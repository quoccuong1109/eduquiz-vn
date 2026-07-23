import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { CurriculumBrowser } from '@/components/student/curriculum-browser'
import type { User } from '@/types/database'

export default async function CurriculumPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
  if (!profile) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={profile as User} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <CurriculumBrowser user={profile as User} />
      </main>
    </div>
  )
}
