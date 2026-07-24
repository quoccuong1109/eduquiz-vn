import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Trophy, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

const MEDALS = ['🥇', '🥈', '🥉']

export default async function TeacherContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: contest } = await supabase
    .from('contests')
    .select('id, title, start_time, end_time, class_id, exam_id, exams(title, subject), classes(name)')
    .eq('id', id)
    .eq('created_by', user.id)
    .single()

  if (!contest) notFound()

  const { data: attempts } = await supabase
    .from('attempts')
    .select('student_id, score, total_points, status, submitted_at, time_spent_seconds, users(full_name, email)')
    .eq('contest_id', id)
    .order('score', { ascending: false })

  const rows = (attempts ?? []).map(a => ({
    student_id: a.student_id,
    full_name: (a.users as unknown as { full_name: string })?.full_name ?? '—',
    email: (a.users as unknown as { email: string })?.email ?? '',
    score: a.score,
    total_points: a.total_points,
    status: a.status,
    submitted_at: a.submitted_at,
    time_spent_seconds: a.time_spent_seconds,
  })).sort((a, b) => {
    if (a.status === 'submitted' && b.status !== 'submitted') return -1
    if (a.status !== 'submitted' && b.status === 'submitted') return 1
    if (a.status === 'submitted' && b.status === 'submitted') {
      const pA = a.total_points ? (a.score ?? 0) / a.total_points : 0
      const pB = b.total_points ? (b.score ?? 0) / b.total_points : 0
      if (pA !== pB) return pB - pA
      return (a.time_spent_seconds ?? 9999) - (b.time_spent_seconds ?? 9999)
    }
    return 0
  })

  const now = new Date()
  const isLive = now >= new Date(contest.start_time) && now <= new Date(contest.end_time)

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/teacher/classes/${contest.class_id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="w-4 h-4" /> Quay lại lớp {(contest.classes as unknown as { name: string })?.name}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" /> {contest.title}
              {isLive && <Badge className="bg-green-100 text-green-700 text-xs">Đang diễn ra</Badge>}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {(contest.exams as unknown as { title: string })?.title} ·{' '}
              {format(new Date(contest.start_time), 'HH:mm', { locale: vi })} → {format(new Date(contest.end_time), 'HH:mm dd/MM/yyyy', { locale: vi })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> {rows.length} học sinh
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Học sinh</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Điểm</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Thời gian</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Nộp lúc</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Chưa có học sinh nào tham gia</td></tr>
              ) : rows.map((r, idx) => {
                const pct = r.total_points ? Math.round((r.score ?? 0) / r.total_points * 100) : null
                const score10 = r.total_points ? ((r.score ?? 0) / r.total_points * 10).toFixed(1) : '—'
                const mins = r.time_spent_seconds ? Math.floor(r.time_spent_seconds / 60) : null
                const secs = r.time_spent_seconds ? r.time_spent_seconds % 60 : null
                return (
                  <tr key={r.student_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-center">
                      {idx < 3 && r.status === 'submitted' ? (
                        <span className="text-lg">{MEDALS[idx]}</span>
                      ) : (
                        <span className="text-muted-foreground">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{r.email}</td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'submitted' && pct !== null ? (
                        <div>
                          <span className={`font-bold text-base ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {score10}
                          </span>
                          <span className="text-xs text-muted-foreground">/10</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-xs hidden lg:table-cell">
                      {mins !== null ? `${mins}p${secs}s` : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {r.submitted_at ? format(new Date(r.submitted_at), 'HH:mm:ss', { locale: vi }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'submitted' ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Đã nộp</Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1 justify-center">
                          <Clock className="w-3 h-3" /> Đang thi
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
