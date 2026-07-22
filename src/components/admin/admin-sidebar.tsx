'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ChevronLeft,
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
} from '@/components/ui/sidebar'

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_ITEMS: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { title: 'Người dùng', url: '/admin/users', icon: Users },
      { title: 'Câu hỏi', url: '/admin/questions', icon: BookOpen },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(url: string, exact?: boolean) {
    return exact ? pathname === url : pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              tooltip="Về trang giáo viên"
            >
              <GraduationCap className="text-blue-600" />
              <span className="font-semibold">EduQuiz Admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_ITEMS.map((group) => (
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
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              tooltip="Quay về Dashboard"
            >
              <ChevronLeft />
              <span>Quay về Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
