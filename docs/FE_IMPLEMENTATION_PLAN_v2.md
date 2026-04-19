# 🚀 KẾ HOẠCH IMPLEMENTATION HOÀN TOÀN BẰNG FE - MultiMinutes AI v2

> **Mục tiêu:** Chuyển đổi frontend từ dashboard-style cũ sang **Organization/Group/Workspace model** (v2), sử dụng **mock data động** (không phải static), phân quyền 5 cấp.
>
> **Trạng thái:** 🟢 Đang thực hiện
> **Ngày tạo:** 2026-04-13
> **Tham chiếu:** UI_REDESIGN_PLAN_v2.md, UI_DETAILED_WIREFRAMES_v2.md, ROLES_AND_PERMISSIONS_v2.md

---

## 📊 TIẾN ĐỘ HIỆN TẠI

| Phase | Trạng thái | Progress | Ghi chú |
|-------|-----------|----------|---------|
| **Phase 1: Foundation** | ✅ Hoàn thành | 100% | Auth, Permissions, Mock Data, Stores |
| **Phase 2: Org & Group UI** | 🔄 Đang làm | 0% → 10% | Bắt đầu Layout & Navigation |
| **Phase 3: Meeting System** | ⏳ Chưa bắt đầu | 0% | |
| **Phase 4: Admin & Analytics** | ⏳ Chưa bắt đầu | 0% | |
| **Phase 5: Polish & Deploy** | ⏳ Chưa bắt đầu | 0% | |

---

## 📋 TỔNG QUAN PHASES

```
Phase 1: Foundation & Auth (✅ HOÀN THÀNH)
    ├─ 1.1: Restructure folder architecture ✅
    ├─ 1.2: Upgrade Auth System (v2 roles) ✅
    ├─ 1.3: Dynamic mock data generator ✅
    └─ 1.4: State management (orgStore, groupStore) ✅
    ↓
Phase 2: Organization & Group Management (🔄 ĐANG LÀM)
    ├─ 2.1: Layout & Sidebar navigation v2
    ├─ 2.2: Dashboard với org context
    ├─ 2.3: Group Management (create, detail, members, settings)
    └─ 2.4: Organization Admin pages
    ↓
Phase 3: Meeting & Action Items
    ├─ 3.1: Meeting List với org/group context
    ├─ 3.2: Meeting Detail v2
    ├─ 3.3: Audio Upload & Processing Status
    └─ 3.4: Action Items system
    ↓
Phase 4: Admin Panels & Analytics
    ├─ 4.1: Analytics dashboards
    ├─ 4.2: System Admin panel
    ├─ 4.3: User Profile & multi-org
    └─ 4.4: Reports & Export
    ↓
Phase 5: Polish, Testing & Deployment
    ├─ 5.1: Responsive design
    ├─ 5.2: Performance optimization
    ├─ 5.3: Error handling
    ├─ 5.4: Testing
    └─ 5.5: Documentation & Deployment
```

---

## ✅ PHASE 1: FOUNDATION & AUTH SETUP (HOÀN THÀNH)

### ✅ Phase 1.1: Project Structure & Core Setup

**Đã hoàn thành:**
- ✅ Tạo thư mục pages theo v2 architecture:
  - `pages/auth/`, `pages/dashboard/`, `pages/org/`, `pages/group/`
  - `pages/meeting/`, `pages/actions/`, `pages/analytics/`
  - `pages/admin/`, `pages/profile/`
  
- ✅ Tạo thư mục components mới:
  - `components/layout/`, `components/meeting/`
  - `components/org/`, `components/group/`, `components/admin/`

- ✅ Tạo `api/mockApiInterceptor.ts`
  - Intercept tất cả API calls
  - Return mock data với simulated network delay
  - Support CRUD operations trên mock database
  - Match routes: /api/auth, /api/organizations, /api/groups, /api/meetings, /api/actions

### ✅ Phase 1.2: Auth System Upgrade (v2)

**Đã hoàn thành:**
- ✅ Update `AuthContext.tsx` với v2 user model:
  - Support `orgMemberships` và `groupMemberships`
  - Support `systemRole` (5-tier: system-admin, org-admin, group-admin, member, viewer)
  - Methods: `switchOrg()`, `switchGroup()`
  - Permission helpers: `hasPermission()`, `isOrgAdmin()`, `isGroupAdmin()`

