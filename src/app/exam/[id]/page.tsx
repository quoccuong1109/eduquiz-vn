import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamRoom } from '@/components/student/exam-room'

interface ExamPageProps {
  params: Promise<{ id: string }>
}

export default async function ExamPage({ params }: ExamPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect(`/login?redirectTo=/exam/${id}`)

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile) redirect('/login')

  // Lấy thông tin đề thi
  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!exam) redirect('/dashboard')

  // Kiểm tra attempt đang dở
  const { data: existingAttempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('exam_id', id)
    .eq('student_id', authUser.id)
    .eq('status', 'in_progress')
    .single()

  // Lấy câu hỏi trong đề (không kèm correct_answer để tránh gian lận)
  const { data: examQuestions } = await supabase
    .from('exam_questions')
    .select('*, questions(id, question_text, option_a, option_b, option_c, option_d, image_url)')
    .eq('exam_id', id)
    .order('order_index')

  const questions = (examQuestions || []).map(eq => ({
    ...eq.questions,
    points: eq.points,
    order_index: eq.order_index,
  }))

  return (
    <ExamRoom
      exam={exam}
      questions={questions}
      userId={authUser.id}
      existingAttemptId={existingAttempt?.id || null}
      existingStartedAt={existingAttempt?.started_at || null}
    />
  )
}
