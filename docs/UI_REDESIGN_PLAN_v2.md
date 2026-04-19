# 🎨 UI Redesign Plan - MultiMinutes AI (v2 - Org Hierarchy)

> **Mục tiêu:** Chuyển đổi từ dashboard-style cũ sang **Organization/Group/Workspace model** giống Microsoft Teams + Slack, tập trung vào **FE FIRST**, quản lý cuộc họp theo nhóm trong tổ chức, hỗ trợ **multi-org** với phân quyền rõ ràng.

> **Phiên bản:** v2 - Incorporates 5-tier permission model with Organization hierarchy
> **Ngày cập nhật:** 2025
> **Tham chiếu:** ROLES_AND_PERMISSIONS_v2.md, UI_DETAILED_WIREFRAMES_v2.md

---

## 📐 TỔNG QUAN KIẾN TRÚC MỚI (v2 - HIERARCHICAL)

### Mô hình Organization → Group → Workspace

```
MultiMinutes AI (System)
│
├── 🏢 Organization 1: "ABC Company"
│   ├── 👑 Org Admin (manages users, groups, billing)
│   ├── 
│   ├── 📁 Group: "Phòng Kinh Doanh"
│   │   ├── ⭐ Group Admin/Owner (created by member)
│   │   ├── 📋 Cuộc họp của group
│   │   ├── 👥 Thành viên group
│   │   ├── 💬 Chat group
│   │   ├── 📊 Group Stats
│   │   └── 📁 Files group
│   │
│   ├── 📁 Group: "Phòng Kỹ Thuật"
│   │   ├── ⭐ Group Admin/Owner
│   │   ├── 👥 Members
│   │   └── ...
│   │
│   ├── 📁 Group: "Ban Giám Đốc"
│   │   ├── ⭐ Group Admin
│   │   └── ...
│   │
│   ├── 👤 Members (24 users)
│   │   ├── Member (can create groups)
│   │   ├── Viewer (read-only)
│   │   └── ...
│   │
│   └── ⚙️ Org Admin Panel
│       ├── 👥 Users in Org
│       ├── 📁 Groups in Org
│       ├── 💰 Billing & Costs
│       └── ⚙️ Org Settings
│
├── 🏢 Organization 2: "XYZ Corp"
│   ├── 👑 Org Admin
│   ├── 📁 Group: "Engineering"
│   ├── 📁 Group: "Sales"
│   └── ...
│
├── 👤 Personal Space
│   ├── ✅ My Actions
│   ├── ⭐ Starred Meetings
│   ├── 📋 All My Groups (across all orgs)
│   └── 🔔 Notifications
│
└── 👑 System Admin (Super Admin only)
    ├── 📊 Global Analytics
    ├── 👥 All Users
    ├── 🏢 All Organizations
    ├── 💰 Global Cost Management
    └── ⚙️ System Settings
```

### Key Differences from v1

| Aspect | v1 (Group-Centric) | v2 (Org Hierarchy) |
|--------|-------------------|-------------------|
| **Org Support** | Single implicit | Multi-org explicit |
| **User Hierarchy** | 4 roles per group | 5 roles (system/org/group + member/viewer) |
| **Group Creation** | Only admin creates | Any member can create → auto becomes admin |
| **Data Isolation** | Per-group | Org → Group → User isolation |
| **Admin Panel** | Super Admin only | Super Admin + Org Admin |
| **User Onboarding** | Join org, assigned to groups | Join org → accept invite → becomes Member |
| **Navigation** | Org implicit, groups listed | Org selector, groups per org |
| **Multi-Org** | Not supported | Full support |

---

