const request = require('supertest');
const app = require('../src/app');

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
  
afterAll(() => {
    jest.restoreAllMocks();
});

// Mock the database pool
jest.mock('../src/config/db', () => {
  const mockConnection = {
    execute: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  return {
    execute: jest.fn(),
    getConnection: jest.fn().mockResolvedValue(mockConnection),
    _mockConnection: mockConnection,
  };
});

const db = require('../src/config/db');

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/register ───────────────────────────────────────────────────────

describe('POST /api/register', () => {
  test('204 on valid registration', async () => {
    const conn = db._mockConnection;

    // findOrCreate teacher: INSERT IGNORE, then SELECT
    conn.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT teacher
      .mockResolvedValueOnce([[{ id: 1 }]])             // SELECT teacher
      .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT student 1
      .mockResolvedValueOnce([[{ id: 10 }]])            // SELECT student 1
      .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT teacher_student 1
      .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT student 2
      .mockResolvedValueOnce([[{ id: 11 }]])            // SELECT student 2
      .mockResolvedValueOnce([{ affectedRows: 1 }]);  // INSERT teacher_student 2

    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'teacherken@gmail.com', students: ['s1@test.com', 's2@test.com'] });

    expect(res.status).toBe(204);
  });

  test('400 when teacher field is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ students: ['s1@test.com'] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  test('400 when teacher email is invalid', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'notanemail', students: ['s1@test.com'] });
    expect(res.status).toBe(400);
  });

  test('400 when students array is empty', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'teacherken@gmail.com', students: [] });
    expect(res.status).toBe(400);
  });

  test('400 when students is not an array', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'teacherken@gmail.com', students: 's1@test.com' });
    expect(res.status).toBe(400);
  });

  test('400 when a student email is invalid', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'teacherken@gmail.com', students: ['invalid-email'] });
    expect(res.status).toBe(400);
  });

  test('500 on database error', async () => {
    db._mockConnection.execute.mockRejectedValueOnce(new Error('DB failure'));
    const res = await request(app)
      .post('/api/register')
      .send({ teacher: 'teacherken@gmail.com', students: ['s1@test.com'] });
    expect(res.status).toBe(500);
    expect(db._mockConnection.rollback).toHaveBeenCalled();
  });
});

// ─── GET /api/commonstudents ──────────────────────────────────────────────────

describe('GET /api/commonstudents', () => {
  test('200 with list of common students for one teacher', async () => {
    db.execute.mockResolvedValueOnce([
      [{ email: 'commonstudent1@gmail.com' }, { email: 'commonstudent2@gmail.com' }],
    ]);
    const res = await request(app)
      .get('/api/commonstudents?teacher=teacherken%40gmail.com');
    expect(res.status).toBe(200);
    expect(res.body.students).toEqual(['commonstudent1@gmail.com', 'commonstudent2@gmail.com']);
  });

  test('200 with common students for multiple teachers', async () => {
    db.execute.mockResolvedValueOnce([[{ email: 'commonstudent1@gmail.com' }]]);
    const res = await request(app)
      .get('/api/commonstudents?teacher=teacherken%40gmail.com&teacher=teacherjoe%40gmail.com');
    expect(res.status).toBe(200);
    expect(res.body.students).toEqual(['commonstudent1@gmail.com']);
  });

  test('200 with empty array when no common students', async () => {
    db.execute.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/commonstudents?teacher=teacherken%40gmail.com');
    expect(res.status).toBe(200);
    expect(res.body.students).toEqual([]);
  });

  test('400 when teacher query param is missing', async () => {
    const res = await request(app).get('/api/commonstudents');
    expect(res.status).toBe(400);
  });

  test('400 when teacher email is invalid', async () => {
    const res = await request(app).get('/api/commonstudents?teacher=notanemail');
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/suspend ────────────────────────────────────────────────────────

describe('POST /api/suspend', () => {
  test('204 on successful suspension', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/suspend')
      .send({ student: 'studentmary@gmail.com' });
    expect(res.status).toBe(204);
  });

  test('404 when student does not exist', async () => {
    db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app)
      .post('/api/suspend')
      .send({ student: 'unknown@gmail.com' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });

  test('400 when student field is missing', async () => {
    const res = await request(app).post('/api/suspend').send({});
    expect(res.status).toBe(400);
  });

  test('400 when student email is invalid', async () => {
    const res = await request(app)
      .post('/api/suspend')
      .send({ student: 'bad-email' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/retrievefornotifications ──────────────────────────────────────

describe('POST /api/retrievefornotifications', () => {
  test('200 with registered + mentioned students (excluding suspended)', async () => {
    // teacherModel.exists
    db.execute
      .mockResolvedValueOnce([[{ id: 1 }]])     // teacher exists
      .mockResolvedValueOnce([                   // registered students
        [{ email: 'studentbob@gmail.com' }],
      ])
      .mockResolvedValueOnce([                   // mentioned students (non-suspended)
        [{ email: 'studentagnes@gmail.com' }, { email: 'studentmiche@gmail.com' }],
      ]);

    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({
        teacher: 'teacherken@gmail.com',
        notification: 'Hello! @studentagnes@gmail.com @studentmiche@gmail.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.recipients).toContain('studentbob@gmail.com');
    expect(res.body.recipients).toContain('studentagnes@gmail.com');
    expect(res.body.recipients).toContain('studentmiche@gmail.com');
  });

  test('200 with only registered students when no mentions', async () => {
    db.execute
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ email: 'studentbob@gmail.com' }]]);

    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({ teacher: 'teacherken@gmail.com', notification: 'Hey everybody' });

    expect(res.status).toBe(200);
    expect(res.body.recipients).toEqual(['studentbob@gmail.com']);
  });

  test('200 returns no duplicates', async () => {
    db.execute
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ email: 'studentbob@gmail.com' }]])
      .mockResolvedValueOnce([[{ email: 'studentbob@gmail.com' }]]); // same student mentioned

    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({
        teacher: 'teacherken@gmail.com',
        notification: 'Hi @studentbob@gmail.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.recipients.filter((e) => e === 'studentbob@gmail.com')).toHaveLength(1);
  });

  test('404 when teacher does not exist', async () => {
    db.execute.mockResolvedValueOnce([[]]); // teacher not found
    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({ teacher: 'nobody@gmail.com', notification: 'Hello' });
    expect(res.status).toBe(404);
  });

  test('400 when teacher field is missing', async () => {
    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({ notification: 'Hello' });
    expect(res.status).toBe(400);
  });

  test('400 when teacher email is invalid', async () => {
    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({ teacher: 'bad', notification: 'Hello' });
    expect(res.status).toBe(400);
  });

  test('400 when notification is missing', async () => {
    const res = await request(app)
      .post('/api/retrievefornotifications')
      .send({ teacher: 'teacherken@gmail.com' });
    expect(res.status).toBe(400);
  });
});

// ─── Misc ─────────────────────────────────────────────────────────────────────

describe('Health check & unknown routes', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
});