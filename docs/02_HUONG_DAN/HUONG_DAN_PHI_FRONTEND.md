# 🎨 MULTIMINUTES AI — Frontend Design Guide
### Hướng dẫn Thiết kế Frontend Chuyên nghiệp

> **Stack:** React.js + TailwindCSS · **Theme:** Xanh lá & Trắng · **Cảm hứng:** Linear, Notion, Vercel Dashboard

---

## 📐 1. DESIGN PHILOSOPHY — Triết lý Thiết kế

### Hướng đi Thẩm mỹ: "Precision Clarity"
MultiMinutes AI là công cụ **B2B doanh nghiệp** — nơi mỗi giây của người dùng đều có giá trị.
Thiết kế phải truyền tải: **Hiệu quả · Tin cậy · Chuyên nghiệp**.

> **Keyword:** Clean Minimalism + Data-forward + Micro-delight

Tránh tuyệt đối:
- Gradient màu sắc rực rỡ như app consumer
- Card shadow quá nặng (box-shadow dày)
- Icon decorative không có nghĩa
- Animation rườm rà làm chậm workflow

---

## 🎨 2. COLOR SYSTEM — Hệ thống Màu sắc

```css
:root {
  /* === PRIMARY — Xanh lá chủ đạo === */
  --color-primary-50:  #f0fdf4;
  --color-primary-100: #dcfce7;
  --color-primary-200: #bbf7d0;
  --color-primary-300: #86efac;
  --color-primary-400: #4ade80;
  --color-primary-500: #22c55e;   /* Main CTA */
  --color-primary-600: #16a34a;   /* Hover */
  --color-primary-700: #15803d;   /* Active / Dark */
  --color-primary-800: #166534;
  --color-primary-900: #14532d;

  /* === NEUTRAL — Trắng & Xám === */
  --color-white:       #ffffff;
  --color-gray-50:     #f9fafb;   /* Background pages */
  --color-gray-100:    #f3f4f6;   /* Card background */
  --color-gray-200:    #e5e7eb;   /* Divider */
  --color-gray-300:    #d1d5db;   /* Border */
  --color-gray-400:    #9ca3af;   /* Placeholder */
  --color-gray-500:    #6b7280;   /* Secondary text */
  --color-gray-600:    #4b5563;
  --color-gray-700:    #374151;   /* Body text */
  --color-gray-800:    #1f2937;
  --color-gray-900:    #111827;   /* Heading */

  /* === SEMANTIC — Trạng thái === */
  --color-success:     #22c55e;
  --color-warning:     #f59e0b;
  --color-error:       #ef4444;
  --color-info:        #3b82f6;

  /* === SURFACE === */
  --surface-base:      #ffffff;
  --surface-raised:    #f9fafb;
  --surface-overlay:   rgba(0, 0, 0, 0.5);

  /* === BRAND GRADIENT === */
  --gradient-brand: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  --gradient-subtle: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
}
```

### Quy tắc sử dụng màu:
| Vai trò | Màu | Ví dụ |
|---------|-----|-------|
| Primary CTA | `primary-500` | Nút "Bắt đầu ghi âm", "Tạo cuộc họp" |
| Hover state | `primary-600` | Hover button |
| Active/Selected | `primary-700` | Nav item đang active |
| Background page | `gray-50` | Nền chính dashboard |
| Card surface | `white` | Card nội dung |
| Border | `gray-200` | Viền card, divider |
| Heading text | `gray-900` | H1, H2 |
| Body text | `gray-700` | Nội dung chính |
| Placeholder | `gray-400` | Input placeholder |
| Status: đang xử lý | `warning` | AI đang phân tích |
| Status: hoàn thành | `success` | Biên bản đã xong |
| Status: lỗi | `error` | Upload thất bại |

---

## 🔤 3. TYPOGRAPHY — Chữ viết

```css
/* Google Fonts — import vào index.html */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;   /* Dùng cho transcript, code */
}
```

> **Lý do chọn Plus Jakarta Sans:** Vừa có personality của startup tech, vừa đủ formal cho B2B. Khác hoàn toàn Inter/Roboto thông thường.

