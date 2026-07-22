'use client'

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Search, Loader2, BookOpen,
  Upload, Download, AlertCircle, CheckCircle2,
  X, ChevronDown,
} from 'lucide-react'
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

interface ParsedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerOption
  subject: string
  grade: number
  difficulty: Difficulty
  explanation: string
  tags: string[]
  _row: number
  _errors: string[]
}

const VALID_ANSWERS = ['A', 'B', 'C', 'D']
const VALID_DIFFICULTIES: Record<string, Difficulty> = {
  'easy': 'easy', 'dễ': 'easy', 'de': 'easy',
  'medium': 'medium', 'trung bình': 'medium', 'trung binh': 'medium', 'tb': 'medium',
  'hard': 'hard', 'khó': 'hard', 'kho': 'hard',
}
const VALID_SUBJECTS: Record<string, string> = {
  'tin_hoc': 'tin_hoc', 'tin học': 'tin_hoc', 'tin hoc': 'tin_hoc', 'tin': 'tin_hoc',
  'toan': 'toan', 'toán': 'toan',
  'vat_ly': 'vat_ly', 'vật lý': 'vat_ly', 'vat ly': 'vat_ly', 'lý': 'vat_ly',
  'hoa_hoc': 'hoa_hoc', 'hóa học': 'hoa_hoc', 'hoa hoc': 'hoa_hoc', 'hóa': 'hoa_hoc',
  'sinh_hoc': 'sinh_hoc', 'sinh học': 'sinh_hoc', 'sinh hoc': 'sinh_hoc', 'sinh': 'sinh_hoc',
  'lich_su': 'lich_su', 'lịch sử': 'lich_su', 'lich su': 'lich_su', 'sử': 'lich_su',
  'dia_ly': 'dia_ly', 'địa lý': 'dia_ly', 'dia ly': 'dia_ly', 'địa': 'dia_ly',
  'ngu_van': 'ngu_van', 'ngữ văn': 'ngu_van', 'ngu van': 'ngu_van', 'văn': 'ngu_van',
  'tieng_anh': 'tieng_anh', 'tiếng anh': 'tieng_anh', 'tieng anh': 'tieng_anh', 'anh': 'tieng_anh',
  'gdcd': 'gdcd',
}

