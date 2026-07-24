import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClassDetail } from '@/components/teacher/class-detail'

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, school_year, join_code')
    .eq('id', id)
    .eq('teacher_id', user!.id)
    .single()

  if (!cls) notFound()

  return <ClassDetail classInfo={cls} userId={user!.id} />
}
