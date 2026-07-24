import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ContestRoom } from '@/components/student/contest-room'

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') redirect('/dashboard')

  // Contest phải thuộc lớp học sinh đang học
  const { data: contest } = await supabase
    .from('contests')
    .select('id, title, start_time, end_time, exam_id, class_id, exams(title, duration_minutes, shuffle_questions)')
    .eq('id', id)
    .single()

  if (!contest) notFound()

  const contestData = {
    ...contest,
    exams: Array.isArray(contest.exams) ? contest.exams[0] : contest.exams,
  } as Parameters<typeof ContestRoom>[0]['contest']

  return (
    <ContestRoom
      contest={contestData}
      userId={user.id}
      userName={profile.full_name}
    />
  )
}
