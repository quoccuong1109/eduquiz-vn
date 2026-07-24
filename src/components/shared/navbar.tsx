'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { GraduationCap, LogOut, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { User as UserType } from '@/types/database'

interface NavbarProps {
  user: UserType
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user.full_name
    .split(' ')
    .map(n => n[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const roleLabel = user.role === 'teacher' ? 'Giáo viên' : user.role === 'admin' ? 'Admin' : 'Học sinh'

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-blue-600">EduQuiz VN</span>
        </Link>

        {/* Admin nav */}
        {user.role === 'admin' && (
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/admin" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-purple-600')}>
              <Shield className="w-3.5 h-3.5 mr-1" /> Quản trị
            </Link>
            <Link href="/teacher/exams" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Đề thi</Link>
            <Link href="/teacher/questions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Câu hỏi</Link>
            <Link href="/teacher/classes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Lớp học</Link>
          </nav>
        )}

        {/* Teacher nav */}
        {user.role === 'teacher' && (
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/teacher/exams" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Đề thi</Link>
            <Link href="/teacher/questions" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Ngân hàng câu hỏi</Link>
            <Link href="/teacher/classes" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Lớp học</Link>
          </nav>
        )}

        {/* Student nav */}
        {user.role === 'student' && (
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/student/curriculum" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Học theo bài</Link>
            <Link href="/student/practice" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Luyện tập</Link>
            <Link href="/student/test" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Tự tạo đề</Link>
          </nav>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className={cn(buttonVariants({ variant: 'ghost' }), 'flex items-center gap-2 h-9 px-2 cursor-pointer')}>
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium leading-none">{user.full_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{roleLabel}</div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <Link href="/dashboard" className="flex items-center gap-2 w-full">
                <User className="w-4 h-4" /> Dashboard
              </Link>
            </DropdownMenuItem>
            {user.role === 'admin' && (
              <DropdownMenuItem>
                <Link href="/admin" className="flex items-center gap-2 w-full text-purple-600">
                  <Shield className="w-4 h-4" /> Quản trị hệ thống
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
