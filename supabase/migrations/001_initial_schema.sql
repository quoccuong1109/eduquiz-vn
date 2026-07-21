-- =====================================================
-- EduQuiz VN - Database Schema
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE user_role AS ENUM ('teacher', 'student', 'admin');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE answer_option AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'expired');

-- =====================================================
-- BẢNG USERS (extend auth.users)
-- =====================================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  school TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BẢNG CLASSES (lớp học)
-- =====================================================
CREATE TABLE public.classes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  school_year TEXT NOT NULL DEFAULT '2025-2026',
  join_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BẢNG CLASS_STUDENTS
-- =====================================================
CREATE TABLE public.class_students (
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);

-- =====================================================
-- BẢNG QUESTIONS (ngân hàng câu hỏi)
-- =====================================================
CREATE TABLE public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  grade INT NOT NULL CHECK (grade BETWEEN 1 AND 12),
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer answer_option NOT NULL,
  explanation TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BẢNG EXAMS (đề thi)
-- =====================================================
CREATE TABLE public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_answers BOOLEAN DEFAULT FALSE,
  show_result_immediately BOOLEAN DEFAULT TRUE,
  max_attempts INT,
  access_code TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BẢNG EXAM_QUESTIONS
-- =====================================================
CREATE TABLE public.exam_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  order_index INT NOT NULL,
  points NUMERIC DEFAULT 1,
  UNIQUE(exam_id, question_id)
);

-- =====================================================
-- BẢNG EXAM_CLASSES
-- =====================================================
CREATE TABLE public.exam_classes (
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  PRIMARY KEY (exam_id, class_id)
);

-- =====================================================
-- BẢNG ATTEMPTS (lượt thi)
-- =====================================================
CREATE TABLE public.attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  total_points NUMERIC,
  time_spent_seconds INT,
  status attempt_status DEFAULT 'in_progress'
);

-- =====================================================
-- BẢNG ATTEMPT_ANSWERS
-- =====================================================
CREATE TABLE public.attempt_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  selected_answer answer_option,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- =====================================================
-- INDEXES để tối ưu query
-- =====================================================
CREATE INDEX idx_questions_created_by ON public.questions(created_by);
CREATE INDEX idx_questions_subject ON public.questions(subject, grade);
CREATE INDEX idx_questions_public ON public.questions(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_exams_created_by ON public.exams(created_by);
CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id);
CREATE INDEX idx_attempts_exam ON public.attempts(exam_id);
CREATE INDEX idx_attempts_student ON public.attempts(student_id);
CREATE INDEX idx_attempt_answers_attempt ON public.attempt_answers(attempt_id);
CREATE INDEX idx_class_students_student ON public.class_students(student_id);

-- =====================================================
-- TRIGGERS: Tự động tạo user profile khi đăng ký
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Bật RLS cho tất cả bảng
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - USERS
-- =====================================================
CREATE POLICY "Users xem profile của mình" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users cập nhật profile của mình" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teacher/Admin xem tất cả users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - QUESTIONS
-- =====================================================
CREATE POLICY "Xem câu hỏi public" ON public.questions
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Xem câu hỏi của mình" ON public.questions
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Teacher tạo câu hỏi" ON public.questions
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Xóa/sửa câu hỏi của mình" ON public.questions
  FOR ALL USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - EXAMS
-- =====================================================
CREATE POLICY "Teacher xem đề của mình" ON public.exams
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Học sinh xem đề được gán" ON public.exams
  FOR SELECT USING (
    is_published = TRUE AND (
      -- Đề public
      access_code IS NULL OR
      -- Đề được gán cho lớp của học sinh
      EXISTS (
        SELECT 1 FROM public.exam_classes ec
        JOIN public.class_students cs ON ec.class_id = cs.class_id
        WHERE ec.exam_id = exams.id AND cs.student_id = auth.uid()
      )
    )
  );

CREATE POLICY "Teacher tạo đề thi" ON public.exams
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teacher sửa đề của mình" ON public.exams
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Teacher xóa đề của mình" ON public.exams
  FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES - EXAM_QUESTIONS
