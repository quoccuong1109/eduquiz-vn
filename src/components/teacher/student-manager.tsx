'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Upload, Pencil, Trash2, Loader2, Users, Search,
  Download, CheckCircle2, AlertCircle, Key, Eye, EyeOff,
} from 'lucide-react'

interface Student {
  id: string
  full_name: string
  email: string | null
  school: string | null
  created_at: string
}

interface StudentManagerProps {
  teacherId: string
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const guide = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE TẠO TÀI KHOẢN HỌC SINH — EDUQUIZ VN'],
    ['Điền thông tin vào sheet «Học sinh», mỗi dòng = 1 học sinh'],
    [],
    ['Cột', 'Tên trường', 'Bắt buộc?', 'Ghi chú'],
    ['A', 'full_name', 'Có', 'Họ và tên đầy đủ'],
    ['B', 'email', 'Có', 'Email đăng nhập (duy nhất trong hệ thống)'],
    ['C', 'password', 'Có', 'Mật khẩu ban đầu — tối thiểu 6 ký tự'],
    ['D', 'school', 'Không', 'Trường học (có thể để trống)'],
    [],
    ['Sau khi điền → Giảng dạy → Học sinh → Nhập từ file Excel'],
  ])
  guide['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn')

  const ws = XLSX.utils.aoa_to_sheet([
    ['full_name', 'email', 'password', 'school'],
    ['Nguyễn Văn An', 'nguyenvanan@example.com', 'matkhau123', 'THPT Chi Lăng'],
    ['Trần Thị Bình', 'tranthib@example.com', 'matkhau123', 'THPT Chi Lăng'],
  ])
  ws['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 16 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Học sinh')

  XLSX.writeFile(wb, 'template_taikhoan_hocsinh.xlsx')
}

export function StudentManager({ teacherId }: StudentManagerProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', school: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit dialog
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', school: '', password: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Import
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; errors: { row: number; msg: string }[] } | null>(null)

  async function loadStudents() {
    setLoading(true)
    const res = await fetch('/api/teacher/students')
    if (res.ok) setStudents(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadStudents() }, [teacherId])

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate() {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Vui lòng điền đầy đủ họ tên, email và mật khẩu')
      return
    }
    if (form.password.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Đã tạo tài khoản cho ${form.full_name}`)
      setCreateOpen(false)
      setForm({ full_name: '', email: '', password: '', school: '' })
      loadStudents()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(s: Student) {
    setEditStudent(s)
    setEditForm({ full_name: s.full_name, school: s.school ?? '', password: '' })
  }

  async function handleEdit() {
    if (!editStudent) return
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Mật khẩu mới tối thiểu 6 ký tự'); return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`/api/teacher/students/${editStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Đã cập nhật thông tin')
      setEditStudent(null)
      loadStudents()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(s: Student) {
    if (!confirm(`Xóa tài khoản của ${s.full_name}? Hành động này không thể hoàn tác.`)) return
    const res = await fetch(`/api/teacher/students/${s.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(`Đã xóa tài khoản ${s.full_name}`)
      setStudents(prev => prev.filter(x => x.id !== s.id))
    } else {
      const d = await res.json()
      toast.error(d.error)
    }
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    const fd = new FormData()
    fd.append('file', importFile)
    try {
      const res = await fetch('/api/teacher/students/import', { method: 'POST', body: fd })
      const data = await res.json()
      setImportResult(data)
      if (data.created > 0) {
        toast.success(`Đã tạo ${data.created} tài khoản`)
        loadStudents()
      }
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setImporting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-4">

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản học sinh</DialogTitle>
            <DialogDescription>Học sinh sẽ dùng email và mật khẩu này để đăng nhập.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Họ và tên <span className="text-red-500">*</span></Label>
              <Input placeholder="Nguyễn Văn An" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="hocsinh@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mật khẩu <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Trường <span className="text-gray-400">(tuỳ chọn)</span></Label>
              <Input placeholder="THPT Chi Lăng" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editStudent} onOpenChange={o => !o && setEditStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa thông tin — {editStudent?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Họ và tên</Label>
              <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Trường</Label>
              <Input placeholder="(tuỳ chọn)" value={editForm.school} onChange={e => setEditForm(f => ({ ...f, school: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Đặt lại mật khẩu <span className="text-gray-400">(để trống = giữ nguyên)</span></Label>
              <Input type="password" placeholder="Mật khẩu mới..." value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Huỷ</Button>
            <Button onClick={handleEdit} disabled={editSaving} className="bg-blue-600 hover:bg-blue-700">
              {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import dialog ── */}
      <Dialog open={importOpen} onOpenChange={o => { setImportOpen(o); if (!o) { setImportFile(null); setImportResult(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập học sinh từ Excel</DialogTitle>
            <DialogDescription>Upload file .xlsx theo mẫu để tạo nhiều tài khoản cùng lúc.</DialogDescription>
          </DialogHeader>
          {!importResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Bước 1 — Tải file mẫu</p>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Tải template (.xlsx)
                </Button>
              </div>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${importFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
                <Upload className="w-7 h-7 text-gray-400 mb-2" />
                {importFile ? (
                  <p className="text-sm font-medium text-blue-700">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Bước 2 — Chọn file đã điền</p>
                    <p className="text-xs text-gray-400 mt-0.5">.xlsx · .xls · .csv</p>
                  </>
                )}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-xl bg-green-50 border border-green-200 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                  <div className="text-xs text-green-600 mt-0.5">tài khoản đã tạo</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <div className="text-2xl font-bold text-orange-500">{importResult.errors.length}</div>
                  <div className="text-xs text-orange-500 mt-0.5">lỗi</div>
                </div>
              </div>
              {importResult.created > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">Tạo tài khoản thành công!</p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="max-h-44 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-orange-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Các dòng lỗi:
                  </p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-gray-600 bg-orange-50 rounded px-2 py-1">Dòng {e.row}: {e.msg}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Đóng</Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={!importFile || importing} className="bg-green-600 hover:bg-green-700">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang tạo...</> : <><Upload className="w-4 h-4 mr-2" />Nhập file</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Toolbar ── */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm học sinh..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-4 h-4" /> Tạo tài khoản
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Nhập từ Excel
        </Button>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {students.length === 0 ? 'Chưa có học sinh nào. Tạo tài khoản hoặc nhập từ Excel.' : 'Không tìm thấy học sinh.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Học sinh</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Trường</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28 hidden lg:table-cell">Ngày tạo</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.full_name}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{s.email}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.email}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {s.school ? <Badge variant="outline" className="text-xs">{s.school}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {new Date(s.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            {filtered.length} / {students.length} học sinh
          </div>
        </Card>
      )}
    </div>
  )
}
