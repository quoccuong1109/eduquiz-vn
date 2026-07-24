import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

function getService() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_ANSWERS = new Set(['A', 'B', 'C', 'D'])
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const VALID_SUBJECTS = new Set(['tin_hoc', 'toan', 'vat_ly', 'hoa_hoc', 'sinh_hoc', 'sinh_hoc', 'tieng_anh', 'ngu_van', 'lich_su', 'dia_ly', 'gdcd'])
const VALID_GRADES = new Set([10, 11, 12])

interface QuestionRow {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  difficulty: string
  subject: string
  grade: number
  tags: string[]
  explanation: string | null
  is_public: boolean
  created_by: string
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      return NextResponse.json({ error: 'Chỉ chấp nhận file .xlsx, .xls hoặc .csv' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // Tìm sheet "Câu hỏi" hoặc sheet đầu tiên
    const sheetName = wb.SheetNames.includes('Câu hỏi') ? 'Câu hỏi' : wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
      header: [
        'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
        'correct_answer', 'difficulty', 'subject', 'grade', 'tags',
        'explanation', 'is_public',
      ],
      range: 2, // skip header (row 1) and example (row 2); data starts row 3
      defval: '',
    })

    const valid: QuestionRow[] = []
    const errors: { row: number; msg: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const rowNum = i + 3 // row 1=header, row 2=example, row 3=first data row

      const q_text = String(r.question_text ?? '').trim()
      const opt_a   = String(r.option_a ?? '').trim()
      const opt_b   = String(r.option_b ?? '').trim()
      const opt_c   = String(r.option_c ?? '').trim()
      const opt_d   = String(r.option_d ?? '').trim()
      const answer  = String(r.correct_answer ?? '').trim().toUpperCase()
      const diff    = String(r.difficulty ?? '').trim().toLowerCase()
      const subj    = String(r.subject ?? '').trim().toLowerCase()
      const grade   = Number(r.grade)
      const tagsRaw = String(r.tags ?? '').trim()
      const expl    = String(r.explanation ?? '').trim() || null
      const is_pub  = String(r.is_public ?? 'TRUE').trim().toUpperCase() !== 'FALSE'

      // Skip completely empty rows
      if (!q_text && !opt_a && !opt_b) continue

      const rowErrors: string[] = []
      if (!q_text) rowErrors.push('Thiếu câu hỏi')
      if (!opt_a || !opt_b || !opt_c || !opt_d) rowErrors.push('Thiếu đáp án')
      if (!VALID_ANSWERS.has(answer)) rowErrors.push(`Đáp án đúng không hợp lệ: "${r.correct_answer}"`)
      if (!VALID_DIFFICULTIES.has(diff)) rowErrors.push(`Độ khó không hợp lệ: "${r.difficulty}"`)
      if (!VALID_SUBJECTS.has(subj)) rowErrors.push(`Môn học không hợp lệ: "${r.subject}"`)
      if (!VALID_GRADES.has(grade)) rowErrors.push(`Lớp không hợp lệ: "${r.grade}"`)
      if (!tagsRaw) rowErrors.push('Thiếu tag bài học')

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, msg: rowErrors.join('; ') })
        continue
      }

      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

      valid.push({
        question_text: q_text,
        option_a: opt_a,
        option_b: opt_b,
        option_c: opt_c,
        option_d: opt_d,
        correct_answer: answer as 'A' | 'B' | 'C' | 'D',
        difficulty: diff as 'easy' | 'medium' | 'hard',
        subject: subj,
        grade,
        tags,
        explanation: expl,
        is_public: is_pub,
        created_by: admin.id,
      })
    }

    if (valid.length === 0) {
      return NextResponse.json({
        error: 'Không có câu hỏi hợp lệ để nhập',
        errors,
      }, { status: 400 })
    }

    // Insert in batches of 50
    const service = getService()
    let inserted = 0
    for (let i = 0; i < valid.length; i += 50) {
      const batch = valid.slice(i, i + 50)
      const { error } = await service.from('questions').insert(batch)
      if (error) {
        return NextResponse.json({ error: `Lỗi khi lưu: ${error.message}`, errors }, { status: 500 })
      }
      inserted += batch.length
    }

    return NextResponse.json({ inserted, skipped: errors.length, errors })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Lỗi server' }, { status: 500 })
  }
}
