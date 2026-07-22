import { createClient } from '@/lib/supabase/server'
import { ExamCreator } from '@/components/teacher/exam-creator'

export default async function CreateExamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <ExamCreator userId={user!.id} />
}