### Type Scale:
```css
/* Tailwind custom fontSize trong tailwind.config.js */
fontSize: {
  'display': ['2.25rem', { lineHeight: '1.2', fontWeight: '800' }],   /* 36px */
  'h1':      ['1.875rem', { lineHeight: '1.25', fontWeight: '700' }], /* 30px */
  'h2':      ['1.5rem',   { lineHeight: '1.3',  fontWeight: '700' }], /* 24px */
  'h3':      ['1.25rem',  { lineHeight: '1.4',  fontWeight: '600' }], /* 20px */
  'h4':      ['1.125rem', { lineHeight: '1.5',  fontWeight: '600' }], /* 18px */
  'body-lg': ['1rem',     { lineHeight: '1.6',  fontWeight: '400' }], /* 16px */
  'body':    ['0.875rem', { lineHeight: '1.6',  fontWeight: '400' }], /* 14px */
  'caption': ['0.75rem',  { lineHeight: '1.5',  fontWeight: '400' }], /* 12px */
  'mono':    ['0.8125rem',{ lineHeight: '1.7',  fontWeight: '400' }], /* 13px */
}
```

---

## 📐 4. SPACING & LAYOUT — Bố cục

### Layout Tổng thể (Dashboard):
```
┌──────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT (fluid)  │
│                         │                        │
│  Logo                   │  Top Bar (56px)        │
│  ─────────              │  ──────────────        │
│  Nav Items              │                        │
│  - Dashboard            │  Page Content          │
│  - Cuộc họp             │  (padding: 24px)       │
│  - Transcript           │                        │
│  - Action Items         │                        │
│  - Reports              │                        │
│  - Settings             │                        │
│                         │                        │
│  User Profile           │                        │
└──────────────────────────────────────────────────┘
```

### Spacing Scale (8px base):
```
4px  → gap-1  (micro spacing, icon gap)
8px  → gap-2  (tight items)
12px → gap-3  (form fields)
16px → gap-4  (default item gap)
24px → gap-6  (section padding)
32px → gap-8  (card padding)
48px → gap-12 (section break)
64px → gap-16 (page section)
```

### Grid System:
```jsx
// Dashboard content grid
<div className="grid grid-cols-12 gap-6">
  {/* Stats row */}
  <div className="col-span-3"> ... </div>  {/* 4 stats cards */}

  {/* Main content */}
  <div className="col-span-8"> ... </div>  {/* Transcript / content */}
  <div className="col-span-4"> ... </div>  {/* Summary panel */}
</div>
```

---

## 🧩 5. COMPONENT LIBRARY — Thư viện Component

### 5.1 Button System

```jsx
// Variants
const buttonVariants = {
  primary:   "bg-green-500 hover:bg-green-600 active:bg-green-700 text-white",
  secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
  ghost:     "bg-transparent hover:bg-gray-100 text-gray-600",
  danger:    "bg-red-500 hover:bg-red-600 text-white",
  success:   "bg-green-500 hover:bg-green-600 text-white",
}

// Sizes
const buttonSizes = {
  sm: "h-8  px-3  text-xs  gap-1.5",
  md: "h-9  px-4  text-sm  gap-2",
  lg: "h-10 px-5  text-sm  gap-2",
  xl: "h-12 px-6  text-base gap-2.5",
}

// Base classes (luôn có)
const base = "inline-flex items-center justify-center rounded-lg font-medium 
              transition-all duration-150 focus:outline-none focus:ring-2 
              focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 
              disabled:cursor-not-allowed select-none"
```

**Recording Button (đặc biệt):**
```jsx
// Button ghi âm có animation pulse khi đang record
<button className={cn(
  "relative h-14 w-14 rounded-full bg-green-500 hover:bg-green-600",
  "shadow-lg shadow-green-500/30 transition-all duration-200",
  isRecording && "bg-red-500 hover:bg-red-600 shadow-red-500/30"
)}>
  {isRecording && (
    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
  )}
  <MicIcon className="h-6 w-6 text-white relative z-10" />
</button>
```

### 5.2 Card Component

