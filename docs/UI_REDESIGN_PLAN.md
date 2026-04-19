# 🎨 UI Redesign Plan - MultiMinutes AI

> **Mục tiêu:** Chuyển đổi từ dashboard-style cũ sang **Workspace/Group model** giống Microsoft Teams, tập trung vào **Fe FIRST**, quản lý cuộc họp theo nhóm, lưu trữ nội dung cuộc họp trong group riêng.

---

## 📐 TỔNG QUAN KIẾN TRÚC MỚI

### Mô hình Group/Workspace
```
MultiMinutes AI
│
├── 🏢 Organization (công ty)
│   ├── 📁 Group: "Phòng Kinh Doanh"
│   │   ├── 📋 Cuộc họp của group
│   │   ├── 👥 Thành viên group
│   │   ├── 💬 Chat group
│   │   ├── 📊 Group Stats
│   │   └── 📁 Files
│   ├── 📁 Group: "Phòng Kỹ Thuật"
│   └── 📁 Group: "Ban Giám Đốc"
│
├── 👤 Personal Space
│   ├── ✅ My Actions
│   ├── ⭐ Starred Meetings
│   └── 🔔 Notifications
│
└── ⚙️ Admin (Super Admin only)
    ├── 📊 Insights & Analytics
    ├── 👥 Users Management
    ├── 💰 Cost Management
    └── ⚙️ System Settings
```

---

## 🏗️ BỐ CỤC CHÍNH

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [☰]  MultiMinutes AI                     🔍 Search...    🔔 3   👤 User ▼ │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│ SIDEBAR  │  MAIN CONTENT                                                   │
│ (250px)  │                                                                 │
│          │  ┌────────────────────────────────────────────────────────────┐ │
│ GROUPS   │  │ Breadcrumbs / Page Title / Actions                         │ │
│ ──────   │  └────────────────────────────────────────────────────────────┘ │
│ 🏢 My Org│  ┌────────────────────────────────────────────────────────────┐ │
│   📁 Kinh Doanh (active) │  │                                                             │ │
│   📁 Kỹ Thuật           │  │  DYNAMIC CONTENT                                              │ │
│   📁 Ban Giám Đốc       │  │  (changes per page)                                           │ │
│                          │  │                                                             │ │
│ ──────                   │  │                                                             │ │
│ QUICK ACCESS             │  │                                                             │ │
│ ──────                   │  │                                                             │ │
│ 📋 All Meetings          │  │                                                             │ │
│ ➕ Upload Audio          │  │                                                             │ │
│ ✅ My Actions            │  └────────────────────────────────────────────────────────────┘ │
│ ⭐ Starred               │                                                                  │
│ 🗑️ Recycle Bin           │                                                                  │
│                          │                                                                  │
│ ──────                   │                                                                  │
│ ADMIN (👑 only)          │                                                                  │
│ ──────                   │                                                                  │
│ 📊 Insights              │                                                                  │
│ 👥 Users                 │                                                                  │
│ 💰 Costs                 │                                                                  │
│ ⚙️ Settings              │                                                                  │
│                          │                                                                  │
│ ──────                   │                                                                  │
│ HELP                     │                                                                  │
│ ──────                   │                                                                  │
│ ❓ Help Center           │                                                                  │
│ 📖 API Docs              │                                                                  │
│ 💬 Feedback              │                                                                  │
│                          │                                                                  │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

---

## 📋 CHI TIẾT TỪNG TRANG

### 1️⃣ HOME / DASHBOARD (Default sau login)

**URL:** `/dashboard`

**Components:**
- Stat cards: Meetings, Total Time, Actions Pending, AI Status
- Upcoming Meetings
- Recent Notifications
- My Action Items (overdue, due soon, on track)
- Activity chart (7 days)
- Quick Actions bar: Upload, Create Meeting, Search

---

### 2️⃣ GROUP DETAIL PAGE

**URL:** `/groups/:id`

**Tabs:**
- 📋 **Meetings:** List of group meetings with filters, pagination, status badges
- 👥 **Members:** Member list with roles, search, add/remove
- 💬 **Group Chat:** Discussion about meetings (persistent chat per group)
- 📊 **Group Stats:** Meetings per week, top members, avg duration, action completion rate, top topics
- 📁 **Files:** Exported files, original audio, storage usage

