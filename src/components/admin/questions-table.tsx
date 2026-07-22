'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, BookOpen, Trash2, ChevronDown, Loader2, X } from 'lucide-react'

type Difficulty = 'easy' | 'medium' | 'hard'

interface AdminQuestion {
  id: string
  question_text: string
  subject: string
  grade: number
  difficulty: Difficulty
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

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' }
const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export function AdminQuestionsTable({ questions: initialQuestions }: { questions: AdminQuestion[] }) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkActing, setBulkActing] = useState(false)
  const [diffMenuOpen, setDiffMenuOpen] = useState(false)
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

  async function handleBulkDifficulty(difficulty: Difficulty) {
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

  const selectedCount = selected.size

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm câu hỏi..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSubject} onValueChange={v => v && setFilterSubject(v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Môn" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả môn</SelectItem>
            {Object.entries(SUBJECTS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
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
      </div>

      {/* Bulk toolbar */}
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
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
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

      {filtered.length === 0 ? (
        <Card className="border">
          <CardContent className="text-center py-16">
            <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Không tìm thấy câu hỏi</p>
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
                        : <span className="text-xs text-muted-foreground">Riêng tư</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {new Date(q.created_at).toLocaleDateString('vi-VN')}
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
