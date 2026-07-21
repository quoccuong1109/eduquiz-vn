'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Shuffle, BookOpen, Loader2 } from 'lucide-react'
import type { Question, AnswerOption } from '@/types/database'
import { cn } from '@/lib/utils'

const SUBJECTS = [
  { value: 'all', label: 'Tất cả môn' },
  { value: 'tin_hoc', label: 'Tin học' },
  { value: 'toan', label: 'Toán' },
  { value: 'vat_ly', label: 'Vật lý' },
  { value: 'hoa_hoc', label: 'Hóa học' },
  { value: 'sinh_hoc', label: 'Sinh học' },
  { value: 'tieng_anh', label: 'Tiếng Anh' },
]

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D']
const optionKeys: Record<string, string> = {
  A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d',
}

interface PracticeModeProps {
  userId: string
}

export function PracticeMode({ userId }: PracticeModeProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('all')
  const [started, setStarted] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selected, setSelected] = useState<AnswerOption | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const supabase = createClient()

  async function loadQuestions() {
    setLoading(true)
    let query = supabase.from('questions').select('*').eq('is_public', true)
    if (subject !== 'all') query = query.eq('subject', subject)
    const { data } = await query.limit(20)
    // Xáo trộn
    const shuffled = (data || []).sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setLoading(false)
    setStarted(true)
    setCurrentIdx(0)
    setSelected(null)
    setRevealed(false)
    setCorrect(0)
    setTotal(0)
  }

  function handleSelect(opt: AnswerOption) {
    if (revealed) return
    setSelected(opt)
  }

  function handleReveal() {
    if (!selected) return
    setRevealed(true)
    setTotal(t => t + 1)
    if (selected === questions[currentIdx].correct_answer) {
      setCorrect(c => c + 1)
    }
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      setStarted(false)
    }
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Luyện tập tự do</h1>
          <p className="text-gray-500 text-sm mt-1">Thi thử từ ngân hàng câu hỏi công khai, không giới hạn lần</p>
        </div>

        {total > 0 && (
          <Card className={cn('border-2', correct / total >= 0.8 ? 'border-green-200 bg-green-50' : 'border-blue-100 bg-blue-50')}>
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold mb-1">
                {correct}/{total} câu đúng
              </div>
              <div className="text-gray-500 text-sm mb-3">
                Tỉ lệ: {Math.round((correct / total) * 100)}%
              </div>
              <Progress value={(correct / total) * 100} className="h-3" />
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cài đặt luyện tập</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Chọn môn học</label>
              <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={loadQuestions}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4 mr-2" />
              )}
              {total > 0 ? 'Luyện tập tiếp' : 'Bắt đầu luyện tập'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const q = questions[currentIdx]
  if (!q) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Câu <strong>{currentIdx + 1}</strong>/{questions.length}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600 font-medium">✓ {correct}</span>
          <span className="text-red-500 font-medium">✗ {total - correct}</span>
        </div>
      </div>
      <Progress value={((currentIdx) / questions.length) * 100} className="h-1.5" />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {/* Badges */}
          <div className="flex gap-2 mb-4">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              {SUBJECTS.find(s => s.value === q.subject)?.label || q.subject}
            </Badge>
            <Badge className={
              q.difficulty === 'easy' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
              q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
              'bg-red-100 text-red-700 hover:bg-red-100'
            }>
              {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
            </Badge>
          </div>

          {/* Question */}
          <p className="text-gray-900 font-medium leading-relaxed mb-5">{q.question_text}</p>

          {/* Options */}
          <div className="space-y-2.5">
            {OPTIONS.map(opt => {
              const key = optionKeys[opt]
              const text = q[key as keyof Question] as string
              const isCorrect = opt === q.correct_answer
              const isSelected = opt === selected

              let cls = 'border-gray-100 bg-white hover:border-blue-200'
              if (revealed) {
                if (isCorrect) cls = 'border-green-300 bg-green-50'
                else if (isSelected && !isCorrect) cls = 'border-red-300 bg-red-50'
                else cls = 'border-gray-100 bg-gray-50 opacity-60'
              } else if (isSelected) {
                cls = 'border-blue-500 bg-blue-50'
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  disabled={revealed}
                  className={cn('w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all', cls)}
                >
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    revealed && isCorrect ? 'bg-green-600 text-white' :
                    revealed && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  )}>
                    {opt}
                  </span>
                  <span className="text-sm text-gray-800 flex-1">{text}</span>
                  {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {revealed && q.explanation && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">💡 Giải thích</p>
              <p className="text-sm text-blue-800">{q.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            {!revealed ? (
              <Button
                onClick={handleReveal}
                disabled={!selected}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Xem đáp án
              </Button>
            ) : (
              <Button onClick={handleNext} className="flex-1 bg-green-600 hover:bg-green-700">
                {currentIdx < questions.length - 1 ? 'Câu tiếp →' : 'Xem kết quả'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setStarted(false)}>Dừng</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