**Group Roles:**
| Role | Permissions |
|------|-------------|
| 👑 Owner | Full control, manage members, settings, delete group |
| 👤 Admin | Create meetings, manage content, invite members |
| 👤 Member | View meetings, chat, upload audio |
| 👁️ Viewer | Read-only access |

---

### 3️⃣ MEETING DETAIL PAGE (Improved)

**URL:** `/groups/:groupId/meetings/:meetingId`

**Tabs:**
- 📝 **Summary:** Meeting overview, key points, decisions, action items
- 🗣️ **Transcript:** Full transcript with audio player, speaker filter, confidence highlighting, edit capability
- ✅ **Actions:** Action items extracted from meeting
- 💬 **Chat AI:** Ask AI about this specific meeting with context
- 📊 **Quality:** STT accuracy, diarization accuracy, processing timeline, low-confidence segments

**Features:**
- Audio player synced with transcript (click segment → jump in audio)
- Export buttons: PDF, DOCX
- Star meeting
- Compare with another meeting

---

### 4️⃣ MY ACTIONS PAGE

**URL:** `/my-actions`

**Sections:**
- 🔴 Overdue (with escalation option)
- 🟡 Due within 7 days
- 🟢 On track
- ✅ Completed (recent history)

**Filters:** By deadline, by group, by status
**Actions:** Mark done, edit, add comment, escalate

---

### 5️⃣ UPLOAD / NEW MEETING

**URL:** `/upload`

**Multi-step wizard:**
1. **Step 1: Basic Info** - Title, group, date/time, attendees, description
2. **Step 2: Upload Audio** - Drag & drop, preview, multiple files
3. **Step 3: AI Processing Options** - STT provider, language, diarization, summarize, translate

**Processing Queue:** Shows progress of ongoing uploads with ETA

---

### 6️⃣ CREATE GROUP PAGE

**URL:** `/groups/new` (Admin only)

**Sections:**
- Basic info: Name, description, icon, privacy level
- Members: Search users, assign roles
- Group settings: Auto-summarize, notifications, storage limit, retention

---

### 7️⃣ ADMIN: USERS MANAGEMENT

**URL:** `/admin/users`

**Features:**
- User list with search, filters (role, status)
- Bulk actions: Change role, deactivate, delete
- Stats: Total users, active, pending invites, inactive
- User detail modal: Groups, meetings count, last active

---

### 8️⃣ ADMIN: INSIGHTS & ANALYTICS

**URL:** `/admin/insights`

**Widgets:**
- Stat cards: Meetings, Total Time, Active Users, Actions
- Meetings trend (line chart, compare periods)
- AI Provider Usage (pie/bar chart)
- Top Groups by Activity
- Avg Processing Time breakdown
- Cost Analysis with budget bar, projection
- Top Contributors
- Quality Metrics averages

---

### 9️⃣ ADMIN: COST MANAGEMENT

**URL:** `/admin/costs`

**Sections:**
- Budget overview with progress bar
- Cost by provider table
- Cost by group table
- Recent cost log with pagination, CSV export

---

### 🔟 ADMIN: SYSTEM SETTINGS

**URL:** `/admin/settings`

**Tabs:**
- **AI Providers:** LLM/STT/Diarization selection, API keys with test, model settings
- **Budget & Alerts:** Monthly budget, threshold, notification channels
- **General:** Language, timezone, date format, auto-processing options, upload limits
- **Security:** JWT secret, token expiry, login attempts, CORS, 2FA

---

### 1️⃣1️⃣ NOTIFICATIONS PAGE

**URL:** `/notifications`

**Types:**
- 🔴 Action Item Overdue
- ✅ Meeting Processed Successfully
- 📤 Export Ready
- 👤 New Action Item Assigned
- 👋 Welcome to Group
- ⚙️ Budget Alert

**Features:** Filter by type, mark read, clear all

---

### 1️⃣2️⃣ MEETING COMPARISON PAGE

**URL:** `/meetings/compare`

**Features:**
- Select 2+ meetings to compare
- Side-by-side metrics table
- Common topics detection
- Trend analysis

---

