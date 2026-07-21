import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamResult } from '@/components/student/exam-result'

interface ResultPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attemptId?: string }>
}

export default async function ResultPage({ params, searchParams }: ResultPageProps) {
  const { id } = await params
  const { attemptId } = await searchParams

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  if (!attemptId) redirect(`/dashboard`)

  // Lấy kết quả attempt
  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', attemptId)
    .eq('student_id', authUser.id)
    .eq('status', 'submitted')
    .single()

  if (!attempt) redirect('/dashboard')

  // Lấy đề thi
  const { data: exam } = await supabase.from('exams').select('*').eq('id', id).single()
  if (!exam) redirect('/dashboard')

  // Nếu giáo viên không cho xem kết quả ngay
  if (!exam.show_result_immediately) {
    redirect('/dashboard')
  }

  // Lấy câu trả lời + đáp án đúng
  const { data: answers } = await supabase
    .from('attempt_answers')
    .select('*, questions(question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)')
    .eq('attempt_id', attemptId)

  // Lấy thứ tự câu hỏi trong đề
  const { data: examQuestions } = await supabase
    .from('exam_questions')
    .select('question_id, order_index, points')
    .eq('exam_id', id)
    .order('order_index')

  return (
    <ExamResult
      exam={exam}
      attempt={attempt}
      answers={answers || []}
      examQuestions={examQuestions || []}
    />
  )
}
