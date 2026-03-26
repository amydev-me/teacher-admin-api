-- Seed data for development and testing

USE teacher_admin;

INSERT IGNORE INTO teachers (email) VALUES
  ('teacherken@gmail.com'),
  ('teacherjoe@gmail.com');

INSERT IGNORE INTO students (email) VALUES
  ('commonstudent1@gmail.com'),
  ('commonstudent2@gmail.com'),
  ('student_only_under_teacher_ken@gmail.com'),
  ('studentbob@gmail.com'),
  ('studentagnes@gmail.com'),
  ('studentmiche@gmail.com'),
  ('studentmary@gmail.com');

-- Register students to teacherken
INSERT IGNORE INTO teacher_student (teacher_id, student_id)
SELECT t.id, s.id FROM teachers t, students s
WHERE t.email = 'teacherken@gmail.com'
  AND s.email IN ('commonstudent1@gmail.com', 'commonstudent2@gmail.com', 'student_only_under_teacher_ken@gmail.com', 'studentbob@gmail.com');

-- Register students to teacherjoe
INSERT IGNORE INTO teacher_student (teacher_id, student_id)
SELECT t.id, s.id FROM teachers t, students s
WHERE t.email = 'teacherjoe@gmail.com'
  AND s.email IN ('commonstudent1@gmail.com', 'commonstudent2@gmail.com');