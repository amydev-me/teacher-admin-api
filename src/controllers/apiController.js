const db = require('../config/db');
const teacherModel = require('../models/teacherModel');
const studentModel = require('../models/studentModel');
const { isValidEmail, extractMentionedEmails } = require('../utils/emailUtils');

/**
 * POST /api/register
 * Registers one or more students to a specified teacher.
 */
const register = async (req, res) => {
  const { teacher, students } = req.body;

  // Validate teacher field
  if (!teacher || typeof teacher !== 'string') {
    return res.status(400).json({ message: 'Teacher email is required.' });
  }
  if (!isValidEmail(teacher)) {
    return res.status(400).json({ message: `Invalid teacher email: ${teacher}` });
  }

  // Validate students field
  if (!students || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ message: 'Students must be a non-empty array.' });
  }
  for (const email of students) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: `Invalid student email: ${email}` });
    }
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const teacherId = await teacherModel.findOrCreate(teacher, conn);

    for (const studentEmail of students) {
      const studentId = await studentModel.findOrCreate(studentEmail, conn);
      await studentModel.registerToTeacher(teacherId, studentId, conn);
    }

    await conn.commit();
    return res.status(204).send();
  } catch (err) {
    await conn.rollback();
    console.error('register error:', err);
    return res.status(500).json({ message: 'An error occurred while registering students.' });
  } finally {
    conn.release();
  }
};

/**
 * GET /api/commonstudents
 * Retrieves students common to all specified teachers.
 */
const commonStudents = async (req, res) => {
  let { teacher } = req.query;

  if (!teacher) {
    return res.status(400).json({ message: 'At least one teacher email is required.' });
  }

  // Normalise to array (single query param comes as string)
  const teacherEmails = Array.isArray(teacher) ? teacher : [teacher];

  for (const email of teacherEmails) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: `Invalid teacher email: ${email}` });
    }
  }

  try {
    const students = await studentModel.getCommonStudents(teacherEmails);
    return res.status(200).json({ students });
  } catch (err) {
    console.error('commonStudents error:', err);
    return res.status(500).json({ message: 'An error occurred while retrieving common students.' });
  }
};

/**
 * POST /api/suspend
 * Suspends a specified student.
 */
const suspend = async (req, res) => {
  const { student } = req.body;

  if (!student || typeof student !== 'string') {
    return res.status(400).json({ message: 'Student email is required.' });
  }
  if (!isValidEmail(student)) {
    return res.status(400).json({ message: `Invalid student email: ${student}` });
  }

  try {
    const updated = await studentModel.suspend(student);
    if (!updated) {
      return res.status(404).json({ message: `Student not found: ${student}` });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('suspend error:', err);
    return res.status(500).json({ message: 'An error occurred while suspending the student.' });
  }
};

/**
 * POST /api/retrievefornotifications
 * Retrieves students eligible to receive a notification from a teacher.
 */
const retrieveForNotifications = async (req, res) => {
  const { teacher, notification } = req.body;

  if (!teacher || typeof teacher !== 'string') {
    return res.status(400).json({ message: 'Teacher email is required.' });
  }
  if (!isValidEmail(teacher)) {
    return res.status(400).json({ message: `Invalid teacher email: ${teacher}` });
  }
  if (notification === undefined || notification === null) {
    return res.status(400).json({ message: 'Notification text is required.' });
  }

  try {
    const teacherExists = await teacherModel.exists(teacher);
    if (!teacherExists) {
      return res.status(404).json({ message: `Teacher not found: ${teacher}` });
    }

    const mentionedEmails = extractMentionedEmails(notification);
    const recipients = await studentModel.getNotificationRecipients(teacher, mentionedEmails);

    return res.status(200).json({ recipients });
  } catch (err) {
    console.error('retrieveForNotifications error:', err);
    return res.status(500).json({ message: 'An error occurred while retrieving notification recipients.' });
  }
};

module.exports = { register, commonStudents, suspend, retrieveForNotifications };