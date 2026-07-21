import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { TeacherDashboard } from '@/components/teacher/dashboard'
import { StudentDashboard } from '@/components/student/dashboard'
import type { User } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) redirect('/login')

  const user = profile as User

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {user.role === 'teacher' || user.role === 'admin' ? (
          <TeacherDashboard user={user} />
        ) : (
          <StudentDashboard user={user} />
        )}
      </main>
    </div>
  )
}