function parseRow(raw: Record<string, unknown>, rowNum: number): ParsedQuestion {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const found = Object.entries(raw).find(([key]) => key.trim().toLowerCase() === k.toLowerCase())
      if (found && found[1] != null && String(found[1]).trim() !== '') return String(found[1]).trim()
    }
    return ''
  }

  const errors: string[] = []
  const question_text = get('câu hỏi', 'cau hoi', 'question_text', 'question', 'nội dung')
  const option_a = get('đáp án a', 'dap an a', 'option_a', 'a')
  const option_b = get('đáp án b', 'dap an b', 'option_b', 'b')
  const option_c = get('đáp án c', 'dap an c', 'option_c', 'c')
  const option_d = get('đáp án d', 'dap an d', 'option_d', 'd')
  const answerRaw = get('đáp án đúng', 'dap an dung', 'correct_answer', 'đúng', 'answer').toUpperCase()
  const subjectRaw = get('môn học', 'mon hoc', 'subject', 'môn').toLowerCase()
  const gradeRaw = get('lớp', 'lop', 'grade', 'khối')
  const diffRaw = get('độ khó', 'do kho', 'difficulty', 'khó').toLowerCase()
  const explanation = get('giải thích', 'giai thich', 'explanation')
  const tagsRaw = get('tags', 'từ khóa', 'tu khoa')

  if (!question_text) errors.push('Thiếu câu hỏi')
  if (!option_a) errors.push('Thiếu đáp án A')
  if (!option_b) errors.push('Thiếu đáp án B')
  if (!option_c) errors.push('Thiếu đáp án C')
  if (!option_d) errors.push('Thiếu đáp án D')
  if (!VALID_ANSWERS.includes(answerRaw)) errors.push(`Đáp án đúng phải là A/B/C/D (nhận được: "${answerRaw}")`)

  const subject = VALID_SUBJECTS[subjectRaw] || ''
  if (!subject) errors.push(`Môn học không hợp lệ: "${subjectRaw}"`)

  const grade = parseInt(gradeRaw)
  if (isNaN(grade) || grade < 1 || grade > 12) errors.push(`Lớp không hợp lệ: "${gradeRaw}"`)

  const difficulty = VALID_DIFFICULTIES[diffRaw] || null
  if (!difficulty) errors.push(`Độ khó phải là easy/medium/hard hoặc dễ/trung bình/khó`)

  return {
    question_text,
    option_a, option_b, option_c, option_d,
    correct_answer: answerRaw as AnswerOption,
    subject: subject || 'tin_hoc',
    grade: isNaN(grade) ? 12 : grade,
    difficulty: difficulty || 'medium',
    explanation,
    tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
    _row: rowNum,
    _errors: errors,
  }
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Môn học', 'Lớp', 'Độ khó', 'Giải thích', 'Tags'],
    ['Hàm nào trong Excel dùng để tính tổng?', '=COUNT()', '=SUM()', '=AVERAGE()', '=MAX()', 'B', 'tin_hoc', '12', 'easy', 'Hàm SUM dùng để tính tổng các giá trị số.', 'excel, hàm, sum'],
    ['Phím tắt nào dùng để lưu file trong Windows?', 'Ctrl+C', 'Ctrl+V', 'Ctrl+S', 'Ctrl+Z', 'C', 'tin_hoc', '10', 'easy', 'Ctrl+S là phím tắt lưu file phổ biến.', ''],
  ])
  ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi')
  XLSX.writeFile(wb, 'mau_import_cau_hoi.xlsx')
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
  const [importOpen, setImportOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedQuestion[]>([])
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Multi-select state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)
  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false)

  const supabase = createClient()

  async function loadQuestions() {
    setLoading(true)
    let query = supabase.from('questions').select('*').eq('created_by', userId).order('created_at', { ascending: false })
    if (filterSubject !== 'all') query = query.eq('subject', filterSubject)
    if (filterDifficulty !== 'all') query = query.eq('difficulty', filterDifficulty)
    const { data } = await query
    setQuestions(data || [])
    setSelected(new Set())
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
      const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), created_by: userId }
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

  // --- Multi-select handlers ---
  const filtered = questions.filter(q => q.question_text.toLowerCase().includes(search.toLowerCase()))
  const allSelected = filtered.length > 0 && filtered.every(q => selected.has(q.id))
  const someSelected = filtered.some(q => selected.has(q.id)) && !allSelected

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(q => next.delete(q.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(q => next.add(q.id))
        return next
      })
    }
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    const ids = [...selected]
    if (!confirm(`Xóa ${ids.length} câu hỏi đã chọn?`)) return
    setBulkActing(true)
    const { error } = await supabase.from('questions').delete().in('id', ids)
    if (error) toast.error(error.message)
    else { toast.success(`Đã xóa ${ids.length} câu hỏi`); loadQuestions() }
    setBulkActing(false)
  }

  async function handleBulkDifficulty(difficulty: Difficulty) {
    const ids = [...selected]
    setBulkActing(true)
    setDifficultyMenuOpen(false)
    const { error } = await supabase.from('questions').update({ difficulty }).in('id', ids)
    if (error) toast.error(error.message)
    else { toast.success(`Đã đổi độ khó ${ids.length} câu hỏi thành "${DIFFICULTY_LABELS[difficulty]}"`); loadQuestions() }
    setBulkActing(false)
  }

  async function handleBulkVisibility(is_public: boolean) {
    const ids = [...selected]
    setBulkActing(true)
    const { error } = await supabase.from('questions').update({ is_public }).in('id', ids)
    if (error) toast.error(error.message)
    else { toast.success(`Đã đặt ${ids.length} câu hỏi thành ${is_public ? 'công khai' : 'riêng tư'}`); loadQuestions() }
    setBulkActing(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      setParsed(rows.map((row, i) => parseRow(row, i + 2)))
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    const valid = parsed.filter(p => p._errors.length === 0)
    if (valid.length === 0) { toast.error('Không có dòng hợp lệ để import'); return }
    setImporting(true)
    const payload = valid.map(p => ({
      created_by: userId,
      subject: p.subject, grade: p.grade, difficulty: p.difficulty,
      question_text: p.question_text, option_a: p.option_a, option_b: p.option_b,
      option_c: p.option_c, option_d: p.option_d, correct_answer: p.correct_answer,
      explanation: p.explanation || null, tags: p.tags, is_public: false,
    }))
    const { error } = await supabase.from('questions').insert(payload)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Đã import ${valid.length} câu hỏi thành công!`)
      setImportOpen(false)
      setParsed([])
      if (fileRef.current) fileRef.current.value = ''
      loadQuestions()
    }
    setImporting(false)
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ngân hàng câu hỏi</h1>
          <p className="text-gray-500 text-sm mt-1">{questions.length} câu hỏi</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) { setParsed([]); if (fileRef.current) fileRef.current.value = '' } }}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Upload className="w-4 h-4 mr-2" /> Import file
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import câu hỏi từ file Excel / CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="rounded-lg border border-dashed border-gray-200 p-4 bg-gray-50">
                  <p className="text-sm font-medium text-gray-700 mb-1">Bước 1: Tải file mẫu</p>
                  <p className="text-xs text-gray-500 mb-3">Điền câu hỏi theo đúng cột trong file mẫu, sau đó upload lên.</p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Tải file mẫu (.xlsx)
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Bước 2: Chọn file</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-200 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50 cursor-pointer"
                  />
                </div>
                {parsed.length > 0 && (() => {
                  const valid = parsed.filter(p => p._errors.length === 0)
                  const invalid = parsed.filter(p => p._errors.length > 0)
                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4" /> {valid.length} hợp lệ
                        </div>
                        {invalid.length > 0 && (
                          <div className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                            <AlertCircle className="w-4 h-4" /> {invalid.length} lỗi
                          </div>
                        )}
                      </div>
                      {valid.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Xem trước ({valid.length} câu)</p>
                          {valid.slice(0, 5).map((p) => (
                            <div key={p._row} className="text-xs bg-white border border-gray-100 rounded p-2">
                              <span className="text-gray-400 mr-1">#{p._row}</span>
                              <span className="text-gray-800 font-medium line-clamp-1">{p.question_text}</span>
                              <span className="ml-2 text-green-700">✓ {p.correct_answer}</span>
                            </div>
                          ))}
                          {valid.length > 5 && <p className="text-xs text-gray-400 pl-2">...và {valid.length - 5} câu nữa</p>}
                        </div>
                      )}
                      {invalid.length > 0 && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Dòng lỗi (sẽ bỏ qua)</p>
                          {invalid.map((p) => (
                            <div key={p._row} className="text-xs bg-red-50 border border-red-100 rounded p-2">
                              <span className="font-medium text-red-700">Dòng {p._row}:</span>
                              <span className="text-red-600 ml-1">{p._errors.join('; ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button onClick={handleImport} disabled={importing || valid.length === 0} className="w-full bg-blue-600 hover:bg-blue-700">
                        {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Import {valid.length} câu hỏi
                      </Button>
                    </div>
                  )
                })()}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white" />}>
              <Plus className="w-4 h-4 mr-2" /> Thêm câu hỏi
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
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
                <div className="space-y-1.5">
                  <Label>Nội dung câu hỏi <span className="text-red-500">*</span></Label>
                  <Textarea
                    placeholder="Nhập câu hỏi..."
                    value={form.question_text}
                    onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                    rows={3}
                  />
                </div>
                {(['A', 'B', 'C', 'D'] as AnswerOption[]).map(opt => (
                  <div key={opt} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, correct_answer: opt }))}
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold transition-colors mt-0.5 ${
                        form.correct_answer === opt ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                    {form.correct_answer === opt && <span className="text-xs text-green-600 font-medium mt-2">✓ Đúng</span>}
                  </div>
                ))}
                <p className="text-xs text-gray-400">👆 Click vào ô chữ cái để chọn đáp án đúng</p>
                <div className="space-y-1.5">
                  <Label>Giải thích đáp án <span className="text-gray-400">(tuỳ chọn)</span></Label>
                  <Textarea
                    placeholder="Giải thích tại sao đáp án này đúng..."
                    value={form.explanation}
                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tags <span className="text-gray-400">(phân cách bằng dấu phẩy)</span></Label>
                  <Input
                    placeholder="VD: excel, hàm, vlookup"
                    value={form.tags}
                    onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  />
                </div>
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

      {/* Bulk action toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 flex-wrap">
          <span className="text-sm font-medium text-blue-800">
            Đã chọn {selectedCount} câu hỏi
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Change difficulty */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkActing}
                onClick={() => setDifficultyMenuOpen(o => !o)}
                className="h-8 text-xs gap-1"
              >
                Đổi độ khó <ChevronDown className="w-3 h-3" />
              </Button>
              {difficultyMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 min-w-[130px]">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-50"
                      onClick={() => handleBulkDifficulty(d)}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Public / Private */}
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={() => handleBulkVisibility(true)}
              className="h-8 text-xs"
            >
              Đặt công khai
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={() => handleBulkVisibility(false)}
              className="h-8 text-xs"
            >
              Đặt riêng tư
            </Button>

            {/* Delete */}
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={handleBulkDelete}
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              {bulkActing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Xóa đã chọn
            </Button>

            {/* Clear */}
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
        <>
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={toggleAll}
            />
            <span className="text-xs text-gray-500">
              {allSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả ${filtered.length} câu hỏi`}
            </span>
          </div>

          <div className="space-y-2">
            {filtered.map((q, idx) => {
              const isSelected = selected.has(q.id)
              return (
                <Card
                  key={q.id}
                  className={`border shadow-sm transition-all ${isSelected ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100 hover:shadow-md'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="mt-0.5 flex-shrink-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(q.id)}
                        />
                      </div>

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
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