## 🏗️ BỐ CỤC CHÍNH (v2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [☰]  MultiMinutes AI                     🔍 Search...    🔔 3   👤 User ▼ │
├──────────┬──────────────────────────────────────────────────────────────────┤
│          │                                                                  │
│ SIDEBAR  │  MAIN CONTENT                                                   │
│ (250px)  │                                                                 │
│          │  ┌────────────────────────────────────────────────────────────┐ │
│ 🏢 ORG   │  │ Breadcrumbs / Page Title / Actions                         │ │
│ ──────   │  └────────────────────────────────────────────────────────────┘ │
│ [ABC Co▼]│  ┌────────────────────────────────────────────────────────────┐ │
│ ⭐ Org    │  │                                                             │ │
│ Admin    │  │  DYNAMIC CONTENT                                              │ │
│ (YOU)    │  │  (changes per page)                                           │ │
│          │  │                                                             │ │
│ GROUPS   │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 📁 Kinh  │  │                                                             │ │
│   Doanh  │  │                                                             │ │
│ 📁 Kỹ    │  │                                                             │ │
│   Thuật  │  │                                                             │ │
│ 📁 Ban   │  │                                                             │ │
│   Giám   │  │                                                             │ │
│ [➕ New] │  │                                                             │ │
│          │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ QUICK    │  │                                                             │ │
│ ACCESS   │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 📋 All   │  │                                                             │ │
│   Meetings                           │ │                                                             │ │
│ ➕ Upload│  │                                                             │ │
│   Audio  │  │                                                             │ │
│ ✅ My    │  │                                                             │ │
│   Actions                            │ │                                                             │ │
│ ⭐ Starred   │  │                                                             │ │
│          │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ ⭐ ORG   │  │                                                             │ │
│ ADMIN    │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 📊 Org   │  │                                                             │ │
│   Analytics  │  │                                                             │ │
│ 👥 Users │  │                                                             │ │
│   (Org)  │  │                                                             │ │
│ 💰 Org   │  │                                                             │ │
│   Costs  │  │                                                             │ │
│ ⚙️ Org   │  │                                                             │ │
│   Settings   │  │                                                             │ │
│          │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ ⭐ GROUP │  │                                                             │ │
│ ADMIN    │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 📊 Grp   │  │                                                             │ │
│   Analytics  │  │                                                             │ │
│ 👥 Grp   │  │                                                             │ │
│   Members    │  │                                                             │ │
│ 💰 Grp   │  │                                                             │ │
│   Costs  │  │                                                             │ │
│ ⚙️ Grp   │  │                                                             │ │
│   Settings   │  │                                                             │ │
│          │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 👑 SYSTEM    │  │                                                             │ │
│ ADMIN (👑👑) │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ 📊 Global    │  │                                                             │ │
│   Analytics  │  │                                                             │ │
│ 👥 All Orgs  │  │                                                             │ │
│ 💰 Global    │  │                                                             │ │
│   Costs  │  │                                                             │ │
│ ⚙️ System    │  │                                                             │ │
│   Settings   │  │                                                             │ │
│          │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ HELP     │  │                                                             │ │
│ ──────   │  │                                                             │ │
│ ❓ Help  │  │                                                             │ │
│   Center │  │                                                             │ │
│ 📖 API   │  │                                                             │ │
│   Docs   │  │                                                             │ │
│ 💬       │  └────────────────────────────────────────────────────────────┘ │
│ Feedback │                                                                  │
│          │                                                                  │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

### Sidebar State Changes

**When user is Org Admin (⭐):**
- Org Admin section VISIBLE (📊, 👥, 💰, ⚙️)
- Shows "⭐ (YOU)" indicator

**When user is Group Admin (⭐):**
- Group Admin section VISIBLE
- Shows "(Admin)" under group name in group list

**When user is System Admin (👑👑):**
- System Admin section VISIBLE with Global scope

**When user is Member:**
- [➕ New] button visible next to GROUPS
- Can click to create group → becomes Group Admin of new group

**When user is Viewer:**
- No [➕ New] button
- No admin sections
- Read-only access only

---

## 📋 CHI TIẾT TỪNG TRANG (v2)

### 0️⃣ LOGIN / ONBOARDING (NEW)

