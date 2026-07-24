'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { BookOpen, Trophy, Clock, ArrowRight, Hash, GraduationCap, Zap, CalendarCheck } from 'lucide-react'
import type { User, Attempt } from '@/types/database'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface StudentDashboardProps {
  user: User
}

interface AttemptWithExam extends Attempt {
  exams: { title: string; subject: string }
}

interface ContestItem {
  id: string
  title: string
  start_time: string
  end_time: string
  exams: { title: string }
  classes: { name: string }
}

interface AssignmentItem {
  id: string
  title: string
  due_date: string | null
  exams: { id: string; title: string }
  classes: { name: string }
}

export function StudentDashboard({ user }: StudentDashboardProps) {
  const router = useRouter()
  const [attempts, setAttempts] = useState<AttemptWithExam[]>([])
  const [contests, setContests] = useState<ContestItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  const [accessCode, setAccessCode] = useState('')
  const [joining, setJoining] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [attRes, contestRes, assignRes] = await Promise.all([
        supabase
          .from('attempts')
          .select('*, exams(title, subject)')
          .eq('student_id', user.id)
          .order('started_at', { ascending: false })
          .limit(10),
        supabase
          .from('contests')
          .select('id, title, start_time, end_time, exams(title), classes(name)')
          .gte('end_time', new Date().toISOString())
          .order('start_time'),
        supabase
          .from('assignments')
          .select('id, title, due_date, exams(id, title), classes(name)')
          .order('due_date', { ascending: true, nullsFirst: false }),
      ])
      setAttempts((attRes.data || []) as AttemptWithExam[])
      setContests((contestRes.data || []) as unknown as ContestItem[])
      setAssignments((assignRes.data || []) as unknown as AssignmentItem[])
    }
    load()
  }, [user.id])

  async function handleJoinByCode() {
    if (!accessCode.trim()) return
    setJoining(true)
    try {
      const { data: exam } = await supabase
        .from('exams')
        .select('id')
        .eq('access_code', accessCode.toUpperCase())
        .eq('is_published', true)
        .single()

      if (!exam) {
        toast.error('Mã thi không đúng hoặc đề thi chưa được phát')
        return
      }
      router.push(`/exam/${exam.id}`)
    } catch {
      toast.error('Không tìm thấy đề thi với mã này')
    } finally {
      setJoining(false)
    }
  }

  const stats = {
    total: attempts.length,
    submitted: attempts.filter(a => a.status === 'submitted').length,
    avgScore: attempts.filter(a => a.score != null && a.total_points).length > 0
      ? (attempts.filter(a => a.score != null && a.total_points)
          .reduce((sum, a) => sum + (a.score! / a.total_points!) * 10, 0) /
          attempts.filter(a => a.score != null && a.total_points).length).toFixed(1)
      : '-',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Xin chào, {user.full_name.split(' ').pop()}! 👋
        </h1>
        <p className="text-gray-500 mt-1">Hôm nay bạn muốn ôn tập gì?</p>
      </div>

      {/* Join by code */}
      <Card className="border-2 border-blue-100 bg-blue-50/50 shadow-none">
        <CardContent className="p-5">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600" /> Vào thi bằng mã code
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập mã thi (VD: ABC123)"
              value={accessCode}
              onChange={e => setAccessCode(e.target.value.toUpperCase())}
              className="bg-white font-mono text-lg tracking-widest"
              maxLength={6}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            />
            <Button onClick={handleJoinByCode} disabled={joining || !accessCode}
              className="bg-blue-600 hover:bg-blue-700 px-6">
              Vào thi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng lượt thi', value: stats.total, icon: <BookOpen className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Đã nộp', value: stats.submitted, icon: <Trophy className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
          { label: 'Điểm TB (10)', value: stats.avgScore, icon: <Clock className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                {s.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming contests */}
      {contests.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Cuộc thi sắp diễn ra
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {contests.slice(0, 3).map(c => {
                const now = new Date()
                const isLive = now >= new Date(c.start_time) && now <= new Date(c.end_time)
                return (
                  <Link
                    key={c.id}
                    href={`/student/contest/${c.id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.title}</span>
                        {isLive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Đang diễn ra</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {c.classes?.name} · {format(new Date(c.start_time), 'HH:mm dd/MM', { locale: vi })}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments */}
      {assignments.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-blue-500" /> Bài tập được giao
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {assignments.slice(0, 3).map(a => (
                <Link
                  key={a.id}
                  href={`/exam/${a.exams?.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.classes?.name}
                      {a.due_date && ` · Hạn: ${format(new Date(a.due_date), 'HH:mm dd/MM', { locale: vi })}`}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curriculum link */}
      <Link href="/student/curriculum"
        className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 transition-colors">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-900">Học theo bài</div>
          <div className="text-sm text-gray-500">Kiểm tra từng bài theo chương trình Tin 10 / 11 / 12</div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
      </Link>

      {/* Practice link */}
      <Link href="/student/practice"
        className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 hover:border-green-200 transition-colors">
        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-900">Luyện tập tự do</div>
          <div className="text-sm text-gray-500">Thi thử từ ngân hàng câu hỏi public</div>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
      </Link>

      {/* History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lịch sử thi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bạn chưa thi lần nào</p>
            </div>
          ) : (
            <div className="divide-y">
              {attempts.map(a => {
                const pct = a.score != null && a.total_points
                  ? Math.round((a.score / a.total_points) * 100)
                  : null
                return (
                  <Link key={a.id} href={a.status === 'submitted' ? `/exam/${a.exam_id}/result?attemptId=${a.id}` : `/exam/${a.exam_id}`}
                    className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{a.exams?.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(a.started_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </div>
                    </div>
                    {a.status === 'submitted' && pct != null ? (
                      <Badge className={
                        pct >= 80 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                        pct >= 50 ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' :
                        'bg-red-100 text-red-700 hover:bg-red-100'
                      }>
                        {pct}%
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Đang thi
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
