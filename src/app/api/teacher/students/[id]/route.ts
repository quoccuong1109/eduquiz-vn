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

// PATCH: update student info (name, school, password)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const service = getService()

  // Verify this student belongs to this teacher
  const { data: student } = await service.from('users').select('created_by').eq('id', id).single()
  if (!student || student.created_by !== teacher.id) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  // Update profile
  const profileUpdate: Record<string, string | null> = {}
  if (body.full_name) profileUpdate.full_name = body.full_name.trim()
  if (body.school !== undefined) profileUpdate.school = body.school?.trim() || null

  if (Object.keys(profileUpdate).length > 0) {
    await service.from('users').update(profileUpdate).eq('id', id)
  }

  // Update password if provided
  if (body.password?.trim()) {
    await service.auth.admin.updateUserById(id, { password: body.password.trim() })
  }

  return NextResponse.json({ ok: true })
}

// DELETE: remove student account
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = getService()

  // Verify ownership
  const { data: student } = await service.from('users').select('created_by').eq('id', id).single()
  if (!student || student.created_by !== teacher.id) {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  }

  const { error } = await service.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
