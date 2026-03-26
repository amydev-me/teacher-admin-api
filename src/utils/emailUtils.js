const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a single email address.
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
};

/**
 * Extracts @mentioned emails from a notification string.
 * Supports standard email format prefixed with @.
 * @param {string} text
 * @returns {string[]} Array of unique mentioned emails
 */
const extractMentionedEmails = (text) => {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/@([^\s@]+@[^\s@]+\.[^\s@]+)/g) || [];
  const emails = matches.map((m) => m.slice(1)); // strip leading @
  return [...new Set(emails)];
};

module.exports = { isValidEmail, extractMentionedEmails };