- ✅ Tạo `usePermission` hook (`hooks/usePermission.ts`):
  - `hasPermission(permission)`
  - `hasAllPermissions(permissions[])`
  - `hasAnyPermission(permissions[])`
  - `isRoleAtLeast(minRole)`
  - Helper properties: `currentRole`, `roleDisplayName`, `roleColor`
  - Boolean flags: `isOrgAdmin`, `isGroupAdmin`, `isSystemAdmin`, `isViewer`

### ✅ Phase 1.3: Dynamic Mock Data System

**Đã hoàn thành:**
- ✅ Enhance `utils/mock-generator.ts`:
  - **ID Generators:** `userId()`, `orgId()`, `groupId()`, `meetingId()`, `actionId()`
  - **Entity Factories:**
    - `createUser(overrides)`
    - `createOrganization(overrides)`
    - `createGroup(overrides)`
    - `createMeeting(overrides)`
    - `createActionItem(overrides)`
  - **CRUD Operators:**
    - `create(collection, entity)`
    - `getById(collection, id)`
    - `query(collection, filter)`
    - `update(collection, id, updates)`
    - `delete(collection, id)`

- ✅ Mock data files đã có sẵn và đầy đủ:
  - `data/users.ts` - 9 users với đầy đủ org/group memberships ✅
  - `data/orgs.ts` - 2 organizations (ABC Company, XYZ Corp) ✅
  - `data/groups.ts` - 5 groups across 2 orgs ✅
  - `data/meetings.ts` - 7 meetings với AI summaries ✅
  - `data/actions.ts` - 12 action items với various statuses ✅
  - `data/roles.ts` - 5-tier role definitions với permissions ✅

### ✅ Phase 1.4: UI Store & State Management

**Đã hoàn thành:**
- ✅ Tạo `stores/orgStore.ts`:
  - Track current organization context
  - Methods: `setCurrentOrg()`, `loadOrgs()`, `loadOrgDetails()`, `loadGroups()`, `loadMembers()`
  - Computed: `getOrgUsage()`, `getGroupsByOrg()`, `getMembersByOrg()`

- ✅ Tạo `stores/groupStore.ts`:
  - Track current group context
  - Methods: `setCurrentGroup()`, `loadGroup()`, `loadMeetings()`, `loadMembers()`, `loadActions()`
  - Computed: `getGroupStats()`, `getMeetingsByGroup()`, `getMembersByGroup()`, `getActionsByGroup()`

- ✅ Update `stores/index.ts` để export tất cả stores
- ✅ Update `hooks/index.ts` để export `usePermission`

**Deliverables Phase 1:**
✅ Login hoạt động với v2 roles
✅ Permission-based routing với RoleGuard
✅ Dynamic mock data system với CRUD
✅ State management hoàn chỉnh (auth, org, group, ui, meeting)

---

## 🔄 PHASE 2: ORGANIZATION & GROUP MANAGEMENT (ĐANG LÀM)

### 🔄 Phase 2.1: Layout & Navigation (v2)

**Cần làm:**
- [ ] 2.1.1: Redesign `Layout.tsx` theo v2 sidebar
  ```
  Sidebar Structure:
  ├── 🏢 ORGANIZATION SELECTOR (dropdown)
  │   └── [ABC Company ▼]
  ├── 📁 GROUPS (in current org)
  │   ├── 🎯 Phòng Kinh Doanh (5👤)
  │   ├── 🔧 Phòng Kỹ Thuật (8👤)
  │   ├── 👑 Ban Giám Đốc (3👤)
  │   └── [➕ New Group]
  ├── ─────────────
  ├── QUICK ACCESS
  │   ├── 📋 All Meetings
  │   ├── ✅ My Actions
  │   ├── ⭐ Starred
  │   └── 📤 Upload Audio
  ├── ─────────────
  ├── ⭐ ORG ADMIN (conditional - chỉ hiện nếu user = Org Admin)
  │   ├── 📊 Org Analytics
  │   ├── 👥 Users in Org
  │   ├── 💰 Org Costs
  │   └── ⚙️ Org Settings
  ├── ─────────────
  ├── 👤 GROUP ADMIN (conditional - chỉ hiện nếu user = Group Admin)
  │   ├── 📊 Group Analytics
  │   ├── 👥 Group Members
  │   ├── 💰 Group Costs
  │   └── ⚙️ Group Settings
  └── ─────────────
  ```

