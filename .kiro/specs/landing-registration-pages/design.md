# Design Document: Landing, Registration, Login Redesign & Forgot Password Pages

## Overview

Tài liệu này mô tả thiết kế kỹ thuật cho bốn trang public-facing của ứng dụng **MultiMinutes AI**: Landing Page, Login Page (redesign), Registration Page, và Forgot Password Page. Tất cả trang tuân theo phong cách **Japanese Corporate Design** — tối giản, nhiều whitespace, typography có weight contrast cao, màu sắc restrained với accent xanh lá (#22c55e).

### Tech Stack

- **React 19 + TypeScript** — component framework
- **Tailwind CSS v3** — utility-first styling với custom tokens đã có sẵn
- **Framer Motion v11** — animations và page transitions
- **React Router v7** — routing và navigation
- **React Hook Form + Zod** — form state management và validation (đã có trong dependencies)
- **Lucide React** — icon library (đã có)

### Design Principles (Japanese Corporate Aesthetic)

1. **Negative space** — padding lớn, sections thoáng, không nhồi nhét content
2. **Typography contrast** — heading rất lớn/bold, body text nhỏ/light, small caps labels
3. **Restrained color** — chủ yếu trắng/xám nhạt, accent xanh lá chỉ dùng cho CTA và highlights
4. **Subtle borders & dividers** — `border-gray-100` thay vì `border-gray-200`, horizontal rule decorators
5. **Numbered sections** — section labels kiểu "01 / TÍNH NĂNG", "02 / LỢI ÍCH"
6. **Grid-based layouts** — strict grid alignment, không dùng arbitrary spacing
7. **Smooth scroll animations** — fade-in + slide-up khi scroll vào viewport (Framer Motion `whileInView`)

---

## Architecture

### Cấu trúc thư mục mới

```
frontend/src/
├── pages/
│   ├── Landing.tsx              # NEW — Landing page (/)
│   ├── Register.tsx             # NEW — Registration page (/register)
│   ├── ForgotPassword.tsx       # NEW — Forgot password (/forgot-password)
│   └── Login.tsx                # MODIFIED — Redesign + thêm links
├── components/
│   └── landing/                 # NEW — Landing-specific components
│       ├── Navbar.tsx
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── BenefitsSection.tsx
│       ├── StatsSection.tsx
│       ├── CtaSection.tsx
│       ├── Footer.tsx
│       └── ImagePlaceholder.tsx
└── App.tsx                      # MODIFIED — thêm routes mới
```

### Routing Changes (App.tsx)

Thêm các routes public mới và `PublicOnlyRoute` guard:

```
/home hoặc /          → Landing Page (public, redirect to /dashboard nếu đã auth)
/login                → Login Page (public, redirect to /dashboard nếu đã auth)
/register             → Registration Page (public, redirect to /dashboard nếu đã auth)
/forgot-password      → Forgot Password Page (public, redirect to /dashboard nếu đã auth)
```

**`PublicOnlyRoute` guard** — ngược lại với `ProtectedRoute`: nếu đã authenticated thì redirect về `/`.

Hiện tại route `/` đang là Dashboard (protected). Cần tách:

- `/` → Landing Page (public, với `PublicOnlyRoute`)
- `/dashboard` → Dashboard (protected) — hoặc giữ `/` là dashboard và dùng `/home` cho landing

**Quyết định thiết kế**: Dùng `/home` cho Landing Page để không phá vỡ routing hiện tại (`/` vẫn là Dashboard). Authenticated users truy cập `/home` sẽ bị redirect về `/`.

---

## Components and Interfaces

### 1. `PublicOnlyRoute` (thêm vào App.tsx)

```typescript
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

### 2. `ImagePlaceholder` Component

```typescript
interface ImagePlaceholderProps {
  width: number; // logical width (dùng cho aspect ratio)
  height: number; // logical height
  label: string; // text hiển thị ở giữa
  className?: string;
}
```

Render: `div` với `bg-gray-100 dark:bg-slate-800`, `rounded-2xl`, aspect ratio tính từ width/height, centered label text.

### 3. `Navbar` Component

```typescript
interface NavbarProps {
  transparent?: boolean; // true = transparent bg khi ở top, false = solid white
}
```

- Sticky top, `backdrop-blur` khi scroll
- Logo (ShieldCheck icon + "MultiMinutes AI")
- Nav links: "Tính năng", "Lợi ích", "Liên hệ" (smooth scroll to sections)
- CTA buttons: "Đăng nhập" (secondary), "Đăng ký" (primary)
- Mobile: hamburger menu

### 4. `HeroSection` Component

Props: none (static content)

Layout:

```
[Left: Text content]          [Right: ImagePlaceholder 600x400]
  - Small caps label
  - H1 heading (text-display)
  - Body description
  - 2 CTA buttons
```

### 5. `FeaturesSection` Component

3 feature cards, mỗi card:

```typescript
interface Feature {
  number: string; // "01", "02", "03"
  icon: React.ReactNode;
  title: string;
  description: string;
  imagePlaceholder: { width: number; height: number; label: string };
}
```

### 6. `BenefitsSection` Component

Layout 2 cột: text list bên trái, ImagePlaceholder bên phải.

### 7. `StatsSection` Component

4 stat items: số liệu ấn tượng với `AnimatedCounter` (component đã có).

### 8. `CtaSection` Component

Full-width section với gradient background, heading + button.

### 9. `Footer` Component

3 cột: brand info, nav links, contact info.

### 10. Form Pages — Shared Pattern

Tất cả form pages (Login, Register, ForgotPassword) dùng chung layout pattern:

**Desktop (≥ lg)**: 2 cột

```
[Left 50%: Branding panel]    [Right 50%: Form card]
  - Gradient background
  - Logo + tagline
  - ImagePlaceholder
  - Decorative elements
```

**Mobile (< lg)**: Chỉ hiện form card, centered.

---

## Data Models

### Form State — Registration

```typescript
interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  orgName: string;
  acceptTerms: boolean;
}

