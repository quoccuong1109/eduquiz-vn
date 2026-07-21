'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, BookOpen } from 'lucide-react'
import type { Question, Difficulty, AnswerOption } from '@/types/database'

const SUBJECTS = [
  { value: 'tin_hoc', label: 'Tin học' },
  { value: 'toan', label: 'Toán' },
  { value: 'vat_ly', label: 'Vật lý' },
  { value: 'hoa_hoc', label: 'Hóa học' },
  { value: 'sinh_hoc', label: 'Sinh học' },
  { value: 'lich_su', label: 'Lịch sử' },
  { value: 'dia_ly', label: 'Địa lý' },
  { value: 'ngu_van', label: 'Ngữ văn' },
  { value: 'tieng_anh', label: 'Tiếng Anh' },
  { value: 'gdcd', label: 'GDCD' },
]

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

interface QuestionFormData {
  subject: string
  grade: number
  difficulty: Difficulty
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerOption
  explanation: string
  is_public: boolean
  tags: string
}

const defaultForm: QuestionFormData = {
  subject: 'tin_hoc',
  grade: 12,
  difficulty: 'medium',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  explanation: '',
  is_public: false,
  tags: '',
}

interface QuestionManagerProps {
  userId: string
}

export function QuestionManager({ userId }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuestionFormData>(defaultForm)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')

  const supabase = createClient()

  async function loadQuestions() {
    setLoading(true)
    let query = supabase.from('questions').select('*').eq('created_by', userId).order('created_at', { ascending: false })
    if (filterSubject !== 'all') query = query.eq('subject', filterSubject)
    if (filterDifficulty !== 'all') query = query.eq('difficulty', filterDifficulty)
    const { data } = await query
    setQuestions(data || [])
    setLoading(false)
  }

  useEffect(() => { loadQuestions() }, [filterSubject, filterDifficulty])

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setOpen(true)
  }

  function openEdit(q: Question) {
    setEditingId(q.id)
    setForm({
      subject: q.subject,
      grade: q.grade,
      difficulty: q.difficulty,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      is_public: q.is_public,
      tags: q.tags.join(', '),
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.question_text || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      toast.error('Vui lòng điền đầy đủ câu hỏi và 4 đáp án')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: userId,
      }
      const { tags: _, ...rest } = payload

      if (editingId) {
        const { error } = await supabase.from('questions').update({ ...rest, tags: payload.tags }).eq('id', editingId)
        if (error) throw error
        toast.success('Đã cập nhật câu hỏi')
      } else {
        const { error } = await supabase.from('questions').insert({ ...rest, tags: payload.tags })
        if (error) throw error
        toast.success('Đã thêm câu hỏi')
      }
      setOpen(false)
      loadQuestions()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa câu hỏi này?')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Đã xóa câu hỏi'); loadQuestions() }
  }

  const filtered = questions.filter(q =>
    q.question_text.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ngân hàng câu hỏi</h1>
          <p className="text-gray-500 text-sm mt-1">{questions.length} câu hỏi</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white" />}
          >
            <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Subject, Grade, Difficulty */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Môn học</Label>
                  <Select value={form.subject} onValueChange={(v) => v && setForm(f => ({ ...f, subject: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lớp</Label>
                  <Select value={String(form.grade)} onValueChange={v => setForm(f => ({ ...f, grade: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 11, 12].map(g => <SelectItem key={g} value={String(g)}>Lớp {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Độ khó</Label>
                  <Select value={form.difficulty} onValueChange={(v) => v && setForm(f => ({ ...f, difficulty: v as Difficulty }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Dễ</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="hard">Khó</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question text */}
              <div className="space-y-1.5">
                <Label>Nội dung câu hỏi <span className="text-red-500">*</span></Label>
                <Textarea
                  placeholder="Nhập câu hỏi..."
                  value={form.question_text}
                  onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Options */}
              {(['A', 'B', 'C', 'D'] as AnswerOption[]).map(opt => (
                <div key={opt} className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, correct_answer: opt }))}
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-colors mt-0.5 ${
                      form.correct_answer === opt
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt}
                  </button>
                  <div className="flex-1 space-y-1">
                    <Input
                      placeholder={`Đáp án ${opt}`}
                      value={form[`option_${opt.toLowerCase()}` as keyof QuestionFormData] as string}
                      onChange={e => setForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                    />
                  </div>
                  {form.correct_answer === opt && (
                    <span className="text-xs text-green-600 font-medium mt-2">✓ Đúng</span>
                  )}
                </div>
              ))}

              <p className="text-xs text-gray-400">👆 Click vào ô chữ cái để chọn đáp án đúng</p>

              {/* Explanation */}
              <div className="space-y-1.5">
                <Label>Giải thích đáp án <span className="text-gray-400">(tuỳ chọn)</span></Label>
                <Textarea
                  placeholder="Giải thích tại sao đáp án này đúng..."
                  value={form.explanation}
                  onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <Label>Tags <span className="text-gray-400">(phân cách bằng dấu phẩy)</span></Label>
                <Input
                  placeholder="VD: excel, hàm, vlookup"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                />
              </div>

              {/* Public toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                  className={`w-11 h-6 rounded-full transition-colors ${form.is_public ? 'bg-blue-600' : 'bg-gray-200'} relative`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${form.is_public ? 'left-6' : 'left-1'}`} />
                </button>
                <Label className="cursor-pointer" onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}>
                  Chia sẻ vào ngân hàng công cộng
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 flex-1">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Cập nhật' : 'Thêm câu hỏi'}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Tìm kiếm câu hỏi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSubject} onValueChange={(v) => v && setFilterSubject(v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Môn học" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn</SelectItem>
            {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={(v) => v && setFilterDifficulty(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Độ khó" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="easy">Dễ</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="hard">Khó</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Không có câu hỏi nào</p>
            <Button onClick={openCreate} className="mt-3" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => (
            <Card key={q.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-gray-400 font-mono mt-0.5 w-6 flex-shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium line-clamp-2">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>
                        {DIFFICULTY_LABELS[q.difficulty]}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {SUBJECTS.find(s => s.value === q.subject)?.label} · Lớp {q.grade}
                      </span>
                      <span className="text-xs font-medium text-green-700">✓ {q.correct_answer}</span>
                      {q.is_public && <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Public</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(q)}
                      className="w-8 h-8 text-gray-400 hover:text-blue-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)}
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
