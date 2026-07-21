import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { QuestionManager } from '@/components/teacher/question-manager'
import type { User } from '@/types/database'

export default async function QuestionsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile || !['teacher', 'admin'].includes(profile.role)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile as User} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <QuestionManager userId={authUser.id} />
      </main>
    </div>
  )
}
