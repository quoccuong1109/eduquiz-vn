'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy, Clock, ArrowLeft, CheckCircle2, Circle,
  Medal, Users, Loader2, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { AnswerOption } from '@/types/database'

interface ContestInfo {
  id: string
  title: string
  start_time: string
  end_time: string
  exam_id: string
  class_id: string
  exams: {
    title: string
    duration_minutes: number
    shuffle_questions: boolean
  }
}

interface QuestionData {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  order_index: number
  points: number
}

interface RankingRow {
  student_id: string
  full_name: string
  score: number | null
  total_points: number | null
  status: string
  submitted_at: string | null
  time_spent_seconds: number | null
}

type ContestPhase = 'waiting' | 'taking' | 'finished' | 'ended'

const MEDALS = ['🥇', '🥈', '🥉']

export function ContestRoom({
  contest,
  userId,
  userName,
}: {
  contest: ContestInfo
  userId: string
  userName: string
}) {
  const supabase = createClient()

  const now = new Date()
  const start = new Date(contest.start_time)
  const end = new Date(contest.end_time)

  function getPhase(): ContestPhase {
    const n = new Date()
    if (n < start) return 'waiting'
    if (n > end) return 'ended'
    return 'taking'
  }

  const [phase, setPhase] = useState<ContestPhase>(getPhase)
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [myScore, setMyScore] = useState<{ score: number; total: number } | null>(null)
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [loadingQ, setLoadingQ] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Countdown to start ────────────────────────────────
  const [msToStart, setMsToStart] = useState(Math.max(0, start.getTime() - now.getTime()))

  useEffect(() => {
    if (phase !== 'waiting') return
    const id = setInterval(() => {
      const left = start.getTime() - Date.now()
      if (left <= 0) {
        setMsToStart(0)
        setPhase('taking')
        clearInterval(id)
      } else {
        setMsToStart(left)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [phase, start])

  // ── Load questions ────────────────────────────────────
  const loadQuestions = useCallback(async () => {
    setLoadingQ(true)
    const { data: eqs } = await supabase
      .from('exam_questions')
      .select('question_id, order_index, points, questions(id, question_text, option_a, option_b, option_c, option_d)')
      .eq('exam_id', contest.exam_id)
      .order('order_index')

    const qs: QuestionData[] = (eqs ?? []).map(eq => ({
      id: (eq.questions as unknown as { id: string }).id,
      question_text: (eq.questions as unknown as { question_text: string }).question_text,
      option_a: (eq.questions as unknown as { option_a: string }).option_a,
      option_b: (eq.questions as unknown as { option_b: string }).option_b,
      option_c: (eq.questions as unknown as { option_c: string }).option_c,
      option_d: (eq.questions as unknown as { option_d: string }).option_d,
      order_index: eq.order_index,
      points: eq.points,
    }))
    setQuestions(qs)
    setLoadingQ(false)
  }, [contest.exam_id, supabase])

  // ── Create attempt ────────────────────────────────────
  const startAttempt = useCallback(async () => {
    // Check if already has attempt in this contest
    const { data: existing } = await supabase
      .from('attempts')
      .select('id, status, score, total_points')
      .eq('exam_id', contest.exam_id)
      .eq('student_id', userId)
      .eq('contest_id', contest.id)
      .single()

    if (existing) {
      setAttemptId(existing.id)
      if (existing.status === 'submitted') {
        setSubmitted(true)
        setMyScore({ score: existing.score ?? 0, total: existing.total_points ?? 0 })
      }
      return existing.id
    }

    const { data, error } = await supabase
      .from('attempts')
      .insert({ exam_id: contest.exam_id, student_id: userId, contest_id: contest.id })
      .select('id')
      .single()

    if (error || !data) { toast.error('Không thể tạo lượt thi'); return null }
    setAttemptId(data.id)
    return data.id
  }, [contest.exam_id, contest.id, userId, supabase])

  // ── Timer ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'taking' || submitted) return
    const endMs = end.getTime()
    const durationMs = contest.exams.duration_minutes * 60 * 1000
    const startMs = start.getTime()
    const personalEnd = Math.min(endMs, startMs + durationMs)

    const update = () => {
      const left = Math.max(0, personalEnd - Date.now())
      setTimeLeft(left)
      if (left === 0) handleSubmit()
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, submitted])

  // ── Init when taking starts ────────────────────────────
  useEffect(() => {
    if (phase === 'taking') {
      loadQuestions()
      startAttempt()
    }
  }, [phase])

  // ── Realtime ranking ──────────────────────────────────
  useEffect(() => {
    if (phase === 'ended') return

    async function loadRanking() {
      const { data } = await supabase
        .from('attempts')
        .select('student_id, score, total_points, status, submitted_at, time_spent_seconds, users(full_name)')
        .eq('contest_id', contest.id)
        .order('score', { ascending: false })

      const rows: RankingRow[] = (data ?? []).map(r => ({
        student_id: r.student_id,
        full_name: (r.users as unknown as { full_name: string })?.full_name ?? 'Ẩn danh',
        score: r.score,
        total_points: r.total_points,
        status: r.status,
        submitted_at: r.submitted_at,
        time_spent_seconds: r.time_spent_seconds,
      }))

      // Sort: submitted first (by score desc, then time asc), then in_progress
      rows.sort((a, b) => {
        if (a.status === 'submitted' && b.status !== 'submitted') return -1
        if (a.status !== 'submitted' && b.status === 'submitted') return 1
        if (a.status === 'submitted' && b.status === 'submitted') {
          const pctA = a.total_points ? (a.score ?? 0) / a.total_points : 0
          const pctB = b.total_points ? (b.score ?? 0) / b.total_points : 0
          if (pctA !== pctB) return pctB - pctA
          return (a.time_spent_seconds ?? 9999) - (b.time_spent_seconds ?? 9999)
        }
        return 0
      })
      setRanking(rows)
    }

    loadRanking()

    const channel = supabase
      .channel(`contest:${contest.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attempts', filter: `contest_id=eq.${contest.id}` },
        () => loadRanking()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [contest.id, phase, supabase])

  // ── Answer + save ─────────────────────────────────────
  async function selectAnswer(questionId: string, answer: AnswerOption) {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    if (!attemptId) return
    await supabase.from('attempt_answers').upsert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: answer,
    }, { onConflict: 'attempt_id,question_id' })
  }

  // ── Submit ────────────────────────────────────────────
  async function handleSubmit() {
    if (submitting || submitted || !attemptId) return
    setSubmitting(true)
    if (timerRef.current) clearInterval(timerRef.current)

    const { data, error } = await supabase.rpc('submit_exam', { p_attempt_id: attemptId })
    if (error) { toast.error('Lỗi nộp bài'); setSubmitting(false); return }

    setMyScore({ score: data.score, total: data.total_points })
    setSubmitted(true)
    setSubmitting(false)
    toast.success('Đã nộp bài!')
  }

  function formatTime(ms: number) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  function formatCountdown(ms: number) {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h} giờ ${m} phút`
    if (m > 0) return `${m} phút ${sec} giây`
    return `${sec} giây`
  }

  const q = questions[currentIdx]
  const answeredCount = Object.keys(answers).length

  // ── WAITING ───────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className="max-w-lg mx-auto pt-16 text-center px-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{contest.title}</h1>
        <p className="text-muted-foreground mb-6">{contest.exams.title}</p>
        <div className="p-6 rounded-2xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-2">Cuộc thi bắt đầu sau</p>
          <p className="text-4xl font-bold text-blue-600 font-mono">{formatCountdown(msToStart)}</p>
          <p className="text-xs text-blue-600 mt-2">
            {format(start, 'HH:mm - dd/MM/yyyy', { locale: vi })}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Trang sẽ tự động chuyển sang phòng thi khi đến giờ</p>
      </div>
    )
  }

  // ── ENDED (not taking) ────────────────────────────────
  if (phase === 'ended') {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-4">
        <div className="text-center mb-6">
          <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">{contest.title}</h1>
          <p className="text-muted-foreground">Cuộc thi đã kết thúc · {format(end, 'HH:mm dd/MM/yyyy', { locale: vi })}</p>
        </div>
        <RankingPanel ranking={ranking} myId={userId} />
      </div>
    )
  }

  // ── TAKING ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`sticky top-0 z-30 border-b bg-white px-4 py-3 flex items-center justify-between gap-4 ${!submitted && timeLeft < 60000 ? 'border-red-300 bg-red-50' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{contest.title}</p>
            <p className="text-xs text-muted-foreground">
              {submitted ? 'Đã nộp bài' : `${answeredCount}/${questions.length} câu đã trả lời`}
            </p>
          </div>
        </div>
        {!submitted && (
          <div className={`flex items-center gap-1.5 font-mono font-bold text-lg flex-shrink-0 ${timeLeft < 60000 ? 'text-red-600' : 'text-gray-800'}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* ── Main: questions or result ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {submitted ? (
            /* Result card */
            <Card className="overflow-hidden">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-1">Đã nộp bài!</h2>
                {myScore && (
                  <p className="text-4xl font-bold text-blue-600 mt-3">
                    {myScore.total ? ((myScore.score / myScore.total) * 10).toFixed(1) : '—'}
                    <span className="text-lg text-muted-foreground">/10</span>
                  </p>
                )}
                <p className="text-muted-foreground mt-2">
                  {myScore?.score ?? 0}/{myScore?.total ?? 0} điểm · {answeredCount}/{questions.length} câu trả lời
                </p>
                <p className="text-sm text-muted-foreground mt-4">Xem ranking bên phải ↗</p>
              </CardContent>
            </Card>
          ) : loadingQ ? (
            <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : q ? (
            <>
              {/* Progress */}
              <div className="flex items-center gap-3">
                <Progress value={answeredCount / questions.length * 100} className="flex-1 h-2" />
                <span className="text-sm text-muted-foreground flex-shrink-0">{answeredCount}/{questions.length}</span>
              </div>

              {/* Question */}
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-6">
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 rounded-full px-2.5 py-0.5 flex-shrink-0">
                      Câu {currentIdx + 1}
                    </span>
                    <p className="text-base font-medium leading-relaxed">{q.question_text}</p>
                  </div>
                  <div className="space-y-2.5">
                    {(['A', 'B', 'C', 'D'] as AnswerOption[]).map(opt => {
                      const optText = q[`option_${opt.toLowerCase()}` as keyof QuestionData] as string
                      const selected = answers[q.id] === opt
                      return (
                        <button
                          key={opt}
                          onClick={() => selectAnswer(q.id, opt)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{opt}</span>
                          <span className="text-sm">{optText}</span>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>← Câu trước</Button>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
                  {questions.map((qq, i) => (
                    <button
                      key={qq.id}
                      onClick={() => setCurrentIdx(i)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                        i === currentIdx ? 'bg-blue-600 text-white' :
                        answers[qq.id] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                {currentIdx < questions.length - 1 ? (
                  <Button onClick={() => setCurrentIdx(i => i + 1)}>Câu tiếp →</Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Nộp bài
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* ── Ranking sidebar ── */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20">
            <RankingPanel ranking={ranking} myId={userId} />
          </div>
        </div>
      </div>

      {/* Mobile ranking toggle */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <MobileRanking ranking={ranking} myId={userId} />
      </div>
    </div>
  )
}

function RankingPanel({ ranking, myId }: { ranking: RankingRow[]; myId: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" />
        <span className="font-semibold text-sm">Bảng xếp hạng</span>
        <Badge variant="outline" className="ml-auto text-xs">{ranking.length} <Users className="w-3 h-3 ml-1" /></Badge>
      </div>
      <div className="divide-y max-h-[500px] overflow-y-auto">
        {ranking.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Chưa có ai tham gia</div>
        ) : ranking.map((r, idx) => {
          const isMe = r.student_id === myId
          const pct = r.total_points ? Math.round((r.score ?? 0) / r.total_points * 100) : null
          return (
            <div key={r.student_id} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-blue-50' : ''}`}>
              <span className="text-base w-6 text-center flex-shrink-0">
                {idx < 3 ? MEDALS[idx] : <span className="text-xs text-muted-foreground">{idx + 1}</span>}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isMe ? 'text-blue-700' : ''}`}>
                  {r.full_name}{isMe ? ' (bạn)' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.status === 'submitted'
                    ? `${r.time_spent_seconds ? Math.floor(r.time_spent_seconds / 60) + 'p' + (r.time_spent_seconds % 60) + 's' : ''}`
                    : 'Đang làm...'}
                </p>
              </div>
              {r.status === 'submitted' && pct !== null ? (
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {r.total_points ? ((r.score ?? 0) / r.total_points * 10).toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">/10</p>
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function MobileRanking({ ranking, myId }: { ranking: RankingRow[]; myId: string }) {
  const [open, setOpen] = useState(false)
  const myRank = ranking.findIndex(r => r.student_id === myId) + 1

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center relative"
      >
        <Trophy className="w-5 h-5" />
        {myRank > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-gray-800 rounded-full text-xs font-bold flex items-center justify-center">
            {myRank}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-16 right-0 w-72">
          <RankingPanel ranking={ranking} myId={myId} />
        </div>
      )}
    </>
  )
}