**Flow:**
1. New user: Gets email invite "You're invited to `ABC Company` on MultiMinutes AI"
2. Clicks link → Login screen
3. After auth → Onboarding screen
4. Shows: "📧 You've been invited to join **ABC Company**"
5. Shows: "Your role will be: **Member** (can upload, create groups, chat)"
6. Button: [Accept Invitation]
7. Redirects to: Dashboard (now showing ABC Company context)

**Existing user adding new org:**
1. Receives new org invite email
2. Clicks → Redirect to org onboarding
3. Becomes Member in new org
4. Sidebar now shows both orgs
5. Can switch between orgs

---

### 1️⃣ HOME / DASHBOARD (Updated)

**URL:** `/dashboard`

**Layout:**
```
[Organization Selector] ▼ 🏢 ABC Company
⭐ Org Admin | Created: 01/2025 | Members: 24

┌─────────────────────────────────────┐
│ ORGANIZATION STATS                   │
├─────────────────────────────────────┤
│ Total Users: 24 │ Groups: 8 │ ...   │
│ Meetings: 124  │ Hours: 286  │ ...  │
│ Usage: 67% of monthly budget         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ MY PINNED GROUPS (in this org)       │
├─────────────────────────────────────┤
│ □ Phòng Kinh Doanh                  │
│ □ Phòng Kỹ Thuật                    │
│ □ Ban Giám Đốc                      │
└─────────────────────────────────────┘

[+ Create New Group]

┌─────────────────────────────────────┐
│ MY ACTION ITEMS                      │
├─────────────────────────────────────┤
│ 🔴 Overdue: 2 items                 │
│ 🟡 Due this week: 5 items           │
│ 🟢 On track: 12 items               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ RECENT MEETINGS (In my groups)       │
├─────────────────────────────────────┤
│ [Meetings list with group context]  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ QUICK ACTIONS                        │
├─────────────────────────────────────┤
│ [Upload Audio] [Create Meeting]     │
│ [Search] [Create Group]             │
└─────────────────────────────────────┘
```

**Key Changes from v1:**
- ✅ Show current org at top
- ✅ Show org-level stats (total users, groups, meetings)
- ✅ [Create New Group] button prominent (members can create)
- ✅ Groups shown as "pinned" or favorite
- ✅ Show org admin status if applicable

---

### 2️⃣ CREATE GROUP PAGE (NEW - When clicking [+ Create])

**URL:** `/groups/create` or `/orgs/:orgId/groups/create`

**Modal/Page:**
```
┌─────────────────────────────────────────────────┐
│ Create New Group in ABC Company                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ Organization:                                   │
│   [🏢 ABC Company ▼] (Fixed - can't change)   │
│                                                 │
│ Group Name:                                     │
│   [________________________________]            │
│                                                 │
│ Description:                                    │
│   [________________________________]            │
│   [________________________________]            │
│                                                 │
│ Privacy Level:                                  │
│   ○ Private (only invited members can see)     │
│   ○ Internal (all org members can see)         │
│   ○ Public (searchable, anyone can join)       │
│                                                 │
│ Invite Initial Members (Optional):             │
│   [Search for users in ABC Company ...]        │
│   □ John Doe (john@abc.com)                    │
│   □ Jane Smith (jane@abc.com)                  │
│                                                 │
│ Note: You will be the Group Admin and can      │
│ manage members, settings, and content.         │
│                                                 │
│              [Cancel]  [Create Group]          │
└─────────────────────────────────────────────────┘
```

**After Creation:**
- Page redirects to `/groups/:groupId`
- Shows: "🎉 Welcome to Phòng Kinh Doanh!"
- Sidebar: New group now listed under GROUPS
- Sidebar: GROUP ADMIN section now visible

---

### 3️⃣ GROUP DETAIL PAGE (Updated)

**URL:** `/groups/:id` or `/orgs/:orgId/groups/:groupId`

**Header:**
```
[Organization: ABC Company]  >  [Group: Phòng Kinh Doanh]
👑 Owner (You) • 12 members • Last activity: 2 hours ago
⭐ Group Admin • Created: 01/15/2025
```

