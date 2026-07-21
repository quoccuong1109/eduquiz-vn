import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Server-side chấm điểm: tránh gian lận client-side
export async function POST(request: Request) {
  try {
    const { attemptId } = await request.json()
    if (!attemptId) return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Xác minh attempt thuộc về user
    const { data: attempt } = await supabase
      .from('attempts')
      .select('*, exams(duration_minutes)')
      .eq('id', attemptId)
      .eq('student_id', user.id)
      .single()

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Attempt already submitted' }, { status: 400 })
    }

    // Lấy tất cả câu trả lời của học sinh
    const { data: studentAnswers } = await supabase
      .from('attempt_answers')
      .select('question_id, selected_answer')
      .eq('attempt_id', attemptId)

    // Lấy đáp án đúng + điểm từng câu (server-side, học sinh không thấy)
    const { data: examQuestions } = await supabase
      .from('exam_questions')
      .select('question_id, points, questions(correct_answer)')
      .eq('exam_id', attempt.exam_id)

    if (!examQuestions) return NextResponse.json({ error: 'No questions found' }, { status: 400 })

    // Tính điểm
    let score = 0
    let totalPoints = 0
    const answerMap = new Map(studentAnswers?.map(a => [a.question_id, a.selected_answer]) || [])

    for (const eq of examQuestions) {
      const points = eq.points || 1
      totalPoints += points
      const correctAnswer = (eq.questions as unknown as { correct_answer: string })?.correct_answer
      const studentAnswer = answerMap.get(eq.question_id)
      if (studentAnswer && studentAnswer === correctAnswer) {
        score += points
      }
    }

    // Cập nhật is_correct cho từng câu trả lời
    if (studentAnswers) {
      for (const sa of studentAnswers) {
        const eq = examQuestions.find(q => q.question_id === sa.question_id)
        const correctAnswer = (eq?.questions as unknown as { correct_answer: string })?.correct_answer
        await supabase
          .from('attempt_answers')
          .update({ is_correct: sa.selected_answer === correctAnswer })
          .eq('attempt_id', attemptId)
          .eq('question_id', sa.question_id)
      }
    }

    // Tính thời gian làm bài
    const timeSpent = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000)

    // Cập nhật attempt
    await supabase
      .from('attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        score,
        total_points: totalPoints,
        time_spent_seconds: timeSpent,
      })
      .eq('id', attemptId)

    return NextResponse.json({ score, totalPoints, timeSpent })
  } catch (error) {
    console.error('Submit exam error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
