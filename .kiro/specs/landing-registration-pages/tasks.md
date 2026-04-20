# Implementation Plan: Landing, Registration, Login Redesign & Forgot Password Pages

## Overview

Implement bốn trang public-facing cho MultiMinutes AI theo Japanese Corporate Design aesthetic: Landing Page, Login Page (redesign), Registration Page, và Forgot Password Page. Tất cả viết bằng TypeScript + React 19, Tailwind CSS, Framer Motion, React Hook Form + Zod.

> **Lưu ý trước khi bắt đầu**: `fast-check` và `vitest` chưa có trong `package.json`. Cần cài thêm trước khi chạy property tests:
>
> ```
> npm install --save-dev fast-check vitest @vitest/ui
> ```

## Tasks

- [x] 1. Cài đặt dependencies và cấu hình test framework
  - Thêm `fast-check`, `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` vào `devDependencies` trong `frontend/package.json`
  - Thêm script `"test": "vitest --run"` và `"test:watch": "vitest"` vào `package.json`
  - Tạo file `frontend/vitest.config.ts` với environment `jsdom` và setup files
  - Tạo file `frontend/src/test/setup.ts` với `@testing-library/jest-dom` matchers
  - _Requirements: 3.2, 3.3, 3.4, 7.3_

- [x] 2. Thêm `PublicOnlyRoute` guard và routes mới vào App.tsx
  - [x] 2.1 Implement `PublicOnlyRoute` component trong `frontend/src/App.tsx`
    - Component nhận `children: React.ReactNode`, dùng `useAuth()` để check `isAuthenticated`
    - Nếu đã authenticated → `<Navigate to="/" replace />`
    - Nếu chưa authenticated → render children
    - _Requirements: 9.4, 9.5, 9.6_
  - [x] 2.2 Thêm lazy imports cho các trang mới vào `App.tsx`
    - `const Landing = React.lazy(() => import('./pages/Landing'))`
    - `const Register = React.lazy(() => import('./pages/Register'))`
    - `const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'))`
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 2.3 Thêm routes public mới vào `AppRoutes` trong `App.tsx`
    - Route `/home` → `<PublicOnlyRoute><Landing /></PublicOnlyRoute>`
    - Route `/register` → `<PublicOnlyRoute><Register /></PublicOnlyRoute>`
    - Route `/forgot-password` → `<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>`
    - Giữ nguyên route `/login` hiện tại, bọc thêm `PublicOnlyRoute`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3. Tạo `ImagePlaceholder` component
  - [x] 3.1 Tạo file `frontend/src/components/landing/ImagePlaceholder.tsx`
    - Interface: `{ width: number; height: number; label: string; className?: string }`
    - Render `div` với `bg-gray-100 dark:bg-slate-800`, `rounded-2xl`
    - Tính aspect ratio từ `width/height` dùng `paddingBottom` trick hoặc `aspect-ratio` CSS
    - Centered label text với `text-caption text-gray-400`
    - Thêm `role="img"` và `aria-label={label}` cho accessibility
    - _Requirements: 12.4, 12.5, 12.6, 12.7_
  - [ ]\* 3.2 Viết unit tests cho `ImagePlaceholder`
    - Test render với các kích thước khác nhau
    - Test aria-label được set đúng
    - Test className được merge đúng
    - _Requirements: 12.7_

- [x] 4. Tạo `Navbar` component cho Landing Page
  - [x] 4.1 Tạo file `frontend/src/components/landing/Navbar.tsx`
    - Interface: `{ transparent?: boolean }`
    - Sticky top với `useScroll` (Framer Motion) để detect scroll position
    - Khi `scrollY > 20`: thêm `backdrop-blur-md bg-white/90 shadow-card dark:bg-slate-900/90`
    - Khi `scrollY <= 20`: transparent background
    - Logo: `ShieldCheck` icon + "MultiMinutes AI" text
    - Nav links: "Tính năng", "Lợi ích", "Liên hệ" (smooth scroll đến section IDs)
    - CTA buttons: "Đăng nhập" (secondary, link to `/login`), "Đăng ký" (primary, link to `/register`)
    - Mobile: hamburger menu với `useState` toggle, dropdown nav links
    - _Requirements: 11.4, 2.1, 2.3_

