import { createClient } from '@/lib/supabase/server'
import { QuestionManager } from '@/components/teacher/question-manager'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <QuestionManager userId={user!.id} />
}