## 🗑️ TRANG CẦN XOÁ

| Page hiện tại | Lý do xoá |
|---------------|-----------|
| `/team` | 100% local state, không có backend |
| `/reports` | Trùng với Insights, dữ liệu giả |
| `/room/:code` | Không có WebRTC/WebSocket backend |
| `/join` | Không có backend verify code |
| `/create` (room-based) | Thay bằng `/upload` wizard |

---

## 📊 CẤU TRÚC NAVIGATION MỚI

```
MultiMinutes AI
│
├── 🏠 /dashboard - Dashboard
│
├── 📁 GROUPS (dynamic in sidebar)
│   ├── 📁 /groups/:id - Group detail
│   │   ├── /groups/:id/meetings
│   │   ├── /groups/:id/members
│   │   ├── /groups/:id/chat
│   │   ├── /groups/:id/stats
│   │   └── /groups/:id/files
│   └── /groups/new - Create group (admin)
│
├── 📋 /meetings - All meetings (cross-group)
│
├── ➕ /upload - Upload & create meeting
│
├── ✅ /my-actions - My action items
│
├── ⭐ /starred - Starred meetings
│
├── 🔔 /notifications - Notifications
│
├── 🗑️ /recycle-bin - Soft deleted items
│
│── ───── ADMIN ONLY ─────
│
├── 📊 /admin/insights - Analytics
│
├── 👥 /admin/users - User management
│
├── 💰 /admin/costs - Cost management
│
├── ⚙️ /admin/settings - System settings
│
└── 🆘 /help - Help center
```

---

## 🎨 DESIGN SYSTEM

### Colors
```
Primary:    #1a73e8 (Google Blue)
Secondary:  #5f6368 (Gray)
Success:    #34a853 (Green)
Warning:    #fbbc04 (Yellow)
Error:      #ea4335 (Red)
Info:       #4285f4 (Blue)
Background: #f8f9fa (Light Gray)
Surface:    #ffffff (White)
Text:       #202124 (Dark Gray)
Text Light: #5f6368 (Medium Gray)
```

### Typography
```
Font: Inter, system-ui, sans-serif
Heading: 600 (Semi-bold)
Body: 400 (Regular)
Small: 300 (Light)
```

### Spacing
```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
```

### Components
```
Sidebar: 250px width, collapsible
Cards: border-radius 12px, shadow subtle
Buttons: border-radius 8px, hover scale 1.02
Tables: striped rows, action buttons
Badges: rounded-full, color-coded
Inputs: border 1px, focus ring primary
```

---

## 🔧 BACKEND API CẦN THÊM

### Groups & Collaboration
1. `GET    /api/groups`                    - List groups (user-scoped)
2. `POST   /api/groups`                    - Create group (admin)
3. `GET    /api/groups/:id`                - Group detail
4. `PATCH  /api/groups/:id`                - Update group
5. `DELETE /api/groups/:id`                - Soft delete group
6. `GET    /api/groups/:id/members`        - List members
7. `POST   /api/groups/:id/members`        - Add member
8. `PATCH  /api/groups/:id/members/:uid`   - Update member role
9. `DELETE /api/groups/:id/members/:uid`   - Remove member
10. `POST   /api/groups/:id/chat`           - Send group chat message
11. `GET    /api/groups/:id/chat`           - Get chat history
12. `GET    /api/groups/:id/files`          - List group files
13. `GET    /api/groups/:id/stats`          - Group statistics

### Meetings (enhanced)
14. `GET    /api/meetings`                  - List with pagination, search, group filter
15. `GET    /api/meetings/:id`              - Meeting detail
16. `PATCH  /api/meetings/:id`              - Update meeting
17. `DELETE /api/meetings/:id`              - Soft delete
18. `POST   /api/meetings/:id/star`         - Star/unstar meeting
19. `POST   /api/meetings/compare`          - Compare 2+ meetings

### Actions
20. `GET    /api/actions/my`                - My action items
21. `PATCH  /api/actions/:id`               - Update action (mark done)
22. `POST   /api/actions`                   - Manual create action

### Users (admin)
23. `GET    /api/admin/users`               - List users
24. `POST   /api/admin/users`               - Create user
25. `PATCH  /api/admin/users/:id`           - Update user
26. `DELETE /api/admin/users/:id`           - Deactivate/delete

