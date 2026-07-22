'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Users } from 'lucide-react'

type UserRole = 'admin' | 'teacher' | 'student'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  teacher: 'Giáo viên',
  student: 'Học sinh',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-gray-100 text-gray-600',
}

export function AdminUsersTable({ users: initialUsers }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setSaving(userId)
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      toast.error(error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Đã cập nhật quyền')
    }
    setSaving(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm tên hoặc email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={v => v && setFilterRole(v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Vai trò" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Giáo viên</SelectItem>
            <SelectItem value="student">Học sinh</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border">
          <CardContent className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Không tìm thấy người dùng</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Người dùng</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Vai trò</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36 hidden md:table-cell">Ngày tạo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-44">Đổi quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.full_name || '(Chưa đặt tên)'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Select
                        value={u.role}
                        onValueChange={(v) => v && handleRoleChange(u.id, v as UserRole)}
                      >
                        <SelectTrigger className="h-7 text-xs w-36 ml-auto" disabled={saving === u.id}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Học sinh</SelectItem>
                          <SelectItem value="teacher">Giáo viên</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
