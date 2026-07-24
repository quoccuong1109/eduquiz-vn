'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Search, BookOpen, Trash2, ChevronDown, Loader2, X,
  Upload, CheckCircle2, AlertCircle, Plus, Pencil, Download,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import type { Difficulty, AnswerOption } from '@/types/database'

type DifficultyType = 'easy' | 'medium' | 'hard'

interface AdminQuestion {
  id: string
  question_text: string
  subject: string
  grade: number
  difficulty: DifficultyType
  correct_answer: string
  is_public: boolean
  created_at: string
  created_by: string
}

const SUBJECTS: Record<string, string> = {
  tin_hoc: 'Tin học', toan: 'Toán', vat_ly: 'Vật lý', hoa_hoc: 'Hóa học',
  sinh_hoc: 'Sinh học', lich_su: 'Lịch sử', dia_ly: 'Địa lý',
  ngu_van: 'Ngữ văn', tieng_anh: 'Tiếng Anh', gdcd: 'GDCD',
}
const SUBJECTS_LIST = Object.entries(SUBJECTS).map(([value, label]) => ({ value, label }))

const DIFFICULTY_LABELS: Record<DifficultyType, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }
const DIFFICULTY_COLORS: Record<DifficultyType, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

interface QuestionFormData {
  subject: string
  grade: number
  difficulty: DifficultyType
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
  subject: 'tin_hoc', grade: 12, difficulty: 'medium',
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  correct_answer: 'A', explanation: '', is_public: true, tags: '',
}

