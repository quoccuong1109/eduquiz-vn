import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminUsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Service client bypasses RLS to fetch all users
  const service = createServiceClient()
  const { data: users } = await service
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Người dùng</h1>
        <p className="text-muted-foreground text-sm mt-1">{users?.length ?? 0} tài khoản trong hệ thống</p>
      </div>
      <AdminUsersTable users={users ?? []} currentUserId={user.id} />
    </div>
  )
}
