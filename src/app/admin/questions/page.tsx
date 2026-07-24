import { createClient } from '@/lib/supabase/server'
import { AdminQuestionsTable } from '@/components/admin/questions-table'

export default async function AdminQuestionsPage() {
  const supabase = await createClient()
  const { data: questions } = await supabase
    .from('questions')
    .select('id, question_text, subject, grade, difficulty, correct_answer, is_public, created_at, created_by')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Câu hỏi</h1>
          <p className="text-muted-foreground text-sm mt-1">{questions?.length ?? 0} câu hỏi trong hệ thống</p>
        </div>
      </div>
      <AdminQuestionsTable questions={questions ?? []} />
    </div>
  )
}