- [ ] 2.1.2: Tạo `OrgSelector` component (dropdown trong header/sidebar)
- [ ] 2.1.3: Tạo `GroupNav` component (sidebar group list)
- [ ] 2.1.4: Update Header hiển thị org context
- [ ] 2.1.5: Implement Breadcrumbs component (org > group > meeting)

**Components cần tạo:**
```
components/layout/
├── Sidebar.tsx (new - tách từ Layout.tsx)
├── Header.tsx (new - tách từ Layout.tsx)
├── OrgSelector.tsx
├── GroupNav.tsx
├── Breadcrumbs.tsx
└── QuickAccess.tsx
```

### Phase 2.2: Dashboard (v2)

**Cần làm:**
- [ ] 2.2.1: Redesign `Dashboard.tsx` theo v2 wireframe
  ```
  Header: 🏠 Dashboard | 🏢 ABC Company | 👋 Chào Nguyễn A
  
  Stats Cards:
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
  │ 📋 Meetings  │ │ ⏱️ My Time   │ │ ✅ Actions   │ │ 🤖 AI Status │
  │   24 (org)   │ │  18.5 giờ    │ │  Overdue: 2  │ │  🟢 Online   │
  │  ↑ 12% tháng │ │  ↑ 8% tháng  │ │  Due: 5      │ │  97.5%       │
  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
  
  Left Column (2/3):
  ┌─ 🏢 ORGANIZATION STATS ──────────────────┐
  │ 👥 Total Users: 24                        │
  │ 📁 Total Groups: 8                        │
  │ 📋 Total Meetings: 124                    │
  │ 💰 Org Usage: 78% of budget               │
  │                                           │
  │ Top Groups:                               │
  │ 1. Kỹ Thuật (45 meetings)                 │
  │ 2. Kinh Doanh (38 meetings)               │
  └───────────────────────────────────────────┘
  
  Right Column (1/3):
  ┌─ 📅 UPCOMING IN MY GROUPS ───────────────┐
  │ ⏰ 14:00 - Sprint Review #25             │
  │     📁 Kinh Doanh • 5 người              │
  │ ⏰ 16:00 - Planning Q3                   │
  │     📁 Kỹ Thuật • 8 người                │
  └──────────────────────────────────────────┘
  
  ┌─ ✅ MY ACTION ITEMS ─────────────────────┐
  │ 🔴 Review code auth (QUÁ HẠN 2 ngày)     │
  │ 🟡 Deploy staging (còn 3 ngày)           │
  │ 🟢 Viết test cases (còn 7 ngày)          │
  └──────────────────────────────────────────┘
  
  ┌─ 🚀 QUICK ACTIONS ───────────────────────┐
  │ [📤 Upload] [➕ Create Group]            │
  │ [🔍 Find Meeting] [📋 List All]          │
  └──────────────────────────────────────────┘
  ```

- [ ] 2.2.2: Tạo `OrgStatsCard` component
- [ ] 2.2.3: Tạo `PinnedGroupsList` component
- [ ] 2.2.4: Tạo `ActionItemsPreview` component
- [ ] 2.2.5: Tạo `RecentMeetingsList` component

### Phase 2.3: Group Management

**Cần làm:**
- [ ] 2.3.1: Tạo `CreateGroupModal.tsx`
  ```
  ┌─────────────────────────────────────────────────┐
  │ ➕ Create New Group                          [×]│
  ├─────────────────────────────────────────────────┤
  │ Organization:                                   │
  │ [🏢 ABC Company ▼] (Fixed)                     │
  │                                                 │
  │ Group Name: *                                   │
  │ [Ex: "Marketing Q3", "Tech Team", etc]         │
  │                                                 │
  │ Description:                                    │
  │ [Optional - what's this group for?]            │
  │                                                 │
  │ Privacy Level:                                  │
  │ ◉ Private (Only invited members can see)       │
  │ ○ Internal (Any org member can join)           │
  │ ○ Public (Anyone can see, request join)        │
  │                                                 │
  │ Initial Members:                                │
  │ [Search: user@company.com]                     │
  │ ✓ Nguyễn Văn A    [× Remove]                   │
  │ ✓ Trần Thị B      [× Remove]                   │
  │                                                 │
  │ ℹ️ You will be the Group Admin                  │
  │                         [Cancel]  [✓ Create]   │
  └─────────────────────────────────────────────────┘
  ```