// Zod schema
const registerSchema = z
  .object({
    firstName: z.string().min(1, "Vui lòng nhập họ"),
    lastName: z.string().min(1, "Vui lòng nhập tên"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
    orgName: z.string().min(1, "Vui lòng nhập tên tổ chức"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Vui lòng đồng ý điều khoản" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
```

### Form State — Forgot Password

```typescript
// Step 1
interface ForgotPasswordStep1 {
  email: string;
}

// Step 2
interface ForgotPasswordStep2 {
  otp: string; // 6 digits
  newPassword: string;
  confirmPassword: string;
}

type ForgotPasswordStep = 1 | 2;

interface ForgotPasswordState {
  step: ForgotPasswordStep;
  email: string; // preserved from step 1
  isLoading: boolean;
  error: string | null;
  success: boolean;
}
```

### Form State — Login (existing, minor additions)

```typescript
interface LoginFormData {
  username: string;
  password: string;
}
// Thêm: isLoading state, link navigation
```

### Validation Schemas (Zod)

```typescript
const loginSchema = z.object({
  username: z.string().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const forgotStep1Schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const forgotStep2Schema = z
  .object({
    otp: z
      .string()
      .length(6, "Mã xác thực phải đúng 6 chữ số")
      .regex(/^\d+$/, "Mã xác thực chỉ gồm chữ số"),
    newPassword: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
```

---

## Layout Wireframes

### Landing Page — Text Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR (sticky)                                             │
│ [Logo + Name]    [Tính năng] [Lợi ích] [Liên hệ]  [Login] [Register] │
├─────────────────────────────────────────────────────────────┤
│ HERO SECTION (min-h-screen, flex items-center)              │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │ SMALL CAPS LABEL     │  │                          │    │
│  │                      │  │  ImagePlaceholder        │    │
│  │ Tiêu đề lớn          │  │  600 × 400               │    │
│  │ (text-display, 2-3   │  │  "Ảnh minh họa chính"    │    │
│  │  dòng)               │  │                          │    │
│  │                      │  └──────────────────────────┘    │
│  │ Mô tả ngắn (body-lg) │                                  │
│  │                      │                                  │
│  │ [Bắt đầu miễn phí]   │                                  │
│  │ [Đăng nhập]          │                                  │
│  └──────────────────────┘                                  │
├─────────────────────────────────────────────────────────────┤
│ STATS SECTION (bg-primary-50)                               │
│  [10,000+ cuộc họp]  [500+ doanh nghiệp]  [99.9% uptime]  [4.9★] │
├─────────────────────────────────────────────────────────────┤
│ FEATURES SECTION                                            │
│  Section label: "01 / TÍNH NĂNG"                           │
│  Heading: "Công nghệ AI tiên tiến"                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ [Icon]   │  │ [Icon]   │  │ [Icon]   │                 │
│  │ Feature 1│  │ Feature 2│  │ Feature 3│                 │
│  │ 400×300  │  │ 400×300  │  │ 400×300  │                 │
│  │ desc...  │  │ desc...  │  │ desc...  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
├─────────────────────────────────────────────────────────────┤
│ BENEFITS SECTION                                            │
│  Section label: "02 / LỢI ÍCH"                            │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ Heading              │  │                          │   │
│  │ ✓ Lợi ích 1          │  │  ImagePlaceholder        │   │
│  │ ✓ Lợi ích 2          │  │  500 × 350               │   │
│  │ ✓ Lợi ích 3          │  │  "Lợi ích doanh nghiệp"  │   │
│  │ ✓ Lợi ích 4          │  │                          │   │
│  │ [CTA Button]         │  └──────────────────────────┘   │
│  └──────────────────────┘                                  │
├─────────────────────────────────────────────────────────────┤
│ CTA SECTION (gradient bg)                                   │
│  "Sẵn sàng bắt đầu?"                                       │
│  [Bắt đầu miễn phí ngay]                                   │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                      │
│  [Brand]  [Sản phẩm links]  [Công ty links]  [Liên hệ]    │
│  ─────────────────────────────────────────────────────     │
│  © 2024 MultiMinutes AI. All rights reserved.              │
└─────────────────────────────────────────────────────────────┘
```

### Login Page — Text Wireframe (Desktop 2-col)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ LEFT PANEL           │  │ RIGHT PANEL (form)       │   │
│  │ (gradient bg)        │  │                          │   │
│  │                      │  │  [Logo icon]             │   │
│  │  [Logo + Name]       │  │  MultiMinutes AI         │   │
│  │  Tagline             │  │  Đăng nhập tài khoản     │   │
│  │                      │  │                          │   │
│  │  ImagePlaceholder    │  │  Tên đăng nhập           │   │
│  │  (full height)       │  │  [________________]      │   │
│  │  "Branding Visual"   │  │                          │   │
│  │                      │  │  Mật khẩu                │   │
│  │                      │  │  [________________]      │   │
│  │                      │  │              [Quên MK?]  │   │
│  │                      │  │                          │   │
│  │                      │  │  [   Đăng nhập   ]       │   │
│  │                      │  │                          │   │
│  │                      │  │  ─────────────────────   │   │
│  │                      │  │  Chưa có tài khoản?      │   │
│  │                      │  │  [Đăng ký ngay]          │   │
│  │                      │  │                          │   │
│  │                      │  │  ▼ Tài khoản demo        │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Registration Page — Text Wireframe (Desktop 2-col)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ LEFT PANEL           │  │ RIGHT PANEL (form)       │   │
│  │ (gradient bg)        │  │                          │   │
│  │  [Logo + Name]       │  │  Tạo tài khoản mới       │   │
│  │  Tagline             │  │                          │   │
│  │  ImagePlaceholder    │  │  Họ        │ Tên         │   │
│  │  "Branding Visual"   │  │  [_______] │ [_______]   │   │
│  │                      │  │                          │   │
│  │  Feature highlights  │  │  Email                   │   │
│  │  ✓ AI transcription  │  │  [________________]      │   │
│  │  ✓ Smart summaries   │  │                          │   │
│  │  ✓ Team collab       │  │  Tên tổ chức             │   │
│  │                      │  │  [________________]      │   │
│  │                      │  │                          │   │
│  │                      │  │  Mật khẩu                │   │
│  │                      │  │  [________________]      │   │
│  │                      │  │                          │   │
│  │                      │  │  Xác nhận mật khẩu       │   │
│  │                      │  │  [________________]      │   │
│  │                      │  │                          │   │
│  │                      │  │  ☐ Tôi đồng ý điều khoản │   │
│  │                      │  │                          │   │
│  │                      │  │  [   Tạo tài khoản   ]   │   │
│  │                      │  │                          │   │
│  │                      │  │  Đã có tài khoản?        │   │
│  │                      │  │  [Đăng nhập]             │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Forgot Password Page — Text Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ┌──────────────────────────────┐              │
│              │ CENTERED CARD                │              │
│              │                              │              │
│              │  [Logo icon]                 │              │
│              │  Khôi phục mật khẩu          │              │
│              │                              │              │
│              │  Step indicators:            │              │
│              │  ●─────────○                 │              │
│              │  1.Email   2.Đặt lại         │              │
│              │                              │              │
│              │  --- STEP 1 ---              │              │
│              │  Email đăng ký               │              │
│              │  [____________________]      │              │
│              │  [   Gửi mã xác thực   ]     │              │
│              │                              │              │
│              │  --- STEP 2 (after submit) --│              │
│              │  Mã xác thực (6 số)          │              │
│              │  [_ _ _ _ _ _]               │              │
│              │  Mật khẩu mới                │              │
│              │  [____________________]      │              │
│              │  Xác nhận mật khẩu mới       │              │
│              │  [____________________]      │              │
│              │  [   Đặt lại mật khẩu   ]    │              │
│              │  [Gửi lại mã]                │              │
│              │                              │              │
│              │  ← Quay lại đăng nhập        │              │
│              └──────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Animation Specifications

### Scroll-triggered Animations (Landing Page)

Dùng Framer Motion `whileInView` với `viewport={{ once: true, margin: "-100px" }}`:

```typescript
// Shared animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};
```

### Page Entrance Animations (Form Pages)

```typescript
// Outer wrapper
initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}

// Left panel (slide from left)
initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}

// Form card (slide from right)
initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
```

### Step Transition (Forgot Password)

```typescript
// AnimatePresence với mode="wait" để transition giữa step 1 và step 2
<AnimatePresence mode="wait">
  {step === 1 ? (
    <motion.div key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    />
  ) : (
    <motion.div key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    />
  )}
</AnimatePresence>
```

### Navbar Scroll Behavior

```typescript
// useScroll hook để detect scroll position
// Khi scrollY > 20: thêm backdrop-blur + bg-white/90 + shadow-card
// Khi scrollY <= 20: transparent background
```

### Button Hover/Tap Animations

```typescript
<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
  <Button>...</Button>
</motion.div>
```

### Stat Counter Animation

Dùng `AnimatedCounter` component đã có, trigger khi section vào viewport.

---

## Error Handling

### Form Validation Errors

- **Client-side**: Zod schema validation qua `react-hook-form` resolver
- Hiển thị lỗi inline dưới mỗi field (dùng `Input` component's `error` prop)
- Focus field đầu tiên có lỗi khi submit (`setFocus` từ `useForm`)
- `aria-describedby` liên kết error message với input field

### API Error Handling

```typescript
// Registration errors
"Email đã được sử dụng"          → HTTP 409 Conflict
"Đăng ký thất bại. Vui lòng thử lại" → HTTP 5xx hoặc network error

// Forgot password errors
"Email không tồn tại trong hệ thống"  → HTTP 404
"Mã xác thực không hợp lệ hoặc đã hết hạn" → HTTP 400/422

// Login errors (existing)
"Đăng nhập thất bại. Vui lòng thử lại." → catch-all
```

Error state được hiển thị trong `motion.div` alert box phía trên form (pattern giống Login hiện tại).

### Loading States

- Submit button: `loading={isLoading}` prop (Button component đã hỗ trợ Loader2 spinner)
- Form inputs: `disabled={isLoading}` để prevent double-submit
- Toàn bộ form: `fieldset disabled={isLoading}` hoặc per-field disabled

### Success States

- Registration success: hiển thị success message + auto-redirect sau 2 giây (`setTimeout(() => navigate('/login'), 2000)`)
- Forgot password step 1 success: transition sang step 2 (không redirect)
- Forgot password step 2 success: hiển thị success message + auto-redirect sang `/login` sau 2 giây

### Navigation Guards

`PublicOnlyRoute` redirect authenticated users về `/` để tránh truy cập trang login/register khi đã đăng nhập.

---

## Testing Strategy

### Unit Tests (Example-based)

Các test cụ thể cho behavior đã biết:

1. **Form validation examples**:
   - Email rỗng → error "Email không hợp lệ"
   - Password < 8 ký tự → error "Mật khẩu tối thiểu 8 ký tự"
   - Password ≠ confirmPassword → error "Mật khẩu xác nhận không khớp"
   - OTP không đủ 6 số → error "Mã xác thực phải đúng 6 chữ số"
   - Terms unchecked → prevent submit

2. **Navigation tests**:
   - Click "Đăng ký ngay" → navigate to `/register`
   - Click "Quên mật khẩu?" → navigate to `/forgot-password`
   - Click "Quay lại đăng nhập" → navigate to `/login`
   - Authenticated user visits `/home` → redirect to `/`

3. **State transition tests**:
   - Forgot password: step 1 success → step 2 visible
   - Registration success → success message visible
   - Loading state: submit button shows spinner, inputs disabled

4. **Accessibility tests**:
   - Tab navigation order correct
   - Error messages have `aria-describedby`
   - Form elements use semantic HTML

### Property-Based Tests

Xem phần **Correctness Properties** bên dưới.

### Integration Tests

- Login flow end-to-end: nhập credentials → navigate to dashboard
- Registration flow: fill form → success message → redirect
- Forgot password flow: email → OTP → new password → redirect to login

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

**Property-based testing library**: [fast-check](https://fast-check.dev/) — đã phổ biến trong TypeScript/React ecosystem, không cần cài thêm nếu dùng Vitest.

Mỗi property test chạy tối thiểu **100 iterations** với inputs được generate ngẫu nhiên.

---

### Property 1: Email validation rejects all invalid formats

_For any_ string that is not a valid RFC 5322 email address (missing @, missing domain, empty string, whitespace-only), the email validator SHALL reject it and return a non-empty error message.

**Validates: Requirements 3.2, 6.2**

---

### Property 2: Password length validation is consistent

_For any_ string with length strictly less than 8 characters, the password validator SHALL reject it; _for any_ string with length greater than or equal to 8 characters, the password validator SHALL accept it (assuming no other constraints violated).

**Validates: Requirements 3.3, 7.4**

---

### Property 3: Password confirmation match is symmetric

_For any_ two strings `password` and `confirmPassword`, the validator SHALL accept the pair if and only if `password === confirmPassword`. This property holds regardless of the content of the strings (including empty strings, special characters, unicode).

**Validates: Requirements 3.4, 7.5**

---

### Property 4: Whitespace-only inputs are treated as empty

_For any_ string composed entirely of whitespace characters (spaces, tabs, newlines), submitting it as a required field SHALL be rejected with a validation error, and the form state SHALL remain unchanged.

**Validates: Requirements 3.5**

---

### Property 5: OTP validation accepts exactly 6-digit strings

_For any_ string, the OTP validator SHALL accept it if and only if it consists of exactly 6 characters all of which are decimal digits (0–9). Strings with fewer digits, more digits, or non-digit characters SHALL be rejected.

**Validates: Requirements 7.3**

---

### Property 6: Form submission is idempotent under loading state

_For any_ form in loading state (`isLoading = true`), submitting the form again SHALL NOT trigger a second API call or change the loading state. The form SHALL remain in loading state until the first request completes.

**Validates: Requirements 4.2, 4.3**

---

### Property 7: Zod schema round-trip — valid registration data

_For any_ `RegisterFormData` object that passes the `registerSchema` validation, serializing it to JSON and deserializing it back SHALL produce an object that also passes `registerSchema` validation with identical field values.

**Validates: Requirements 3.1 through 3.5**

---

**Tag format cho test implementation**: `Feature: landing-registration-pages, Property {N}: {property_text}`

**Ví dụ test tag**:

```typescript
// Feature: landing-registration-pages, Property 1: Email validation rejects all invalid formats
it.prop([fc.string()])("rejects invalid emails", (str) => {
  // ... test body
});
```
