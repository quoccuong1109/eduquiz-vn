import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

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

export async function POST(req: Request) {
  const teacher = await requireTeacher()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const sheetName = wb.SheetNames.includes('Học sinh') ? 'Học sinh' : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    header: ['full_name', 'email', 'password', 'school'],
    range: 2, // skip header + example row
    defval: '',
  })

  const service = getService()
  const created: string[] = []
  const errors: { row: number; msg: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 3
    const full_name = String(r.full_name ?? '').trim()
    const email = String(r.email ?? '').trim()
    const password = String(r.password ?? '').trim()
    const school = String(r.school ?? '').trim() || null

    if (!full_name && !email) continue

    if (!full_name) { errors.push({ row: rowNum, msg: 'Thiếu họ tên' }); continue }
    if (!email) { errors.push({ row: rowNum, msg: 'Thiếu email' }); continue }
    if (!password || password.length < 6) { errors.push({ row: rowNum, msg: 'Mật khẩu tối thiểu 6 ký tự' }); continue }

    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name, role: 'student' },
      email_confirm: true,
    })

    if (authError) {
      const msg = authError.message.includes('already registered')
        ? `Email đã tồn tại: ${email}`
        : authError.message
      errors.push({ row: rowNum, msg })
      continue
    }

    await service
      .from('users')
      .update({ created_by: teacher.id, email, school })
      .eq('id', authData.user.id)

    created.push(email)
  }

  return NextResponse.json({ created: created.length, errors })
}
