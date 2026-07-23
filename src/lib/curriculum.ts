export interface Lesson {
  lessonNumber: number
  title: string
  tag: string
  isCSOnly?: boolean
}

export interface Chapter {
  index: number
  title: string
  lessons: Lesson[]
  isCSOnly?: boolean
}

export interface GradeCurriculum {
  grade: 10 | 11 | 12
  subject: string
  chapters: Chapter[]
}

export function lessonTag(grade: number, lessonNumber: number): string {
  return `tin${grade}-b${lessonNumber}`
}

export const CURRICULUM: GradeCurriculum[] = [
  {
    grade: 10,
    subject: 'tin_hoc',
    chapters: [
      {
        index: 1,
        title: 'Máy tính và xã hội tri thức',
        lessons: [
          { lessonNumber: 1, title: 'Thông tin và xử lí thông tin', tag: 'tin10-b1' },
          { lessonNumber: 2, title: 'Vai trò của thiết bị thông minh và tin học đối với xã hội', tag: 'tin10-b2' },
          { lessonNumber: 3, title: 'Một số kiểu dữ liệu và dữ liệu văn bản', tag: 'tin10-b3' },
          { lessonNumber: 4, title: 'Hệ nhị phân và dữ liệu số nguyên', tag: 'tin10-b4' },
          { lessonNumber: 5, title: 'Dữ liệu logic', tag: 'tin10-b5' },
          { lessonNumber: 6, title: 'Dữ liệu âm thanh và hình ảnh', tag: 'tin10-b6' },
          { lessonNumber: 7, title: 'Thực hành sử dụng thiết bị số thông dụng', tag: 'tin10-b7' },
        ],
      },
      {
        index: 2,
        title: 'Mạng máy tính và Internet',
        lessons: [
          { lessonNumber: 8, title: 'Mạng máy tính trong cuộc sống hiện đại', tag: 'tin10-b8' },
          { lessonNumber: 9, title: 'An toàn trên không gian mạng', tag: 'tin10-b9' },
          { lessonNumber: 10, title: 'Thực hành khai thác tài nguyên trên Internet', tag: 'tin10-b10' },
        ],
      },
      {
        index: 3,
        title: 'Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { lessonNumber: 11, title: 'Ứng xử trên môi trường số. Nghĩa vụ tôn trọng bản quyền', tag: 'tin10-b11' },
        ],
      },
      {
        index: 4,
        title: 'Ứng dụng tin học',
        lessons: [
          { lessonNumber: 12, title: 'Phần mềm thiết kế đồ hoạ', tag: 'tin10-b12' },
          { lessonNumber: 13, title: 'Bổ sung các đối tượng đồ hoạ', tag: 'tin10-b13' },
          { lessonNumber: 14, title: 'Làm việc với đối tượng đường và văn bản', tag: 'tin10-b14' },
          { lessonNumber: 15, title: 'Hoàn thiện hình ảnh đồ hoạ', tag: 'tin10-b15' },
        ],
      },
      {
        index: 5,
        title: 'Giải quyết vấn đề với sự trợ giúp của máy tính',
        lessons: [
          { lessonNumber: 16, title: 'Ngôn ngữ lập trình bậc cao và Python', tag: 'tin10-b16' },
          { lessonNumber: 17, title: 'Biến và lệnh gán', tag: 'tin10-b17' },
          { lessonNumber: 18, title: 'Các lệnh vào ra đơn giản', tag: 'tin10-b18' },
          { lessonNumber: 19, title: 'Câu lệnh rẽ nhánh', tag: 'tin10-b19' },
          { lessonNumber: 20, title: 'Câu lệnh lặp for', tag: 'tin10-b20' },
          { lessonNumber: 21, title: 'Câu lệnh lặp while', tag: 'tin10-b21' },
          { lessonNumber: 22, title: 'Kiểu dữ liệu danh sách', tag: 'tin10-b22' },
          { lessonNumber: 23, title: 'Một số lệnh làm việc với dữ liệu danh sách', tag: 'tin10-b23' },
          { lessonNumber: 24, title: 'Xâu kí tự', tag: 'tin10-b24' },
          { lessonNumber: 25, title: 'Một số lệnh làm việc với xâu kí tự', tag: 'tin10-b25' },
          { lessonNumber: 26, title: 'Hàm trong Python', tag: 'tin10-b26' },
          { lessonNumber: 27, title: 'Tham số của hàm', tag: 'tin10-b27' },
          { lessonNumber: 28, title: 'Phạm vi của biến', tag: 'tin10-b28' },
          { lessonNumber: 29, title: 'Nhận biết lỗi chương trình', tag: 'tin10-b29' },
          { lessonNumber: 30, title: 'Kiểm thử và gỡ lỗi chương trình', tag: 'tin10-b30' },
          { lessonNumber: 31, title: 'Thực hành viết chương trình đơn giản', tag: 'tin10-b31' },
          { lessonNumber: 32, title: 'Ôn tập lập trình Python', tag: 'tin10-b32' },
        ],
      },
      {
        index: 6,
        title: 'Hướng nghiệp với tin học',
        lessons: [
          { lessonNumber: 33, title: 'Nghề thiết kế đồ hoạ máy tính', tag: 'tin10-b33' },
          { lessonNumber: 34, title: 'Nghề phát triển phần mềm', tag: 'tin10-b34' },
        ],
      },
    ],
  },
  {
    grade: 11,
    subject: 'tin_hoc',
    chapters: [
      {
        index: 1,
        title: 'Máy tính và xã hội tri thức',
        lessons: [
          { lessonNumber: 1, title: 'Hệ điều hành', tag: 'tin11-b1' },
          { lessonNumber: 2, title: 'Thực hành sử dụng hệ điều hành', tag: 'tin11-b2' },
          { lessonNumber: 3, title: 'Phần mềm nguồn mở và phần mềm chạy trên Internet', tag: 'tin11-b3' },
          { lessonNumber: 4, title: 'Bên trong máy tính', tag: 'tin11-b4' },
          { lessonNumber: 5, title: 'Kết nối máy tính với các thiết bị số', tag: 'tin11-b5' },
        ],
      },
      {
        index: 2,
        title: 'Tổ chức lưu trữ, tìm kiếm và trao đổi thông tin',
        lessons: [
          { lessonNumber: 6, title: 'Lưu trữ và chia sẻ tệp tin trên Internet', tag: 'tin11-b6' },
          { lessonNumber: 7, title: 'Thực hành tìm kiếm thông tin trên Internet', tag: 'tin11-b7' },
          { lessonNumber: 8, title: 'Thực hành nâng cao sử dụng thư điện tử và mạng xã hội', tag: 'tin11-b8' },
        ],
      },
      {
        index: 3,
        title: 'Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { lessonNumber: 9, title: 'Giao tiếp an toàn trên Internet', tag: 'tin11-b9' },
        ],
      },
      {
        index: 4,
        title: 'Giới thiệu các hệ cơ sở dữ liệu',
        lessons: [
          { lessonNumber: 10, title: 'Lưu trữ dữ liệu và khai thác thông tin phục vụ quản lí', tag: 'tin11-b10' },
          { lessonNumber: 11, title: 'Cơ sở dữ liệu', tag: 'tin11-b11' },
          { lessonNumber: 12, title: 'Hệ quản trị cơ sở dữ liệu và hệ cơ sở dữ liệu', tag: 'tin11-b12' },
          { lessonNumber: 13, title: 'Cơ sở dữ liệu quan hệ', tag: 'tin11-b13' },
          { lessonNumber: 14, title: 'SQL — ngôn ngữ truy vấn có cấu trúc', tag: 'tin11-b14' },
          { lessonNumber: 15, title: 'Bảo mật và an toàn hệ cơ sở dữ liệu', tag: 'tin11-b15' },
        ],
      },
      {
        index: 5,
        title: 'Hướng nghiệp với tin học',
        lessons: [
          { lessonNumber: 16, title: 'Công việc quản trị cơ sở dữ liệu', tag: 'tin11-b16' },
        ],
      },
      {
        index: 6,
        title: 'Kĩ thuật lập trình',
        isCSOnly: true,
        lessons: [
          { lessonNumber: 17, title: 'Dữ liệu mảng một chiều và hai chiều', tag: 'tin11-b17', isCSOnly: true },
          { lessonNumber: 18, title: 'Thực hành dữ liệu mảng một chiều và hai chiều', tag: 'tin11-b18', isCSOnly: true },
          { lessonNumber: 19, title: 'Bài toán tìm kiếm', tag: 'tin11-b19', isCSOnly: true },
          { lessonNumber: 20, title: 'Thực hành bài toán tìm kiếm', tag: 'tin11-b20', isCSOnly: true },
          { lessonNumber: 21, title: 'Các thuật toán sắp xếp', tag: 'tin11-b21', isCSOnly: true },
          { lessonNumber: 22, title: 'Thực hành bài toán sắp xếp', tag: 'tin11-b22', isCSOnly: true },
          { lessonNumber: 23, title: 'Kiểm thử và đánh giá chương trình', tag: 'tin11-b23', isCSOnly: true },
          { lessonNumber: 24, title: 'Đánh giá độ phức tạp thời gian thuật toán', tag: 'tin11-b24', isCSOnly: true },
          { lessonNumber: 25, title: 'Thực hành xác định độ phức tạp thời gian thuật toán', tag: 'tin11-b25', isCSOnly: true },
          { lessonNumber: 26, title: 'Phương pháp làm mịn dần trong thiết kế chương trình', tag: 'tin11-b26', isCSOnly: true },
          { lessonNumber: 27, title: 'Thực hành thiết kế chương trình theo phương pháp làm mịn dần', tag: 'tin11-b27', isCSOnly: true },
          { lessonNumber: 28, title: 'Thiết kế chương trình theo mô đun', tag: 'tin11-b28', isCSOnly: true },
          { lessonNumber: 29, title: 'Thực hành thiết kế chương trình theo mô đun', tag: 'tin11-b29', isCSOnly: true },
          { lessonNumber: 30, title: 'Thiết lập thư viện cho chương trình', tag: 'tin11-b30', isCSOnly: true },
          { lessonNumber: 31, title: 'Thực hành thiết lập thư viện chương trình', tag: 'tin11-b31', isCSOnly: true },
        ],
      },
    ],
  },
  {
    grade: 12,
    subject: 'tin_hoc',
    chapters: [
      {
        index: 1,
        title: 'Máy tính và xã hội tri thức',
        lessons: [
          { lessonNumber: 1, title: 'Làm quen với Trí tuệ nhân tạo', tag: 'tin12-b1' },
          { lessonNumber: 2, title: 'Trí tuệ nhân tạo trong khoa học và đời sống', tag: 'tin12-b2' },
        ],
      },
      {
        index: 2,
        title: 'Mạng máy tính và Internet',
        lessons: [
          { lessonNumber: 3, title: 'Một số thiết bị mạng thông dụng', tag: 'tin12-b3' },
          { lessonNumber: 4, title: 'Giao thức mạng', tag: 'tin12-b4' },
          { lessonNumber: 5, title: 'Thực hành chia sẻ tài nguyên trên mạng', tag: 'tin12-b5' },
        ],
      },
      {
        index: 3,
        title: 'Đạo đức, pháp luật và văn hoá trong môi trường số',
        lessons: [
          { lessonNumber: 6, title: 'Giao tiếp và ứng xử trong không gian mạng', tag: 'tin12-b6' },
        ],
      },
      {
        index: 4,
        title: 'Giải quyết vấn đề với sự trợ giúp của máy tính — HTML & CSS',
        lessons: [
          { lessonNumber: 7, title: 'HTML và cấu trúc trang web', tag: 'tin12-b7' },
          { lessonNumber: 8, title: 'Định dạng văn bản', tag: 'tin12-b8' },
          { lessonNumber: 9, title: 'Tạo danh sách, bảng', tag: 'tin12-b9' },
          { lessonNumber: 10, title: 'Tạo liên kết', tag: 'tin12-b10' },
          { lessonNumber: 11, title: 'Chèn tệp tin đa phương tiện và khung nội tuyến vào trang web', tag: 'tin12-b11' },
          { lessonNumber: 12, title: 'Tạo biểu mẫu', tag: 'tin12-b12' },
          { lessonNumber: 13, title: 'Khái niệm, vai trò của CSS', tag: 'tin12-b13' },
          { lessonNumber: 14, title: 'Định dạng văn bản bằng CSS', tag: 'tin12-b14' },
          { lessonNumber: 15, title: 'Tạo màu cho chữ và nền', tag: 'tin12-b15' },
          { lessonNumber: 16, title: 'Định dạng khung', tag: 'tin12-b16' },
          { lessonNumber: 17, title: 'Các mức ưu tiên của bộ chọn', tag: 'tin12-b17' },
          { lessonNumber: 18, title: 'Thực hành tổng hợp thiết kế trang web', tag: 'tin12-b18' },
        ],
      },
      {
        index: 5,
        title: 'Hướng nghiệp với tin học',
        lessons: [
          { lessonNumber: 19, title: 'Dịch vụ sửa chữa và bảo trì máy tính', tag: 'tin12-b19' },
          { lessonNumber: 20, title: 'Nhóm nghề quản trị thuộc ngành Công nghệ thông tin', tag: 'tin12-b20' },
          { lessonNumber: 21, title: 'Hội thảo hướng nghiệp', tag: 'tin12-b21' },
        ],
      },
      {
        index: 6,
        title: 'Mạng máy tính và Internet (định hướng CS)',
        isCSOnly: true,
        lessons: [
          { lessonNumber: 22, title: 'Tìm hiểu thiết bị mạng', tag: 'tin12-b22', isCSOnly: true },
          { lessonNumber: 23, title: 'Đường truyền mạng và ứng dụng', tag: 'tin12-b23', isCSOnly: true },
          { lessonNumber: 24, title: 'Sơ bộ về thiết kế mạng', tag: 'tin12-b24', isCSOnly: true },
        ],
      },
      {
        index: 7,
        title: 'Giải quyết vấn đề với sự trợ giúp của máy tính (định hướng CS)',
        isCSOnly: true,
        lessons: [
          { lessonNumber: 25, title: 'Làm quen với Học máy', tag: 'tin12-b25', isCSOnly: true },
          { lessonNumber: 26, title: 'Làm quen với Khoa học dữ liệu', tag: 'tin12-b26', isCSOnly: true },
          { lessonNumber: 27, title: 'Máy tính và Khoa học dữ liệu', tag: 'tin12-b27', isCSOnly: true },
          { lessonNumber: 28, title: 'Thực hành trải nghiệm trích rút thông tin và tri thức', tag: 'tin12-b28', isCSOnly: true },
          { lessonNumber: 29, title: 'Mô phỏng trong giải quyết vấn đề', tag: 'tin12-b29', isCSOnly: true },
          { lessonNumber: 30, title: 'Ứng dụng mô phỏng trong giáo dục', tag: 'tin12-b30', isCSOnly: true },
        ],
      },
    ],
  },
]

export function findLesson(tag: string): { grade: GradeCurriculum; chapter: Chapter; lesson: Lesson } | null {
  for (const grade of CURRICULUM) {
    for (const chapter of grade.chapters) {
      const lesson = chapter.lessons.find(l => l.tag === tag)
      if (lesson) return { grade, chapter, lesson }
    }
  }
  return null
}

export function getLessonsForGrade(grade: 10 | 11 | 12): Lesson[] {
  return CURRICULUM.find(g => g.grade === grade)?.chapters.flatMap(c => c.lessons) ?? []
}
