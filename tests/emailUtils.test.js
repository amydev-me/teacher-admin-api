const { isValidEmail, extractMentionedEmails } = require('../src/utils/emailUtils');

describe('isValidEmail', () => {
  test('returns true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
    expect(isValidEmail('teacherken@gmail.com')).toBe(true);
  });

  test('returns false for invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
  });
});

describe('extractMentionedEmails', () => {
  test('extracts single @mentioned email', () => {
    const result = extractMentionedEmails('Hello @studentagnes@gmail.com');
    expect(result).toEqual(['studentagnes@gmail.com']);
  });

  test('extracts multiple @mentioned emails', () => {
    const result = extractMentionedEmails(
      'Hello students! @studentagnes@gmail.com @studentmiche@gmail.com'
    );
    expect(result).toContain('studentagnes@gmail.com');
    expect(result).toContain('studentmiche@gmail.com');
    expect(result).toHaveLength(2);
  });

  test('deduplicates repeated mentions', () => {
    const result = extractMentionedEmails('@dup@test.com @dup@test.com');
    expect(result).toEqual(['dup@test.com']);
  });

  test('returns empty array when no mentions', () => {
    expect(extractMentionedEmails('Hey everybody')).toEqual([]);
    expect(extractMentionedEmails('')).toEqual([]);
    expect(extractMentionedEmails(null)).toEqual([]);
  });

  test('does not extract plain email without @ prefix', () => {
    const result = extractMentionedEmails('Contact student@example.com for details');
    expect(result).toEqual([]);
  });
});