- [x] 5. Tạo các section components cho Landing Page
  - [x] 5.1 Tạo `HeroSection.tsx` trong `frontend/src/components/landing/`
    - Layout 2 cột (lg:grid-cols-2): text bên trái, `ImagePlaceholder 600×400` bên phải
    - Small caps label, H1 heading (`text-display`), body description
    - 2 CTA buttons: "Bắt đầu miễn phí" (primary, link `/register`), "Đăng nhập" (secondary, link `/login`)
    - Framer Motion `whileInView` với `fadeInUp` variant, `viewport={{ once: true }}`
    - `motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}` cho buttons
    - _Requirements: 1.1, 11.1, 11.2, 11.7, 2.4, 2.7_
  - [x] 5.2 Tạo `FeaturesSection.tsx` trong `frontend/src/components/landing/`
    - Section label: "01 / TÍNH NĂNG", heading: "Công nghệ AI tiên tiến"
    - 3 feature cards với `ImagePlaceholder 400×300` mỗi card
    - Mỗi card: numbered label ("01", "02", "03"), icon, title, description
    - `staggerContainer` + `fadeInUp` variants cho stagger animation
    - _Requirements: 1.2, 2.4, 2.7_
  - [x] 5.3 Tạo `BenefitsSection.tsx` trong `frontend/src/components/landing/`
    - Section label: "02 / LỢI ÍCH"
    - Layout 2 cột: text list bên trái (checkmark items), `ImagePlaceholder 500×350` bên phải
    - `slideInLeft` animation cho text, `fadeInUp` cho image
    - _Requirements: 1.3, 2.4, 2.7_
  - [x] 5.4 Tạo `StatsSection.tsx` trong `frontend/src/components/landing/`
    - Background `bg-primary-50 dark:bg-primary-900/10`
    - 4 stat items dùng `AnimatedCounter` component đã có (`frontend/src/components/ui/AnimatedCounter.tsx`)
    - Trigger counter khi section vào viewport
    - _Requirements: 1.1, 2.4_
  - [x] 5.5 Tạo `CtaSection.tsx` trong `frontend/src/components/landing/`
    - Full-width section với gradient background (`from-primary-600 to-primary-800`)
    - Heading "Sẵn sàng bắt đầu?" + button "Bắt đầu miễn phí ngay" link to `/register`
    - _Requirements: 11.3, 11.5, 11.6_
  - [x] 5.6 Tạo `Footer.tsx` trong `frontend/src/components/landing/`
    - 3 cột: brand info (logo + tagline), nav links (Sản phẩm, Công ty), contact info
    - Copyright line: "© 2024 MultiMinutes AI. All rights reserved."
    - _Requirements: 1.4_

- [x] 6. Tạo `Landing.tsx` page và wire các components
  - [x] 6.1 Tạo file `frontend/src/pages/Landing.tsx`
    - Import và compose tất cả landing components: `Navbar`, `HeroSection`, `FeaturesSection`, `BenefitsSection`, `StatsSection`, `CtaSection`, `Footer`
    - Thêm `id` attributes cho sections để smooth scroll hoạt động: `id="features"`, `id="benefits"`, `id="contact"`
    - Page entrance animation: `motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.5_
  - [x] 6.2 Tạo barrel export `frontend/src/components/landing/index.ts`
    - Export tất cả landing components
    - _Requirements: 1.1_

- [x] 7. Checkpoint — Kiểm tra Landing Page và routing
  - Đảm bảo tất cả landing components render không có TypeScript errors
  - Đảm bảo routes `/home`, `/register`, `/forgot-password` được định nghĩa đúng trong App.tsx
  - Đảm bảo `PublicOnlyRoute` redirect authenticated users về `/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Redesign `Login.tsx` — 2-column layout + navigation links
  - [x] 8.1 Refactor `frontend/src/pages/Login.tsx` sang 2-column layout
    - Desktop (≥ lg): 2 cột — Left panel (gradient bg, logo, tagline, `ImagePlaceholder 400×500`) + Right panel (form card)
    - Mobile (< lg): chỉ hiện form card, centered
    - Left panel animation: `initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}`
    - Right panel animation: `initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}`
    - _Requirements: 13.1, 14.1, 14.2, 14.3, 13.4, 13.6, 13.7, 13.8_
  - [x] 8.2 Thêm navigation links vào Login form
    - Link "Quên mật khẩu?" (`<Link to="/forgot-password">`) aligned right dưới password field, `text-caption text-gray-500 hover:text-primary-600`
    - Section "Chưa có tài khoản?" + link "Đăng ký ngay" (`<Link to="/register">`) ở bottom, centered
    - Giữ nguyên demo account info nhưng chuyển sang collapsible `<details>` element
    - _Requirements: 13.2, 13.3, 13.9, 13.10, 14.5, 14.6_
  - [x] 8.3 Tích hợp Zod + React Hook Form vào Login
    - Định nghĩa `loginSchema` với Zod: `username` min 1, `password` min 1
    - Dùng `useForm` với `zodResolver(loginSchema)`
    - Hiển thị inline errors qua `Input` component's `error` prop
    - `setFocus` field đầu tiên có lỗi khi submit
    - `aria-describedby` liên kết error message với input
    - _Requirements: 10.1, 10.3, 10.5, 10.6, 10.8_