- [ ] 2.3.2: Tạo `GroupDetail.tsx` page
  - Header: group info, member count, org context
  - Tabs: Meetings, Members, Chat, Stats, Files, Settings
  
- [ ] 2.3.3: Tạo `GroupMeetingsTab.tsx`
  - Meeting list với filters (status, month, sort)
  - Meeting cards với AI summary badges
  
- [ ] 2.3.4: Tạo `GroupMembersTab.tsx`
  - Member list với role display (Owner/Admin/Member/Viewer)
  - Search & filter by role/status
  - Add/remove members, Change roles
  
- [ ] 2.3.5: Tạo `GroupSettingsTab.tsx`
  - Edit group info
  - Manage member roles
  - Delete/archive group

### Phase 2.4: Organization Admin Pages

**Cần làm:**
- [ ] 2.4.1: Tạo `OrgAdminConsole.tsx` page (org-admin only)
  - Tabs: Overview, Users, Groups, Costs, Settings
  
- [ ] 2.4.2: Tạo `OrgUsersTab.tsx`
  - User list với roles
  - Invite users (email)
  - Change roles, Remove users
  
- [ ] 2.4.3: Tạo `OrgGroupsTab.tsx`
  - List all groups in org
  - Create new group
  - Manage settings, View stats
  
- [ ] 2.4.4: Tạo `OrgCostsTab.tsx`
  - Budget display
  - Cost breakdown by group
  - Set budget alerts

**Deliverables Phase 2:**
⏳ Sidebar navigation v2 hoàn chỉnh
⏳ Dashboard với org context
⏳ Create group flow (member → group admin)
⏳ Group detail page với tabs
⏳ Org admin console (users, groups, costs)

---

## ⏳ PHASE 3: MEETING & ACTION ITEMS (CHƯA BẮT ĐẦU)

### Phase 3.1: Meeting List & Filters

- [ ] 3.1.1: Redesign `MeetingList.tsx` theo v2
- [ ] 3.1.2: Tạo `MeetingFilters.tsx`
- [ ] 3.1.3: Tạo `MeetingCard.tsx`
- [ ] 3.1.4: Implement pagination

### Phase 3.2: Meeting Detail (v2)

- [ ] 3.2.1: Update `MeetingDetail.tsx` với org/group breadcrumbs
- [ ] 3.2.2: Update tabs: Summary, Transcript, Actions, Chat AI, Quality
- [ ] 3.2.3: Audio player synced với transcript
- [ ] 3.2.4: Star/bookmark feature
- [ ] 3.2.5: Share meeting to other groups

### Phase 3.3: Audio Upload & Processing

- [ ] 3.3.1: Update `UploadModal.tsx` với v2 flow
- [ ] 3.3.2: Tạo `ProcessingStatus.tsx`
- [ ] 3.3.3: Tạo `CreateMeeting.tsx` page

### Phase 3.4: Action Items System

- [ ] 3.4.1: Redesign `ActionItems.tsx` page
- [ ] 3.4.2: Tạo `ActionItemCard.tsx`
- [ ] 3.4.3: Tạo `ActionItemDetail.tsx`
- [ ] 3.4.4: Tạo `AssignActionModal.tsx`

**Deliverables Phase 3:**
⏳ Meeting list với org/group context
⏳ Meeting detail v2
⏳ Audio upload với processing status
⏳ Action items system hoàn chỉnh

---

## ⏳ PHASE 4: ADMIN PANELS & ANALYTICS (CHƯA BẮT ĐẦU)

### Phase 4.1: Analytics Dashboard

- [ ] 4.1.1: Redesign `Analytics.tsx`
- [ ] 4.1.2: Tạo `OrgAnalytics.tsx`
- [ ] 4.1.3: Tạo `GroupAnalytics.tsx`

### Phase 4.2: System Admin Panel

- [ ] 4.2.1: Tạo `SystemAdminDashboard.tsx`
- [ ] 4.2.2: Tạo `SystemUsersTab.tsx`
- [ ] 4.2.3: Tạo `SystemOrgsTab.tsx`
- [ ] 4.2.4: Tạo `SystemSettingsTab.tsx`