```jsx
// Base card
<div className="bg-white rounded-xl border border-gray-200 p-6 
                shadow-sm hover:shadow-md transition-shadow duration-200">
  ...
</div>

// Stat card (cho số liệu)
<div className="bg-white rounded-xl border border-gray-200 p-5">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
      <Icon className="h-4 w-4 text-green-600" />
    </div>
  </div>
  <div className="text-2xl font-bold text-gray-900">{value}</div>
  <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
</div>
```

### 5.3 Status Badge

```jsx
const statusConfig = {
  processing: { label: 'Đang xử lý', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed:  { label: 'Hoàn thành', color: 'bg-green-50 text-green-700 border-green-200' },
  failed:     { label: 'Thất bại',   color: 'bg-red-50 text-red-700 border-red-200' },
  pending:    { label: 'Chờ xử lý',  color: 'bg-gray-50 text-gray-600 border-gray-200' },
  reviewing:  { label: 'Đang duyệt', color: 'bg-blue-50 text-blue-700 border-blue-200' },
}

<span className={cn(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
  statusConfig[status].color
)}>
  <span className="h-1.5 w-1.5 rounded-full bg-current" />
  {statusConfig[status].label}
</span>
```

### 5.4 Input & Form

```jsx
// Input với label
<div className="space-y-1.5">
  <label className="text-sm font-medium text-gray-700">{label}</label>
  <input
    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white
               text-sm text-gray-900 placeholder-gray-400
               focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
               transition-all duration-150"
  />
  {error && <p className="text-xs text-red-500">{error}</p>}
</div>
```

### 5.5 Progress Bar (cho AI Processing)

```jsx
<div className="space-y-1">
  <div className="flex justify-between text-xs text-gray-500">
    <span>{label}</span>
    <span>{progress}%</span>
  </div>
  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full
                 transition-all duration-500 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

---

## 🗂️ 6. PAGE STRUCTURES — Cấu trúc Trang

### 6.1 Sidebar Navigation

```jsx
const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan',    path: '/dashboard' },
  { icon: Mic,             label: 'Ghi âm mới',   path: '/record',    highlight: true },
  { icon: FileText,        label: 'Cuộc họp',     path: '/meetings' },
  { icon: AlignLeft,       label: 'Transcript',   path: '/transcripts' },
  { icon: CheckSquare,     label: 'Action Items', path: '/actions',   badge: 5 },
  { icon: BarChart2,       label: 'Báo cáo',      path: '/reports' },
  { icon: Users,           label: 'Thành viên',   path: '/members',   role: 'manager' },
  { icon: Settings,        label: 'Cài đặt',      path: '/settings' },
]
```

### 6.2 Dashboard Page Layout

```
┌─────────────────────────────────────────────────┐
│ HEADER: "Xin chào, [Tên]!" + Quick actions      │
├─────────────────────────────────────────────────┤
│ STATS ROW (4 cards):                            │
│ [Tổng cuộc họp] [Đang xử lý] [Action Items] [Tiết kiệm giờ] │
├─────────────────────────────────────────────────┤
│ RECENT MEETINGS (bảng, 5 dòng gần nhất)         │
│ + CTA "Xem tất cả"                              │
├──────────────────────┬──────────────────────────┤
│ ACTION ITEMS của tôi │  AI Processing Queue     │
│ (checklist)          │  (progress bars)         │
└──────────────────────┴──────────────────────────┘
```

### 6.3 Meeting Detail Page — Trang chính của App

```
┌──────────────────────────────────────────────────────────┐
│ HEADER: Tên cuộc họp + Meta (ngày, thời lượng, người)    │
│ + Tabs: [Transcript] [Bản dịch] [Tóm tắt] [Action Items]│
├────────────────────────────┬─────────────────────────────┤
│ TRANSCRIPT PANEL (2/3)     │ SUMMARY PANEL (1/3)         │
│                            │                             │
│ Audio Player               │ Key Points (3-7 items)      │
│ ──────────────             │                             │
│ [00:01:23] [Giám đốc]      │ Decisions Made              │
│ Nội dung phát biểu...      │                             │
│                            │ Action Items                │
│ [00:02:45] [Kế toán]       │ (owner + deadline)          │
│ Nội dung phát biểu...      │                             │
│                            │ Export Buttons              │
│ [Tìm kiếm trong text]      │ [PDF] [DOCX] [Email]        │
└────────────────────────────┴─────────────────────────────┘
```

### 6.4 Record/Upload Page

```
┌───────────────────────────────────────────────┐
│           NEW MEETING                         │
│  Tên cuộc họp: [_______________]              │
│  Người tham gia: [tag input]                  │
│  Ngôn ngữ: [VI ▼]  Dịch sang: [EN, JA ▼]    │
├───────────────────────────────────────────────┤
│      ┌─────────────────────────────┐          │
│      │   🎙️  [●] BẮT ĐẦU GHI ÂM  │          │
│      │   hoặc                      │          │
│      │   📁  Kéo thả file MP3/WAV │          │
│      └─────────────────────────────┘          │
│                                               │
│  Waveform Visualizer (khi đang ghi)           │
│  ████████░░░░░░░░░░░  00:05:32                │
└───────────────────────────────────────────────┘
```

---

## ✨ 7. ANIMATIONS & MICRO-INTERACTIONS

### 7.1 Page Load — Staggered Reveal
```jsx
// Dùng framer-motion hoặc CSS animation-delay
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}
```

### 7.2 Processing State Animation
```jsx
// AI đang xử lý — chuỗi step hiện dần
const steps = [
  'Đang chuyển đổi giọng nói...',
  'Phân tách người nói...',
  'AI đang dịch thuật...',
  'Tổng hợp nội dung...',
  'Hoàn thành! ✓'
]
// Hiển thị từng bước với fade-in + checkmark animation
```

### 7.3 Audio Waveform
```jsx
// Real-time waveform khi ghi âm
// Dùng Web Audio API + Canvas / hoặc thư viện wavesurfer.js
// Màu: green-400 với opacity animation
```

### 7.4 Transcript Typing Effect
```jsx
// Khi STT trả về real-time, text hiện ra như đang gõ
// cursor nhấp nháy ở cuối dòng đang xử lý
<span className="animate-pulse text-green-500">|</span>
```

### 7.5 Toast Notifications
```jsx
// Sử dụng react-hot-toast
toast.success('Biên bản đã được xuất thành công!', {
  style: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
  }
})
```

### 7.6 CSS Keyframes quan trọng
```css
@keyframes slideInRight {
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes fadeInUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes recordingPulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.05); opacity: 0.9; }
}