- [x] 9. Tạo `Register.tsx` — Registration page
  - [x] 9.1 Tạo file `frontend/src/pages/Register.tsx` với 2-column layout
    - Desktop: Left panel (gradient, logo, feature highlights list) + Right panel (form)
    - Mobile: chỉ form card
    - Cùng animation pattern với Login (slide từ trái/phải)
    - _Requirements: 5.1, 5.3, 5.4, 5.6_
  - [x] 9.2 Implement `registerSchema` Zod validation
    - Fields: `firstName` (min 1), `lastName` (min 1), `email` (email format), `password` (min 8), `confirmPassword`, `orgName` (min 1), `acceptTerms` (literal true)
    - `.refine()` check `password === confirmPassword`, path `["confirmPassword"]`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8_
  - [x] 9.3 Implement form với React Hook Form
    - `useForm<RegisterFormData>` với `zodResolver(registerSchema)`
    - Fields layout: Họ + Tên (2 cột), Email, Tên tổ chức, Mật khẩu, Xác nhận mật khẩu, Terms checkbox
    - Inline error messages qua `Input` component's `error` prop
    - `setFocus` field đầu tiên có lỗi
    - `aria-describedby` cho tất cả error messages
    - Keyboard navigation: Tab giữa fields, Enter submit
    - _Requirements: 3.6, 10.1, 10.3, 10.5, 10.6, 10.8_
  - [x] 9.4 Implement submit handler và state management
    - `isLoading` state: button `loading={isLoading}`, inputs `disabled={isLoading}`
    - Gọi API `POST /api/auth/register` với form data
    - Success: hiển thị success message, `setTimeout(() => navigate('/login'), 2000)`
    - Error 409: hiển thị "Email đã được sử dụng"
    - Error 5xx/network: hiển thị "Đăng ký thất bại. Vui lòng thử lại"
    - Re-enable form inputs khi có lỗi
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [x] 9.5 Thêm link "Đã có tài khoản? Đăng nhập" ở bottom form
    - `<Link to="/login">` với styling nhất quán
    - _Requirements: 3.9_

- [x] 10. Tạo `ForgotPassword.tsx` — 2-step flow
  - [x] 10.1 Tạo file `frontend/src/pages/ForgotPassword.tsx` với centered card layout
    - Single centered card (max-w-md), không dùng 2-column layout
    - Logo icon + "Khôi phục mật khẩu" heading
    - Step indicators: 2 dots với labels "1. Email" và "2. Đặt lại mật khẩu"
    - `useState<1 | 2>` cho step, `useState<string>` cho email (preserve từ step 1)
    - _Requirements: 8.1, 8.2, 8.4, 8.6, 8.7_
  - [x] 10.2 Implement Step 1 — Email submission
    - `forgotStep1Schema`: `email` (email format)
    - `useForm` với `zodResolver(forgotStep1Schema)`
    - Submit: gọi API `POST /api/auth/forgot-password` với `{ email }`
    - Loading state trên button
    - Success: preserve email, transition sang step 2
    - Error: hiển thị "Email không tồn tại trong hệ thống"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [x] 10.3 Implement Step 2 — OTP + new password
    - `forgotStep2Schema`: `otp` (length 6, digits only), `newPassword` (min 8), `confirmPassword` + refine match
    - OTP input: 6-char text input với `maxLength={6}`, `inputMode="numeric"`
    - Submit: gọi API `POST /api/auth/reset-password` với `{ email, otp, newPassword }`
    - Success: hiển thị "Mật khẩu đã được đặt lại thành công", `setTimeout(() => navigate('/login'), 2000)`
    - Error invalid code: hiển thị "Mã xác thực không hợp lệ hoặc đã hết hạn"
    - "Gửi lại mã" button: gọi lại API step 1 với email đã lưu
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.8_
  - [x] 10.4 Implement step transition animation
    - `AnimatePresence mode="wait"` bọc ngoài step content
    - Step 1: `key="step1"`, `initial={{ opacity: 0, x: 20 }}`, `exit={{ opacity: 0, x: -20 }}`
    - Step 2: `key="step2"`, `initial={{ opacity: 0, x: 20 }}`, `exit={{ opacity: 0, x: -20 }}`
    - _Requirements: 8.3_
  - [x] 10.5 Thêm "← Quay lại đăng nhập" link
    - `<Link to="/login">` ở bottom card
    - _Requirements: 6.7, 9.9_

