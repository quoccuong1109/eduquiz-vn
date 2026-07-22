'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Users,
  LogOut,
  BarChart3,
  PlusCircle,
  Shield,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Tổng quan',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Giảng dạy',
    items: [
      { title: 'Ngân hàng câu hỏi', url: '/teacher/questions', icon: BookOpen },
      { title: 'Đề thi', url: '/teacher/exams', icon: ClipboardList },
      { title: 'Tạo đề thi', url: '/teacher/exams/create', icon: PlusCircle },
      { title: 'Lớp học', url: '/teacher/classes', icon: Users },
    ],
  },
]

interface TeacherSidebarProps {
  user: User
}

export function TeacherSidebar({ user }: TeacherSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  function isActive(url: string, exact?: boolean) {
    return exact ? pathname === url : pathname.startsWith(url)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user.full_name
    .split(' ')
    .map((n: string) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              tooltip="EduQuiz VN"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-blue-600 text-white flex-shrink-0">
                <GraduationCap className="size-4" />
              </div>
              <span className="font-semibold">EduQuiz VN</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive(item.url, item.exact)}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {user.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/admin" />}
                    isActive={isActive('/admin')}
                    tooltip="Quản trị"
                  >
                    <Shield />
                    <span>Quản trị hệ thống</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`${user.full_name} · ${user.role === 'admin' ? 'Admin' : 'Giáo viên'}`}
              className="h-auto py-2"
            >
              <Avatar className="size-6 flex-shrink-0">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium leading-none">{user.full_name}</p>
                <p className="truncate text-xs text-muted-foreground mt-0.5">{user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}</p>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Đăng xuất"
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut />
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
