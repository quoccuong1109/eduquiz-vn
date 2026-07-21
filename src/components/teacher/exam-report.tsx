'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Download, Users, BarChart2, Clock, Trophy, AlertTriangle } from 'lucide-react'
import type { Exam } from '@/types/database'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface StudentResult {
  student_id: string
  full_name: string
  score: number | null
  total_points: number | null
  submitted_at: string | null
  time_spent_seconds: number | null
  status: string
}

interface QuestionStat {
  question_id: string
  question_text: string
  correct_answer: string
  total: number
  correct: number
  dist: Record<string, number>
}

interface ExamReportProps {
  exam: Exam
}

export function ExamReport({ exam }: ExamReportProps) {
  const [students, setStudents] = useState<StudentResult[]>([])
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadReport()
  }, [exam.id])

  async function loadReport() {
    setLoading(true)

    // Lấy tất cả attempts + user info
    const { data: attempts } = await supabase
      .from('attempts')
      .select('*, users(full_name)')
      .eq('exam_id', exam.id)
      .order('score', { ascending: false })

    const studentResults: StudentResult[] = (attempts || []).map(a => ({
      student_id: a.student_id,
      full_name: (a.users as unknown as { full_name: string })?.full_name || 'Ẩn danh',
      score: a.score,
      total_points: a.total_points,
      submitted_at: a.submitted_at,
      time_spent_seconds: a.time_spent_seconds,
      status: a.status,
    }))
    setStudents(studentResults)

    // Lấy thống kê từng câu hỏi
    const { data: examQs } = await supabase
      .from('exam_questions')
      .select('question_id, questions(question_text, correct_answer)')
      .eq('exam_id', exam.id)

    if (examQs && attempts) {
      const attemptIds = attempts.filter(a => a.status === 'submitted').map(a => a.id)

      const stats: QuestionStat[] = []
      for (const eq of examQs) {
        const q = eq.questions as unknown as { question_text: string; correct_answer: string }
        if (!q) continue

        const { data: answers } = await supabase
          .from('attempt_answers')
          .select('selected_answer, is_correct')
          .eq('question_id', eq.question_id)
          .in('attempt_id', attemptIds)

        const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
        let correct = 0
        for (const a of (answers || [])) {
          if (a.selected_answer) dist[a.selected_answer] = (dist[a.selected_answer] || 0) + 1
          if (a.is_correct) correct++
        }

        stats.push({
          question_id: eq.question_id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          total: answers?.length || 0,
          correct,
          dist,
        })
      }

      // Sắp xếp: câu sai nhiều nhất lên đầu
      stats.sort((a, b) => (a.correct / (a.total || 1)) - (b.correct / (b.total || 1)))
      setQuestionStats(stats)
    }

    setLoading(false)
  }

  async function exportExcel() {
    const { default: XLSX } = await import('xlsx')
    const data = students.map((s, i) => ({
      'STT': i + 1,
      'Họ và tên': s.full_name,
      'Điểm': s.score != null && s.total_points
        ? ((s.score / s.total_points) * 10).toFixed(1)
        : '-',
      'Điểm gốc': s.score != null ? `${s.score}/${s.total_points}` : '-',
      '% đúng': s.score != null && s.total_points
        ? `${Math.round((s.score / s.total_points) * 100)}%`
        : '-',
      'Thời gian (phút)': s.time_spent_seconds ? Math.round(s.time_spent_seconds / 60) : '-',
      'Nộp lúc': s.submitted_at ? format(new Date(s.submitted_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-',
      'Trạng thái': s.status === 'submitted' ? 'Đã nộp' : 'Đang thi',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm')
    XLSX.writeFile(wb, `${exam.title.replace(/\s+/g, '_')}_ketqua.xlsx`)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  const submitted = students.filter(s => s.status === 'submitted')
  const avgScore = submitted.length > 0
    ? submitted.reduce((sum, s) => sum + (s.score != null && s.total_points ? (s.score / s.total_points) * 10 : 0), 0) / submitted.length
    : 0
  const highest = submitted.reduce((max, s) => {
    const pct = s.score != null && s.total_points ? (s.score / s.total_points) * 10 : 0
    return pct > max ? pct : max
  }, 0)

  // TOP 5 câu sai nhiều nhất
  const weakQuestions = questionStats.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
          <p className="text-gray-500 text-sm mt-1">Báo cáo kết quả thi</p>
        </div>
        <Button onClick={exportExcel} variant="outline">
          <Download className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Tổng quan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Lượt thi', value: students.length, icon: <Users className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Đã nộp', value: submitted.length, icon: <BarChart2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
          { label: 'Điểm TB', value: avgScore.toFixed(1), icon: <Trophy className="w-5 h-5 text-yellow-600" />, bg: 'bg-yellow-50' },
          { label: 'Điểm cao nhất', value: highest.toFixed(1), icon: <Trophy className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TOP 5 câu yếu */}
      {weakQuestions.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              TOP {Math.min(5, weakQuestions.length)} câu học sinh làm sai nhiều nhất
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakQuestions.map((q, idx) => {
              const pct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0
              return (
                <div key={q.question_id} className="border rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 flex-shrink-0">#{idx + 1}</Badge>
                    <p className="text-sm text-gray-800 line-clamp-2">{q.question_text}</p>
                    <Badge className="ml-auto flex-shrink-0 bg-green-100 text-green-700 hover:bg-green-100">
                      ✓ {q.correct_answer}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-500">Tỉ lệ đúng:</span>
                    <Progress value={pct} className="flex-1 h-2" />
                    <span className={`text-sm font-medium ${pct < 30 ? 'text-red-600' : pct < 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {pct}%
                    </span>
                  </div>
                  {/* Phân bổ chọn từng đáp án */}
                  <div className="grid grid-cols-4 gap-2">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const count = q.dist[opt] || 0
                      const optPct = q.total > 0 ? Math.round((count / q.total) * 100) : 0
                      return (
                        <div key={opt} className={`text-center p-2 rounded-lg text-xs ${
                          opt === q.correct_answer ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'
                        }`}>
                          <div className="font-bold">{opt}</div>
                          <div>{optPct}%</div>
                          <div className="text-gray-400">({count} HS)</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Bảng điểm */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bảng điểm học sinh</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm">Chưa có học sinh nào thi</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">STT</th>
                    <th className="px-4 py-3 text-left">Học sinh</th>
                    <th className="px-4 py-3 text-center">Điểm (10)</th>
                    <th className="px-4 py-3 text-center">% đúng</th>
                    <th className="px-4 py-3 text-center">Thời gian</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, idx) => {
                    const pct = s.score != null && s.total_points
                      ? Math.round((s.score / s.total_points) * 100) : null
                    const grade = s.score != null && s.total_points
                      ? ((s.score / s.total_points) * 10).toFixed(1) : '-'
                    const mins = s.time_spent_seconds ? Math.round(s.time_spent_seconds / 60) : '-'

                    return (
                      <tr key={s.student_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            pct != null && pct >= 80 ? 'text-green-600' :
                            pct != null && pct >= 50 ? 'text-yellow-600' :
                            pct != null ? 'text-red-600' : 'text-gray-400'
                          }`}>{grade}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">
                          {pct != null ? `${pct}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {mins !== '-' ? `${mins} phút` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={s.status === 'submitted'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                          }>
                            {s.status === 'submitted' ? 'Đã nộp' : 'Đang thi'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
