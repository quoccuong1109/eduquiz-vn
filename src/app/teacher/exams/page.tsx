import { createClient } from '@/lib/supabase/server'
import { ExamList } from '@/components/teacher/exam-list'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <ExamList userId={user!.id} />
}
