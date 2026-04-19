# 🎨 MultiMinutes AI - Chi Tiết Giao Diện Từng Trang (v2 - Multi-Org)

> **Thiết kế theo mô hình Organization/Group/Meeting** - Như Microsoft Teams + Slack
> **5-Tier Roles:** System Admin → Org Admin → Group Admin → Member → Viewer
> **Tập trung:** Cấu trúc phân tầng: Tổ Chức → Nhóm → Cuộc họp,  với quản lý quyền rõ ràng

---

## 📐 BỐ CỤC TỔNG QUAN (V2)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [☰]  MultiMinutes AI                                    🔍 Search...   🔔 3  👤▼  │
│  ↑ Top Bar: Logo, Search, Notifications, User Dropdown (+ Org Selector)            │
├──────────────────────────┬───────────────────────────────────────────────────────────┤
│                          │                                                           │
│  SIDEBAR (280px)         │   MAIN CONTENT AREA                                       │
│                          │                                                           │
│  🏢 ORGANIZATION         │   ┌──────────────────────────────────────────────────┐   │
│  ┌────────────────────┐  │   │                                                  │   │
│  │ [▼] ABC Company    │  │   │  DYNAMIC CONTENT                                 │   │
│  │ (Org Admin: ⭐)    │  │   │  (Changes based on route & org context)          │   │
│  └────────────────────┘  │   │                                                  │   │
│                          │   │                                                  │   │
│  📁 GROUPS (in org)      │   └──────────────────────────────────────────────────┘   │
│  ├─ 🎯 Kinh Doanh (5👤) │                                                           │
│  ├─ 🔧 Kỹ Thuật  (8👤) │                                                           │
│  ├─ 👑 Ban GD     (3👤) │                                                           │
│  ├─ 🚀 New Product(12👤)│                                                           │
│  └─ [➕ New Group]      │                                                           │
│                          │                                                           │
│  ────────────────────── │                                                           │
│  ⭐ ORG ADMIN           │                                                           │
│  (Chỉ hiện nếu          │                                                           │
│   user = Org Admin)      │                                                           │
│                          │                                                           │
│  📊 Org Analytics        │                                                           │
│  👥 Users in Org         │                                                           │
│  💰 Org Costs            │                                                           │
│  ⚙️ Org Settings         │                                                           │
│  👑 System Admin         │                                                           │
│                          │                                                           │
│  ────────────────────── │                                                           │
│  QUICK ACCESS            │                                                           │
│  📋 All Meetings         │                                                           │
│  ✅ My Actions           │                                                           │
│  ⭐ Starred              │                                                           │
│  📤 Upload Audio         │                                                           │
│                          │                                                           │
│  ────────────────────── │                                                           │
│  👤 GROUP ADMIN MENU     │                                                           │
│  (Hiện nếu user là       │                                                           │
│   Group Admin)           │                                                           │
│                          │                                                           │
│  📊 Group Analytics      │                                                           │
│  👥 Group Members        │                                                           │
│  💰 Group Costs          │                                                           │
│  ⚙️ Group Settings       │                                                           │
│                          │                                                           │
└──────────────────────────┴───────────────────────────────────────────────────────────┘
```

---

## FLOW 1️⃣: LOGIN & ONBOARDING

```
NEW USER (First Time)
    ↓
[Login Page] → Email/Password
    ↓
[Invite > Accept] → User joins Organization
    ↓
[Auto Set: MEMBER Role] → Can create groups
    ↓
[Dashboard] → See groups in their org only
    ↓
