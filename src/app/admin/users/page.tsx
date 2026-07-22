import { createClient } from '@/lib/supabase/server'
import { AdminUsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Người dùng</h1>
        <p className="text-muted-foreground text-sm mt-1">{users?.length ?? 0} tài khoản trong hệ thống</p>
      </div>
      <AdminUsersTable users={users ?? []} />
    </div>
  )
}
