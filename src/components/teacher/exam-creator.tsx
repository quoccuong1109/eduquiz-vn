'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, X, Shuffle, Loader2, Search } from 'lucide-react'
import type { Question, Difficulty } from '@/types/database'

const SUBJECTS = [
  { value: 'tin_hoc', label: 'Tin học' },
  { value: 'toan', label: 'Toán' },
  { value: 'vat_ly', label: 'Vật lý' },
  { value: 'hoa_hoc', label: 'Hóa học' },
  { value: 'sinh_hoc', label: 'Sinh học' },
  { value: 'ngu_van', label: 'Ngữ văn' },
  { value: 'tieng_anh', label: 'Tiếng Anh' },
]

interface ExamCreatorProps {
  userId: string
}

export function ExamCreator({ userId }: ExamCreatorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Thông tin đề thi
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('tin_hoc')
  const [grade, setGrade] = useState(12)
  const [duration, setDuration] = useState(45)
  const [accessCode, setAccessCode] = useState('')
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('')
  const [shuffleQ, setShuffleQ] = useState(false)
  const [shuffleA, setShuffleA] = useState(false)
  const [showResult, setShowResult] = useState(true)

  // Câu hỏi đã chọn
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([])

  // Ngân hàng câu hỏi
  const [bankQuestions, setBankQuestions] = useState<Question[]>([])
  const [bankLoading, setBankLoading] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [bankSubject, setBankSubject] = useState('all')
  const [bankDifficulty, setBankDifficulty] = useState('all')

  // Random config
  const [randomSubject, setRandomSubject] = useState('tin_hoc')
  const [randomGrade, setRandomGrade] = useState(12)
  const [randomEasy, setRandomEasy] = useState(5)
  const [randomMedium, setRandomMedium] = useState(5)
  const [randomHard, setRandomHard] = useState(0)

  const supabase = createClient()

  async function loadBank() {
    setBankLoading(true)
    let query = supabase.from('questions').select('*').eq('created_by', userId)
    if (bankSubject !== 'all') query = query.eq('subject', bankSubject)
    if (bankDifficulty !== 'all') query = query.eq('difficulty', bankDifficulty)
    const { data } = await query.order('created_at', { ascending: false })
    setBankQuestions(data || [])
    setBankLoading(false)
  }

  useEffect(() => { loadBank() }, [bankSubject, bankDifficulty])

  function addQuestion(q: Question) {
    if (selectedQuestions.find(s => s.id === q.id)) {
      toast.info('Câu hỏi đã có trong đề')
      return
    }
    setSelectedQuestions(prev => [...prev, q])
  }

  function removeQuestion(id: string) {
    setSelectedQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function handleRandomAdd() {
    const total = randomEasy + randomMedium + randomHard
    if (total === 0) { toast.error('Nhập số câu cần lấy'); return }

    const difficultyGroups: { diff: Difficulty; count: number }[] = (
    [
      { diff: 'easy' as Difficulty, count: randomEasy },
      { diff: 'medium' as Difficulty, count: randomMedium },
      { diff: 'hard' as Difficulty, count: randomHard },
    ] as { diff: Difficulty; count: number }[]
  ).filter(g => g.count > 0)

    let allPicked: Question[] = []
    for (const { diff, count } of difficultyGroups) {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('created_by', userId)
        .eq('subject', randomSubject)
        .eq('grade', randomGrade)
        .eq('difficulty', diff)

      const available = (data || []).filter(q => !selectedQuestions.find(s => s.id === q.id))
      const shuffled = available.sort(() => Math.random() - 0.5)
      allPicked = [...allPicked, ...shuffled.slice(0, count)]
    }

    if (allPicked.length === 0) {
      toast.error('Không có câu hỏi phù hợp. Hãy thêm câu hỏi vào ngân hàng trước.')
      return
    }
    setSelectedQuestions(prev => [...prev, ...allPicked])
    toast.success(`Đã thêm ${allPicked.length} câu hỏi ngẫu nhiên`)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Vui lòng nhập tên đề thi'); return }
    if (selectedQuestions.length === 0) { toast.error('Vui lòng chọn ít nhất 1 câu hỏi'); return }

    setSaving(true)
    try {
      // Tạo đề thi
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          created_by: userId,
          title: title.trim(),
          subject,
          grade,
          duration_minutes: duration,
          access_code: accessCode.trim() || null,
          max_attempts: maxAttempts || null,
          shuffle_questions: shuffleQ,
          shuffle_answers: shuffleA,
          show_result_immediately: showResult,
          is_published: false,
        })
        .select()
        .single()

      if (examError) throw examError

      // Thêm câu hỏi vào đề
      const examQuestions = selectedQuestions.map((q, idx) => ({
        exam_id: exam.id,
        question_id: q.id,
        order_index: idx + 1,
        points: 1,
      }))

      const { error: eqError } = await supabase.from('exam_questions').insert(examQuestions)
      if (eqError) throw eqError

      toast.success('Đã tạo đề thi thành công!')
      router.push('/teacher/exams')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi tạo đề thi')
    } finally {
      setSaving(false)
    }
  }

  const filteredBank = bankQuestions.filter(q =>
    q.question_text.toLowerCase().includes(bankSearch.toLowerCase())
  )

  const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tạo đề thi mới</h1>
        <p className="text-gray-500 text-sm mt-1">Điền thông tin và chọn câu hỏi cho đề thi</p>
      </div>

      {/* Thông tin đề thi */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thông tin đề thi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên đề thi <span className="text-red-500">*</span></Label>
            <Input placeholder="VD: Kiểm tra Tin học lớp 12 - Chương 1" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Môn học</Label>
              <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lớp</Label>
              <Select value={String(grade)} onValueChange={v => setGrade(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 11, 12].map(g => <SelectItem key={g} value={String(g)}>Lớp {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Thời gian (phút)</Label>
              <Input type="number" min={5} max={180} value={duration} onChange={e => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Mã vào thi</Label>
              <Input
                placeholder="Tự động nếu trống"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Xáo trộn câu hỏi', value: shuffleQ, set: setShuffleQ },
              { label: 'Xáo trộn đáp án', value: shuffleA, set: setShuffleA },
              { label: 'Hiện kết quả ngay', value: showResult, set: setShowResult },
            ].map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => opt.set(!opt.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                  opt.value ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  opt.value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                }`}>
                  {opt.value && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>}
                </div>
                <span className="text-sm text-gray-700">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Câu hỏi đã chọn */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Câu hỏi đã chọn
              <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">{selectedQuestions.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {selectedQuestions.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              Chưa có câu hỏi nào. Thêm từ ngân hàng bên dưới.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-400 w-6 flex-shrink-0 mt-0.5">{idx + 1}.</span>
                  <p className="text-sm text-gray-800 flex-1 line-clamp-2">{q.question_text}</p>
                  <Badge className={`text-xs flex-shrink-0 ${DIFFICULTY_COLORS[q.difficulty]}`}>
                    {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'TB' : 'Khó'}
                  </Badge>
                  <button onClick={() => removeQuestion(q.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chọn câu hỏi */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thêm câu hỏi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList className="mb-4">
              <TabsTrigger value="manual">Chọn thủ công</TabsTrigger>
              <TabsTrigger value="random">Ngẫu nhiên</TabsTrigger>
            </TabsList>

            {/* Manual */}
            <TabsContent value="manual" className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm câu hỏi..."
                    className="pl-9"
                    value={bankSearch}
                    onChange={e => setBankSearch(e.target.value)}
                  />
                </div>
                <Select value={bankSubject} onValueChange={(v) => v && setBankSubject(v)}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={bankDifficulty} onValueChange={(v) => v && setBankDifficulty(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Độ khó</SelectItem>
                    <SelectItem value="easy">Dễ</SelectItem>
                    <SelectItem value="medium">Trung bình</SelectItem>
                    <SelectItem value="hard">Khó</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bankLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : filteredBank.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Không có câu hỏi. <a href="/teacher/questions" className="text-blue-600 hover:underline">Thêm câu hỏi vào ngân hàng</a>
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {filteredBank.map(q => {
                    const isAdded = selectedQuestions.some(s => s.id === q.id)
                    return (
                      <div key={q.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        isAdded ? 'border-blue-200 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}>
                        <p className="text-sm text-gray-800 flex-1 line-clamp-2">{q.question_text}</p>
                        <Badge className={`text-xs flex-shrink-0 ${DIFFICULTY_COLORS[q.difficulty]}`}>
                          {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'TB' : 'Khó'}
                        </Badge>
                        <button
                          onClick={() => isAdded ? removeQuestion(q.id) : addQuestion(q)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            isAdded
                              ? 'bg-blue-600 text-white hover:bg-red-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                          }`}
                        >
                          {isAdded ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Random */}
            <TabsContent value="random" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Môn học</Label>
                  <Select value={randomSubject} onValueChange={(v) => v && setRandomSubject(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Lớp</Label>
                  <Select value={String(randomGrade)} onValueChange={v => setRandomGrade(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 11, 12].map(g => <SelectItem key={g} value={String(g)}>Lớp {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-green-700">Dễ (câu)</Label>
                  <Input type="number" min={0} value={randomEasy} onChange={e => setRandomEasy(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-yellow-700">Trung bình (câu)</Label>
                  <Input type="number" min={0} value={randomMedium} onChange={e => setRandomMedium(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-red-700">Khó (câu)</Label>
                  <Input type="number" min={0} value={randomHard} onChange={e => setRandomHard(Number(e.target.value))} />
                </div>
              </div>
              <Button onClick={handleRandomAdd} variant="outline" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50">
                <Shuffle className="w-4 h-4 mr-2" />
                Thêm {randomEasy + randomMedium + randomHard} câu ngẫu nhiên
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Lưu đề thi ({selectedQuestions.length} câu)
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Huỷ</Button>
      </div>
    </div>
  )
}
