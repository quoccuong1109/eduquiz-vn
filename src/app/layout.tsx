import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin', 'vietnamese'] })

export const metadata: Metadata = {
  title: 'EduQuiz VN - Nền tảng thi trắc nghiệm trực tuyến',
  description: 'Thi trắc nghiệm online cho giáo viên và học sinh Việt Nam',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${inter.className} min-h-full antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
