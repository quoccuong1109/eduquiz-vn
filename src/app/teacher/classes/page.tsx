import { createClient } from '@/lib/supabase/server'
import { ClassManager } from '@/components/teacher/class-manager'

export default async function ClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <ClassManager userId={user!.id} />
}
