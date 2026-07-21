'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Clock, AlertTriangle, CheckCircle2, Loader2, Flag } from 'lucide-react'
import type { Exam, AnswerOption } from '@/types/database'
import { cn } from '@/lib/utils'

interface ExamQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  image_url: string | null
  points: number
  order_index: number
}

interface ExamRoomProps {
  exam: Exam
  questions: ExamQuestion[]
  userId: string
  existingAttemptId: string | null
  existingStartedAt: string | null
}

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D']

export function ExamRoom({ exam, questions, userId, existingAttemptId, existingStartedAt }: ExamRoomProps) {
  const router = useRouter()
  const supabase = createClient()

  const [attemptId, setAttemptId] = useState<string | null>(existingAttemptId)
  const [startedAt, setStartedAt] = useState<string | null>(existingStartedAt)
  const [started, setStarted] = useState(!!existingAttemptId)
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({})
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Xáo trộn câu hỏi nếu cần
  const [orderedQuestions] = useState(() => {
    if (exam.shuffle_questions) {
      return [...questions].sort(() => Math.random() - 0.5)
    }
    return questions
  })

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tính thời gian còn lại từ DB (tránh hack setInterval)
  function calcTimeLeft(startedAtStr: string) {
    const elapsed = Math.floor((Date.now() - new Date(startedAtStr).getTime()) / 1000)
    return Math.max(0, exam.duration_minutes * 60 - elapsed)
  }

  // Bắt đầu thi
  async function startExam() {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .insert({ exam_id: exam.id, student_id: userId, status: 'in_progress' })
        .select()
        .single()
      if (error) throw error
      setAttemptId(data.id)
      setStartedAt(data.started_at)
      setTimeLeft(calcTimeLeft(data.started_at))
      setStarted(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Không thể bắt đầu thi')
    }
  }

  // Load đáp án đã lưu nếu có attempt cũ
  useEffect(() => {
    if (!existingAttemptId) return
    async function loadSavedAnswers() {
      const { data } = await supabase
        .from('attempt_answers')
        .select('question_id, selected_answer')
        .eq('attempt_id', existingAttemptId)
      if (data) {
        const saved: Record<string, AnswerOption> = {}
        data.forEach(a => {
          if (a.selected_answer) saved[a.question_id] = a.selected_answer as AnswerOption
        })
        setAnswers(saved)
      }
    }
    loadSavedAnswers()
    if (existingStartedAt) setTimeLeft(calcTimeLeft(existingStartedAt))
  }, [existingAttemptId])

  // Đồng hồ đếm ngược — tính từ startedAt trong DB
  useEffect(() => {
    if (!started || !startedAt || submitted) return
    const interval = setInterval(() => {
      const remaining = calcTimeLeft(startedAt)
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        handleSubmit(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [started, startedAt, submitted])

  // Lưu đáp án ngay khi chọn (debounce 500ms)
  const saveAnswer = useCallback(async (questionId: string, answer: AnswerOption) => {
    if (!attemptId) return
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(async () => {
      await supabase.from('attempt_answers').upsert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_answer: answer,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'attempt_id,question_id' })
    }, 500)
  }, [attemptId])

  function selectAnswer(questionId: string, answer: AnswerOption) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    saveAnswer(questionId, answer)
  }

  function toggleFlag(questionId: string) {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  async function handleSubmit(isAutoSubmit = false) {
    if (submitting || submitted) return
    if (!isAutoSubmit) {
      const unanswered = orderedQuestions.filter(q => !answers[q.id]).length
      if (unanswered > 0 && !confirm(`Còn ${unanswered} câu chưa trả lời. Nộp bài?`)) return
    }

    setSubmitting(true)
    try {
      // Gọi server-side function để chấm điểm
      const res = await fetch('/api/submit-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setSubmitted(true)
      toast.success('Nộp bài thành công!')

      if (exam.show_result_immediately) {
        router.push(`/exam/${exam.id}/result?attemptId=${attemptId}`)
      } else {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi nộp bài')
      setSubmitting(false)
    }
  }

  // Format thời gian
  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const answeredCount = Object.keys(answers).length
  const totalCount = orderedQuestions.length
  const isUrgent = timeLeft < 300 // < 5 phút

  // Màn hình chờ bắt đầu
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p>⏱ Thời gian: <strong className="text-gray-900">{exam.duration_minutes} phút</strong></p>
            <p>📝 Số câu: <strong className="text-gray-900">{orderedQuestions.length} câu</strong></p>
            {exam.access_code && <p>🔑 Mã vào thi: <strong className="text-gray-900 font-mono">{exam.access_code}</strong></p>}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left mb-6">
            <p className="font-medium mb-1">⚠️ Lưu ý trước khi thi:</p>
            <ul className="space-y-1">
              <li>• Đảm bảo kết nối internet ổn định</li>
              <li>• Đáp án được lưu tự động khi bạn chọn</li>
              <li>• Bài thi sẽ tự nộp khi hết giờ</li>
            </ul>
          </div>
          <Button onClick={startExam} className="w-full bg-blue-600 hover:bg-blue-700 h-11">
            Bắt đầu thi
          </Button>
        </div>
      </div>
    )
  }

  const currentQ = orderedQuestions[currentIdx]

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className={cn(
        'sticky top-0 z-40 border-b shadow-sm',
        isUrgent ? 'bg-red-600' : 'bg-blue-600'
      )}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="text-white">
            <div className="font-semibold text-sm truncate max-w-[200px] md:max-w-sm">{exam.title}</div>
            <div className="text-xs opacity-75">{answeredCount}/{totalCount} câu đã trả lời</div>
          </div>

          {/* Đồng hồ */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-1.5 rounded-full font-mono font-bold text-lg',
            isUrgent ? 'bg-white text-red-600 animate-pulse' : 'bg-white/20 text-white'
          )}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>

          <Button
            size="sm"
            onClick={() => handleSubmit()}
            disabled={submitting}
            className={cn(
              'font-medium',
              isUrgent ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-white text-blue-600 hover:bg-blue-50'
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Nộp bài'}
          </Button>
        </div>
        <Progress value={(answeredCount / totalCount) * 100} className="h-1 rounded-none bg-white/30" />
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full gap-4 p-4">
        {/* Câu hỏi */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* Question */}
            <div className="flex items-start gap-3 mb-6">
              <span className="text-blue-600 font-bold text-lg flex-shrink-0">{currentIdx + 1}.</span>
              <div className="flex-1">
                <p className="text-gray-900 font-medium leading-relaxed">{currentQ.question_text}</p>
                {currentQ.image_url && (
                  <img src={currentQ.image_url} alt="Hình minh hoạ" className="mt-3 max-h-48 rounded-lg" />
                )}
              </div>
              <button
                onClick={() => toggleFlag(currentQ.id)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors flex-shrink-0',
                  flagged.has(currentQ.id)
                    ? 'text-orange-500 bg-orange-50'
                    : 'text-gray-300 hover:text-orange-400 hover:bg-orange-50'
                )}
                title="Đánh dấu xem lại"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {OPTIONS.map(opt => {
                const optKey = `option_${opt.toLowerCase()}` as keyof ExamQuestion
                const optText = currentQ[optKey] as string
                const isSelected = answers[currentQ.id] === opt

                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(currentQ.id, opt)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                    )}
                  >
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {opt}
                    </span>
                    <span className={cn('text-sm leading-relaxed', isSelected ? 'text-blue-900 font-medium' : 'text-gray-700')}>
                      {optText}
                    </span>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 ml-auto mt-0.5" />}
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
              >
                ← Câu trước
              </Button>
              <span className="text-sm text-gray-400">{currentIdx + 1} / {totalCount}</span>
              <Button
                variant="outline"
                onClick={() => setCurrentIdx(i => Math.min(totalCount - 1, i + 1))}
                disabled={currentIdx === totalCount - 1}
              >
                Câu tiếp →
              </Button>
            </div>
          </div>
        </div>

        {/* Panel câu hỏi sidebar */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Bảng câu hỏi</p>
            <div className="grid grid-cols-5 gap-1.5">
              {orderedQuestions.map((q, idx) => {
                const isAnswered = !!answers[q.id]
                const isFlagged = flagged.has(q.id)
                const isCurrent = idx === currentIdx
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                      isCurrent
                        ? 'bg-blue-600 text-white scale-110 shadow'
                        : isFlagged
                        ? 'bg-orange-100 text-orange-600 border border-orange-300'
                        : isAnswered
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
                Đã trả lời
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                Đánh dấu
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-100" />
                Chưa làm
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 mb-1">{answeredCount}/{totalCount} đã trả lời</p>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-xs"
                onClick={() => handleSubmit()}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Nộp bài'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
