-- 호치민 고등학교 시드 데이터 (app-content.ts presets/hochiminh.ts 와 동기화)

INSERT INTO schools (name, city) VALUES
  ('THPT Marie Curie', 'Ho Chi Minh'),
  ('THPT Lê Hồng Phong', 'Ho Chi Minh'),
  ('THPT Nguyễn Thị Minh Khai', 'Ho Chi Minh'),
  ('THPT Trần Phú', 'Ho Chi Minh'),
  ('THPT Phổ Thông Năng Khiếu', 'Ho Chi Minh'),
  ('THPT Bùi Thị Xuân', 'Ho Chi Minh'),
  ('THPT Gia Định', 'Ho Chi Minh'),
  ('THPT Lương Thế Vinh', 'Ho Chi Minh')
ON CONFLICT DO NOTHING;

INSERT INTO classes (school_id, name)
SELECT s.id, c.name
FROM schools s
CROSS JOIN (VALUES
  ('Lớp 10A'), ('Lớp 10B'), ('Lớp 10C'),
  ('Lớp 11A'), ('Lớp 11B'), ('Lớp 11C'),
  ('Lớp 12A'), ('Lớp 12B')
) AS c(name)
WHERE s.city = 'Ho Chi Minh'
ON CONFLICT DO NOTHING;

-- 비속어 시드 (베트남어)
INSERT INTO profanity_blacklist (word, language) VALUES
  ('ditme', 'vi'), ('dmm', 'vi'), ('clmm', 'vi'), ('vl', 'vi'),
  ('lon', 'vi'), ('cu', 'vi'),
  ('시발', 'ko'), ('병신', 'ko'), ('좆', 'ko')
ON CONFLICT DO NOTHING;
