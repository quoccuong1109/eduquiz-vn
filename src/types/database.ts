// Types tự động từ Supabase schema - giữ đồng bộ với migrations

export type UserRole = 'teacher' | 'student' | 'admin'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type AnswerOption = 'A' | 'B' | 'C' | 'D'
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired'

export interface User {
  id: string
  full_name: string
  role: UserRole
  school: string | null
  email: string | null
  created_by: string | null
  created_at: string
}

export interface Question {
  id: string
  created_by: string
  subject: string
  grade: number
  difficulty: Difficulty
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerOption
  explanation: string | null
  image_url: string | null
  tags: string[]
  is_public: boolean
  created_at: string
}

export interface Exam {
  id: string
  created_by: string
  title: string
  subject: string
  grade: number
  duration_minutes: number
  start_time: string | null
  end_time: string | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_result_immediately: boolean
  max_attempts: number | null
  access_code: string | null
  is_published: boolean
  lesson_tag: string | null
  created_at: string
}

export interface ExamQuestion {
  id: string
  exam_id: string
  question_id: string
  order_index: number
  points: number
}

export interface Class {
  id: string
  teacher_id: string
  name: string
  school_year: string
  created_at: string
}

export interface ClassStudent {
  class_id: string
  student_id: string
  joined_at: string
}

export interface ExamClass {
  exam_id: string
  class_id: string
}

export interface Attempt {
  id: string
  exam_id: string
  student_id: string
  started_at: string
  submitted_at: string | null
  score: number | null
  total_points: number | null
  time_spent_seconds: number | null
  status: AttemptStatus
}

export interface AttemptAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_answer: AnswerOption | null
  is_correct: boolean | null
  answered_at: string | null
}

export interface Assignment {
  id: string
  class_id: string
  exam_id: string
  title: string
  instructions: string | null
  due_date: string | null
  created_by: string
  created_at: string
}

export interface Contest {
  id: string
  class_id: string
  exam_id: string
  title: string
  start_time: string
  end_time: string
  created_by: string
  created_at: string
}

// Extended types với joins
export interface ExamWithQuestions extends Exam {
  exam_questions: (ExamQuestion & { questions: Question })[]
}

export interface AttemptWithAnswers extends Attempt {
  attempt_answers: AttemptAnswer[]
  exams: Exam
}

export interface QuestionWithStats extends Question {
  total_answers: number
  correct_count: number
  answer_distribution: Record<AnswerOption, number>
}

export interface StudentResult {
  student_id: string
  full_name: string
  score: number | null
  total_points: number | null
  submitted_at: string | null
  time_spent_seconds: number | null
  status: AttemptStatus
}
