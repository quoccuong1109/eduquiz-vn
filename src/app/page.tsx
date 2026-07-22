import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BookOpen, Clock, BarChart2, Users, Shuffle, Shield,
  ArrowRight, CheckCircle2, GraduationCap, Trophy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-blue-600">EduQuiz VN</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">Cách dùng</a>
            <a href="#subjects" className="hover:text-blue-600 transition-colors">Môn học</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className={cn(buttonVariants(), 'bg-blue-600 hover:bg-blue-700 text-white')}>Vào Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>Đăng nhập</Link>
                <Link href="/register" className={cn(buttonVariants(), 'bg-blue-600 hover:bg-blue-700 text-white')}>Đăng ký miễn phí</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
            🇻🇳 Dành cho học sinh & giáo viên Việt Nam
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Nền tảng thi trắc nghiệm<br />
            <span className="text-blue-600">trực tuyến thông minh</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Giáo viên tạo đề thi nhanh chóng — Học sinh thi mọi lúc mọi nơi.<br />
            Chấm điểm tự động, báo cáo chi tiết, hoàn toàn miễn phí.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register?role=teacher"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-blue-600 hover:bg-blue-700 text-white text-base px-8')}>
              <GraduationCap className="w-5 h-5 mr-2" />
              Tôi là Giáo viên
            </Link>
            <Link href="/register?role=student"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'text-base px-8 border-blue-200 text-blue-600 hover:bg-blue-50')}>
              <BookOpen className="w-5 h-5 mr-2" />
              Tôi là Học sinh
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">Không cần thẻ tín dụng • Miễn phí mãi mãi</p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {[
            { num: '10,000+', label: 'Câu hỏi ngân hàng' },
            { num: '500+', label: 'Giáo viên tin dùng' },
            { num: '15,000+', label: 'Học sinh đã thi' },
            { num: '99.9%', label: 'Uptime đảm bảo' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold">{s.num}</div>
              <div className="text-blue-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Tính năng nổi bật</h2>
            <p className="text-gray-500">Mọi thứ bạn cần để tổ chức thi trắc nghiệm hiệu quả</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <Clock className="w-6 h-6 text-blue-600" />, title: 'Đồng hồ đếm ngược realtime', desc: 'Tích hợp Supabase Realtime. Không mất tiến độ khi refresh trang hay mất điện.' },
              { icon: <Shuffle className="w-6 h-6 text-green-600" />, title: 'Xáo trộn câu hỏi & đáp án', desc: 'Tự động xáo trộn để mỗi học sinh có đề thi khác nhau, chống gian lận hiệu quả.' },
              { icon: <BarChart2 className="w-6 h-6 text-purple-600" />, title: 'Báo cáo phân tích chi tiết', desc: 'TOP 5 câu sai nhiều nhất, tỉ lệ chọn từng đáp án, bảng điểm học sinh.' },
              { icon: <Trophy className="w-6 h-6 text-yellow-600" />, title: 'Bảng xếp hạng realtime', desc: 'Học sinh thấy thứ hạng trong khi đang thi, tạo động lực cạnh tranh lành mạnh.' },
              { icon: <Shield className="w-6 h-6 text-red-600" />, title: 'Chấm điểm server-side', desc: 'Điểm số được tính trên server, không thể hack từ phía client.' },
              { icon: <Users className="w-6 h-6 text-indigo-600" />, title: 'Quản lý lớp học', desc: 'Tạo lớp, mời học sinh, gán đề thi theo lớp. Theo dõi tiến độ từng em.' },
            ].map((f) => (
              <Card key={f.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bắt đầu trong 3 bước</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> Giáo viên
              </h3>
              {[
                { step: '1', title: 'Tạo ngân hàng câu hỏi', desc: 'Nhập câu hỏi, 4 đáp án, chọn đáp án đúng và thêm giải thích.' },
                { step: '2', title: 'Tạo đề thi', desc: 'Chọn câu từ ngân hàng hoặc random theo môn/lớp/độ khó.' },
                { step: '3', title: 'Phát đề & xem báo cáo', desc: 'Gán cho lớp, cài mã vào thi, xem kết quả realtime.' },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                  <div>
                    <div className="font-medium text-gray-900">{s.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Học sinh
              </h3>
              {[
                { step: '1', title: 'Vào thi bằng mã code', desc: 'Nhận mã từ giáo viên và bắt đầu thi ngay, không cần cài app.' },
                { step: '2', title: 'Làm bài với đồng hồ đếm ngược', desc: 'Giao diện thân thiện, tự động lưu đáp án khi chọn.' },
                { step: '3', title: 'Xem kết quả ngay', desc: 'Điểm số, câu đúng/sai, giải thích chi tiết từng câu.' },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 mb-6">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.step}</div>
                  <div>
                    <div className="font-medium text-gray-900">{s.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section id="subjects" className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Hỗ trợ tất cả môn học</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Tin học', 'Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Ngữ văn', 'Tiếng Anh', 'GDCD', 'Công nghệ', 'Thể dục'].map(m => (
              <Badge key={m} variant="outline" className="px-4 py-2 text-sm">{m}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Bắt đầu ngay hôm nay</h2>
          <p className="text-blue-100 mb-8">Miễn phí 100% — Không cần thẻ tín dụng — Cài đặt trong 2 phút</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register?role=teacher"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-blue-600 hover:bg-blue-50')}>
              Đăng ký làm Giáo viên <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link href="/register?role=student"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-2 border-white text-white bg-transparent hover:bg-white/10')}>
              Đăng ký làm Học sinh <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="flex justify-center gap-6 mt-8 text-sm text-blue-200">
            {['Miễn phí mãi mãi', 'Không quảng cáo', 'Bảo mật dữ liệu'].map(t => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t text-center text-sm text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-700">EduQuiz VN</span>
        </div>
        <p>© 2025 EduQuiz VN — Nền tảng thi trắc nghiệm dành cho giáo dục Việt Nam</p>
      </footer>
    </div>
  )
}
