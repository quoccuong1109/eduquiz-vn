'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, Users, BarChart2, FileText, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User, Exam } from '@/types/database'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface TeacherDashboardProps {
  user: User
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [stats, setStats] = useState({ exams: 0, questions: 0, students: 0, attempts: 0 })
  const [recentExams, setRecentExams] = useState<Exam[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const [examsRes, questionsRes] = await Promise.all([
        supabase.from('exams').select('*').eq('created_by', user.id).order('created_at', { ascending: false }),
        supabase.from('questions').select('id', { count: 'exact' }).eq('created_by', user.id),
      ])

      const exams = examsRes.data || []
      setRecentExams(exams.slice(0, 5))

      const examIds = exams.map(e => e.id)
      let totalAttempts = 0
      let uniqueStudents = 0

      if (examIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('attempts')
          .select('student_id')
          .in('exam_id', examIds)
        totalAttempts = attemptsData?.length || 0
        uniqueStudents = new Set(attemptsData?.map(a => a.student_id)).size
      }

      setStats({
        exams: exams.length,
        questions: questionsRes.count || 0,
        students: uniqueStudents,
        attempts: totalAttempts,
      })
    }
    loadData()
  }, [user.id])

  const statCards = [
    { label: 'Đề thi', value: stats.exams, icon: <FileText className="w-5 h-5 text-blue-600" />, color: 'bg-blue-50' },
    { label: 'Câu hỏi', value: stats.questions, icon: <BookOpen className="w-5 h-5 text-green-600" />, color: 'bg-green-50' },
    { label: 'Học sinh', value: stats.students, icon: <Users className="w-5 h-5 text-purple-600" />, color: 'bg-purple-50' },
    { label: 'Lượt thi', value: stats.attempts, icon: <BarChart2 className="w-5 h-5 text-orange-600" />, color: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {user.full_name.split(' ').pop()}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Quản lý đề thi và theo dõi học sinh của bạn</p>
        </div>
        <Link href="/teacher/exams/create"
          className={cn(buttonVariants(), 'bg-blue-600 hover:bg-blue-700 text-white')}>
          <Plus className="w-4 h-4 mr-2" /> Tạo đề thi mới
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { href: '/teacher/questions', icon: <Plus className="w-5 h-5" />, label: 'Thêm câu hỏi', color: 'text-green-600 bg-green-50 hover:bg-green-100' },
          { href: '/teacher/exams', icon: <FileText className="w-5 h-5" />, label: 'Quản lý đề thi', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { href: '/teacher/classes', icon: <Users className="w-5 h-5" />, label: 'Quản lý lớp', color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className={`flex items-center gap-3 p-4 rounded-xl transition-colors ${a.color}`}>
            {a.icon}
            <span className="font-medium">{a.label}</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Link>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Đề thi gần đây</CardTitle>
            <Link href="/teacher/exams" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Xem tất cả
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentExams.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Bạn chưa có đề thi nào</p>
              <Link href="/teacher/exams/create"
                className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex')}>
                Tạo đề thi đầu tiên
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentExams.map(exam => (
                <Link key={exam.id} href={`/teacher/exams/${exam.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{exam.title}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3" /> {exam.duration_minutes} phút •{' '}
                      {format(new Date(exam.created_at), 'dd/MM/yyyy', { locale: vi })}
                    </div>
                  </div>
                  <Badge variant={exam.is_published ? 'default' : 'secondary'}
                    className={exam.is_published ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                    {exam.is_published ? 'Đã phát' : 'Nháp'}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
