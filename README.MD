# Teacher Admin API

A RESTful Node.js API for teachers to perform administrative functions for their classes — including registering students, querying common enrolments, suspending students, and retrieving notification recipients.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [Running Tests](#running-tests)
- [API Reference](#api-reference)
  - [POST /api/register](#1-post-apiregister)
  - [GET /api/commonstudents](#2-get-apicommonstudents)
  - [POST /api/suspend](#3-post-apisuspend)
  - [POST /api/retrievefornotifications](#4-post-apiretrievefornotifications)
- [Error Responses](#error-responses)
- [Design Decisions](#design-decisions)

---

## Tech Stack

| Layer      | Technology           |
|------------|----------------------|
| Runtime    | Node.js (v18+)       |
| Framework  | Express.js           |
| Database   | MySQL 8+             |
| DB Client  | mysql2 (with Promises) |
| Testing    | Jest + Supertest     |

---

## Project Structure

```
teacher-admin-api/
├── db/
│   ├── schema.sql          # Database schema
│   └── seed.sql            # Sample seed data
├── src/
│   ├── app.js              # Express app setup
│   ├── server.js           # HTTP server entry point
│   ├── config/
│   │   └── db.js           # MySQL connection pool
│   ├── controllers/
│   │   └── apiController.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── teacherModel.js
│   │   └── studentModel.js
│   ├── routes/
│   │   └── api.js
│   └── utils/
│       └── emailUtils.js
├── tests/
│   ├── api.test.js         # Integration tests (mocked DB)
│   └── emailUtils.test.js  # Unit tests for email utilities
├── .env.example
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MySQL](https://dev.mysql.com/downloads/) 8.0 or higher
- npm v8+

### Environment Variables

Copy the example env file and fill in your database credentials:

```bash
cp .env.example .env
```

| Variable    | Description                  | Default       |
|-------------|------------------------------|---------------|
| PORT        | Port for the API server      | 3000          |
| DB_HOST     | MySQL host                   | localhost     |
| DB_PORT     | MySQL port                   | 3306          |
| DB_USER     | MySQL user                   | root          |
| DB_PASSWORD | MySQL password               | yourpassword  |
| DB_NAME     | Database name                | teacher_admin |
| NODE_ENV    | Environment                  | development   |

### Database Setup

Connect to your MySQL instance and run the schema:

```bash
mysql -u root -p < db/schema.sql
```

Optionally, load seed data for development:

```bash
mysql -u root -p < db/seed.sql
```

### Running the Server

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

The API will be available at `http://localhost:3000`.

For development with auto-reload:

```bash
npm run dev
```

---

## Running Tests

Tests use a mocked database — no real database connection required.

```bash
npm test
```

To see coverage:

```bash
npm run test:coverage
```

---

## API Reference

### 1. POST `/api/register`

Register one or more students to a specified teacher. Both the teacher and students are created if they don't already exist.

**Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "teacher": "teacherken@gmail.com",
  "students": [
    "studentjon@gmail.com",
    "studenthon@gmail.com"
  ]
}
```

**Success Response:** `HTTP 204 No Content`

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400    | Missing/invalid teacher or student email |
| 500    | Database error |

---

### 2. GET `/api/commonstudents`

Retrieve students registered to **all** specified teachers.

**Query Parameters:**

| Param   | Required | Example |
|---------|----------|---------|
| teacher | Yes (1+) | `teacher=teacherken%40gmail.com` |

**Request Examples:**

```
GET /api/commonstudents?teacher=teacherken%40gmail.com
GET /api/commonstudents?teacher=teacherken%40gmail.com&teacher=teacherjoe%40gmail.com
```

**Success Response:** `HTTP 200 OK`

```json
{
  "students": [
    "commonstudent1@gmail.com",
    "commonstudent2@gmail.com"
  ]
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400    | No teacher param or invalid email |
| 500    | Database error |

---

### 3. POST `/api/suspend`

Suspend a specified student.

**Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "student": "studentmary@gmail.com"
}
```

**Success Response:** `HTTP 204 No Content`

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400    | Missing or invalid student email |
| 404    | Student not found |
| 500    | Database error |

---

### 4. POST `/api/retrievefornotifications`

Retrieve a deduplicated list of students eligible to receive a notification from a teacher.

A student is eligible if they:
- Are **not** suspended, **AND**
- Are registered to the teacher **OR** are @mentioned in the notification text

**Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "teacher": "teacherken@gmail.com",
  "notification": "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com"
}
```

**Success Response:** `HTTP 200 OK`

```json
{
  "recipients": [
    "studentbob@gmail.com",
    "studentagnes@gmail.com",
    "studentmiche@gmail.com"
  ]
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400    | Missing or invalid teacher email, or missing notification |
| 404    | Teacher not found |
| 500    | Database error |

---

## Error Responses

All error responses return JSON with a `message` field:

```json
{
  "message": "Some meaningful error message"
}
```

---

## Design Decisions

- **Connection pooling**: `mysql2` pool is used for efficient DB connection management under concurrent load.
- **Transactions on register**: Registering students to a teacher uses a DB transaction — if any insert fails, the entire operation rolls back cleanly.
- **Upsert pattern**: Teachers and students are created automatically on register (`INSERT IGNORE`), keeping the API idempotent — re-registering the same student to the same teacher is a no-op.
- **`HAVING COUNT(DISTINCT t.id) = N` for common students**: A single query filters students registered to all N teachers without subquery nesting, which performs well with appropriate indexes.
- **Mention extraction via regex**: `@mention` parsing is isolated in a utility function and fully unit-tested, making it easy to extend.
- **Mocked DB in tests**: Integration tests mock the DB pool so they are fast and runnable without a live database, while still exercising the full Express request/response cycle.