const db = require('../config/db');

/**
 * Finds a teacher by email, or creates one if they don't exist.
 * @param {string} email
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<number>} teacher id
 */
const findOrCreate = async (email, conn) => {
  await conn.execute(
    'INSERT IGNORE INTO teachers (email) VALUES (?)',
    [email]
  );
  const [rows] = await conn.execute(
    'SELECT id FROM teachers WHERE email = ?',
    [email]
  );
  return rows[0].id;
};

/**
 * Checks if a teacher with the given email exists.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
const exists = async (email) => {
  const [rows] = await db.execute(
    'SELECT id FROM teachers WHERE email = ?',
    [email]
  );
  return rows.length > 0;
};

module.exports = { findOrCreate, exists };