### Phase 4.3: User Profile

- [ ] 4.3.1: Redesign `Settings.tsx` → `Profile.tsx`
- [ ] 4.3.2: Tạo `MyOrgsSection.tsx`
- [ ] 4.3.3: Tạo `NotificationSettings.tsx`

### Phase 4.4: Reports & Export

- [ ] 4.4.1: Update `Reports.tsx`

**Deliverables Phase 4:**
⏳ Analytics với charts
⏳ System admin panel
⏳ User profile với multi-org
⏳ Reports & export

---

## ⏳ PHASE 5: POLISH, TESTING & DEPLOYMENT (CHƯA BẮT ĐẦU)

### Phase 5.1-5.5

- [ ] 5.1: Responsive design testing
- [ ] 5.2: Performance optimization
- [ ] 5.3: Error handling
- [ ] 5.4: Testing (unit, integration)
- [ ] 5.5: Documentation & Deployment

**Deliverables Phase 5:**
⏳ Production-ready application

---

## 🎯 KEY TECHNICAL DECISIONS

| Aspect | Decision | Rationale |
|--------|---------|-----------|
| **State Management** | Zustand + React Query | Lightweight, easy to use, đã có trong project |
| **Routing** | React Router v7 | Đã có, stable API |
| **Mock Data** | Dynamic generators + in-memory CRUD | Realistic data, no backend needed |
| **UI Components** | Custom Tailwind | Full control, no external dependencies |
| **Charts** | Recharts | Đã có trong dependencies |
| **Audio** | wavesurfer.js | Đã có trong dependencies |
| **Animations** | Framer Motion | Đã có trong dependencies |
| **Forms** | React Hook Form + Zod | Đã có, type-safe validation |
| **HTTP Client** | Axios + mock interceptor | Easy to intercept, mock API |

---

## 📊 ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                   React Application                    │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐│ │
│  │  │   Pages     │  │  Components  │  │   Layouts    ││ │
│  │  │  (20+ pages)│  │ (50+ comps)  │  │  (Sidebar,   ││ │
│  │  │             │  │              │  │   Header)    ││ │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘│ │
│  │         │                │                   │        │ │
│  │  ┌──────┴────────────────┴───────────────────┴──────┐│ │
│  │  │          State Management Layer                  ││ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        ││ │
│  │  │  │ authStore│ │ orgStore │ │groupStore│        ││ │
│  │  │  └──────────┘ └──────────┘ └──────────┘        ││ │
│  │  │  ┌──────────┐ ┌──────────┐                     ││ │
│  │  │  │ uiStore  │ │meetingStore                   ││ │
│  │  │  └──────────┘ └──────────┘                     ││ │
│  │  └────────────────────────────────────────────────┘│ │
│  │                                                     │ │
│  │  ┌────────────────────────────────────────────────┐│ │
│  │  │         Context Layer                          ││ │
│  │  │  ┌──────────────┐  ┌─────────────────────┐    ││ │
│  │  │  │ AuthContext   │  │ usePermission Hook  │    ││ │
│  │  │  │ (v2 roles)    │  │ (5-tier perms)      │    ││ │
│  │  │  └──────────────┘  └─────────────────────┘    ││ │
│  │  └────────────────────────────────────────────────┘│ │
│  │                                                     │ │
│  │  ┌────────────────────────────────────────────────┐│ │
│  │  │         Data Layer                             ││ │
│  │  │  ┌──────────────┐  ┌─────────────────────┐    ││ │
│  │  │  │ Mock Data    │  │ Mock API Interceptor│    ││ │
│  │  │  │ (dynamic)    │  │ (simulate backend)  │    ││ │
│  │  │  └──────────────┘  └─────────────────────┘    ││ │
│  │  └────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 FILE STRUCTURE (FINAL)

