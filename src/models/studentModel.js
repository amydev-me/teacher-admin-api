const db = require('../config/db');

/**
 * Finds a student by email, or creates one if they don't exist.
 * @param {string} email
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<number>} student id
 */
const findOrCreate = async (email, conn) => {
  await conn.execute(
    'INSERT IGNORE INTO students (email) VALUES (?)',
    [email]
  );
  const [rows] = await conn.execute(
    'SELECT id FROM students WHERE email = ?',
    [email]
  );
  return rows[0].id;
};

/**
 * Checks if a student with the given email exists.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
const exists = async (email) => {
  const [rows] = await db.execute(
    'SELECT id FROM students WHERE email = ?',
    [email]
  );
  return rows.length > 0;
};

/**
 * Suspends a student by email.
 * @param {string} email
 * @returns {Promise<boolean>} true if a student was updated
 */
const suspend = async (email) => {
  const [result] = await db.execute(
    'UPDATE students SET is_suspended = TRUE WHERE email = ?',
    [email]
  );
  return result.affectedRows > 0;
};

/**
 * Registers a student under a teacher (upsert).
 * @param {number} teacherId
 * @param {number} studentId
 * @param {import('mysql2/promise').PoolConnection} conn
 */
const registerToTeacher = async (teacherId, studentId, conn) => {
  await conn.execute(
    'INSERT IGNORE INTO teacher_student (teacher_id, student_id) VALUES (?, ?)',
    [teacherId, studentId]
  );
};

/**
 * Returns students common to ALL given teacher emails.
 * @param {string[]} teacherEmails
 * @returns {Promise<string[]>}
 */
const getCommonStudents = async (teacherEmails) => {
  const placeholders = teacherEmails.map(() => '?').join(', ');
  const [rows] = await db.execute(
    `SELECT s.email
     FROM students s
     JOIN teacher_student ts ON s.id = ts.student_id
     JOIN teachers t ON t.id = ts.teacher_id
     WHERE t.email IN (${placeholders})
     GROUP BY s.id, s.email
     HAVING COUNT(DISTINCT t.id) = ?`,
    [...teacherEmails, teacherEmails.length]
  );
  return rows.map((r) => r.email);
};

/**
 * Returns non-suspended students registered to a teacher OR whose emails are in the mention list.
 * @param {string} teacherEmail
 * @param {string[]} mentionedEmails
 * @returns {Promise<string[]>}
 */
const getNotificationRecipients = async (teacherEmail, mentionedEmails) => {
  // Get non-suspended students registered to teacher
  const [registeredRows] = await db.execute(
    `SELECT s.email
     FROM students s
     JOIN teacher_student ts ON s.id = ts.student_id
     JOIN teachers t ON t.id = ts.teacher_id
     WHERE t.email = ? AND s.is_suspended = FALSE`,
    [teacherEmail]
  );

  const recipientSet = new Set(registeredRows.map((r) => r.email));

  // Add non-suspended mentioned students
  if (mentionedEmails.length > 0) {
    const placeholders = mentionedEmails.map(() => '?').join(', ');
    const [mentionedRows] = await db.execute(
      `SELECT email FROM students WHERE email IN (${placeholders}) AND is_suspended = FALSE`,
      mentionedEmails
    );
    mentionedRows.forEach((r) => recipientSet.add(r.email));
  }

  return [...recipientSet];
};

module.exports = {
  findOrCreate,
  exists,
  suspend,
  registerToTeacher,
  getCommonStudents,
  getNotificationRecipients,
};