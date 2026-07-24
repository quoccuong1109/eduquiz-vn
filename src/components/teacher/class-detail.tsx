'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Users, BookOpen, Trophy, Plus, Trash2, Loader2, ArrowLeft,
  Hash, Calendar, Clock, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface ClassInfo {
  id: string
  name: string
  school_year: string
  join_code: string
}

interface StudentInClass {
  student_id: string
  joined_at: string
  users: { full_name: string; email: string | null }
}

interface ExamOption {
  id: string
  title: string
  subject: string
}

interface Assignment {
  id: string
  title: string
  instructions: string | null
  due_date: string | null
  created_at: string
  exams: { title: string; subject: string }
}

interface Contest {
  id: string
  title: string
  start_time: string
  end_time: string
  created_at: string
  exams: { title: string; subject: string }
}

type Tab = 'students' | 'assignments' | 'contests'

const SUBJECT_LABELS: Record<string, string> = {
  tin_hoc: 'Tin học', toan: 'Toán', vat_ly: 'Vật lý', hoa_hoc: 'Hóa học',
  sinh_hoc: 'Sinh học', tieng_anh: 'Tiếng Anh', ngu_van: 'Ngữ văn',
}

export function ClassDetail({ classInfo, userId }: { classInfo: ClassInfo; userId: string }) {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('students')

  const [students, setStudents] = useState<StudentInClass[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [exams, setExams] = useState<ExamOption[]>([])
  const [loading, setLoading] = useState(false)

  // Add student by email
  const [addEmail, setAddEmail] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)

  // Assignment dialog
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({ exam_id: '', title: '', instructions: '', due_date: '' })
  const [assignSaving, setAssignSaving] = useState(false)

  // Contest dialog
  const [contestOpen, setContestOpen] = useState(false)
  const [contestForm, setContestForm] = useState({ exam_id: '', title: '', start_time: '', end_time: '' })
  const [contestSaving, setContestSaving] = useState(false)

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true)
    if (t === 'students') {
      const { data } = await supabase
        .from('class_students')
        .select('student_id, joined_at, users(full_name, email)')
        .eq('class_id', classInfo.id)
        .order('joined_at')
      setStudents((data as unknown as StudentInClass[]) ?? [])
    } else if (t === 'assignments') {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, instructions, due_date, created_at, exams(title, subject)')
        .eq('class_id', classInfo.id)
        .order('created_at', { ascending: false })
      setAssignments((data as unknown as Assignment[]) ?? [])
    } else {
      const { data } = await supabase
        .from('contests')
        .select('id, title, start_time, end_time, created_at, exams(title, subject)')
        .eq('class_id', classInfo.id)
        .order('start_time', { ascending: false })
      setContests((data as unknown as Contest[]) ?? [])
    }
    setLoading(false)
  }, [classInfo.id, supabase])

  useEffect(() => { loadTab(tab) }, [tab, loadTab])

  async function loadExams() {
    const { data } = await supabase
      .from('exams')
      .select('id, title, subject')
      .eq('created_by', userId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    setExams(data ?? [])
  }

  // Add student by email via existing /api/find-user
  async function handleAddStudent() {
    if (!addEmail.trim()) return
    setAddingStudent(true)
    try {
      const res = await fetch('/api/find-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: addEmail.trim(), classId: classInfo.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`Đã thêm học sinh vào lớp`)
      setAddEmail('')
      loadTab('students')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Không tìm thấy học sinh')
    } finally {
      setAddingStudent(false)
    }
  }

  async function handleRemoveStudent(studentId: string, name: string) {
    if (!confirm(`Xóa ${name} khỏi lớp?`)) return
    const { error } = await supabase
      .from('class_students')
      .delete()
      .eq('class_id', classInfo.id)
      .eq('student_id', studentId)
    if (error) toast.error(error.message)
    else { toast.success(`Đã xóa ${name} khỏi lớp`); loadTab('students') }
  }

  async function handleCreateAssignment() {
    if (!assignForm.exam_id || !assignForm.title.trim()) {
      toast.error('Vui lòng chọn đề thi và nhập tiêu đề'); return
    }
    setAssignSaving(true)
    const { error } = await supabase.from('assignments').insert({
      class_id: classInfo.id,
      exam_id: assignForm.exam_id,
      title: assignForm.title.trim(),
      instructions: assignForm.instructions.trim() || null,
      due_date: assignForm.due_date || null,
      created_by: userId,
    })
    if (error) { toast.error(error.message) }
    else {
      toast.success('Đã giao bài tập')
      setAssignOpen(false)
      setAssignForm({ exam_id: '', title: '', instructions: '', due_date: '' })
      loadTab('assignments')
    }
    setAssignSaving(false)
  }

  async function handleDeleteAssignment(id: string) {
    if (!confirm('Xóa bài tập này?')) return
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Đã xóa bài tập'); loadTab('assignments') }
  }

  async function handleCreateContest() {
    if (!contestForm.exam_id || !contestForm.title.trim() || !contestForm.start_time || !contestForm.end_time) {
      toast.error('Vui lòng điền đầy đủ thông tin'); return
    }
    if (new Date(contestForm.end_time) <= new Date(contestForm.start_time)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu'); return
    }
    setContestSaving(true)
    const { error } = await supabase.from('contests').insert({
      class_id: classInfo.id,
      exam_id: contestForm.exam_id,
      title: contestForm.title.trim(),
      start_time: contestForm.start_time,
      end_time: contestForm.end_time,
      created_by: userId,
    })
    if (error) { toast.error(error.message) }
    else {
      toast.success('Đã tạo cuộc thi')
      setContestOpen(false)
      setContestForm({ exam_id: '', title: '', start_time: '', end_time: '' })
      loadTab('contests')
    }
    setContestSaving(false)
  }

  async function handleDeleteContest(id: string) {
    if (!confirm('Xóa cuộc thi này? Tất cả kết quả sẽ bị xóa.')) return
    const { error } = await supabase.from('contests').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Đã xóa cuộc thi'); loadTab('contests') }
  }

  function contestStatus(c: Contest) {
    const now = new Date()
    if (now < new Date(c.start_time)) return { label: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-700' }
    if (now <= new Date(c.end_time)) return { label: 'Đang diễn ra', color: 'bg-green-100 text-green-700' }
    return { label: 'Đã kết thúc', color: 'bg-gray-100 text-gray-600' }
  }

  const TAB_ITEMS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'students', label: 'Học sinh', icon: <Users className="w-4 h-4" />, count: students.length },
    { key: 'assignments', label: 'Bài tập', icon: <BookOpen className="w-4 h-4" />, count: assignments.length },
    { key: 'contests', label: 'Cuộc thi', icon: <Trophy className="w-4 h-4" />, count: contests.length },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/teacher/classes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách lớp
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{classInfo.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{classInfo.school_year}</span>
              <span className="flex items-center gap-1 font-mono text-blue-600 font-medium">
                <Hash className="w-3.5 h-3.5" /> {classInfo.join_code}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TAB_ITEMS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
            {tab === t.key && t.count !== undefined && (
              <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs font-semibold">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Students tab ── */}
      {tab === 'students' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nhập email học sinh để thêm..."
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
              className="flex-1"
            />
            <Button onClick={handleAddStudent} disabled={addingStudent || !addEmail.trim()} className="bg-blue-600 hover:bg-blue-700">
              {addingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Hoặc chia sẻ mã lớp <strong className="font-mono text-blue-600">{classInfo.join_code}</strong> cho học sinh tự tham gia.
          </p>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : students.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Chưa có học sinh nào trong lớp</p></CardContent></Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Học sinh</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Ngày tham gia</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, idx) => (
                    <tr key={s.student_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{s.users?.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.users?.email}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {format(new Date(s.joined_at), 'dd/MM/yyyy', { locale: vi })}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => handleRemoveStudent(s.student_id, s.users?.full_name)}
                          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t px-4 py-2 text-xs text-muted-foreground">{students.length} học sinh</div>
            </Card>
          )}
        </div>
      )}

      {/* ── Assignments tab ── */}
      {tab === 'assignments' && (
        <div className="space-y-3">
          {/* Assignment Dialog */}
          <Dialog open={assignOpen} onOpenChange={o => { setAssignOpen(o); if (o) loadExams() }}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Giao bài tập</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Đề thi <span className="text-red-500">*</span></Label>
                  <Select value={assignForm.exam_id} onValueChange={v => setAssignForm(f => ({ ...f, exam_id: v ?? '' }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn đề thi đã xuất bản..." /></SelectTrigger>
                    <SelectContent>
                      {exams.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Chưa có đề thi nào. Xuất bản đề trước.</div>
                      ) : exams.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title} ({SUBJECT_LABELS[e.subject] ?? e.subject})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tiêu đề bài tập <span className="text-red-500">*</span></Label>
                  <Input placeholder="VD: BTVN tuần 3 — HTML cơ bản" value={assignForm.title} onChange={e => setAssignForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hướng dẫn <span className="text-muted-foreground">(tuỳ chọn)</span></Label>
                  <Textarea placeholder="Ghi chú cho học sinh..." rows={2} value={assignForm.instructions} onChange={e => setAssignForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hạn nộp <span className="text-muted-foreground">(tuỳ chọn)</span></Label>
                  <Input type="datetime-local" value={assignForm.due_date} onChange={e => setAssignForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Huỷ</Button>
                <Button onClick={handleCreateAssignment} disabled={assignSaving} className="bg-blue-600 hover:bg-blue-700">
                  {assignSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Giao bài
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setAssignOpen(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="w-4 h-4" /> Giao bài tập mới
          </Button>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : assignments.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground"><BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Chưa có bài tập nào</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => (
                <Card key={a.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{a.title}</span>
                        <Badge variant="outline" className="text-xs">{SUBJECT_LABELS[a.exams?.subject] ?? a.exams?.subject}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{a.exams?.title}</p>
                      {a.instructions && <p className="text-xs text-muted-foreground mt-1">{a.instructions}</p>}
                      {a.due_date && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Hạn nộp: {format(new Date(a.due_date), 'HH:mm dd/MM/yyyy', { locale: vi })}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Contests tab ── */}
      {tab === 'contests' && (
        <div className="space-y-3">
          {/* Contest Dialog */}
          <Dialog open={contestOpen} onOpenChange={o => { setContestOpen(o); if (o) loadExams() }}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Tạo cuộc thi</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label>Đề thi <span className="text-red-500">*</span></Label>
                  <Select value={contestForm.exam_id} onValueChange={v => setContestForm(f => ({ ...f, exam_id: v ?? '' }))}>
                    <SelectTrigger><SelectValue placeholder="Chọn đề thi đã xuất bản..." /></SelectTrigger>
                    <SelectContent>
                      {exams.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Chưa có đề thi nào được xuất bản.</div>
                      ) : exams.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tên cuộc thi <span className="text-red-500">*</span></Label>
                  <Input placeholder="VD: Kiểm tra 15 phút — Bài HTML" value={contestForm.title} onChange={e => setContestForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Bắt đầu <span className="text-red-500">*</span></Label>
                    <Input type="datetime-local" value={contestForm.start_time} onChange={e => setContestForm(f => ({ ...f, start_time: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kết thúc <span className="text-red-500">*</span></Label>
                    <Input type="datetime-local" value={contestForm.end_time} onChange={e => setContestForm(f => ({ ...f, end_time: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setContestOpen(false)}>Huỷ</Button>
                <Button onClick={handleCreateContest} disabled={contestSaving} className="bg-purple-600 hover:bg-purple-700">
                  {contestSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Tạo cuộc thi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setContestOpen(true)} className="bg-purple-600 hover:bg-purple-700 gap-2">
            <Plus className="w-4 h-4" /> Tạo cuộc thi mới
          </Button>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : contests.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground"><Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>Chưa có cuộc thi nào</p></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {contests.map(c => {
                const status = contestStatus(c)
                return (
                  <Card key={c.id} className="overflow-hidden">
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{c.title}</span>
                          <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{c.exams?.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(c.start_time), 'HH:mm dd/MM', { locale: vi })}
                          </span>
                          <ChevronRight className="w-3 h-3" />
                          <span>{format(new Date(c.end_time), 'HH:mm dd/MM/yyyy', { locale: vi })}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Link
                          href={`/teacher/contest/${c.id}`}
                          className="text-xs text-blue-600 hover:underline px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Xem kết quả
                        </Link>
                        <button
                          onClick={() => handleDeleteContest(c.id)}
                          className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