// ── Template download (giống giáo viên) ──────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const guide = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE NHẬP CÂU HỎI — EDUQUIZ VN'],
    ['Dùng sheet «Câu hỏi» để nhập dữ liệu · Mỗi dòng = 1 câu hỏi · Không xóa dòng tiêu đề'],
    [],
    ['Cột', 'Tên trường', 'Bắt buộc?', 'Mô tả / Giá trị hợp lệ'],
    ['A', 'question_text', 'Có', 'Nội dung câu hỏi'],
    ['B', 'option_a', 'Có', 'Đáp án A'],
    ['C', 'option_b', 'Có', 'Đáp án B'],
    ['D', 'option_c', 'Có', 'Đáp án C'],
    ['E', 'option_d', 'Có', 'Đáp án D'],
    ['F', 'correct_answer', 'Có', 'Chữ in hoa: A, B, C hoặc D'],
    ['G', 'difficulty', 'Có', 'easy | medium | hard'],
    ['H', 'subject', 'Có', 'tin_hoc | toan | vat_ly | hoa_hoc | sinh_hoc | tieng_anh'],
    ['I', 'grade', 'Có', '10, 11 hoặc 12'],
    ['J', 'tags', 'Có', 'Tag bài học cách nhau dấu phẩy. VD: tin12-b7,tin12-b8 (xem sheet Danh sách Tag)'],
    ['K', 'explanation', 'Không', 'Giải thích đáp án đúng (hiển thị sau khi học sinh làm)'],
    ['L', 'is_public', 'Không', 'TRUE = câu hỏi công khai cho Luyện tập · FALSE = chỉ dùng trong đề thi'],
    [],
    ['LƯU Ý QUAN TRỌNG'],
    ['1. Không xóa hoặc đổi thứ tự các cột — hệ thống đọc theo vị trí cột'],
    ['2. Nhập câu hỏi từ dòng 3 trở đi trong sheet «Câu hỏi» (dòng 1=tiêu đề, dòng 2=ví dụ)'],
    ['3. Cột tags: tra cứu tag đúng ở sheet «Danh sách Tag»'],
    ['4. Sau khi điền xong → Admin → Câu hỏi → Nhập từ file → chọn file này'],
  ])
  guide['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn')

  const headers = [
    'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'difficulty', 'subject', 'grade', 'tags', 'explanation', 'is_public',
  ]
  const example = [
    'Thẻ HTML nào dùng để tạo tiêu đề lớn nhất?',
    '<h6>', '<h1>', '<title>', '<head>',
    'B', 'easy', 'tin_hoc', 12, 'tin12-b7',
    '<h1> là thẻ tiêu đề lớn nhất trong HTML (heading level 1)', true,
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = [
    { wch: 45 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 35 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi')

  // Tag list
  const TAG_DATA: [number, string, number, string, string][] = []
  const CUR: [number, string, [number, string][]][] = [
    [10,'Máy tính và xã hội tri thức',[[1,'Thông tin và xử lí thông tin'],[2,'Vai trò của thiết bị thông minh'],[3,'Một số kiểu dữ liệu'],[4,'Hệ nhị phân và dữ liệu số nguyên'],[5,'Dữ liệu logic'],[6,'Dữ liệu âm thanh và hình ảnh'],[7,'Thực hành sử dụng thiết bị số']]],
    [10,'Mạng máy tính và Internet',[[8,'Mạng máy tính trong cuộc sống'],[9,'An toàn trên không gian mạng'],[10,'Thực hành khai thác tài nguyên']]],
    [10,'Đạo đức, pháp luật và văn hoá',[[11,'Ứng xử trên môi trường số']]],
    [10,'Ứng dụng tin học',[[12,'Phần mềm thiết kế đồ hoạ'],[13,'Bổ sung các đối tượng đồ hoạ'],[14,'Làm việc với đối tượng đường và văn bản'],[15,'Hoàn thiện hình ảnh đồ hoạ']]],
    [10,'Giải quyết vấn đề — Python',[[16,'Ngôn ngữ lập trình bậc cao và Python'],[17,'Biến và lệnh gán'],[18,'Các lệnh vào ra đơn giản'],[19,'Câu lệnh rẽ nhánh'],[20,'Câu lệnh lặp for'],[21,'Câu lệnh lặp while'],[22,'Kiểu dữ liệu danh sách'],[23,'Một số lệnh làm việc với danh sách'],[24,'Xâu kí tự'],[25,'Một số lệnh làm việc với xâu kí tự'],[26,'Hàm trong Python'],[27,'Tham số của hàm'],[28,'Phạm vi của biến'],[29,'Nhận biết lỗi chương trình'],[30,'Kiểm thử và gỡ lỗi'],[31,'Thực hành viết chương trình'],[32,'Ôn tập lập trình Python']]],
    [10,'Hướng nghiệp với tin học',[[33,'Nghề thiết kế đồ hoạ máy tính'],[34,'Nghề phát triển phần mềm']]],
    [11,'Máy tính và xã hội tri thức',[[1,'Hệ điều hành'],[2,'Thực hành sử dụng hệ điều hành'],[3,'Phần mềm nguồn mở'],[4,'Bên trong máy tính'],[5,'Kết nối máy tính với thiết bị số']]],
    [11,'Tổ chức lưu trữ và trao đổi thông tin',[[6,'Lưu trữ và chia sẻ tệp tin'],[7,'Thực hành tìm kiếm thông tin'],[8,'Thực hành sử dụng thư điện tử']]],
    [11,'Đạo đức, pháp luật và văn hoá',[[9,'Giao tiếp an toàn trên Internet']]],
    [11,'Giới thiệu các hệ cơ sở dữ liệu',[[10,'Lưu trữ dữ liệu và khai thác thông tin'],[11,'Cơ sở dữ liệu'],[12,'Hệ quản trị cơ sở dữ liệu'],[13,'Cơ sở dữ liệu quan hệ'],[14,'SQL — ngôn ngữ truy vấn có cấu trúc'],[15,'Bảo mật và an toàn hệ cơ sở dữ liệu']]],
    [11,'Hướng nghiệp với tin học',[[16,'Công việc quản trị cơ sở dữ liệu']]],
    [11,'Kĩ thuật lập trình (CS)',[[17,'Dữ liệu mảng một chiều và hai chiều'],[18,'Thực hành dữ liệu mảng'],[19,'Bài toán tìm kiếm'],[20,'Thực hành tìm kiếm'],[21,'Các thuật toán sắp xếp'],[22,'Thực hành sắp xếp'],[23,'Kiểm thử và đánh giá chương trình'],[24,'Đánh giá độ phức tạp thời gian'],[25,'Thực hành xác định độ phức tạp'],[26,'Phương pháp làm mịn dần'],[27,'Thực hành làm mịn dần'],[28,'Thiết kế chương trình theo mô đun'],[29,'Thực hành thiết kế theo mô đun'],[30,'Thiết lập thư viện'],[31,'Thực hành thiết lập thư viện']]],
    [12,'Máy tính và xã hội tri thức',[[1,'Làm quen với Trí tuệ nhân tạo'],[2,'Trí tuệ nhân tạo trong khoa học và đời sống']]],
    [12,'Mạng máy tính và Internet',[[3,'Một số thiết bị mạng thông dụng'],[4,'Giao thức mạng'],[5,'Thực hành chia sẻ tài nguyên trên mạng']]],
    [12,'Đạo đức, pháp luật và văn hoá',[[6,'Giao tiếp và ứng xử trong không gian mạng']]],
    [12,'HTML & CSS',[[7,'HTML và cấu trúc trang web'],[8,'Định dạng văn bản'],[9,'Tạo danh sách, bảng'],[10,'Tạo liên kết'],[11,'Chèn tệp tin đa phương tiện'],[12,'Tạo biểu mẫu'],[13,'Khái niệm, vai trò của CSS'],[14,'Định dạng văn bản bằng CSS'],[15,'Tạo màu cho chữ và nền'],[16,'Định dạng khung'],[17,'Các mức ưu tiên của bộ chọn'],[18,'Thực hành tổng hợp thiết kế trang web']]],
    [12,'Hướng nghiệp với tin học',[[19,'Dịch vụ sửa chữa và bảo trì máy tính'],[20,'Nhóm nghề quản trị CNTT'],[21,'Hội thảo hướng nghiệp']]],
    [12,'Mạng máy tính (CS)',[[22,'Tìm hiểu thiết bị mạng'],[23,'Đường truyền mạng và ứng dụng'],[24,'Sơ bộ về thiết kế mạng']]],
    [12,'Giải quyết vấn đề với MTTT (CS)',[[25,'Làm quen với Học máy'],[26,'Làm quen với Khoa học dữ liệu'],[27,'Máy tính và Khoa học dữ liệu'],[28,'Thực hành trích rút thông tin và tri thức'],[29,'Mô phỏng trong giải quyết vấn đề'],[30,'Ứng dụng mô phỏng trong giáo dục']]],
  ]
  for (const [g, ch, ls] of CUR) {
    for (const [n, t] of ls) TAG_DATA.push([g, ch, n, t, `tin${g}-b${n}`])
  }
  const tagSheet = XLSX.utils.aoa_to_sheet([
    ['Lớp', 'Chủ đề', 'Bài số', 'Tên bài học', 'Tag (dùng trong cột J)'],
    ...TAG_DATA,
  ])
  tagSheet['!cols'] = [{ wch: 6 }, { wch: 42 }, { wch: 8 }, { wch: 55 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, tagSheet, 'Danh sách Tag')

  const promptSheet = XLSX.utils.aoa_to_sheet([
    ['PROMPT MẪU CHO AI (thay giá trị trong [ ] trước khi dùng)'],
    [],
    [`Hãy tạo cho tôi [SỐ_CÂU] câu hỏi trắc nghiệm 4 lựa chọn (A/B/C/D) cho môn Tin học:\n\nLớp: [10 / 11 / 12]\nBài: Bài [SỐ_BÀI] - [TÊN_BÀI]\nTag: [TAG] (ví dụ: tin12-b7)\nĐộ khó: pha trộn easy 40% / medium 40% / hard 20%\n\nTrả về ĐÚNG định dạng CSV sau (không giải thích thêm):\nquestion_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,subject,grade,tags,explanation,is_public\n\nLưu ý:\n- Mỗi câu = 1 dòng CSV\n- Nội dung có dấu phẩy thì đặt trong dấu ngoặc kép\n- correct_answer: chỉ A/B/C/D (in hoa)\n- difficulty: easy / medium / hard\n- subject: tin_hoc\n- grade: 10, 11 hoặc 12 (số)\n- tags: [TAG]\n- explanation: 1-2 câu giải thích\n- is_public: TRUE`],
  ])
  promptSheet['!cols'] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(wb, promptSheet, 'Prompt AI gợi ý')

  XLSX.writeFile(wb, 'template_cauhoi_eduquiz.xlsx')
}

export function AdminQuestionsTable({
  questions: initialQuestions,
  userId,
}: {
  questions: AdminQuestion[]
  userId: string
}) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)
  const [diffMenuOpen, setDiffMenuOpen] = useState(false)

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuestionFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  // Import state
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    inserted: number
    skipped: number
    errors: { row: number; msg: string }[]
  } | null>(null)

  const supabase = createClient()

  const filtered = questions.filter(q => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase())
    const matchSubject = filterSubject === 'all' || q.subject === filterSubject
    const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    return matchSearch && matchSubject && matchDiff
  })

  const allSelected = filtered.length > 0 && filtered.every(q => selected.has(q.id))
  const someSelected = filtered.some(q => selected.has(q.id)) && !allSelected

  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleAll() {
    if (allSelected) setSelected(prev => { const s = new Set(prev); filtered.forEach(q => s.delete(q.id)); return s })
    else setSelected(prev => { const s = new Set(prev); filtered.forEach(q => s.add(q.id)); return s })
  }

  // ── Form handlers ─────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm({ ...defaultForm })
    setFormOpen(true)
  }

  function openEdit(q: AdminQuestion) {
    setEditingId(q.id)
    setForm({
      subject: q.subject, grade: q.grade, difficulty: q.difficulty,
      question_text: q.question_text,
      option_a: '', option_b: '', option_c: '', option_d: '',
      correct_answer: q.correct_answer as AnswerOption,
      explanation: '', is_public: q.is_public, tags: '',
    })
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.question_text || !form.option_a || !form.option_b || !form.option_c || !form.option_d) {
      toast.error('Vui lòng điền đầy đủ câu hỏi và 4 đáp án')
      return
    }
    setSaving(true)
    try {
      const payload = {
        subject: form.subject, grade: form.grade, difficulty: form.difficulty,
        question_text: form.question_text,
        option_a: form.option_a, option_b: form.option_b,
        option_c: form.option_c, option_d: form.option_d,
        correct_answer: form.correct_answer,
        explanation: form.explanation || null,
        is_public: form.is_public,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: userId,
      }
      if (editingId) {
        const { error } = await supabase.from('questions').update(payload).eq('id', editingId)
        if (error) throw error
        setQuestions(prev => prev.map(q => q.id === editingId ? { ...q, ...payload } : q))
        toast.success('Đã cập nhật câu hỏi')
      } else {
        const { data, error } = await supabase.from('questions').insert(payload).select('id, question_text, subject, grade, difficulty, correct_answer, is_public, created_at, created_by').single()
        if (error) throw error
        if (data) setQuestions(prev => [data as AdminQuestion, ...prev])
        toast.success('Đã thêm câu hỏi')
      }
      setFormOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa câu hỏi này?')) return
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { setQuestions(prev => prev.filter(q => q.id !== id)); toast.success('Đã xóa câu hỏi') }
  }

  // ── Bulk handlers ─────────────────────────────────────
  async function handleBulkDelete() {
    const ids = [...selected]
    if (!confirm(`Xóa ${ids.length} câu hỏi?`)) return
    setBulkActing(true)
    const { error } = await supabase.from('questions').delete().in('id', ids)
    if (error) { toast.error(error.message) }
    else {
      setQuestions(prev => prev.filter(q => !ids.includes(q.id)))
      setSelected(new Set())
      toast.success(`Đã xóa ${ids.length} câu hỏi`)
    }
    setBulkActing(false)
  }

  async function handleBulkDifficulty(difficulty: DifficultyType) {
    const ids = [...selected]
    setBulkActing(true)
    setDiffMenuOpen(false)
    const { error } = await supabase.from('questions').update({ difficulty }).in('id', ids)
    if (error) { toast.error(error.message) }
    else {
      setQuestions(prev => prev.map(q => ids.includes(q.id) ? { ...q, difficulty } : q))
      toast.success(`Đã đổi độ khó ${ids.length} câu`)
    }
    setBulkActing(false)
  }

  async function handleBulkVisibility(is_public: boolean) {
    const ids = [...selected]
    setBulkActing(true)
    const { error } = await supabase.from('questions').update({ is_public }).in('id', ids)
    if (error) { toast.error(error.message) }
    else {
      setQuestions(prev => prev.map(q => ids.includes(q.id) ? { ...q, is_public } : q))
      toast.success(`Đã đặt ${ids.length} câu thành ${is_public ? 'công khai' : 'riêng tư'}`)
    }
    setBulkActing(false)
  }

  // ── Import handler ────────────────────────────────────
  async function handleImport() {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/admin/questions/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok && !data.inserted) {
        toast.error(data.error ?? 'Lỗi nhập file')
      } else {
        setImportResult(data)
        if (data.inserted > 0) {
          toast.success(`Đã nhập ${data.inserted} câu hỏi`)
          setTimeout(() => window.location.reload(), 1500)
        }
      }
    } catch {
      toast.error('Lỗi kết nối server')
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = selected.size

  return (
    <div className="space-y-4">

      {/* ── Thêm câu hỏi Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Môn học</Label>
                <Select value={form.subject} onValueChange={v => v && setForm(f => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUBJECTS_LIST.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
                <Select value={form.difficulty} onValueChange={v => v && setForm(f => ({ ...f, difficulty: v as DifficultyType }))}>
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
                <div className="flex-1">
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
              <Label>Giải thích đáp án <span className="text-muted-foreground">(tuỳ chọn)</span></Label>
              <Textarea
                placeholder="Giải thích tại sao đáp án này đúng..."
                value={form.explanation}
                onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags <span className="text-muted-foreground">(phân cách bằng dấu phẩy, VD: tin12-b7)</span></Label>
              <Input
                placeholder="tin12-b7, tin12-b8"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.is_public ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${form.is_public ? 'left-6' : 'left-1'}`} />
              </button>
              <Label className="cursor-pointer" onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}>
                Câu hỏi công khai (học sinh dùng được cho Luyện tập)
              </Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 flex-1">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? 'Cập nhật' : 'Thêm câu hỏi'}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>Huỷ</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={open => { setImportOpen(open); if (!open) { setImportFile(null); setImportResult(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nhập câu hỏi từ file</DialogTitle>
            <DialogDescription>
              Tải lên file .xlsx hoặc .csv theo đúng mẫu template. Mỗi dòng = 1 câu hỏi.
            </DialogDescription>
          </DialogHeader>

          {!importResult ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-200 p-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-1">Bước 1: Tải file mẫu</p>
                <p className="text-xs text-gray-500 mb-3">Điền câu hỏi theo đúng cột, sau đó upload lên. File mẫu có sheet hướng dẫn, danh sách tag và prompt AI.</p>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Tải file mẫu (.xlsx)
                </Button>
              </div>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${importFile ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}`}>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                {importFile ? (
                  <>
                    <p className="text-sm font-medium text-blue-700">{importFile.name}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{(importFile.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Bước 2: Chọn file đã điền</p>
                    <p className="text-xs text-gray-400 mt-0.5">.xlsx · .xls · .csv</p>
                  </>
                )}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setImportFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-4 text-center">
                <div className="flex-1 p-3 rounded-xl bg-green-50 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                  <div className="text-xs text-green-600 mt-0.5">câu đã nhập</div>
                </div>
                <div className="flex-1 p-3 rounded-xl bg-orange-50 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-500">{importResult.skipped}</div>
                  <div className="text-xs text-orange-500 mt-0.5">dòng bỏ qua</div>
                </div>
              </div>
              {importResult.inserted > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700">Đang tải lại danh sách...</p>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <p className="text-xs font-medium text-orange-700 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Các dòng lỗi:
                  </p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-gray-600 bg-orange-50 rounded px-2 py-1">
                      Dòng {e.row}: {e.msg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Đóng</Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={!importFile || importing} className="bg-blue-600 hover:bg-blue-700">
                {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Đang nhập...</> : <><Upload className="w-4 h-4 mr-2" />Nhập câu hỏi</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Toolbar ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm câu hỏi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSubject} onValueChange={v => v && setFilterSubject(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Môn" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn</SelectItem>
            {SUBJECTS_LIST.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDifficulty} onValueChange={v => v && setFilterDifficulty(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Độ khó" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="easy">Dễ</SelectItem>
            <SelectItem value="medium">Trung bình</SelectItem>
            <SelectItem value="hard">Khó</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Thêm câu hỏi
        </Button>
        <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2">
          <Upload className="w-4 h-4" /> Nhập từ file
        </Button>
      </div>

      {/* ── Bulk toolbar ── */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 flex-wrap">
          <span className="text-sm font-medium text-blue-800">Đã chọn {selectedCount} câu hỏi</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Button size="sm" variant="outline" disabled={bulkActing} onClick={() => setDiffMenuOpen(o => !o)} className="h-8 text-xs gap-1">
                Đổi độ khó <ChevronDown className="w-3 h-3" />
              </Button>
              {diffMenuOpen && (
                <div className="absolute top-full mt-1 left-0 z-10 bg-white border border-gray-200 rounded-md shadow-md py-1 min-w-[130px]">
                  {(['easy', 'medium', 'hard'] as DifficultyType[]).map(d => (
                    <button key={d} className="w-full text-left text-sm px-3 py-1.5 hover:bg-gray-50" onClick={() => handleBulkDifficulty(d)}>
                      {DIFFICULTY_LABELS[d]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" variant="outline" disabled={bulkActing} onClick={() => handleBulkVisibility(true)} className="h-8 text-xs">Đặt công khai</Button>
            <Button size="sm" variant="outline" disabled={bulkActing} onClick={() => handleBulkVisibility(false)} className="h-8 text-xs">Đặt riêng tư</Button>
            <Button size="sm" variant="outline" disabled={bulkActing} onClick={handleBulkDelete} className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50">
              {bulkActing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Xóa đã chọn
            </Button>
            <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <Card className="border">
          <CardContent className="text-center py-16">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Không tìm thấy câu hỏi</p>
            <Button onClick={openCreate} className="mt-3" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <Checkbox checked={allSelected} indeterminate={someSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Câu hỏi</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28 hidden md:table-cell">Môn / Lớp</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Độ khó</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-24 hidden lg:table-cell">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28 hidden lg:table-cell">Ngày tạo</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(q => (
                  <tr key={q.id} className={`transition-colors ${selected.has(q.id) ? 'bg-blue-50/50' : 'hover:bg-muted/20'}`}>
                    <td className="px-4 py-3">
                      <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleOne(q.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 font-medium text-sm">{q.question_text}</p>
                      <span className="text-xs text-green-700 font-medium">✓ {q.correct_answer}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      <p>{SUBJECTS[q.subject] ?? q.subject}</p>
                      <p className="text-xs">Lớp {q.grade}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${DIFFICULTY_COLORS[q.difficulty]}`}>
                        {DIFFICULTY_LABELS[q.difficulty]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {q.is_public
                        ? <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Công khai</Badge>
                        : <span className="text-xs text-muted-foreground">Riêng tư</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {new Date(q.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(q)} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(q.id)} className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
