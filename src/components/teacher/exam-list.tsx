'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Clock, FileText, BarChart2, Trash2, Eye, EyeOff, Hash, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Exam } from '@/types/database'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface ExamListProps {
  userId: string
}

export function ExamList({ userId }: ExamListProps) {
  const [exams, setExams] = useState<(Exam & { question_count: number; attempt_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function loadExams() {
    setLoading(true)
    const { data } = await supabase
      .from('exams')
      .select('*, exam_questions(count), attempts(count)')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    const mapped = (data || []).map(e => ({
      ...e,
      question_count: e.exam_questions?.[0]?.count || 0,
      attempt_count: e.attempts?.[0]?.count || 0,
    }))
    setExams(mapped)
    setLoading(false)
  }

  useEffect(() => { loadExams() }, [userId])

  async function togglePublish(exam: Exam) {
    const { error } = await supabase
      .from('exams')
      .update({ is_published: !exam.is_published })
      .eq('id', exam.id)
    if (error) toast.error(error.message)
    else {
      toast.success(exam.is_published ? 'Đã ẩn đề thi' : 'Đã phát đề thi')
      loadExams()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa đề thi này? Tất cả dữ liệu thi sẽ bị mất.')) return
    const { error } = await supabase.from('exams').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Đã xóa đề thi'); loadExams() }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đề thi của tôi</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} đề thi</p>
        </div>
        <Link href="/teacher/exams/create"
          className={cn(buttonVariants(), 'bg-blue-600 hover:bg-blue-700 text-white')}>
          <Plus className="w-4 h-4 mr-2" /> Tạo đề thi
        </Link>
      </div>

      {exams.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Bạn chưa có đề thi nào</p>
            <Link href="/teacher/exams/create"
              className={cn(buttonVariants(), 'mt-3 inline-flex bg-blue-600 hover:bg-blue-700 text-white')}>
              Tạo đề thi đầu tiên
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <Card key={exam.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                      <Badge className={exam.is_published
                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                      }>
                        {exam.is_published ? 'Đã phát' : 'Nháp'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {exam.question_count} câu</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} phút</span>
                      <span className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5" /> {exam.attempt_count} lượt thi</span>
                      {exam.access_code && (
                        <span className="flex items-center gap-1 font-mono text-blue-600">
                          <Hash className="w-3.5 h-3.5" /> {exam.access_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Tạo {format(new Date(exam.created_at), 'dd/MM/yyyy', { locale: vi })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePublish(exam)}
                      className={exam.is_published ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                    >
                      {exam.is_published ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                      {exam.is_published ? 'Ẩn' : 'Phát'}
                    </Button>
                    <Link href={`/teacher/reports/${exam.id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs')}>
                      <BarChart2 className="w-3.5 h-3.5 mr-1" /> Báo cáo
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(exam.id)}
                      className="w-8 h-8 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
