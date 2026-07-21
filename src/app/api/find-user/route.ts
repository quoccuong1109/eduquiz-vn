import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, classId } = await request.json()

    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Xác minh teacher sở hữu lớp này
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', authUser.id)
      .single()

    if (!cls) return NextResponse.json({ error: 'Không có quyền truy cập lớp này' }, { status: 403 })

    // Dùng service role để tìm user theo email (bypass RLS)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { users }, error } = await serviceSupabase.auth.admin.listUsers()
    if (error) throw error

    const targetUser = users.find(u => u.email === email.toLowerCase())
    if (!targetUser) {
      return NextResponse.json({ error: `Không tìm thấy tài khoản với email: ${email}` }, { status: 404 })
    }

    // Thêm vào lớp
    const { error: insertError } = await supabase
      .from('class_students')
      .upsert({ class_id: classId, student_id: targetUser.id })

    if (insertError) throw insertError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}