- [x] 11. Checkpoint — Kiểm tra tất cả form pages
  - Đảm bảo Login, Register, ForgotPassword render đúng trên desktop và mobile
  - Đảm bảo Zod validation hoạt động đúng cho tất cả fields
  - Đảm bảo navigation links giữa các trang hoạt động
  - Đảm bảo loading states và error messages hiển thị đúng
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Viết property-based tests với fast-check
  - [ ]\* 12.1 Viết property test cho Property 1: Email validation rejects all invalid formats
    - Tạo file `frontend/src/test/validation.property.test.ts`
    - Dùng `fc.string()` generate strings không phải email hợp lệ
    - Verify `forgotStep1Schema.safeParse({ email: str }).success === false` cho mọi invalid input
    - **Property 1: Email validation rejects all invalid formats**
    - **Validates: Requirements 3.2, 6.2**
  - [ ]\* 12.2 Viết property test cho Property 2: Password length validation is consistent
    - Dùng `fc.string({ maxLength: 7 })` cho strings < 8 chars → expect reject
    - Dùng `fc.string({ minLength: 8 })` cho strings ≥ 8 chars → expect accept
    - Test trên cả `registerSchema` và `forgotStep2Schema`
    - **Property 2: Password length validation is consistent**
    - **Validates: Requirements 3.3, 7.4**
  - [ ]\* 12.3 Viết property test cho Property 3: Password confirmation match is symmetric
    - Dùng `fc.string()` generate arbitrary `password` và `confirmPassword`
    - Verify: schema accepts iff `password === confirmPassword`
    - Test với special chars, unicode, empty strings
    - **Property 3: Password confirmation match is symmetric**
    - **Validates: Requirements 3.4, 7.5**
  - [ ]\* 12.4 Viết property test cho Property 4: Whitespace-only inputs are treated as empty
    - Dùng `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` generate whitespace-only strings
    - Verify required fields (firstName, lastName, orgName, email) reject whitespace-only input
    - **Property 4: Whitespace-only inputs are treated as empty**
    - **Validates: Requirements 3.5**
  - [ ]\* 12.5 Viết property test cho Property 5: OTP validation accepts exactly 6-digit strings
    - Dùng `fc.string()` generate arbitrary strings → verify accept iff `/^\d{6}$/` matches
    - Dùng `fc.stringOf(fc.integer({ min: 0, max: 9 }).map(String), { minLength: 6, maxLength: 6 })` → expect accept
    - Dùng `fc.string({ maxLength: 5 })` và `fc.string({ minLength: 7 })` → expect reject
    - **Property 5: OTP validation accepts exactly 6-digit strings**
    - **Validates: Requirements 7.3**
  - [ ]\* 12.6 Viết property test cho Property 7: Zod schema round-trip — valid registration data
    - Dùng `fc.record({ firstName: fc.string({ minLength: 1 }), ... })` generate valid `RegisterFormData`
    - Verify `JSON.parse(JSON.stringify(data))` cũng pass `registerSchema`
    - **Property 7: Zod schema round-trip — valid registration data**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 13. Final checkpoint — Đảm bảo tất cả tests pass
  - Chạy `npm run test` trong `frontend/` để verify tất cả property tests pass
  - Fix bất kỳ TypeScript errors nào trong các files mới tạo
  - Đảm bảo không có unused imports hoặc variables
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional — có thể bỏ qua để implement MVP nhanh hơn
- Mỗi task reference requirements cụ thể để đảm bảo traceability
- Checkpoints ở task 7, 11, 13 để validate incremental progress
- Property tests (task 12) validate correctness properties từ design document
- `fast-check` cần được cài trước khi chạy property tests (xem task 1)
- Design document dùng `/home` cho Landing Page để không phá vỡ route `/` hiện tại (Dashboard)
- `PublicOnlyRoute` redirect authenticated users về `/` (Dashboard), không phải `/dashboard`