**Tabs:**
- 📋 **Meetings:** List of group meetings
- 👥 **Members:** Member list with roles, search, add/remove
- 💬 **Group Chat:** Discussion about meetings
- 📊 **Group Stats:** Analytics specific to this group
- 📁 **Files:** Group file storage
- ⚙️ **Group Settings:** (Admin only) Name, description, privacy, member roles

**Section: GROUP MEMBERS Tab (Updated)**
```
┌─────────────────────────────────────────────────┐
│ Members (12)                                    │
├─────────────────────────────────────────────────┤
│ 🔍 [Search members...]  👤 Role: [All ▼]       │
├─────────────────────────────────────────────────┤
│                                                 │
│ OWNERS/ADMINS                                   │
│ ✓ You (john@example.com)      👑 Owner         │
│   [Remove]                                      │
│                                                 │
│ MEMBERS                                         │
│ □ Jane Smith (jane@abc.com)   👤 Member        │
│   [Options ▼] [Change Role ▼]                  │
│ □ Bob Johnson (bob@abc.com)   👤 Member        │
│   [Options ▼] [Change Role ▼]                  │
│ □ Alice Brown (alice@abc.com) 👁️ Viewer        │
│   [Options ▼] [Change Role ▼]                  │
│                                                 │
│ [+ Invite Members]  [Bulk Import]              │
│                                                 │
│ Legend:                                         │
│ 👑 Owner/Admin - Full control of group         │
│ 👤 Member - Can upload, create meetings        │
│ 👁️ Viewer - Read-only access                   │
└─────────────────────────────────────────────────┘
```

---

### 4️⃣ MEETING DETAIL PAGE (Updated)

**URL:** `/groups/:groupId/meetings/:meetingId`

**Header:**
```
[Organization: ABC Company]  >  [Group: Phòng Kinh Doanh]  >  [Meeting: Q1 Planning]
```

**Tabs:**
- 📝 **Summary:** Meeting overview, key points, decisions, action items
- 🗣️ **Transcript:** Full transcript with audio player
- ✅ **Actions:** Action items extracted
- 💬 **Chat AI:** Ask AI about this meeting
- 📊 **Quality:** STT accuracy metrics
- 🔍 **Metadata:** Duration, attendees, group context

**Features:**
- Audio player synced with transcript
- Export buttons: PDF, DOCX
- Star meeting
- Share with other groups (if allowed by org policy)

---

### 5️⃣ MY ACTIONS PAGE (Updated)

**URL:** `/my-actions`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ My Action Items (Across All Groups & Orgs)      │
├─────────────────────────────────────────────────┤
│ Filter: [Organization: All ▼] [Group: All ▼]   │
│ Sort: [Due Date ▼]                              │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔴 OVERDUE (2)                                  │
│ ├─ [ABC Co] Phòng Kinh Doanh - "Send report"  │
│ │  Due: 01/10 | Meeting: Q1 Planning           │
│ │  [Mark Done] [Edit]                          │
│                                                 │
│ 🟡 DUE THIS WEEK (5)                            │
│ ├─ [XYZ Co] Engineering - "Code review"        │
│ │  Due: 01/15 | Meeting: Sprint Planning       │
│ └─ ...                                          │
│                                                 │
│ 🟢 ON TRACK (12)                                │
│ ├─ [ABC Co] Ban Giám Đốc - "Budget approved"  │
│ │  Due: 02/01 | Meeting: Monthly Review        │
│ └─ ...                                          │
│                                                 │
│ ✅ COMPLETED (Recent)                           │
│ ├─ ...                                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Enhancements:**
- ✅ Filter by Organization and Group
- ✅ Show org context with color coding
- ✅ Actions from all groups user is member of
- ✅ Complete action → archived in Completed section

---

### 6️⃣ ORGANIZATION ADMIN PANEL (NEW - ⭐ ONLY)

**URL:** `/orgs/:orgId/admin` (Org Admin only)

