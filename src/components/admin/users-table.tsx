'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Search, Users, UserPlus, Trash2, KeyRound, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

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

export function AdminUsersTable({
  users: initialUsers,
  currentUserId,
}: {
  users: AdminUser[]
  currentUserId: string
}) {
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [saving, setSaving] = useState<string | null>(null)

  // Add user dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '', role: 'student' as UserRole })
  const [addLoading, setAddLoading] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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

  async function handleAddUser() {
    if (!addForm.full_name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    setAddLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }

      const newUser: AdminUser = {
        id: data.user.id,
        email: addForm.email,
        full_name: addForm.full_name,
        role: addForm.role,
        created_at: new Date().toISOString(),
      }
      setUsers(prev => [newUser, ...prev])
      setAddForm({ full_name: '', email: '', password: '', role: 'student' })
      setAddOpen(false)
      toast.success('Đã tạo tài khoản thành công')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Đã xóa tài khoản')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || !newPassword) return
    if (newPassword.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return }
    setResetLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setResetTarget(null)
      setNewPassword('')
      toast.success('Đã đặt lại mật khẩu')
    } finally {
      setResetLoading(false)
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap items-center">
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
        <Button onClick={() => setAddOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4" /> Thêm người dùng
        </Button>
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
                  <th className="w-12"></th>
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
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {format(new Date(u.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
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
                    <td className="px-2 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => { setResetTarget(u); setNewPassword('') }}
                            className="gap-2"
                          >
                            <KeyRound className="w-4 h-4" /> Đặt lại mật khẩu
                          </DropdownMenuItem>
                          {u.id !== currentUserId && (
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(u)}
                              className="gap-2 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" /> Xóa tài khoản
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
            <DialogDescription>Tạo tài khoản mới cho học sinh hoặc giáo viên</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Họ và tên *</Label>
              <Input
                placeholder="Nguyễn Văn A"
                value={addForm.full_name}
                onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Mật khẩu *</Label>
              <Input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Vai trò</Label>
              <Select value={addForm.role} onValueChange={v => v && setAddForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Học sinh</SelectItem>
                  <SelectItem value="teacher">Giáo viên</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button onClick={handleAddUser} disabled={addLoading} className="bg-blue-600 hover:bg-blue-700">
              {addLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa tài khoản</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa tài khoản của <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Đang xóa...' : 'Xóa tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={open => !open && setResetTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Đặt lại mật khẩu</DialogTitle>
            <DialogDescription>
              Đặt mật khẩu mới cho <strong>{resetTarget?.full_name || resetTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Mật khẩu mới</Label>
            <Input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="mt-1"
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Hủy</Button>
            <Button onClick={handleResetPassword} disabled={resetLoading} className="bg-blue-600 hover:bg-blue-700">
              {resetLoading ? 'Đang lưu...' : 'Đặt mật khẩu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
