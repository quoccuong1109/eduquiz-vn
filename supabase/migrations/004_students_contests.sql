-- =====================================================
-- Migration 004: Student Management + Assignments + Contests
-- =====================================================

-- Giáo viên tạo học sinh → lưu ai tạo
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_by ON public.users(created_by);

-- Teacher thấy học sinh mình tạo
CREATE POLICY "Teacher xem học sinh mình tạo" ON public.users
  FOR SELECT USING (created_by = auth.uid());

-- Teacher cập nhật thông tin học sinh mình tạo
CREATE POLICY "Teacher cập nhật học sinh mình tạo" ON public.users
  FOR UPDATE USING (created_by = auth.uid());

-- =====================================================
-- BẢNG ASSIGNMENTS (bài tập giao cho lớp)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);

CREATE POLICY "Teacher quản lý bài tập của mình" ON public.assignments
  FOR ALL USING (created_by = auth.uid());

-- Helper để tránh RLS recursion
CREATE OR REPLACE FUNCTION public.is_student_in_class_for_assignment(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.class_students
    WHERE class_id = p_class_id AND student_id = auth.uid()
  );
$$;

CREATE POLICY "Học sinh xem bài tập lớp mình" ON public.assignments
  FOR SELECT USING (public.is_student_in_class_for_assignment(class_id));

-- =====================================================
-- BẢNG CONTESTS (cuộc thi)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contests_class ON public.contests(class_id);

CREATE POLICY "Teacher quản lý contest của mình" ON public.contests
  FOR ALL USING (created_by = auth.uid());

-- Helper
CREATE OR REPLACE FUNCTION public.is_student_in_contest_class(p_contest_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contests c
    JOIN public.class_students cs ON cs.class_id = c.class_id
    WHERE c.id = p_contest_id AND cs.student_id = auth.uid()
  );
$$;

CREATE POLICY "Học sinh xem contest lớp mình" ON public.contests
  FOR SELECT USING (public.is_student_in_contest_class(id));

-- Realtime cho contests
ALTER PUBLICATION supabase_realtime ADD TABLE public.contests;

-- =====================================================
-- Thêm contest_id vào attempts để link ranking
-- =====================================================
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS contest_id UUID REFERENCES public.contests(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_attempts_contest ON public.attempts(contest_id);

-- Học sinh xem attempt của TẤT CẢ bạn trong cùng contest (để hiển thị ranking)
CREATE OR REPLACE FUNCTION public.is_contest_participant(p_contest_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contests c
    JOIN public.class_students cs ON cs.class_id = c.class_id
    WHERE c.id = p_contest_id AND cs.student_id = auth.uid()
  );
$$;

CREATE POLICY "Xem attempt trong contest" ON public.attempts
  FOR SELECT USING (
    contest_id IS NOT NULL AND public.is_contest_participant(contest_id)
  );
