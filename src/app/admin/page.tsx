import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, GraduationCap } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: userCount },
    { count: questionCount },
    { count: examCount },
    { count: classCount },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('questions').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('classes').select('*', { count: 'exact', head: true }),
  ])

  const { data: recentUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Người dùng', value: userCount ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Câu hỏi', value: questionCount ?? 0, icon: BookOpen, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Đề thi', value: examCount ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Lớp học', value: classCount ?? 0, icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Giáo viên',
    student: 'Học sinh',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Tổng quan hệ thống EduQuiz</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`${s.bg} ${s.color} p-3 rounded-lg`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent users */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Người dùng mới nhất</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentUsers?.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{u.full_name || '(Chưa đặt tên)'}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  u.role === 'admin' ? 'bg-red-100 text-red-700' :
                  u.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
