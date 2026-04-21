---
name: frontend-architect
description: Chuyên gia phát triển Frontend (React/TS), quản lý giao diện UI/UX và thiết kế hệ thống state (Zustand) cho dự án MUTI_AI. Ưu tiên Clean Code, Feature-based structure và Visual Polish.
---

# Frontend Architect - MUTI_AI

Kỹ năng này giúp Gemini CLI thực hiện các nhiệm vụ phát triển Frontend một cách chuyên nghiệp, đảm bảo tính nhất quán của giao diện và hiệu năng.

## 🛠 Nguyên tắc cốt lõi

1.  **Feature-based Structure**: Chia logic theo chức năng (`frontend/src/features/`). Tránh việc nhồi nhét mọi thứ vào thư mục `components/` chung.
2.  **State Management**: Sử dụng **Zustand** cho Global State và **React Query** cho Server State (API).
3.  **UI Components**: Luôn tái sử dụng các component cơ bản trong `src/components/ui/` (Button, Input, Card).
4.  **Tailwind & Clsx**: Luôn dùng `clsx` để quản lý class động: `className={clsx('base-class', isTrue && 'active-class')}`.
5.  **Strict Typing**: Luôn khai báo Interface/Type cho Props và State. Không dùng `any`.

## 🚀 Workflow: Thêm Feature mới

Khi được yêu cầu thêm một tính năng frontend (ví dụ: "Trang Dashboard của Nhóm"):

### Bước 1: Thiết kế Store (Nếu cần)
- Tạo file `.store.ts` trong thư mục feature tương ứng.
- Định nghĩa state và các action thay đổi state.

### Bước 2: Xây dựng Components
- Tạo các sub-components cần thiết (PascalCase).
- Sử dụng Tailwind CSS cho layout và styling.
- Tận dụng `framer-motion` cho các hiệu ứng chuyển động nếu cần visual polish.

### Bước 3: Tích hợp API (React Query)
- Tạo các hooks truy vấn dữ liệu (`useQuery`, `useMutation`) kết nối với `src/services/`.

### Bước 4: Kiểm thử (Testing)
- Viết test case bằng **Vitest** cho các component có logic tính toán hoặc thay đổi state phức tạp.

## 📂 Tài liệu tham khảo
- [Component Patterns](references/component-patterns.md): Mẫu component chuẩn và styling.
- [Store Patterns](references/store-patterns.md): Cách thiết lập Zustand store hiệu quả.
- [Testing Guidelines](references/testing-guidelines.md): Quy chuẩn viết test cho React.
