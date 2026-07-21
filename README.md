# EduQuiz VN 🎓

**Nền tảng thi trắc nghiệm online dành cho giáo viên và học sinh Việt Nam.**

> Made with ❤️ by **anhgiaochilang** — THPT Chi Lăng

---

## Tính năng

### Dành cho Giáo viên
- **Ngân hàng câu hỏi** — Tạo, chỉnh sửa, phân loại câu hỏi theo môn học, khối lớp, độ khó
- **Tạo đề thi** — Chọn tay từ ngân hàng hoặc bốc ngẫu nhiên theo tiêu chí
- **Quản lý lớp** — Thêm học sinh vào lớp qua email, giao đề cho từng lớp
- **Báo cáo & phân tích** — Thống kê điểm, top 5 câu hỏi học sinh làm sai nhiều nhất, phân phối đáp án từng câu, xuất Excel

### Dành cho Học sinh
- **Phòng thi realtime** — Đồng hồ đếm ngược đồng bộ từ server (không bị gian lận khi F5), tự động lưu bài 500ms/lần
- **Tiếp tục bài thi** — Vào lại trang thi nếu mất kết nối, bài làm vẫn còn
- **Kết quả chi tiết** — Xem đáp án đúng, giải thích từng câu sau khi nộp
- **Luyện tập** — Làm bài từ ngân hàng câu hỏi công khai, không cần giáo viên giao

### Bảo mật
- **Chấm điểm phía server** — Đáp án đúng không bao giờ được gửi xuống trình duyệt
- **Row Level Security** — Mọi bảng đều có RLS, học sinh không đọc được bài của người khác
- **Xác thực session** — Cookie-based auth với `@supabase/ssr`, middleware bảo vệ toàn bộ route

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui v3 (Base UI) |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Deploy | Vercel + Supabase free tier |

---

## Cấu trúc thư mục

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/                      # Đăng nhập
│   ├── register/                   # Đăng ký (chọn vai trò teacher/student)
│   ├── dashboard/                  # Dashboard theo role
│   ├── teacher/
│   │   ├── questions/              # CRUD ngân hàng câu hỏi
│   │   ├── exams/                  # Danh sách + tạo đề thi
│   │   ├── classes/                # Quản lý lớp học
│   │   └── reports/[examId]/       # Báo cáo chi tiết
│   ├── student/
│   │   └── practice/               # Luyện tập tự do
│   ├── exam/[id]/                  # Phòng thi
│   │   └── result/                 # Kết quả sau thi
│   └── api/
│       ├── submit-exam/            # Chấm điểm server-side
│       └── find-user/              # Tìm user theo email
├── components/
│   ├── shared/navbar.tsx
│   ├── teacher/                    # Dashboard, QuestionManager, ExamCreator...
│   └── student/                    # ExamRoom, ExamResult, PracticeMode...
├── lib/supabase/                   # client / server / middleware helpers
└── types/database.ts               # TypeScript types cho toàn bộ schema
supabase/
├── migrations/001_initial_schema.sql   # Schema đầy đủ (9 bảng, RLS, triggers)
└── seed.sql                            # Dữ liệu mẫu (xem hướng dẫn bên trong)
```

---

## Cài đặt & Chạy thử

### 1. Clone repo

```bash
git clone https://github.com/quoccuong1109/eduquiz-vn.git
cd eduquiz-vn
npm install
```

### 2. Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project
2. Vào **SQL Editor** → chạy toàn bộ file [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
3. (Tuỳ chọn) Bật Google OAuth: **Authentication → Providers → Google**

### 3. Cấu hình biến môi trường

Tạo file `.env.local` tại thư mục gốc:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Lấy các giá trị tại: Supabase Dashboard → **Project Settings → API**

### 4. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

---

## Deploy lên Vercel

1. Import repo này vào [vercel.com](https://vercel.com)
2. Thêm 4 biến môi trường ở trên (thay `NEXT_PUBLIC_APP_URL` bằng domain Vercel)
3. Deploy — xong!

---

## Database Schema

9 bảng chính:

```
users            — Profile người dùng (teacher / student)
classes          — Lớp học do giáo viên tạo
class_students   — Học sinh thuộc lớp nào
questions        — Ngân hàng câu hỏi (4 đáp án A/B/C/D)
exams            — Đề thi (thời gian, số câu, trộn đề...)
exam_questions   — Câu hỏi nào nằm trong đề nào
exam_classes     — Đề thi giao cho lớp nào
attempts         — Lần làm bài của học sinh
attempt_answers  — Đáp án từng câu trong mỗi lần làm
```

Tất cả bảng đều có **Row Level Security (RLS)**. Hàm `submit_exam()` chạy phía server để chấm điểm an toàn.

---

## Lưu ý kỹ thuật

- **shadcn/ui v3** dùng `@base-ui/react` thay Radix UI → không có `asChild`. Dùng `render={<Button/>}` hoặc `<Link className={buttonVariants({...})}>` trực tiếp.
- **Next.js 16** yêu cầu `useSearchParams()` phải nằm trong `<Suspense>` boundary.
- Đồng hồ phòng thi tính từ `started_at` lưu trong DB (không dùng `setInterval` thuần) để chống gian lận khi refresh trang.

---

*Made with ❤️ by **anhgiaochilang** — THPT Chi Lăng*
