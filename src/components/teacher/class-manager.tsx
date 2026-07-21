'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Users, Trash2, UserPlus, Hash, Loader2 } from 'lucide-react'
import type { Class } from '@/types/database'

interface ClassWithStudents extends Class {
  join_code: string
  student_count: number
}

interface ClassManagerProps {
  userId: string
}

export function ClassManager({ userId }: ClassManagerProps) {
  const [classes, setClasses] = useState<ClassWithStudents[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState<string | null>(null)
  const [className, setClassName] = useState('')
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [studentEmail, setStudentEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase
      .from('classes')
      .select('*, class_students(count)')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })

    setClasses((data || []).map(c => ({
      ...c,
      student_count: c.class_students?.[0]?.count || 0,
    })))
    setLoading(false)
  }

  useEffect(() => { loadClasses() }, [userId])

  async function handleCreateClass() {
    if (!className.trim()) { toast.error('Vui lòng nhập tên lớp'); return }
    setSaving(true)
    const { error } = await supabase.from('classes').insert({
      teacher_id: userId,
      name: className.trim(),
      school_year: schoolYear,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Đã tạo lớp học')
      setClassName('')
      setCreateOpen(false)
      loadClasses()
    }
    setSaving(false)
  }

  async function handleAddStudent(classId: string) {
    if (!studentEmail.trim()) { toast.error('Vui lòng nhập email học sinh'); return }
    setSaving(true)
    try {
        // Dùng API route (service role) để tìm user theo email
      const res = await fetch('/api/find-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: studentEmail.trim(), classId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`Đã thêm ${studentEmail} vào lớp`)
      setStudentEmail('')
      setAddStudentOpen(null)
      loadClasses()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không tìm thấy học sinh')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteClass(id: string) {
    if (!confirm('Xóa lớp này? Tất cả dữ liệu liên quan sẽ bị mất.')) return
    const { error } = await supabase.from('classes').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Đã xóa lớp'); loadClasses() }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý lớp học</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700 text-white" />}>
            <Plus className="w-4 h-4 mr-2" /> Tạo lớp mới
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo lớp học mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Tên lớp</Label>
                <Input placeholder="VD: 12A1 - Tin học" value={className} onChange={e => setClassName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Năm học</Label>
                <Input placeholder="2025-2026" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} />
              </div>
              <Button onClick={handleCreateClass} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Tạo lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Chưa có lớp học nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {classes.map(cls => (
            <Card key={cls.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>{cls.school_year}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {cls.student_count} học sinh
                      </span>
                      <span className="flex items-center gap-1 text-blue-600 font-mono font-medium">
                        <Hash className="w-3.5 h-3.5" /> {cls.join_code}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={addStudentOpen === cls.id} onOpenChange={o => setAddStudentOpen(o ? cls.id : null)}>
                      <DialogTrigger render={<Button size="sm" variant="outline" />}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm học sinh
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Thêm học sinh vào {cls.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 pt-2">
                          <p className="text-sm text-gray-500">
                            Hoặc chia sẻ mã lớp <strong className="font-mono text-blue-600">{cls.join_code}</strong> để học sinh tự tham gia.
                          </p>
                          <div className="space-y-1.5">
                            <Label>Email học sinh</Label>
                            <Input
                              type="email"
                              placeholder="hocsinh@example.com"
                              value={studentEmail}
                              onChange={e => setStudentEmail(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddStudent(cls.id)}
                            />
                          </div>
                          <Button onClick={() => handleAddStudent(cls.id)} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Thêm vào lớp
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteClass(cls.id)}
                      className="w-8 h-8 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
