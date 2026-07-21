-- =====================================================
-- EduQuiz VN - Seed Data (dữ liệu mẫu để test)
-- Chạy SAU khi đã chạy 001_initial_schema.sql
-- LƯU Ý: Tạo user qua UI trước, rồi copy UUID vào đây
-- =====================================================

-- Bước 1: Sau khi đăng ký tài khoản giáo viên qua UI,
-- chạy query này để lấy UUID:
-- SELECT id, full_name, role FROM public.users;

-- Bước 2: Thay YOUR_TEACHER_UUID bằng UUID thực
-- và chạy phần dưới để tạo dữ liệu mẫu:

/*
-- Câu hỏi mẫu môn Tin học
INSERT INTO public.questions (created_by, subject, grade, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, is_public, tags)
VALUES
(
  'YOUR_TEACHER_UUID',
  'tin_hoc', 12, 'easy',
  'Phần mềm nào sau đây là hệ điều hành?',
  'Microsoft Word', 'Windows 11', 'Google Chrome', 'Visual Studio Code',
  'B',
  'Hệ điều hành (Operating System) là phần mềm quản lý tài nguyên máy tính. Windows 11 là hệ điều hành phổ biến của Microsoft.',
  true,
  ARRAY['hệ điều hành', 'phần mềm', 'tin học đại cương']
),
(
  'YOUR_TEACHER_UUID',
  'tin_hoc', 12, 'medium',
  'Trong Excel, hàm nào dùng để tính tổng các giá trị thỏa mãn điều kiện?',
  'SUM', 'SUMIF', 'COUNT', 'AVERAGE',
  'B',
  'Hàm SUMIF tính tổng các ô thỏa mãn điều kiện cho trước. Cú pháp: =SUMIF(range, criteria, sum_range).',
  true,
  ARRAY['excel', 'hàm', 'sumif']
),
(
  'YOUR_TEACHER_UUID',
  'tin_hoc', 12, 'hard',
  'Trong lập trình Python, kết quả của biểu thức 2**3**2 là bao nhiêu?',
  '64', '512', '72', '36',
  'B',
  'Trong Python, phép lũy thừa ** kết hợp phải sang trái. 2**3**2 = 2**(3**2) = 2**9 = 512.',
  true,
  ARRAY['python', 'lập trình', 'lũy thừa']
),
(
  'YOUR_TEACHER_UUID',
  'tin_hoc', 11, 'easy',
  'HTML viết tắt của từ gì?',
  'Hyper Text Markup Language', 'High Tech Modern Language', 'Hyperlink and Text Markup Language', 'Home Tool Markup Language',
  'A',
  'HTML = HyperText Markup Language - ngôn ngữ đánh dấu siêu văn bản, dùng để tạo cấu trúc trang web.',
  true,
  ARRAY['html', 'web', 'lập trình']
),
(
  'YOUR_TEACHER_UUID',
  'tin_hoc', 10, 'easy',
  'Đơn vị lưu trữ nào lớn hơn 1 GB?',
  '1 MB', '1 KB', '1 TB', '1 Byte',
  'C',
  '1 TB (Terabyte) = 1024 GB. Thứ tự tăng dần: Byte < KB < MB < GB < TB < PB.',
  true,
  ARRAY['đơn vị lưu trữ', 'tin học đại cương']
);
*/
