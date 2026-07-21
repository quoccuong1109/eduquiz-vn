'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'teacher' | 'student'

export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get('role') as Role) || 'student'

  const [role, setRole] = useState<Role>(defaultRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role, school },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      toast.success('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.')
      router.push('/login')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleRegister() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) toast.error(error.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl text-blue-600">EduQuiz VN</span>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
            <CardDescription>Bắt đầu miễn phí ngay hôm nay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Bạn là:</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    role === 'teacher' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                  )}
                >
                  <GraduationCap className={cn('w-6 h-6', role === 'teacher' ? 'text-blue-600' : 'text-gray-400')} />
                  <span className={cn('text-sm font-medium', role === 'teacher' ? 'text-blue-600' : 'text-gray-600')}>
                    Giáo viên
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    role === 'student' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-200'
                  )}
                >
                  <BookOpen className={cn('w-6 h-6', role === 'student' ? 'text-green-600' : 'text-gray-400')} />
                  <span className={cn('text-sm font-medium', role === 'student' ? 'text-green-600' : 'text-gray-600')}>
                    Học sinh
                  </span>
                </button>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleRegister}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Đăng ký với Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">hoặc</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Họ và tên</Label>
                <Input id="fullName" placeholder="Nguyễn Văn A" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="school">
                  {role === 'teacher' ? 'Trường công tác' : 'Trường học'}{' '}
                  <span className="text-gray-400 text-xs">(tuỳ chọn)</span>
                </Label>
                <Input id="school" placeholder="THPT Chi Lăng" value={school} onChange={e => setSchool(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input id="password" type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button
                type="submit"
                className={cn('w-full text-white', role === 'teacher' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700')}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tạo tài khoản {role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">Đăng nhập</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
