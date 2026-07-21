'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Clock, Trophy, ArrowLeft, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Exam, Attempt } from '@/types/database'

interface AnswerWithQuestion {
  question_id: string
  selected_answer: string | null
  is_correct: boolean | null
  questions: {
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: string
    explanation: string | null
  }
}

interface ExamResultProps {
  exam: Exam
  attempt: Attempt
  answers: AnswerWithQuestion[]
  examQuestions: { question_id: string; order_index: number; points: number }[]
}

export function ExamResult({ exam, attempt, answers, examQuestions }: ExamResultProps) {
  const score = attempt.score || 0
  const total = attempt.total_points || 1
  const pct = Math.round((score / total) * 100)
  const grade10 = ((score / total) * 10).toFixed(1)

  const correctCount = answers.filter(a => a.is_correct).length
  const wrongCount = answers.filter(a => !a.is_correct && a.selected_answer).length
  const skippedCount = answers.filter(a => !a.selected_answer).length

  const minutes = attempt.time_spent_seconds ? Math.floor(attempt.time_spent_seconds / 60) : 0
  const seconds = attempt.time_spent_seconds ? attempt.time_spent_seconds % 60 : 0

  const getGradeColor = () => {
    if (pct >= 80) return 'text-green-600'
    if (pct >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGradeBg = () => {
    if (pct >= 80) return 'bg-green-50 border-green-200'
    if (pct >= 50) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  const sortedAnswers = examQuestions
    .map(eq => ({
      ...eq,
      answer: answers.find(a => a.question_id === eq.question_id),
    }))
    .filter(item => item.answer)

  const OPTIONS = ['A', 'B', 'C', 'D']
  const optionKeys: Record<string, string> = {
    A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500 truncate">{exam.title}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Score card */}
        <Card className={`border-2 ${getGradeBg()} shadow-none`}>
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              {pct >= 50 ? (
                <Trophy className={`w-12 h-12 ${getGradeColor()}`} />
              ) : (
                <BookOpen className={`w-12 h-12 ${getGradeColor()}`} />
              )}
            </div>
            <div className={`text-5xl font-bold ${getGradeColor()} mb-1`}>{grade10}</div>
            <div className="text-gray-500 text-sm mb-4">điểm / 10</div>

            <Progress value={pct} className="h-3 mb-4" />

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{correctCount}</div>
                <div className="text-xs text-gray-500">Câu đúng</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-500">{wrongCount}</div>
                <div className="text-xs text-gray-500">Câu sai</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{skippedCount}</div>
                <div className="text-xs text-gray-500">Bỏ qua</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
              <div className="font-semibold text-gray-900">{minutes}:{seconds.toString().padStart(2, '0')}</div>
              <div className="text-xs text-gray-400">Thời gian làm</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <div className="font-semibold text-gray-900">{pct}%</div>
              <div className="text-xs text-gray-400">Tỉ lệ đúng</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <div className="font-semibold text-gray-900">{score}/{total}</div>
              <div className="text-xs text-gray-400">Điểm số</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed answers */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Đáp án chi tiết</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedAnswers.map(({ answer, order_index }) => {
              if (!answer) return null
              const q = answer.questions
              const isCorrect = answer.is_correct
              const selected = answer.selected_answer
              const correct = q.correct_answer

              return (
                <div key={answer.question_id} className={cn(
                  'rounded-xl border p-4',
                  isCorrect ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'
                )}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-sm font-bold text-gray-500 flex-shrink-0">{order_index}.</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{q.question_text}</p>
                    </div>
                    <Badge className={cn('flex-shrink-0', isCorrect
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : 'bg-red-100 text-red-700 hover:bg-red-100'
                    )}>
                      {isCorrect ? '✓ Đúng' : '✗ Sai'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 ml-5">
                    {OPTIONS.map(opt => {
                      const key = optionKeys[opt]
                      const text = q[key as keyof typeof q] as string
                      const isCorrectOpt = opt === correct
                      const isSelectedOpt = opt === selected
                      return (
                        <div key={opt} className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
                          isCorrectOpt
                            ? 'bg-green-100 text-green-800 font-medium'
                            : isSelectedOpt && !isCorrectOpt
                            ? 'bg-red-100 text-red-800 line-through'
                            : 'text-gray-600'
                        )}>
                          <span className={cn(
                            'w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0',
                            isCorrectOpt ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                          )}>{opt}</span>
                          <span>{text}</span>
                          {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 ml-auto" />}
                          {isSelectedOpt && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-red-500 ml-auto" />}
                        </div>
                      )
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 ml-5 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs font-medium text-blue-700 mb-1">💡 Giải thích:</p>
                      <p className="text-xs text-blue-800">{q.explanation}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/dashboard"
            className={cn(buttonVariants(), 'flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white')}>
            Về Dashboard
          </Link>
          <Link href="/student/practice"
            className={cn(buttonVariants({ variant: 'outline' }))}>
            Luyện tập tiếp
          </Link>
        </div>
      </div>
    </div>
  )
}