-- =====================================================
CREATE POLICY "Xem câu hỏi trong đề" ON public.exam_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND (
        e.created_by = auth.uid() OR
        (e.is_published = TRUE AND EXISTS (
          SELECT 1 FROM public.attempts a
          WHERE a.exam_id = e.id AND a.student_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Teacher quản lý câu hỏi trong đề" ON public.exam_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND e.created_by = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - CLASSES
-- =====================================================
CREATE POLICY "Teacher quản lý lớp của mình" ON public.classes
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Học sinh xem lớp của mình" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_students
      WHERE class_id = classes.id AND student_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - CLASS_STUDENTS
-- =====================================================
CREATE POLICY "Teacher xem học sinh trong lớp" ON public.class_students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Học sinh xem thông tin lớp của mình" ON public.class_students
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teacher thêm học sinh vào lớp" ON public.class_students
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teacher xóa học sinh khỏi lớp" ON public.class_students
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE id = class_id AND teacher_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - EXAM_CLASSES
-- =====================================================
CREATE POLICY "Teacher quản lý gán đề cho lớp" ON public.exam_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND e.created_by = auth.uid()
    )
  );

CREATE POLICY "Học sinh xem đề được gán" ON public.exam_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_students cs
      WHERE cs.class_id = exam_classes.class_id AND cs.student_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - ATTEMPTS
-- =====================================================
CREATE POLICY "Học sinh xem attempt của mình" ON public.attempts
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Học sinh tạo attempt" ON public.attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Học sinh cập nhật attempt của mình" ON public.attempts
  FOR UPDATE USING (student_id = auth.uid());

CREATE POLICY "Teacher xem attempt của đề mình tạo" ON public.attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exams e
      WHERE e.id = exam_id AND e.created_by = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - ATTEMPT_ANSWERS
-- =====================================================
CREATE POLICY "Học sinh quản lý câu trả lời của mình" ON public.attempt_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.attempts a
      WHERE a.id = attempt_id AND a.student_id = auth.uid()
    )
  );

CREATE POLICY "Teacher xem câu trả lời" ON public.attempt_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.attempts a
      JOIN public.exams e ON e.id = a.exam_id
      WHERE a.id = attempt_id AND e.created_by = auth.uid()
    )
  );

-- =====================================================
-- REALTIME: Bật cho attempts và attempt_answers
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attempt_answers;

-- =====================================================
-- FUNCTION: Chấm điểm server-side (gọi từ API route)
-- =====================================================
CREATE OR REPLACE FUNCTION public.submit_exam(p_attempt_id UUID)
RETURNS JSON AS $$
DECLARE
  v_attempt attempts;
  v_score NUMERIC := 0;
  v_total NUMERIC := 0;
  v_time_spent INT;
BEGIN
  -- Lấy thông tin attempt
  SELECT * INTO v_attempt FROM public.attempts WHERE id = p_attempt_id;

  IF v_attempt.student_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_attempt.status != 'in_progress' THEN
    RAISE EXCEPTION 'Attempt already submitted';
  END IF;

  -- Tính điểm từng câu
  UPDATE public.attempt_answers aa
  SET is_correct = (aa.selected_answer = q.correct_answer)
  FROM public.questions q
  WHERE aa.question_id = q.id AND aa.attempt_id = p_attempt_id;

  -- Tính tổng điểm
  SELECT
    SUM(CASE WHEN aa.is_correct THEN eq.points ELSE 0 END),
    SUM(eq.points)
  INTO v_score, v_total
  FROM public.attempt_answers aa
  JOIN public.exam_questions eq ON eq.question_id = aa.question_id AND eq.exam_id = v_attempt.exam_id
  WHERE aa.attempt_id = p_attempt_id;

  -- Tính thời gian làm bài
  v_time_spent := EXTRACT(EPOCH FROM (NOW() - v_attempt.started_at))::INT;

  -- Cập nhật attempt
  UPDATE public.attempts
  SET
    status = 'submitted',
    submitted_at = NOW(),
    score = COALESCE(v_score, 0),
    total_points = COALESCE(v_total, 0),
    time_spent_seconds = v_time_spent
  WHERE id = p_attempt_id;

  RETURN json_build_object(
    'score', COALESCE(v_score, 0),
    'total_points', COALESCE(v_total, 0),
    'time_spent_seconds', v_time_spent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