[Create Group?] → Become Group Admin of new group
```

---

# 🖥️ TRANG DETAILS

---

## TRANG 1️⃣: 🏠 DASHBOARD (Default sau login)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard                                       🏢 ABC Company  👋 Chào Nguyễn A │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ ┌──────────────┐ │
│  │ 📋 Meetings (My) │  │ ⏱️ My Time Spent  │  │ ✅ My Actions    │ │ 🤖 AI Status │ │
│  │                  │  │                  │  │                  │ │              │ │
│  │      24 (org)    │  │    18.5 giờ      │  │    Overdue: 2    │ │ 🟢 Online    │ │
│  │   ↑ 12% tháng    │  │   ↑ 8% tháng     │  │   Due Soon: 5    │ │ 97.5% success│ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ └──────────────┘ │
│                                                                                     │
│  ┌─ 🏢 ORGANIZATION STATS (Org Admin only)      ┌─ 📅 UPCOMING IN MY GROUPS      │
│  │                                                │                               │ │
│  │ 📊 Org Overview:                              │ ⏰ 14:00 - Sprint Review #25  │ │
│  │  • Total Users: 24                             │     📁 Kinh Doanh • 5 người  │ │
│  │  • Total Groups: 8                             │                               │ │
│  │  • Total Meetings: 124                         │ ⏰ 16:00 - Planning Q3        │ │
│  │  • Org Usage: 78% of budget                    │    📁 Kỹ Thuật • 8 người    │ │
│  │                                                │                               │ │
│  │ 👥 Top Groups by Activity:                     │ ⏰ 09:00 T2 - Daily Standup  │ │
│  │  1. Kỹ Thuật (45 meetings)                     │    📁 Kỹ Thuật • 3 người    │ │
│  │  2. Kinh Doanh (38 meetings)                   │                               │ │
│  │  3. Ban GD (22 meetings)                       │ [Xem tất cả →]               │ │
│  │                                                │                               │ │
│  │ 💰 Org Cost This Month: $342                   └───────────────────────────────┘ │
│  │  (↓ 5% vs last month)                                                           │ │
│  └─────────────────────────────────────────┐                                       │
│                                              │                                       │
│  ┌─ ✅ MY ACTION ITEMS ──────────────────────┘                                     │
│  │                                                                                     │
│  │ 🔴 Review code auth                                                              │ │
│  │    📁 Kỹ Thuật  •  Assigned by Admin                                             │ │
│  │    Deadline: 10/04 (QUÁ HẠN 2 ngày)  [Mark Done] [Escalate]                     │ │
│  │                                                                                   │ │
│  │ 🟡 Deploy staging                                                                │ │
│  │    📁 Kinh Doanh  •  Self-assigned                                               │ │
│  │    Deadline: 14/04 (còn 3 ngày)  [Mark Done]                                     │ │
│  │                                                                                   │ │
│  │ 🟢 Viết test cases                                                               │ │
│  │    📁 Kỹ Thuật  •  Assigned by Admin                                             │ │
│  │    Deadline: 18/04 (còn 7 ngày)  [Mark Done]                                     │ │
│  │                                                                                   │ │
│  │ [Xem tất cả →]                                                                   │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  ┌─ 🚀 QUICK ACTIONS ────────────────────────────────────────────────────────────┐ │
│  │                                                                               │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │   │ 📤 Upload    │  │ ➕ Create    │  │ 🔍 Find      │  │ 📋 List All  │   │ │
│  │   │ Audio        │  │ Group (NEW!) │  │ Meeting      │  │ Meetings     │   │ │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## TRANG 2️⃣: ➕ CREATE GROUP (NEW FLOW)

```
FLOW: User (Member) clicks "+ New Group"
        ↓
[Modal: Create New Group]
        ↓
