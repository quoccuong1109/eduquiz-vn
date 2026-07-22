import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamReport } from '@/components/teacher/exam-report'

interface ReportPageProps {
  params: Promise<{ examId: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { examId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: exam } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('created_by', user!.id)
    .single()

  if (!exam) redirect('/teacher/exams')

  return <ExamReport exam={exam} />
}
