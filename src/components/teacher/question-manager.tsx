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
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Hướng dẫn ──────────────────────────────────
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
    ['L', 'is_public', 'Không', 'TRUE = câu hỏi công khai cho Luyện tập · FALSE = chỉ dùng trong đề thi (mặc định FALSE)'],
    [],
    ['LƯU Ý QUAN TRỌNG'],
    ['1. Không xóa hoặc đổi thứ tự các cột — hệ thống đọc theo vị trí cột'],
    ['2. Nhập câu hỏi từ dòng 3 trở đi trong sheet «Câu hỏi» (dòng 1=tiêu đề, dòng 2=ví dụ)'],
    ['3. Cột tags: tra cứu tag đúng ở sheet «Danh sách Tag»'],
    ['4. Sau khi điền xong → Ngân hàng câu hỏi → Import file → chọn file này'],
  ])
  guide['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 10 }, { wch: 70 }]
  XLSX.utils.book_append_sheet(wb, guide, 'Hướng dẫn')

  // ── Sheet 2: Câu hỏi ────────────────────────────────────
  const headers = [
    'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
    'correct_answer', 'difficulty', 'subject', 'grade', 'tags', 'explanation', 'is_public',
  ]
  const example = [
    'Thẻ HTML nào dùng để tạo tiêu đề lớn nhất?',
    '<h6>', '<h1>', '<title>', '<head>',
    'B', 'easy', 'tin_hoc', 12, 'tin12-b7',
    '<h1> là thẻ tiêu đề lớn nhất trong HTML (heading level 1)',
    true,
  ]
  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = [
    { wch: 45 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 24 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 35 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Câu hỏi')

  // ── Sheet 3: Danh sách Tag ───────────────────────────────
  const TAG_DATA: [number, string, number, string, string][] = []
  const CURRICULUM_FLAT: [number, string, [number, string][]][] = [
    [10, 'Máy tính và xã hội tri thức', [[1,'Thông tin và xử lí thông tin'],[2,'Vai trò của thiết bị thông minh'],[3,'Một số kiểu dữ liệu'],[4,'Hệ nhị phân và dữ liệu số nguyên'],[5,'Dữ liệu logic'],[6,'Dữ liệu âm thanh và hình ảnh'],[7,'Thực hành sử dụng thiết bị số']]],
    [10, 'Mạng máy tính và Internet', [[8,'Mạng máy tính trong cuộc sống'],[9,'An toàn trên không gian mạng'],[10,'Thực hành khai thác tài nguyên']]],
    [10, 'Đạo đức, pháp luật và văn hoá', [[11,'Ứng xử trên môi trường số']]],
    [10, 'Ứng dụng tin học', [[12,'Phần mềm thiết kế đồ hoạ'],[13,'Bổ sung các đối tượng đồ hoạ'],[14,'Làm việc với đối tượng đường và văn bản'],[15,'Hoàn thiện hình ảnh đồ hoạ']]],
    [10, 'Giải quyết vấn đề — Python', [[16,'Ngôn ngữ lập trình bậc cao và Python'],[17,'Biến và lệnh gán'],[18,'Các lệnh vào ra đơn giản'],[19,'Câu lệnh rẽ nhánh'],[20,'Câu lệnh lặp for'],[21,'Câu lệnh lặp while'],[22,'Kiểu dữ liệu danh sách'],[23,'Một số lệnh làm việc với danh sách'],[24,'Xâu kí tự'],[25,'Một số lệnh làm việc với xâu kí tự'],[26,'Hàm trong Python'],[27,'Tham số của hàm'],[28,'Phạm vi của biến'],[29,'Nhận biết lỗi chương trình'],[30,'Kiểm thử và gỡ lỗi'],[31,'Thực hành viết chương trình đơn giản'],[32,'Ôn tập lập trình Python']]],
    [10, 'Hướng nghiệp với tin học', [[33,'Nghề thiết kế đồ hoạ máy tính'],[34,'Nghề phát triển phần mềm']]],
    [11, 'Máy tính và xã hội tri thức', [[1,'Hệ điều hành'],[2,'Thực hành sử dụng hệ điều hành'],[3,'Phần mềm nguồn mở'],[4,'Bên trong máy tính'],[5,'Kết nối máy tính với thiết bị số']]],
    [11, 'Tổ chức lưu trữ và trao đổi thông tin', [[6,'Lưu trữ và chia sẻ tệp tin'],[7,'Thực hành tìm kiếm thông tin'],[8,'Thực hành sử dụng thư điện tử']]],
    [11, 'Đạo đức, pháp luật và văn hoá', [[9,'Giao tiếp an toàn trên Internet']]],
    [11, 'Giới thiệu các hệ cơ sở dữ liệu', [[10,'Lưu trữ dữ liệu và khai thác thông tin'],[11,'Cơ sở dữ liệu'],[12,'Hệ quản trị cơ sở dữ liệu'],[13,'Cơ sở dữ liệu quan hệ'],[14,'SQL — ngôn ngữ truy vấn có cấu trúc'],[15,'Bảo mật và an toàn hệ cơ sở dữ liệu']]],
    [11, 'Hướng nghiệp với tin học', [[16,'Công việc quản trị cơ sở dữ liệu']]],
    [11, 'Kĩ thuật lập trình (CS)', [[17,'Dữ liệu mảng một chiều và hai chiều'],[18,'Thực hành dữ liệu mảng'],[19,'Bài toán tìm kiếm'],[20,'Thực hành tìm kiếm'],[21,'Các thuật toán sắp xếp'],[22,'Thực hành sắp xếp'],[23,'Kiểm thử và đánh giá chương trình'],[24,'Đánh giá độ phức tạp thời gian'],[25,'Thực hành xác định độ phức tạp'],[26,'Phương pháp làm mịn dần'],[27,'Thực hành làm mịn dần'],[28,'Thiết kế chương trình theo mô đun'],[29,'Thực hành thiết kế theo mô đun'],[30,'Thiết lập thư viện'],[31,'Thực hành thiết lập thư viện']]],
    [12, 'Máy tính và xã hội tri thức', [[1,'Làm quen với Trí tuệ nhân tạo'],[2,'Trí tuệ nhân tạo trong khoa học và đời sống']]],
    [12, 'Mạng máy tính và Internet', [[3,'Một số thiết bị mạng thông dụng'],[4,'Giao thức mạng'],[5,'Thực hành chia sẻ tài nguyên trên mạng']]],
    [12, 'Đạo đức, pháp luật và văn hoá', [[6,'Giao tiếp và ứng xử trong không gian mạng']]],
    [12, 'HTML & CSS', [[7,'HTML và cấu trúc trang web'],[8,'Định dạng văn bản'],[9,'Tạo danh sách, bảng'],[10,'Tạo liên kết'],[11,'Chèn tệp tin đa phương tiện'],[12,'Tạo biểu mẫu'],[13,'Khái niệm, vai trò của CSS'],[14,'Định dạng văn bản bằng CSS'],[15,'Tạo màu cho chữ và nền'],[16,'Định dạng khung'],[17,'Các mức ưu tiên của bộ chọn'],[18,'Thực hành tổng hợp thiết kế trang web']]],
    [12, 'Hướng nghiệp với tin học', [[19,'Dịch vụ sửa chữa và bảo trì máy tính'],[20,'Nhóm nghề quản trị CNTT'],[21,'Hội thảo hướng nghiệp']]],
    [12, 'Mạng máy tính (CS)', [[22,'Tìm hiểu thiết bị mạng'],[23,'Đường truyền mạng và ứng dụng'],[24,'Sơ bộ về thiết kế mạng']]],
    [12, 'Giải quyết vấn đề với MTTT (CS)', [[25,'Làm quen với Học máy'],[26,'Làm quen với Khoa học dữ liệu'],[27,'Máy tính và Khoa học dữ liệu'],[28,'Thực hành trích rút thông tin và tri thức'],[29,'Mô phỏng trong giải quyết vấn đề'],[30,'Ứng dụng mô phỏng trong giáo dục']]],
  ]
  for (const [grade, chapter, lessons] of CURRICULUM_FLAT) {
    for (const [num, title] of lessons) {
      TAG_DATA.push([grade, chapter, num, title, `tin${grade}-b${num}`])
    }
  }
  const tagSheet = XLSX.utils.aoa_to_sheet([
    ['Lớp', 'Chủ đề', 'Bài số', 'Tên bài học', 'Tag (dùng trong cột J)'],
    ...TAG_DATA,
  ])
  tagSheet['!cols'] = [{ wch: 6 }, { wch: 42 }, { wch: 8 }, { wch: 55 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, tagSheet, 'Danh sách Tag')

  // ── Sheet 4: Prompt AI ───────────────────────────────────
  const promptSheet = XLSX.utils.aoa_to_sheet([
    ['PROMPT MẪU CHO AI (thay giá trị trong [ ] trước khi dùng)'],
    [],
    [`Hãy tạo cho tôi [SỐ_CÂU] câu hỏi trắc nghiệm 4 lựa chọn (A/B/C/D) cho môn Tin học:

Lớp: [10 / 11 / 12]
Bài: Bài [SỐ_BÀI] - [TÊN_BÀI]
Tag: [TAG] (ví dụ: tin12-b7)
Độ khó: pha trộn easy 40% / medium 40% / hard 20%

Trả về ĐÚNG định dạng CSV sau (không giải thích thêm):

question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,subject,grade,tags,explanation,is_public

Lưu ý:
- Mỗi câu = 1 dòng CSV
- Nội dung có dấu phẩy thì đặt trong dấu ngoặc kép
- correct_answer: chỉ A/B/C/D (in hoa)
- difficulty: easy / medium / hard
- subject: tin_hoc
- grade: 10, 11 hoặc 12 (số)
- tags: [TAG] (ví dụ tin12-b7)
- explanation: 1-2 câu giải thích ngắn
- is_public: TRUE

Ví dụ 1 dòng hợp lệ:
"Thẻ HTML nào dùng để tạo tiêu đề lớn nhất?",<h6>,<h1>,<title>,<head>,B,easy,tin_hoc,12,tin12-b7,"<h1> là thẻ tiêu đề lớn nhất trong HTML",TRUE`],
  ])
  promptSheet['!cols'] = [{ wch: 110 }]
  XLSX.utils.book_append_sheet(wb, promptSheet, 'Prompt AI gợi ý')

  XLSX.writeFile(wb, 'template_cauhoi_eduquiz.xlsx')
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