/* Apply: */
.transcript-line { animation: slideInRight 0.25s ease-out; }
.stat-card       { animation: fadeInUp 0.3s ease-out both; }
.recording-btn   { animation: recordingPulse 2s ease-in-out infinite; }
```

---

## 📦 8. TAILWIND CONFIG

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'modal': '0 20px 60px rgba(0,0,0,0.15)',
        'green': '0 4px 14px rgba(34,197,94,0.25)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-right': 'slideInRight 0.25s ease-out',
        'recording': 'recordingPulse 2s ease-in-out infinite',
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ]
}
```

---

## 📁 9. PROJECT STRUCTURE — Cấu trúc Thư mục

```
src/
├── components/
│   ├── ui/                    # Atomic components
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Progress.jsx
│   │   ├── Toast.jsx
│   │   └── Tooltip.jsx
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   └── MainLayout.jsx
│   ├── meeting/               # Domain components
│   │   ├── MeetingCard.jsx
│   │   ├── MeetingTable.jsx
│   │   └── MeetingFilters.jsx
│   ├── transcript/
│   │   ├── TranscriptPanel.jsx
│   │   ├── TranscriptLine.jsx
│   │   ├── AudioPlayer.jsx
│   │   └── SpeakerTag.jsx
│   ├── summary/
│   │   ├── SummaryPanel.jsx
│   │   ├── KeyPoints.jsx
│   │   ├── ActionItemList.jsx
│   │   └── DecisionList.jsx
│   ├── record/
│   │   ├── RecordButton.jsx
│   │   ├── Waveform.jsx
│   │   ├── UploadZone.jsx
│   │   └── ProcessingStatus.jsx
│   └── dashboard/
│       ├── StatsRow.jsx
│       ├── RecentMeetings.jsx
│       └── AIQueue.jsx
│
├── pages/
│   ├── DashboardPage.jsx
│   ├── MeetingsPage.jsx
│   ├── MeetingDetailPage.jsx
│   ├── RecordPage.jsx
│   ├── ActionItemsPage.jsx
│   ├── ReportsPage.jsx
│   ├── MembersPage.jsx        # Manager only
│   ├── AdminPage.jsx          # Admin only
│   └── LoginPage.jsx
│
├── hooks/
│   ├── useRecording.js        # Web Audio API logic
│   ├── useMeeting.js
│   ├── useTranscript.js
│   ├── useWebSocket.js        # Real-time transcript
│   └── useAuth.js
│
├── services/
│   ├── api.js                 # Axios instance
│   ├── meetingService.js
│   ├── transcriptService.js
│   └── exportService.js
│
├── store/                     # Zustand or Redux
│   ├── authStore.js
│   ├── meetingStore.js
│   └── uiStore.js
│
└── styles/
    ├── index.css              # Tailwind imports + global
    └── variables.css          # CSS custom properties
```

