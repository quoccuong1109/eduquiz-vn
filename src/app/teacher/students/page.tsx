import { createClient } from '@/lib/supabase/server'
import { StudentManager } from '@/components/teacher/student-manager'

export default async function StudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quản lý học sinh</h1>
        <p className="text-muted-foreground text-sm mt-1">Tạo và quản lý tài khoản học sinh do bạn cấp phát</p>
      </div>
      <StudentManager teacherId={user!.id} />
    </div>
  )
}
