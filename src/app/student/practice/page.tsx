import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { PracticeMode } from '@/components/student/practice-mode'
import type { User } from '@/types/database'

export default async function PracticePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile as User} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <PracticeMode userId={authUser.id} />
      </main>
    </div>
  )
}
