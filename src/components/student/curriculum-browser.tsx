'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CURRICULUM, type Lesson } from '@/lib/curriculum'
import { Badge } from '@/components/ui/badge'
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User } from '@/types/database'

interface ExamForLesson {
  id: string
  title: string
  duration_minutes: number
  lesson_tag: string
}

interface CurriculumBrowserProps {
  user: User
}

export function CurriculumBrowser({ user }: CurriculumBrowserProps) {
  const [grade, setGrade] = useState<10 | 11 | 12>(10)
  const [exams, setExams] = useState<ExamForLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([1]))
  const supabase = createClient()

  useEffect(() => {
    loadExams()
  }, [user.id])

  async function loadExams() {
    setLoading(true)

    // Lấy các lớp học của học sinh
    const { data: classStudents } = await supabase
      .from('class_students')
      .select('class_id')
      .eq('student_id', user.id)

    if (!classStudents || classStudents.length === 0) {
      setExams([])
      setLoading(false)
      return
    }

    const classIds = classStudents.map(cs => cs.class_id)

    // Lấy exam_ids được gán cho các lớp này
    const { data: examClasses } = await supabase
      .from('exam_classes')
      .select('exam_id')
      .in('class_id', classIds)

    if (!examClasses || examClasses.length === 0) {
      setExams([])
      setLoading(false)
      return
    }

    const examIds = [...new Set(examClasses.map(ec => ec.exam_id))]

    // Lấy các đề thi đã phát có lesson_tag
    const { data: examData } = await supabase
      .from('exams')
      .select('id, title, duration_minutes, lesson_tag')
      .in('id', examIds)
      .eq('is_published', true)
      .not('lesson_tag', 'is', null)

    setExams((examData || []) as ExamForLesson[])
    setLoading(false)
  }

  function toggleChapter(idx: number) {
    setOpenChapters(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function getExamForLesson(lesson: Lesson): ExamForLesson | undefined {
    return exams.find(e => e.lesson_tag === lesson.tag)
  }

  const curriculum = CURRICULUM.find(g => g.grade === grade)

  const totalLessons = curriculum?.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0) ?? 0
  const coveredLessons = curriculum?.chapters.reduce((sum, ch) =>
    sum + ch.lessons.filter(l => getExamForLesson(l)).length, 0) ?? 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Học theo bài</h1>
        <p className="text-gray-500 text-sm mt-1">Làm bài kiểm tra theo từng bài học trong chương trình</p>
      </div>

      {/* Grade selector */}
      <div className="flex gap-2">
        {([10, 11, 12] as const).map(g => (
          <button
            key={g}
            onClick={() => { setGrade(g); setOpenChapters(new Set([1])) }}
            className={cn(
              'flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border-2',
              grade === g
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
            )}
          >
            Lớp {g}
          </button>
        ))}
      </div>

      {/* Progress summary */}
      {!loading && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <ClipboardList className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-blue-700">{coveredLessons}/{totalLessons}</span>
            <span className="text-blue-600"> bài đã có đề kiểm tra</span>
          </div>
        </div>
      )}

      {/* Chapters */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : curriculum ? (
        <div className="space-y-2">
          {curriculum.chapters.map(chapter => {
            const isOpen = openChapters.has(chapter.index)
            const covered = chapter.lessons.filter(l => getExamForLesson(l)).length
            return (
              <div key={chapter.index} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleChapter(chapter.index)}
                  className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">
                      Chủ đề {chapter.index}: {chapter.title}
                    </div>
                    {chapter.isCSOnly && (
                      <span className="text-xs text-purple-600 font-medium">Định hướng CS</span>
                    )}
                  </div>
                  <Badge className={cn(
                    'text-xs flex-shrink-0',
                    covered === chapter.lessons.length && covered > 0
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : covered > 0
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                  )}>
                    {covered}/{chapter.lessons.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {chapter.lessons.map(lesson => {
                      const exam = getExamForLesson(lesson)
                      return (
                        <div key={lesson.tag} className="flex items-center gap-3 px-4 py-3 bg-gray-50/50">
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            exam ? 'bg-green-500' : 'bg-gray-300'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-800">
                              <span className="font-medium text-gray-500 mr-1.5">Bài {lesson.lessonNumber}.</span>
                              {lesson.title}
                            </div>
                            {exam && (
                              <div className="text-xs text-gray-400 mt-0.5">{exam.duration_minutes} phút</div>
                            )}
                          </div>
                          {exam ? (
                            <Link
                              href={`/exam/${exam.id}`}
                              className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Làm bài
                            </Link>
                          ) : (
                            <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-400 text-xs font-medium flex items-center gap-1.5 cursor-default">
                              <Lock className="w-3.5 h-3.5" />
                              Chưa có
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
