-- =====================================================
-- Bước 1: Thêm cột lesson_tag vào bảng exams
-- (bỏ qua nếu đã chạy rồi)
-- =====================================================
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS lesson_tag TEXT;

-- =====================================================
-- Bước 2: Auto-tag câu hỏi Tin 12 theo từng bài
-- Dựa trên nội dung question_text
-- =====================================================

-- Bài 1: Làm quen với Trí tuệ nhân tạo
-- (lịch sử AI, định nghĩa, đặc trưng cơ bản, phép thử Turing, MYCIN)
UPDATE public.questions
SET tags = array_append(tags, 'tin12-b1')
WHERE grade = 12
  AND subject = 'tin_hoc'
  AND NOT (tags @> ARRAY['tin12-b1'])
  AND (
    question_text ILIKE '%phép thử Turing%'
    OR question_text ILIKE '%Alan Turing%'
    OR question_text ILIKE '%MYCIN%'
    OR question_text ILIKE '%ra đời chính thức%'
    OR question_text ILIKE '%sự kiện ra đời%'
    OR (question_text ILIKE '%Trí tuệ nhân tạo%' AND question_text ILIKE '%đặc trưng%')
    OR (question_text ILIKE '%Trí tuệ nhân tạo%' AND question_text ILIKE '%khả năng học%')
    OR (question_text ILIKE '%Trí tuệ nhân tạo%' AND question_text ILIKE '%định nghĩa%')
    OR (question_text ILIKE '%AI%' AND question_text ILIKE '%lịch sử%')
  );

-- Bài 2: Trí tuệ nhân tạo trong khoa học và đời sống
-- (ứng dụng AI thực tế: xe tự lái, nhận dạng, chẩn đoán y tế, ...)
UPDATE public.questions
SET tags = array_append(tags, 'tin12-b2')
WHERE grade = 12
  AND subject = 'tin_hoc'
  AND NOT (tags @> ARRAY['tin12-b2'])
  AND (
    question_text ILIKE '%xe tự lái%'
    OR question_text ILIKE '%nhận dạng khuôn mặt%'
    OR question_text ILIKE '%chẩn đoán bệnh%'
    OR question_text ILIKE '%dự báo thời tiết%'
    OR question_text ILIKE '%robot%'
    OR (question_text ILIKE '%AI%' AND question_text ILIKE '%ứng dụng%')
    OR (question_text ILIKE '%Trí tuệ nhân tạo%' AND question_text ILIKE '%đời sống%')
    OR (question_text ILIKE '%Trí tuệ nhân tạo%' AND question_text ILIKE '%khoa học%')
    OR (question_text ILIKE '%cảm biến%' AND question_text ILIKE '%AI%')
  );

-- Bài 3: Một số thiết bị mạng thông dụng
-- (Router, Switch, Hub, Modem, cáp quang, cáp xoắn, Firewall)
UPDATE public.questions
SET tags = array_append(tags, 'tin12-b3')
WHERE grade = 12
  AND subject = 'tin_hoc'
  AND NOT (tags @> ARRAY['tin12-b3'])
  AND (
    question_text ILIKE '%cáp quang%'
    OR question_text ILIKE '%cáp xoắn%'
    OR question_text ILIKE '%Firewall%'
    OR question_text ILIKE '%Tường lửa%'
    OR question_text ILIKE '%Switch%'
    OR question_text ILIKE '%Modem%'
    OR question_text ILIKE '%thiết bị mạng%'
    OR (question_text ILIKE '%Hub%' AND question_text ILIKE '%mạng%')
    OR (question_text ILIKE '%Router%' AND NOT question_text ILIKE '%NAT%')
  );

-- Bài 4: Giao thức mạng
-- (TCP/IP, IPv4, IPv6, địa chỉ IP, NAT, DNS, HTTP, giao thức)
UPDATE public.questions
SET tags = array_append(tags, 'tin12-b4')
WHERE grade = 12
  AND subject = 'tin_hoc'
  AND NOT (tags @> ARRAY['tin12-b4'])
  AND (
    question_text ILIKE '%IPv4%'
    OR question_text ILIKE '%IPv6%'
    OR question_text ILIKE '%TCP/IP%'
    OR question_text ILIKE '%địa chỉ IP%'
    OR question_text ILIKE '%giao thức mạng%'
    OR question_text ILIKE '%NAT%'
    OR question_text ILIKE '%DNS%'
    OR question_text ILIKE '%HTTP%'
    OR question_text ILIKE '%cạn kiệt%'
  );

-- Bài 5: Thực hành chia sẻ tài nguyên trên mạng
-- (chia sẻ thư mục, mức quyền, Wi-Fi, kết nối LAN)
UPDATE public.questions
SET tags = array_append(tags, 'tin12-b5')
WHERE grade = 12
  AND subject = 'tin_hoc'
  AND NOT (tags @> ARRAY['tin12-b5'])
  AND (
    (question_text ILIKE '%chia sẻ%' AND question_text ILIKE '%mạng%')
    OR question_text ILIKE '%mức quyền%'
    OR (question_text ILIKE '%Wi-Fi%' AND question_text ILIKE '%kết nối%')
    OR (question_text ILIKE '%LAN%' AND question_text ILIKE '%chia sẻ%')
    OR question_text ILIKE '%quyền Read%'
    OR question_text ILIKE '%quyền Write%'
    OR question_text ILIKE '%quyền Full Control%'
  );

-- =====================================================
-- Kiểm tra kết quả
-- =====================================================
SELECT
  CASE
    WHEN 'tin12-b1' = ANY(tags) THEN 'Bài 1'
    WHEN 'tin12-b2' = ANY(tags) THEN 'Bài 2'
    WHEN 'tin12-b3' = ANY(tags) THEN 'Bài 3'
    WHEN 'tin12-b4' = ANY(tags) THEN 'Bài 4'
    WHEN 'tin12-b5' = ANY(tags) THEN 'Bài 5'
    ELSE 'Chưa tag'
  END AS bai,
  COUNT(*) AS so_cau
FROM public.questions
WHERE grade = 12 AND subject = 'tin_hoc'
GROUP BY bai
ORDER BY bai;