```
frontend/src/
├── api/
│   └── mockApiInterceptor.ts          ✅ Created
├── components/
│   ├── ui/                            ✅ Already exists
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   ├── layout/                        🔄 To create
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── OrgSelector.tsx
│   │   ├── GroupNav.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── QuickAccess.tsx
│   ├── meeting/                       🔄 To create
│   │   ├── MeetingCard.tsx
│   │   ├── MeetingFilters.tsx
│   │   ├── MeetingList.tsx
│   │   ├── TranscriptPlayer.tsx
│   │   └── AudioPlayer.tsx
│   ├── org/                           🔄 To create
│   │   ├── OrgStatsCard.tsx
│   │   ├── OrgUsersList.tsx
│   │   └── OrgGroupsList.tsx
│   ├── group/                         🔄 To create
│   │   ├── CreateGroupModal.tsx
│   │   ├── GroupMembersList.tsx
│   │   └── GroupMeetingsList.tsx
│   └── admin/                         🔄 To create
│       ├── SystemAdminDashboard.tsx
│       └── ...
├── context/
│   └── AuthContext.tsx                ✅ Updated (v2)
├── data/                              ✅ Already exists
│   ├── users.ts
│   ├── orgs.ts
│   ├── groups.ts
│   ├── meetings.ts
│   ├── actions.ts
│   ├── roles.ts
│   └── index.ts
├── hooks/
│   ├── usePermission.ts               ✅ Created
│   ├── useRecording.ts
│   ├── useWebSocket.ts
│   └── index.ts
├── layouts/
│   └── Layout.tsx                     🔄 To update (v2)
├── pages/
│   ├── auth/
│   │   ├── Login.tsx                  🔄 To update
│   │   └── Onboarding.tsx             🔄 To create
│   ├── dashboard/
│   │   └── Dashboard.tsx              🔄 To update (v2)
│   ├── org/
│   │   ├── OrgAdminConsole.tsx        🔄 To create
│   │   ├── OrgUsersTab.tsx            🔄 To create
│   │   ├── OrgGroupsTab.tsx           🔄 To create
│   │   └── OrgCostsTab.tsx            🔄 To create
│   ├── group/
│   │   ├── GroupDetail.tsx            🔄 To create
│   │   ├── GroupMeetingsTab.tsx       🔄 To create
│   │   ├── GroupMembersTab.tsx        🔄 To create
│   │   └── GroupSettingsTab.tsx       🔄 To create
│   ├── meeting/
│   │   ├── MeetingList.tsx            🔄 To update
│   │   ├── MeetingDetail.tsx          🔄 To update
│   │   └── CreateMeeting.tsx          🔄 To create
│   ├── actions/
│   │   └── ActionItems.tsx            🔄 To update
│   ├── analytics/
│   │   └── Analytics.tsx              🔄 To update
│   ├── admin/
│   │   ├── SystemAdminDashboard.tsx   🔄 To create
│   │   └── ...
│   └── profile/
│       └── Profile.tsx                🔄 To create
├── services/
│   ├── api.ts                         ✅ Already exists
│   ├── authService.ts
│   ├── meetingService.ts
│   └── ...
├── stores/
│   ├── authStore.ts                   ✅ Already exists
│   ├── uiStore.ts                     ✅ Already exists
│   ├── meetingStore.ts                ✅ Already exists
│   ├── orgStore.ts                    ✅ Created
│   ├── groupStore.ts                  ✅ Created
│   └── index.ts                       ✅ Updated
├── types/
│   └── index.ts                       ✅ Already exists (v2 types)
├── utils/
│   └── mock-generator.ts              ✅ Updated (CRUD)
├── App.tsx                            🔄 To update (routes)
└── main.tsx                           ✅ Already exists
```

---

## 🚀 NEXT STEPS (IMMEDIATE)

**Tuần này (Tuần 3):**
1. ✨ Redesign Layout.tsx với v2 sidebar
2. ✨ Tạo OrgSelector component
3. ✨ Tạo GroupNav component
4. ✨ Update Dashboard với org context
5. ✨ Tạo CreateGroupModal

**Tuần sau (Tuần 4):**
1. Group Detail page với tabs
2. Group Members management
3. Org Admin Console
4. Testing & bug fixes

---

## 📞 SUPPORT & QUESTIONS

- Reference docs: `docs/UI_REDESIGN_PLAN_v2.md`, `docs/UI_DETAILED_WIREFRAMES_v2.md`
- Types: `src/types/index.ts`
- Mock data: `src/data/`
- State management: `src/stores/`

---

**Last Updated:** 2026-04-13 | **Status:** 🟢 Phase 1 Complete, Phase 2 In Progress
