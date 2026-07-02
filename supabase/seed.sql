-- Seed schools and classes for Vietnam high schools

INSERT INTO schools (name, city) VALUES
  ('Marie Curie', 'Ho Chi Minh'),
  ('Lê Hồng Phong', 'Ho Chi Minh'),
  ('Nguyễn Thị Minh Khai', 'Hanoi'),
  ('Trần Phú', 'Ho Chi Minh'),
  ('Phổ Thông Năng Khiếu', 'Ho Chi Minh')
ON CONFLICT DO NOTHING;

INSERT INTO classes (school_id, name)
SELECT s.id, c.name
FROM schools s
CROSS JOIN (VALUES
  ('Lớp 10A'), ('Lớp 10B'), ('Lớp 11A'), ('Lớp 11B'), ('Lớp 12A'), ('Lớp 12B')
) AS c(name)
WHERE s.name IN ('Marie Curie', 'Lê Hồng Phong', 'Nguyễn Thị Minh Khai')
ON CONFLICT DO NOTHING;