User fills form + becomes Group Admin automatically
```

### 2A. CREATE GROUP MODAL

```
┌─────────────────────────────────────────────────┐
│ ➕ Create New Group                          [×]│
├─────────────────────────────────────────────────┤
│                                                 │
│  Organization:                                  │
│  [🏢 ABC Company ▼]  (Fixed - can't change)   │
│  └─ You'll be adding this group to your org    │
│                                                 │
│  Group Name: *                                  │
│  ┌─────────────────────────────────────────┐  │
│  │ Ex: "Marketing Q3", "Tech Team", etc    │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Description:                                   │
│  ┌─────────────────────────────────────────┐  │
│  │ Optional - what's this group for?       │  │
│  │                                         │  │
│  │ (Ex: "Weekly product reviews")          │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Privacy Level:                                 │
│  ◉ Private (Only invited members can see)     │
│  ○ Internal (Any org member can join)         │
│  ○ Public (Anyone can see, request join)      │
│                                                 │
│  Initial Members:                               │
│  ┌─ Invite Users ────────────────────────────┐ │
│  │ Search: [user@company.com]                │ │
│  │ - Nguyễn Văn A    [+ Add]                 │ │
│  │ - Trần Thị B      [+ Add]                 │ │
│  │ - Lê Văn C        [+ Add]                 │ │
│  │                                           │ │
│  │ Selected (3):                             │ │
│  │ ✓ Nguyễn Văn A   [× Remove]               │ │
│  │ ✓ Trần Thị B     [× Remove]               │ │
│  │ ✓ Lê Văn C       [× Remove]               │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ℹ️ Note: You will be the Group Admin.         │
│          You can manage members, meetings, etc.│
│          Other members can upload & participate│
│                                                 │
│                         [Cancel]  [✓ Create]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2B. CONFIRMATION AFTER CREATE

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Group Created Successfully!                          [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 🎉 Welcome to "Marketing Q3"                              │
│                                                             │
│ You are now the Group Owner. Here's what you can do:       │
│                                                             │
│ ✅ Invite more members     → Button: [+ Invite Members]    │
│ ✅ Upload meetings          → Button: [📤 Upload]          │
│ ✅ Manage settings          → Button: [⚙️ Settings]        │
│ ✅ View group analytics     → Button: [📊 Analytics]       │
│ ✅ Manage members & roles   → Tab: [👥 Members]           │
│                                                             │
│                                                             │
│ Initial members invited (3):                               │
│ ✓ Nguyễn Văn A                                             │
│ ✓ Trần Thị B                                               │
│ ✓ Lê Văn C                                                 │
│                                                             │
│ Awaiting acceptance...                                      │
│                                                             │
│            [Go to Group]  [Go to Dashboard]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## TRANG 3️⃣: 📁 GROUP DETAIL - Tab Meetings

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 📁 Kinh Doanh                                                    [+ New Meeting]  [⚙️]│
│ 👑 Owner (you)  •  12 members  •  48 meetings  •  Created: 01/2026                 │
│ 📍 In Organization: ABC Company                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ [📋 Meetings]  [👥 Members]  [💬 Chat]  [📊 Stats]  [📁 Files]  [⚙️ Settings]      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  Filters: [Status: All ▼] [Month ▼] [Sort: Newest ▼]  🔍 Search...                │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 Sprint Review #24                                    Status: ✅ Complete   │ │
│  │                                                                               │ │
│  │ 📅 12/04/2026 14:00  |  ⏱️ 45 min  |  👥 5 speakers  |  🎤 Audio ready      │ │
│  │ Attendees: Nguyễn A, Trần B, Lê C, ...                                      │ │
│  │                                                                               │ │
│  │ 🤖 AI Summary  |  🔑 5 Key Points  |  🎯 2 Decisions  |  ✅ 3 Action Items   │ │
│  │ 💬 4 discussions |  📎 2 files attached                                       │ │
│  │                                                                               │ │
│  │ [👁️ View]  [💬 Discuss]  [📤 Export]  [⭐]  [🔗 Copy]  [...]                 │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 Weekly Sales Review                                  Status: ✅ Complete   │ │
│  │                                                                               │ │
│  │ 📅 10/04/2026 09:00  |  ⏱️ 60 min  |  👥 8 speakers  |  🎤 Audio ready      │ │
│  │ Attendees: Nguyễn A, Trần B, ...                                             │ │
│  │                                                                               │ │
│  │ 🤖 AI Summary  |  🔑 8 Key Points  |  🎯 4 Decisions  |  ✅ 6 Action Items   │ │
│  │                                                                               │ │
│  │ [👁️ View]  [💬 Discuss]  [📤 Export]  [⭐]  [🔗 Copy]  [...]                 │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  Showing 1-10 of 48  [< Prev]  1  2  3  4  5  [Next >]                             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## TRANG 4️⃣: 📁 GROUP - Tab Members

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 📁 Kinh Doanh → Members                                         [+ Invite Members]  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ [📋 Meetings]  [👥 Members]  [💬 Chat]  [📊 Stats]  [📁 Files]  [⚙️ Settings]      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  🔍 Search members...              Role: [All ▼]   Status: [All ▼]                 │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐ │
│  │ 👑 ADMIN / OWNER                                                             │ │
│  │ ─────────────────────────────────────────────────────────────────────────────│ │
│  │                                                                               │ │
│  │ 👑 You (Nguyễn Văn A)                  │ Owner    │ 🟢 Active                │ │
│  │ nguyenvana@company.com                 │          │ Online 5 min ago         │ │
│  │ Joined: 01/2026  |  Created this group│  32 mtgs │ Can fully manage group   │ │
│  │ [👁️ Profile]  [🔧 Role: Owner]  [Remove Option: N/A]                      │ │
│  │                                                                               │ │
│  │                                                                               │ │
│  │ 👤 MEMBERS                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────────────────────│ │
│  │                                                                               │ │
│  │ 👤 Admin (Trần Thị B)                  │ Admin    │ 🟢 Active                │ │
│  │ tranthib@company.com                   │          │ Online 2 min ago         │ │
│  │ Joined: 02/2026  |  18 meetings        │          │                         │ │
│  │ [👁️ Profile]  [🔧 Change Role ▼]  [🚫 Remove]                           │ │
│  │   ├─ Change to: Member                                                      │ │
│  │   ├─ Change to: Viewer                                                      │ │
│  │   └─ Change to: Admin                                                       │ │
│  │                                                                               │ │
│  │ 👤 Member (Lê Văn C)                   │ Member  │ 🟢 Active                │ │
│  │ levanc@company.com                     │          │ Online 1 hour ago        │ │
│  │ Joined: 03/2026  |  5 meetings         │          │                         │ │
│  │ [👁️ Profile]  [🔧 Change Role ▼]  [🚫 Remove]                           │ │
│  │                                                                               │ │
│  │ 👤 Member (Phạm Thị D)                 │ Member  │ 🟡 Pending Invite        │ │
│  │ phamtd@company.com                     │          │ Sent: 11/04/2026         │ │
│  │ [📨 Resend Invite]  [❌ Cancel Invite]                                       │ │
│  │                                                                               │ │
│  │ 👁️ VIEWERS                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────────────────────│ │
│  │                                                                               │ │
│  │ 👁️ Viewer (Nguyễn Thị E)               │ Viewer   │ 🔴 Inactive              │ │
│  │ nguyenthe@company.com                  │          │ Last seen: 2 weeks ago   │ │
│  │ Joined: 04/2026  |  2 meetings viewed  │          │                         │ │
│  │ [👁️ Profile]  [🔧 Change Role ▼]  [🚫 Remove]                           │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  Showing 1-10 of 12  [Pagination...]                                               │
│                                                                                     │
│  ℹ️ Role Guide:                                                                     │
│  👑 Owner/Admin: Full management rights - can invite, remove, assign roles         │
│  👤 Member: Can upload meetings, participate, discuss                              │
│  👁️ Viewer: Read-only - can see summaries but not edit or upload                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## TRANG 5️⃣: ⭐ ORG ADMIN CONSOLE (Org Admin only)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 👑 Organization Admin Dashboard                           🏢 ABC Company            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ [📊 Overview]  [👥 Users]  [📁 Groups]  [💰 Costs]  [⚙️ Settings]                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ 👥 Users       │  │ 📁 Groups      │  │ 📊 Meetings    │  │ 💰 Budget      │  │
│  │                │  │                │  │                │  │                │  │
│  │       24       │  │        8       │  │      124       │  │ $850 / $1000   │  │
│  │   ↑ 3 this mo  │  │   ↑ 1 this mo  │  │   ↑ 18 th week │  │ 85% used       │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                                                     │
│  ┌─ 👥 USERS IN ORG ──────────────────────────────────────────────────────────┐   │
│  │                                                                             │   │
│  │  [+ Invite Users]  [Import CSV]  🔍 Search...  Filter: [Role: All ▼]      │   │
│  │                                                                             │   │
│  │  👑 (Org Admin)                                                             │   │
│  │    Nguyễn Văn A  (nguyenvana@company.com)  │ Org Admin │ 🟢 Active        │   │
│  │    [Manage]  [Change Role]  [Remove]                                       │   │
│  │                                                                             │   │
│  │  👤 (Member)                                                                │   │
│  │    Trần Thị B    (tranthib@company.com)    │ Member    │ 🟢 Active        │   │
│  │    [Manage]  [Change Role ▼]  [Remove]                                     │   │
│  │                                                                             │   │
│  │    [+ Add 10 more...]                                                      │   │
│  │                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌─ 📁 GROUPS IN ORG ──────────────────────────────────────────────────────────┐   │
│  │                                                                             │   │
│  │  [+ Create Group]  🔍 Search...                                            │   │
│  │                                                                             │   │
│  │  📁 Kinh Doanh                    │ 12 members │ 48 meetings │ Owner: Admin │    │
│  │     [👁️ Manage]  [Settings]  [📊 Stats]  [+ Add Members]  [🗑️ Archive]   │    │
│  │                                                                             │   │
│  │  📁 Kỹ Thuật                      │ 8 members  │ 32 meetings │ Owner: Tech  │    │
│  │     [👁️ Manage]  [Settings]  [📊 Stats]  [+ Add Members]  [🗑️ Archive]   │    │
│  │                                                                             │   │
│  │  📁 Ban GD                        │ 3 members  │ 8 meetings  │ Owner: CEO   │    │
│  │     [👁️ Manage]  [Settings]  [📊 Stats]  [+ Add Members]  [🗑️ Archive]   │    │
│  │                                                                             │   │
│  │  [+ Show 5 more...]                                                        │   │
│  │                                                                             │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│  ┌─ 💰 ORGANIZATION BILLING ──────────────────────────────────────────────────┐    │
│  │                                                                             │    │
│  │ Monthly Budget: $1000                                                       │    │
│  │ This Month Used: $850 (85%)                                                │    │
│  │ Cost by Group:                                                              │    │
│  │  • Kỹ Thuật: $520 (61%)  - Using heavy ML models                           │    │
│  │  • Kinh Doanh: $280 (33%)                                                  │    │
│  │  • Ban GD: $50 (6%)                                                        │    │
│  │                                                                             │    │
│  │ [📊 View Detailed Report]  [Set Budget Alert]  [⚙️ AI Provider Settings]  │    │
│  │                                                                             │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## TRANG 6️⃣: 👤 USER PROFILE & PREFERENCES

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 👤 My Profile                                                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  PROFILE INFORMATION                                                                │
│  ┌─ Profile Picture ──┐  Name:         [Nguyễn Văn A              ]              │
│  │                    │  Email:        [nguyenvana@company.com   ]              │
│  │   [Nguyễn A]       │  Phone:        [+84 98 765 4321          ] (Optional)   │
│  │                    │  Timezone:     [Asia/Ho_Chi_Minh ▼       ]              │
│  │ [Change Avatar]    │  Language:     [Tiếng Việt ▼             ]              │
│  │ [Remove]           │  Department:   [Kinh Doanh               ] (Optional)   │
│  └─ Profile Picture ──┘  Job Title:    [Sales Manager            ] (Optional)   │
│                                                                                     │
│  ┌─ ORGANIZATIONS & ROLES ────────────────────────────────────────────────────── │
│  │                                                                               │ │
│  │ 🏢 ABC Company (Member)                                                      │ │
│  │    • Groups: 4/8                                                            │ │
│  │    • Groups you admin: 1 (Kinh Doanh)                                       │ │
│  │    • Can create new groups: ✅ Yes                                          │ │
│  │    [Leave Org]  [View Org Details]                                         │ │
│  │                                                                               │ │
│  │ 🏢 XYZ Corporation (Org Admin) - Private Org                                │ │
│  │    • Total users in org: 12                                                 │ │
│  │    • Groups: 3/5                                                            │ │
│  │    • Groups you admin: 0                                                    │ │
│  │    [Manage Org]  [View Org Details]  [Leave Org]                           │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  ┌─ NOTIFICATION PREFERENCES ─────────────────────────────────────────────────── │
│  │                                                                               │ │
│  │ Email Notifications:                                                         │ │
│  │  ☑ When someone invites me to group                                         │ │
│  │  ☑ When assigned an action item                                             │ │
│  │  ☑ Daily digest of meetings in my groups                                    │ │
│  │  ☐ Weekly report                                                            │ │
│  │  ☑ System alerts & updates                                                  │ │
│  │                                                                               │ │
│  │ In-App Notifications:                                                        │ │
│  │  ☑ Sound enabled for important alerts                                       │ │
│  │  ☑ Show badges for unread items                                             │ │
│  │  ☑ Desktop notifications (browser permission required)                      │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│  ┌─ SECURITY & ACCOUNT ────────────────────────────────────────────────────────── │
│  │                                                                               │ │
│  │ Password:  ●●●●●●●●●          [Change Password]                             │ │
│  │                                                                               │ │
│  │ Two-Factor Authentication: ○ Disabled  [Enable 2FA]                         │ │
│  │                                                                               │ │
│  │ Active Sessions:                                                              │ │
│  │  • This Browser  (Current)  •  Last active: Just now  [Logout]              │ │
│  │  • Safari on Mac            •  Last active: 2 days ago  [Logout]            │ │
│  │  • Mobile App                •  Last active: 1 week ago  [Logout]           │ │
│  │                                                                               │ │
│  │ [Delete Account]  (Permanent - cannot undo)                                 │ │
│  │                                                                               │ │
│  └───────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│                                        [Save Changes]  [Cancel]                     │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## MATRIX: ROLE PERMISSIONS BY PAGE

| Feature / Page | System Admin | Org Admin | Group Admin | Member | Viewer |
|---|---|---|---|---|---|
| **Dashboard** | ✅ Full | ✅ Own Org | ✅ Own Group | ✅ Limited | ✅ Limited |
| **Create Group** | ✅ | ✅ (for org) | ❌ | ✅ (become admin) | ❌ |
| **Invite Users** | ✅ | ✅ (to org) | ✅ (to group) | ❌ | ❌ |
| **View Users** | ✅ All | ✅ In org | ✅ In group | ✅ In group | ❌ |
| **Change Roles** | ✅ | ✅ (in org) | ✅ (in group) | ❌ | ❌ |
| **Upload Meetings** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Meetings** | ✅ All | ✅ In org | ✅ In group | ✅ In group | ✅ In group |
| **Export** | ✅ | ✅ (org) | ✅ (group) | ✅ | ✅ |
| **Org Admin Panel** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System Admin Panel** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔐 DATA ISOLATION RULES

```
┌─────────────────────────────────────────┐
│    DATA VISIBILITY HIERARCHY             │
├─────────────────────────────────────────┤
│                                         │
│ System Admin                            │
│ ├─ Sees: ALL organizations & groups    │
│ │                                       │
│ Org Admin (ABC Co)                      │
│ ├─ Sees: Only ABC Co data               │
│ ├─ Cannot see: XYZ Corp data            │
│ │                                       │
│ Group Admin (Kinh Doanh)                │
│ ├─ Sees: Kinh Doanh meetings/members   │
│ ├─ Cannot see: Other groups in org     │
│ │                                       │
│ Member (in Kinh Doanh only)             │
│ ├─ Sees: Kinh Doanh data only          │
│ ├─ Cannot see: Kỹ Thuật group          │
│ │                                       │
│ Non-Member (NOT in any group)           │
│ └─ 🚫 CANNOT ACCESS: Nothing            │
│                                         │
└─────────────────────────────────────────┘
```

---

## ACCESS CONTROL RULES (Backend Must Enforce)

```
BEFORE showing any resource, check:

1. Is user SYSTEM ADMIN?
   → Show everything ✅

2. User tries to view Org X?
   → Is user in Org X?
      → YES: Show ✅
      → NO: 403 Forbidden ❌

3. User tries to access Group Y in Org X?
   → Is user member of Group Y?
      → YES: Show (role determines what to see) ✅
      → NO: 403 Forbidden ❌
   → Check if Group Y is in Org X
      → If not: 403 Forbidden ❌

4. User tries to CREATE GROUP?
   → Is user at least MEMBER (not VIEWER)?
      → YES: Allow, user becomes Group Admin ✅
      → NO: Permission Denied ❌

5. User tries to INVITE someone to Org?
   → Is user Org Admin of that org?
      → YES: Allow ✅
      → NO: 403 Forbidden ❌

6. User tries to ASSIGN ROLE in Group?
   → Is user Group Admin?
      → YES: Allow (for own group) ✅
      → NO: 403 Forbidden ❌
```

---

## ✨ UX IMPROVEMENTS FROM V1 → V2

| Aspect | V1 | V2 |
|--------|----|----|
| **Org Support** | Single implicit | Multiple, explicit, switchable |
| **Create Group** | Org Admin only | Any Member can create (become admin) |
| **Role Clarity** | 4 roles | 5 roles (added Org Admin) |
| **Group Creator** | Manual role assign | Auto-promoted to Group Admin |
| **Sidebar** | Groups only | Org selector + Groups + Admin panel |
| **Security** | Basic group isolation | Hierarchical org + group isolation |
| **Admin Console** | System Admin only | System + Org Admins have consoles |
| **Onboarding** | "You're a Member" | "You can create groups in this org" |

