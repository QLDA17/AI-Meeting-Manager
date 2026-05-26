# 🎨 KẾ HOẠCH PHÁT TRIỂN FRONTEND (v2)

---

## 📐 CHIẾN LƯỢC REDESIGN
Chuyển đổi từ Dashboard đơn giản sang mô hình **Organization/Group** (giống Slack/Teams).
- **FE-First:** Sử dụng dynamic mock data để phát triển nhanh mà không phụ thuộc backend.
- **Hierarchy:** Organization → Group → Meeting.

---

## 📊 CÁC GIAI ĐOẠN TRIỂN KHAI (PHASES)

### Phase 1: Foundation & Auth (✅ HOÀN THÀNH)
- Cấu trúc thư mục v2.
- Hệ thống Auth hỗ trợ 5 cấp Role.
- Dynamic Mock Data System (CRUD in-memory).
- State Management (Zustand: `orgStore`, `groupStore`).

### Phase 2: Organization & Group UI (🔄 ĐANG LÀM)
- **Sidebar v2:** Org Selector + Group List.
- **Dashboard v2:** Org context stats, Pinned groups.
- **Group Management:** Create group (Member → Group Admin), Group Detail (Tabs: Meetings, Members, Settings).
- **Org Admin Panel:** Quản lý User, Group, Chi phí trong Org.

### Phase 3: Meeting System (⏳ CHƯA BẮT ĐẦU)
- Danh sách cuộc họp theo Group.
- Meeting Detail: Transcript player, AI Summary, Chat AI.
- Audio Upload & Processing status.
- Action Items system.

### Phase 4: Admin & Analytics (⏳ CHƯA BẮT ĐẦU)
- System Admin Panel (Global).
- Analytics dashboards (Charts).
- User Profile (Multi-org support).

### Phase 5: Polish & Deployment (⏳ CHƯA BẮT ĐẦU)
- Responsive Design.
- Performance optimization.
- E2E Testing & Deploy.

---

## 🖼️ ĐẶC TẢ GIAI DIỆN CHÍNH

### Bố cục Sidebar
```
├── 🏢 ORG SELECTOR (ABC Company ▼)
├── 📁 GROUPS (Kinh Doanh, Kỹ Thuật...)
│   └── [➕ New Group]
├── 📋 QUICK ACCESS (Meetings, My Actions, Starred)
├── ⭐ ORG ADMIN (Users, Groups, Costs)
└── ⭐ GROUP ADMIN (Members, Settings)
```

### Flow tạo Group
1. Member nhấn `[➕ New Group]`.
2. Điền thông tin (Name, Description, Privacy).
3. Sau khi tạo: User tự động thành **Group Admin** của Group đó.

---

## 🛠️ QUY CHUẨN KỸ THUẬT
- **Styling:** TailwindCSS (Custom config).
- **Components:** Tách biệt `ui/` (nguyên tử) và `features/` (logic).
- **Testing:** TDD (Viết test trước khi code tính năng).

---
**Tham chiếu chi tiết:** `frontend/src/types/index.ts`, `frontend/src/data/mock-generator.ts`
**Cập nhật:** 2026-04-28
