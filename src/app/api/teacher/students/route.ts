import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getService() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireTeacher() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || !['teacher', 'admin'].includes(profile.role)) return null
  return user
}

// GET: list students created by this teacher
export async function GET() {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = getService()
  const { data, error } = await service
    .from('users')
    .select('id, full_name, email, school, created_at')
    .eq('created_by', teacher.id)
    .eq('role', 'student')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: create one student account
export async function POST(req: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { full_name, email, password, school } = body

  if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Thiếu họ tên, email hoặc mật khẩu' }, { status: 400 })
  }

  const service = getService()

  // Create auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email: email.trim(),
    password: password.trim(),
    user_metadata: { full_name: full_name.trim(), role: 'student' },
    email_confirm: true,
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? `Email ${email} đã được sử dụng`
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Update profile: set created_by + email + school
  await service
    .from('users')
    .update({ created_by: teacher.id, email: email.trim(), school: school?.trim() || null })
    .eq('id', authData.user.id)

  return NextResponse.json({ id: authData.user.id, email, full_name })
}