### Notifications
27. `GET    /api/notifications`             - Get user notifications
28. `PATCH  /api/notifications/:id/read`    - Mark as read
29. `PATCH  /api/notifications/read-all`    - Mark all read

### Settings
30. `GET    /api/settings`                  - Get system settings (admin)
31. `PATCH  /api/settings`                  - Update system settings (admin)

---

## 📊 DATABASE SCHEMA MỚI

### New Tables

```sql
-- Groups
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(10) DEFAULT '📁',
    privacy VARCHAR(20) DEFAULT 'private', -- public, private, secret
    owner_id UUID REFERENCES users(id),
    storage_limit BIGINT DEFAULT 10737418240, -- 10GB
    storage_used BIGINT DEFAULT 0,
    retention_days INT DEFAULT 90,
    auto_summarize BOOLEAN DEFAULT true,
    auto_extract_actions BOOLEAN DEFAULT true,
    auto_translate BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Group Members
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- owner, admin, member, viewer
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group Chat Messages
CREATE TABLE group_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    meeting_id UUID REFERENCES meetings(id), -- optional: link to meeting
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL, -- overdue_action, meeting_completed, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Tables

```sql
-- Meetings: add group_id and soft delete
ALTER TABLE meetings ADD COLUMN group_id UUID REFERENCES groups(id);
ALTER TABLE meetings ADD COLUMN starred BOOLEAN DEFAULT false;
ALTER TABLE meetings ADD COLUMN deleted_at TIMESTAMP;

-- Users: add soft delete
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN last_active TIMESTAMP;
```

---

## 🔒 ROLE-BASED ACCESS CONTROL

| Action | Viewer | Member | Admin | Owner | Super Admin |
|--------|--------|--------|-------|-------|-------------|
| View group | ✅ | ✅ | ✅ | ✅ | ✅ |
| View meetings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload audio | ❌ | ✅ | ✅ | ✅ | ✅ |
| View transcript | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat with AI | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat group | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create meeting | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit meeting | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete meeting | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage members | ❌ | ❌ | ✅ | ✅ | ✅ |
| Group settings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete group | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin pages | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 📱 RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, hamburger sidebar |
| Tablet | 768px - 1024px | Collapsible sidebar |
| Desktop | > 1024px | Fixed sidebar 250px |

---

## ✅ IMPLEMENTATION PHASES

### Phase 1: Layout Foundation
- [ ] New App.tsx routing structure
- [ ] MainLayout component (sidebar + topbar + content)
- [ ] Sidebar component with group navigation
- [ ] TopBar component (search, notifications, user dropdown)
- [ ] Responsive sidebar toggle

### Phase 2: Cleanup
- [ ] Remove unused pages (Team, Reports, Room, Join, Create)
- [ ] Remove unused components
- [ ] Clean up routes

### Phase 3: Group Feature
- [ ] Group DB models & migration
- [ ] Group API endpoints
- [ ] Group pages (detail, members, chat, stats, files)
- [ ] Create Group page

### Phase 4: Core Pages Redesign
- [ ] Dashboard page
- [ ] Meetings list with pagination
- [ ] Meeting Detail with tabs
- [ ] Upload/New Meeting wizard
- [ ] My Actions page
- [ ] Notifications page

### Phase 5: Admin Pages
- [ ] Insights & Analytics
- [ ] Users Management
- [ ] Cost Management
- [ ] System Settings

### Phase 6: Backend Bug Fixes
- [ ] Fix Chat endpoint
- [ ] Fix Export endpoint
- [ ] Fix audio path default bug
- [ ] Fix registration role escalation
- [ ] Fix NLP evaluation
- [ ] Fix Analytics hardcoded data
- [ ] Add auth to download endpoint
- [ ] Vietnamese PDF font support

---

## 📝 NOTES

- **FE First:** Build UI with mock data first, then connect to APIs
- **Progressive Enhancement:** Start with core features, add extras later
- **Keep it Simple:** Don't over-engineer, focus on user experience
- **Vietnamese Support:** All UI text in Vietnamese, proper font rendering
- **Dark Mode:** Consider for future phases
