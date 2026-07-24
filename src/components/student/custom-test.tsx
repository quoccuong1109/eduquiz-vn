'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CURRICULUM } from '@/lib/curriculum'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Clock, Loader2, Trophy, ChevronRight, RotateCcw, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Question, AnswerOption } from '@/types/database'

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D']
const optionKeys: Record<string, string> = {
  A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d',
}

const QUESTION_COUNTS = [10, 15, 20, 30]
const TIME_OPTIONS = [
  { label: 'Không giới hạn', value: 0 },
  { label: '10 phút', value: 10 },
  { label: '15 phút', value: 15 },
  { label: '20 phút', value: 20 },
  { label: '30 phút', value: 30 },
  { label: '45 phút', value: 45 },
]

type Step = 'config' | 'taking' | 'results'

interface TestAnswer {
  questionId: string
  selected: AnswerOption | null
}

export function CustomTest({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>('config')

  // Config state
  const [grade, setGrade] = useState<10 | 11 | 12>(12)
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set())
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set())
  const [questionCount, setQuestionCount] = useState(15)
  const [timeLimitMin, setTimeLimitMin] = useState(0)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [configError, setConfigError] = useState('')

  // Test state
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<TestAnswer[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()
  const curriculum = CURRICULUM.find(g => g.grade === grade)!

  // Khi chọn grade, reset selection
  useEffect(() => {
    setSelectedChapters(new Set())
    setSelectedLessons(new Set())
  }, [grade])

  // Timer countdown
  useEffect(() => {
    if (step !== 'taking' || timeLimitMin === 0 || submitted) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [step, timeLimitMin, submitted])

  function toggleChapter(idx: number) {
    const lessons = curriculum.chapters.find(c => c.index === idx)?.lessons ?? []
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
        setSelectedLessons(pl => {
          const nl = new Set(pl)
          lessons.forEach(l => nl.delete(l.tag))
          return nl
        })
      } else {
        next.add(idx)
        setSelectedLessons(pl => {
          const nl = new Set(pl)
          lessons.forEach(l => nl.add(l.tag))
          return nl
        })
      }
      return next
    })
  }

  function toggleLesson(tag: string, chapterIdx: number) {
    setSelectedLessons(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      // Update chapter checkbox state
      const chapter = curriculum.chapters.find(c => c.index === chapterIdx)
      if (chapter) {
        const allSelected = chapter.lessons.every(l => next.has(l.tag))
        setSelectedChapters(pc => {
          const nc = new Set(pc)
          if (allSelected) nc.add(chapterIdx)
          else nc.delete(chapterIdx)
          return nc
        })
      }
      return next
    })
  }

  async function handleStart() {
    if (selectedLessons.size === 0) {
      setConfigError('Vui lòng chọn ít nhất một bài học')
      return
    }
    setConfigError('')
    setLoadingQuestions(true)

    const tags = Array.from(selectedLessons)
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('is_public', true)
      .overlaps('tags', tags)

    const shuffled = (data || []).sort(() => Math.random() - 0.5).slice(0, questionCount)

    if (shuffled.length === 0) {
      setConfigError('Không tìm thấy câu hỏi cho các bài đã chọn. Giáo viên chưa thêm câu hỏi công khai cho bài này.')
      setLoadingQuestions(false)
      return
    }

    setQuestions(shuffled)
    setAnswers(shuffled.map(q => ({ questionId: q.id, selected: null })))
    setCurrentIdx(0)
    setSubmitted(false)
    setTimeLeft(timeLimitMin * 60)
    setLoadingQuestions(false)
    setStep('taking')
  }

  function selectAnswer(opt: AnswerOption) {
    setAnswers(prev => prev.map((a, i) =>
      i === currentIdx ? { ...a, selected: opt } : a
    ))
  }

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    setStep('results')
  }, [])

  function handleReset() {
    setStep('config')
    setSelectedChapters(new Set())
    setSelectedLessons(new Set())
    setQuestions([])
    setAnswers([])
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ─── STEP: CONFIG ────────────────────────────────────────────────
  if (step === 'config') {
    const totalSelected = selectedLessons.size
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tự tạo đề kiểm tra</h1>
          <p className="text-gray-500 text-sm mt-1">Chọn nội dung, số câu và thời gian để tạo đề luyện tập cho bản thân</p>
        </div>

        {/* Grade */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">1. Chọn lớp</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex gap-2">
              {([10, 11, 12] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border-2',
                    grade === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                  )}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chapter/Lesson selector */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">2. Chọn bài học</CardTitle>
              {totalSelected > 0 && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                  Đã chọn {totalSelected} bài
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {curriculum.chapters.map(chapter => {
              const chapterSelected = selectedChapters.has(chapter.index)
              const partialSelected = !chapterSelected && chapter.lessons.some(l => selectedLessons.has(l.tag))
              return (
                <div key={chapter.index} className="border border-gray-200 rounded-xl overflow-hidden">
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={chapterSelected}
                      ref={el => { if (el) el.indeterminate = partialSelected }}
                      onChange={() => toggleChapter(chapter.index)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800">
                        Chủ đề {chapter.index}: {chapter.title}
                      </span>
                      {chapter.isCSOnly && (
                        <span className="ml-2 text-xs text-purple-600 font-medium">CS</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{chapter.lessons.length} bài</span>
                  </label>
                  <div className="border-t border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
                    {chapter.lessons.map(lesson => (
                      <label key={lesson.tag} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedLessons.has(lesson.tag)}
                          onChange={() => toggleLesson(lesson.tag, chapter.index)}
                          className="w-3.5 h-3.5 rounded accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">
                          <span className="text-gray-400 mr-1">Bài {lesson.lessonNumber}.</span>
                          {lesson.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">3. Cài đặt đề thi</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Số câu hỏi</label>
              <div className="flex gap-2">
                {QUESTION_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all',
                      questionCount === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                    )}
                  >
                    {n} câu
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Thời gian làm bài</label>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTimeLimitMin(opt.value)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-semibold border-2 transition-all',
                      timeLimitMin === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {configError && (
          <p className="text-sm text-red-600 text-center">{configError}</p>
        )}

        <Button
          onClick={handleStart}
          disabled={loadingQuestions || selectedLessons.size === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
        >
          {loadingQuestions ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo đề...</>
          ) : (
            <><BookOpen className="w-4 h-4 mr-2" /> Bắt đầu làm bài</>
          )}
        </Button>
      </div>
    )
  }

  // ─── STEP: TAKING ────────────────────────────────────────────────
  if (step === 'taking') {
    const q = questions[currentIdx]
    const currentAnswer = answers[currentIdx]?.selected
    const answered = answers.filter(a => a.selected !== null).length

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Câu <strong>{currentIdx + 1}</strong>/{questions.length}
            <span className="ml-2 text-gray-400">({answered} đã trả lời)</span>
          </div>
          {timeLimitMin > 0 && (
            <div className={cn(
              'flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full',
              timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
            )}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
        <Progress value={(currentIdx / questions.length) * 100} className="h-1.5" />

        {/* Question panel */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex gap-2 mb-4">
              <Badge className={
                q.difficulty === 'easy' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                'bg-red-100 text-red-700 hover:bg-red-100'
              }>
                {q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
              </Badge>
            </div>

            <p className="text-gray-900 font-medium leading-relaxed mb-5">{q.question_text}</p>

            <div className="space-y-2.5">
              {OPTIONS.map(opt => {
                const key = optionKeys[opt]
                const text = q[key as keyof Question] as string
                const isSelected = opt === currentAnswer

                return (
                  <button
                    key={opt}
                    onClick={() => selectAnswer(opt)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'
                    )}
                  >
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    )}>
                      {opt}
                    </span>
                    <span className="text-sm text-gray-800 flex-1">{text}</span>
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="mt-5 flex gap-2">
              {currentIdx > 0 && (
                <Button variant="outline" onClick={() => setCurrentIdx(i => i - 1)} className="flex-1">
                  ← Câu trước
                </Button>
              )}
              {currentIdx < questions.length - 1 ? (
                <Button onClick={() => setCurrentIdx(i => i + 1)} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Câu tiếp <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Nộp bài ({answered}/{questions.length} câu)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question navigator */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Điều hướng câu hỏi</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-xs font-semibold border-2 transition-all',
                    i === currentIdx ? 'border-blue-600 bg-blue-600 text-white' :
                    answers[i]?.selected ? 'border-green-400 bg-green-50 text-green-700' :
                    'border-gray-200 bg-white text-gray-500 hover:border-blue-300'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-200 inline-block" /> Đã trả lời
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Đang xem
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── STEP: RESULTS ───────────────────────────────────────────────
  const correctCount = answers.filter((a, i) => a.selected === questions[i]?.correct_answer).length
  const score = Math.round((correctCount / questions.length) * 10 * 10) / 10

  const scoreColor = score >= 8 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-500'
  const scoreBg = score >= 8 ? 'bg-green-50 border-green-200' : score >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kết quả kiểm tra</h1>
      </div>

      {/* Score card */}
      <Card className={cn('border-2', scoreBg)}>
        <CardContent className="p-6 text-center">
          <Trophy className={cn('w-10 h-10 mx-auto mb-3', scoreColor)} />
          <div className={cn('text-5xl font-bold mb-1', scoreColor)}>{score}</div>
          <div className="text-gray-500 text-sm mb-4">điểm (thang 10)</div>
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-gray-400">Câu đúng</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{questions.length - correctCount}</div>
              <div className="text-gray-400">Câu sai</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">{questions.length}</div>
              <div className="text-gray-400">Tổng câu</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail review */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Chi tiết từng câu</h2>
        {questions.map((q, i) => {
          const userAnswer = answers[i]?.selected
          const isCorrect = userAnswer === q.correct_answer
          return (
            <Card key={q.id} className={cn('border', isCorrect ? 'border-green-100' : 'border-red-100')}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {isCorrect
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      <span className="text-gray-400 mr-1.5">Câu {i + 1}.</span>
                      {q.question_text}
                    </p>
                    <div className="flex gap-3 text-xs">
                      {!isCorrect && userAnswer && (
                        <span className="text-red-600">
                          Bạn chọn: <strong>{userAnswer}</strong> — {q[`option_${userAnswer.toLowerCase()}` as keyof Question] as string}
                        </span>
                      )}
                      {!isCorrect && !userAnswer && (
                        <span className="text-gray-400">Chưa trả lời</span>
                      )}
                      <span className="text-green-700">
                        Đáp án: <strong>{q.correct_answer}</strong> — {q[`option_${q.correct_answer.toLowerCase()}` as keyof Question] as string}
                      </span>
                    </div>
                    {!isCorrect && q.explanation && (
                      <div className="mt-2 p-2.5 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-700">💡 {q.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={handleReset} className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" /> Tạo đề mới
        </Button>
        <Button onClick={handleStart} className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2">
          <Loader2 className="w-4 h-4" /> Làm lại đề này
        </Button>
      </div>
    </div>
  )
}