---

## 🔌 10. WEBSOCKET — Real-time Transcript

```jsx
// hooks/useWebSocket.js
const useWebSocket = (meetingId) => {
  const [transcript, setTranscript] = useState([])
  const [status, setStatus] = useState('idle') // idle | connecting | streaming | done

  useEffect(() => {
    const ws = new WebSocket(`ws://api/meetings/${meetingId}/stream`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'transcript_chunk') {
        setTranscript(prev => [...prev, {
          id: data.id,
          speaker: data.speaker,
          text: data.text,
          timestamp: data.timestamp,
          isNew: true             // Trigger animation
        }])
      }

      if (data.type === 'status_update') {
        setStatus(data.status)
      }
    }

    return () => ws.close()
  }, [meetingId])

  return { transcript, status }
}
```

---

## 📤 11. EXPORT UX — Trải nghiệm Xuất file

```jsx
// Export buttons với loading state
const ExportPanel = ({ meetingId }) => {
  const [exporting, setExporting] = useState(null)

  const handleExport = async (format) => {
    setExporting(format)
    try {
      const blob = await exportService.export(meetingId, format)
      downloadBlob(blob, `bien-ban-${meetingId}.${format}`)
      toast.success(`Xuất ${format.toUpperCase()} thành công!`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        onClick={() => handleExport('pdf')}
        loading={exporting === 'pdf'}
        icon={<FileText className="h-4 w-4" />}
      >
        Xuất PDF
      </Button>
      <Button
        variant="secondary"
        onClick={() => handleExport('docx')}
        loading={exporting === 'docx'}
        icon={<File className="h-4 w-4" />}
      >
        Xuất DOCX
      </Button>
      <Button
        variant="ghost"
        onClick={() => handleExport('email')}
        icon={<Mail className="h-4 w-4" />}
      >
        Gửi Email
      </Button>
    </div>
  )
}
```

---

## 🔐 12. AUTH & ROLE-BASED UI

```jsx
// Hiển thị menu theo role
const useRoleAccess = () => {
  const { user } = useAuth()
  return {
    canManageUsers:    ['admin', 'manager'].includes(user.role),
    canDeleteMeeting:  ['admin', 'manager'].includes(user.role),
    canViewCosts:      user.role === 'admin',
    canApproveMinutes: ['admin', 'manager'].includes(user.role),
    canRecord:         true,  // Tất cả
  }
}

// Sử dụng trong component:
const { canManageUsers } = useRoleAccess()
{canManageUsers && <NavItem label="Thành viên" path="/members" />}
```

---

## 📱 13. RESPONSIVE DESIGN

```jsx
// Breakpoints: sm(640) md(768) lg(1024) xl(1280) 2xl(1536)

// Sidebar: hidden trên mobile, slide-in khi toggle
<aside className={cn(
  "fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200",
  "transition-transform duration-300",
  "lg:translate-x-0 lg:static lg:z-auto",  // Desktop: luôn hiện
  mobileOpen ? "translate-x-0" : "-translate-x-full"  // Mobile: toggle
)}>

// Meeting grid: 1 cột mobile → 2 cột tablet → bố cục đầy đủ desktop
<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
  <TranscriptPanel />
  <SummaryPanel className="hidden lg:block" />  {/* Summary: chuyển sang tab trên mobile */}
</div>
```

---

## ⚡ 14. PERFORMANCE BEST PRACTICES

```jsx
// 1. Lazy load các trang
const MeetingDetailPage = lazy(() => import('./pages/MeetingDetailPage'))

// 2. Virtual scroll cho transcript dài
import { FixedSizeList } from 'react-window'
// Transcript có thể 1000+ dòng — phải virtual scroll

// 3. Debounce search input
const debouncedSearch = useDeferredValue(searchQuery)

// 4. Memo hóa transcript lines
const TranscriptLine = memo(({ line }) => { ... })

// 5. Tách AudioPlayer — chỉ load khi cần
const AudioPlayer = lazy(() => import('./components/transcript/AudioPlayer'))
```

---

## 🎯 15. KEY UX PATTERNS — Học từ Website Nổi tiếng

### Từ Linear.app:
- Keyboard shortcuts hiển thị trong tooltip
- Sidebar collapse animation mượt
- Empty states có illustration + CTA rõ ràng

### Từ Notion:
- Inline editing transcript (click để sửa trực tiếp)
- Slash command `/` để insert action items
- Breadcrumb navigation

### Từ Vercel Dashboard:
- Status dots với màu semantic rõ ràng
- Timeline/Activity log ở sidebar phải
- Dark mode support (CSS variables sẵn sàng)

### Từ Loom:
- Waveform playback sync với text highlight
- Speaker color coding (mỗi người một màu nhẹ)
- Timestamp click-to-seek

### Từ Asana:
- Action items checklist với owner avatar
- Due date color: đỏ = quá hạn, cam = hôm nay, xanh = an toàn
- Progress indicator tổng số task

---

## ✅ 16. CHECKLIST TRƯỚC KHI SHIP

### Visual Quality
- [ ] Không có hardcoded color, dùng CSS variables hoặc Tailwind token
- [ ] Font load đúng, không flash FOUT
- [ ] Icon set nhất quán (dùng **Lucide React** xuyên suốt)
- [ ] Spacing đồng đều, không có pixel lẻ

### Functionality
- [ ] Loading state cho mọi async action
- [ ] Error state với message rõ ràng + retry CTA
- [ ] Empty state cho danh sách trống
- [ ] Toast notification sau mỗi action quan trọng

### Responsive
- [ ] Test trên 375px (iPhone SE), 768px (iPad), 1280px (laptop)
- [ ] Sidebar collapse đúng trên mobile
- [ ] Table có horizontal scroll trên mobile

### Accessibility
- [ ] Focus ring hiển thị khi dùng keyboard
- [ ] ARIA labels cho icon buttons
- [ ] Color contrast ratio ≥ 4.5:1

### Performance
- [ ] Bundle split theo route (code splitting)
- [ ] Image lazy loading
- [ ] API response được cache (React Query / SWR)

---

## 📚 17. THƯ VIỆN ĐỀ XUẤT

| Mục đích | Thư viện | Lý do |
|----------|----------|-------|
| UI Components | TailwindCSS + shadcn/ui | Flexible, không opinionated |
| Icons | `lucide-react` | Nhẹ, nhất quán, tree-shakeable |
| Animation | `framer-motion` | Powerful, React-native |
| Audio Waveform | `wavesurfer.js` | Mature, feature-rich |
| Forms | `react-hook-form` + `zod` | Performance + validation |
| State | `zustand` | Đơn giản, ít boilerplate |
| Data fetching | `@tanstack/react-query` | Cache, loading, error tự động |
| Toast | `react-hot-toast` | Đơn giản, đẹp |
| Date | `date-fns` | Nhẹ hơn moment.js |
| PDF Preview | `react-pdf` | Preview trước khi export |
| Virtual list | `react-window` | Transcript 1000+ dòng |
| Charts | `recharts` | Cost dashboard, analytics |

---

*MultiMinutes AI Frontend Guide v1.0 — Được tạo cho Sprint 3+*
*Stack: React + TailwindCSS · Theme: Green & White · Cảm hứng: Linear, Notion, Vercel*