**Layout:**
```
[Organization: ABC Company]  >  [Admin Console]
⭐ Org Admin Panel | Members: 24 | Groups: 8

┌─────────────────────────────────────────────────┐
│ ORGANIZATION STATISTICS                         │
├─────────────────────────────────────────────────┤
│ Total Users: 24          │ Groups: 8             │
│ Meetings: 124            │ Total Hours: 286      │
│ Monthly Budget: $1,000   │ Used: $850 (85%)      │
│ Avg Cost per Meeting: $6.85                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ USERS IN ORGANIZATION (24)                      │
├─────────────────────────────────────────────────┤
│ [+ Invite Users]  🔍 Search...  Role: [All ▼]  │
├─────────────────────────────────────────────────┤
│ □ john@abc.com                ✓ Org Admin     │
│ □ jane@abc.com                👤 Member        │
│ □ bob@abc.com                 👁️ Viewer        │
│ [Edit Role]  [Remove]  [Resend Invite]         │
│                                                 │
│ Legend:                                         │
│ ✓ Org Admin - Manage org, users, groups, billing
│ 👤 Member - Can create groups, upload meetings  │
│ 👁️ Viewer - Read-only access to org            │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ GROUPS IN ORGANIZATION (8)                      │
├─────────────────────────────────────────────────┤
│ [+ Create Group (as admin)]  🔍 Search...      │
├─────────────────────────────────────────────────┤
│ □ Phòng Kinh Doanh           8 members    💬 ... │
│ □ Phòng Kỹ Thuật            12 members   💬 ... │
│ □ Ban Giám Đốc              5 members    💬 ...  │
│ [Manage] [Settings] [Stats] [Remove]           │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ORGANIZATION BILLING                            │
├─────────────────────────────────────────────────┤
│ Monthly Budget: $1,000                          │
│ Spent: $850 | Remaining: $150 | 85% Used       │
│                                                 │
│ Cost Breakdown by Group:                        │
│ ├─ Phòng Kinh Doanh:     $420 (49%)            │
│ ├─ Phòng Kỹ Thuật:       $280 (33%)            │
│ ├─ Ban Giám Đốc:         $150 (18%)            │
│                                                 │
│ [Set Budget Alert] [View Detailed Report]      │
│ [Configure AI Providers] [Export Report]       │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ORGANIZATION SETTINGS                           │
├─────────────────────────────────────────────────┤
│ Organization Name: [ABC Company ────────────]   │
│ Default Role for New Members: [Member ▼]       │
│ STT Provider: [Google Gemini ▼]                │
│ Allow Members to Create Groups: [✓ Yes]        │
│ Allow Member Group Creation (new): [✓ Enabled] │
│                                                 │
│ [Save Settings]                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 7️⃣ USER PROFILE & PREFERENCES (Updated)

**URL:** `/profile` or `/settings/profile`

**Layout:**
```
┌─────────────────────────────┐
│ PROFILE INFORMATION         │
├─────────────────────────────┤
│ Name: John Doe              │
│ Email: john@example.com     │
│ Avatar: [###] [Change]      │
│ Join Date: 01/01/2025       │
│                             │
│ Language: [English ▼]       │
│ Timezone: [UTC+7 ▼]         │
│                             │
│ [Edit Profile]              │
└─────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ MY ORGANIZATIONS & ROLES                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🏢 ABC Company                                 │
│ Your Role: ✓ Org Admin                         │
│ Member Since: 01/01/2025                        │
│ Groups You Manage: 2 (Kinh Doanh, Ban Giám)   │
│ Groups You Join: 5 total                        │
│ [Settings] [Leave Org]                         │
│                                                 │
│ 🏢 XYZ Corp                                    │
│ Your Role: 👤 Member                            │
│ Member Since: 01/05/2025                        │
│ Groups You Join: 3 (Engineering, Sales, HR)   │
│ [Switch to Org] [Leave Org]                    │
│                                                 │
└─────────────────────────────────────────────────┘

┌─────────────────────────────┐
│ NOTIFICATION PREFERENCES    │
├─────────────────────────────┤
│ ✓ Email on New Action Item  │
│ ✓ Slack Integration         │
│ ✓ Meeting Summaries         │
│ ✓ Group Announcements       │
│                             │
│ [Manage Notifications]      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ SECURITY & ACCOUNT          │
├─────────────────────────────┤
│ [Enable 2FA]                │
│ [Active Sessions]           │
│ [API Keys]                  │
│ [Change Password]           │
│                             │
└─────────────────────────────┘
```

---

### 8️⃣ SYSTEM ADMIN PANEL (👑👑 ONLY)

**URL:** `/admin/system`

**Sections:**
```
┌─────────────────────────────────────────────────┐
│ SYSTEM ADMINISTRATION (Super Admin Only)        │
├─────────────────────────────────────────────────┤
│                                                 │
│ GLOBAL STATISTICS                               │
│ Total Organizations: 24                         │
│ Total Users: 1,240                              │
│ Total Groups: 240                               │
│ Total Meetings: 12,500                          │
│ Monthly Revenue: $45,000                        │
│                                                 │
├─────────────────────────────────────────────────┤
│ ORGANIZATIONS MANAGEMENT                        │
│                                                 │
│ [+ Create Organization]  🔍 [Search...]        │
│ □ ABC Company     24 users   $2,400  Jan 2025  │
│ □ XYZ Corp        18 users   $1,800  Dec 2024  │
│ □ Tech Startup    8 users    $800    Nov 2024  │
│                                                 │
│ [View] [Settings] [Billing] [Delete]           │
│                                                 │
├─────────────────────────────────────────────────┤
│ GLOBAL ANALYTICS                                │
│                                                 │
│ Meetings per month (chart)                      │
│ Revenue trend (chart)                           │
│ Top organizations by usage                      │
│ STT accuracy across all meetings                │
│                                                 │
│ [Export Report]                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ SYSTEM SETTINGS                                 │
│                                                 │
│ Default STT Provider: [Google Gemini ▼]        │
│ API Rate Limits: [1000/day ▼]                  │
│ Max Organization Size: [500 users ▼]           │
│ Enable Multi-Org: [✓ Yes]                      │
│                                                 │
│ [Save]                                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎯 ROLE-BASED PAGE ACCESS MATRIX

| Feature | System Admin | Org Admin | Group Admin | Member | Viewer |
|---------|-------------|-----------|------------|--------|--------|
| View Dashboard | ✅ Global | ✅ Org-level | ✅ Group | ✅ Personal | ❌ |
| Create Group | ❌ (Can create via admin) | ✅ Yes | ❌ | ✅ **NEW** | ❌ |
| Invite Users to Group | ✅ Any org | ✅ Org members | ✅ Group members | ❌ | ❌ |
| Manage Group Members | ✅ All | ✅ Their org | ✅ Yes | ❌ | ❌ |
| Create Organization | ✅ Yes | ❌ | ❌ | ❌ | ❌ |
| Manage Organization | ✅ All | ✅ Their org | ❌ | ❌ | ❌ |
| Upload Meeting | ✅ All orgs | ✅ Org members | ✅ Group members | ✅ Yes | ❌ |
| View Meetings | ✅ All | ✅ Org meetings | ✅ Group meetings | ✅ Member groups | ✅ Assigned |
| Export/Download | ✅ All | ✅ Org-level | ✅ Group-level | ✅ Personal | ❌ |
| View Analytics | ✅ Global | ✅ Org analytics | ✅ Group analytics | ✅ Limited | ❌ |
| Manage Billing | ✅ All | ✅ Org billing | ❌ | ❌ | ❌ |
| System Settings | ✅ Yes | ❌ | ❌ | ❌ | ❌ |

---

## 🔐 DATA ISOLATION & VISIBILITY RULES

### Hierarchical Visibility

```
System Admin (👑👑)
  └─ Can see: EVERYTHING
     - All organizations
     - All users
     - All groups in all orgs
     - All meetings
     - Global analytics & billing

Org Admin (👑) in Organization
  └─ Can see: ONLY their organization
     - All users in their org
     - All groups in their org
     - All meetings in their org groups
     - Org-level analytics & billing
     - CANNOT see: Other orgs

Group Admin/Owner (⭐) in Group
  └─ Can see: ONLY their group
     - Group members
     - Group meetings
     - Group chat & files
     - Group analytics
     - CANNOT see: Other groups, other orgs

Member (👤) in Group
  └─ Can see: Their groups
     - Meetings in groups they joined
     - Chat in their groups
     - Files in their groups
     - CANNOT see: Other groups, users outside their groups

Viewer (👁️) in Group
  └─ Can see: ONLY assigned meetings
     - Summaries & transcripts
     - Action items
     - CANNOT see: Other meetings, upload, create, manage
     - CANNOT see: Group chat or members

Non-Member
  └─ Can see: NOTHING
     - 403 Forbidden to all group resources
```

### Security Rules

1. **Non-Member Access = BLOCKED**
   - User not in group → cannot view/edit group data
   - User not in org → cannot see org data
   - Backend must verify membership before returning any resource

2. **Group Creator = Group Admin**
   - When member creates group → auto-assigned as Group Admin
   - Can manage group members & settings
   - Cannot change own role (only other admins can)

3. **Org Creator = Org Admin**
   - When system admin creates org → designated org admin
   - System admin retains system scope

4. **Role Hierarchy (Non-transferable)**
   - System Admin ≥ Org Admin ≥ Group Admin ≥ Member ≥ Viewer
   - Each scope cannot escalate to higher scope
   - Only same-scope admin can change roles

5. **Single Membership Per Group**
   - User can have ONLY ONE role per group
   - If invited with different role → override previous

6. **Org Isolation**
   - Org A cannot access Org B data
   - Even if user is admin in both
   - Must explicitly switch org context

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (Weeks 1-2)
- ✅ Database schema updates (Organizations table, FK relationships)
- ✅ Permission middleware in FastAPI
- ✅ Backend API updates for org scoping
- ✅ Authentication/JWT for org context

### Phase 2: Frontend Navigation (Weeks 2-3)
- ✅ Org selector in sidebar
- ✅ Group creation modal
- ✅ Conditional admin sections (Org Admin, Group Admin)
- ✅ Role-based UI rendering

### Phase 3: Admin Interfaces (Weeks 3-4)
- ✅ Organization Admin panel
- ✅ System Admin panel (for ops)
- ✅ User management with roles
- ✅ Billing & cost tracking

### Phase 4: Testing & Polish (Week 5)
- ✅ Permission enforcement tests
- ✅ Multi-org workflow tests (user switching orgs)
- ✅ Group creation workflow
- ✅ Data isolation verification

### Phase 5: Documentation & Training (Week 6)
- ✅ User guides for each role
- ✅ Admin runbooks
- ✅ API documentation updates
- ✅ Video tutorials

---

## 📊 SUCCESS METRICS

**After v2 Implementation:**
- ✅ Multi-org support enabled → support multiple customer organizations
- ✅ Member group creation → 40% more groups, lower admin burden
- ✅ Org admin panel → 30 min time saved per org admin per week
- ✅ Clear permission model → 50% reduction in access disputes
- ✅ Data isolation enforced → 100% security compliance
- ✅ Role flexibility → support use cases (super admin, org managers, group leads)

---

## 🔗 RELATED DOCUMENTATION

- See: **ROLES_AND_PERMISSIONS_v2.md** - Detailed permission specifications
- See: **UI_DETAILED_WIREFRAMES_v2.md** - Complete UI page specifications
- See: **DATABASE/SCHEMA.SQL** - Updated schema for org hierarchy (TODO)
- See: **DEPLOYMENT.md** - Deployment considerations for multi-org

---

**Document Version:** 2.0 (Org Hierarchy)  
**Last Update:** 2025  
**Owner:** Design & Product  
**Status:** ✅ Ready for Backend Implementation
