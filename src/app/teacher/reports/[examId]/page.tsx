import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { ExamReport } from '@/components/teacher/exam-report'
import type { User } from '@/types/database'

interface ReportPageProps {
  params: Promise<{ examId: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { examId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile || !['teacher', 'admin'].includes(profile.role)) redirect('/dashboard')

  const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).eq('created_by', authUser.id).single()
  if (!exam) redirect('/teacher/exams')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile as User} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ExamReport exam={exam} />
      </main>
    </div>
  )
}
