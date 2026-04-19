# 👥 Vai Trò Trong Hệ Thống - MultiMinutes AI (v2 Phân Tầng)

> **Mô hình phân quyền 5 cấp:** System Admin → Organization Admin → Group Admin → Member → Viewer
> 
> **Nguyên tắc:** Users tạo Organizations → Org Admins quản lý users & groups → Group creators là Group Admin → Members tham gia meetings

---

## 📊 BẢNG TỔNG QUAN - QUY TRÌNH PHÂN QUYỀN

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SYSTEM ADMIN (👑👑)                               │
│            Quản lý toàn bộ hệ thống & billing                        │
│  ├─ Tạo/sửa/xóa Organizations                                       │
│  ├─ Xem tất cả users, groups, meetings                              │
│  ├─ Quản lý costs & budgets                                         │
│  └─ System settings, UI, features                                   │
└────────────────┬──────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                ORGANIZATION ADMIN (👑)                              │
│         Quản lý một Tổ Chức/Công ty cụ thể                          │
│  ├─ Xem tất cả users trong org                                      │
│  ├─ Mời/xóa users vào org                                           │
│  ├─ Tạo/sửa/xóa groups trong org                                    │
│  ├─ G án Group Admins                                               │
│  ├─ Xem analytics org                                               │
│  └─ ⚠️ KHÔNG: Quản lý org khác, system settings                     │
└────────────────┬──────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  GROUP ADMIN/OWNER (⭐)                             │
│        Quản lý một Group cụ thể (thường là Group Creator)            │
│  ├─ Mời/xóa members khỏi group                                      │
│  ├─ Tạo/sửa/xóa meetings trong group                                │
│  ├─ Gán/xóa action items cho members                                │
│  ├─ Xem analytics group                                             │
│  ├─ Quản lý group settings, chat                                    │
│  └─ ⚠️ KHÔNG: Quản lý group khác, Org Admin, System Admin           │
└────────────────┬──────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│              MEMBER (👤)                                            │
│       Thành viên bình thường trong Group                            │
│  ├─ Tham gia meetings trong group                                   │
│  ├─ Upload audio, tạo meetings                                      │
│  ├─ Xem transcripts & summaries                                     │
│  ├─ Mark done action items                                          │
│  └─ ⚠️ KHÔNG: Quản lý members, xóa meetings, group settings         │
└────────────────┬──────────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│              VIEWER (👁️) - Read-only                               │
│       Chỉ xem nội dung, không chỉnh sửa                             │
│  ├─ Xem meetings transcript & summary                               │
│  ├─ Xem chat group                                                  │
│  └─ ⚠️ KHÔNG: Upload, tạo meetings, quản lý gì                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 CORE RULES - QUI TẮC QUAN TRỌNG

| Rule | Giải thích | Ví dụ |
|------|-----------|--------|
| **Non-Member Access** | Người KHÔNG phải thành viên group → **KHỎ NG TRUY CẬP** | Nguyễn A không trong Group "Kinh Doanh" → không thấy meetings |
| **Group Creator = Admin** | Ai tạo group → tự động trở thành Group Admin | Trần B tạo "Phòng Kỹ Thuật" → Trần B = Admin |
| **Org Creator = Org Admin** | Ai tạo org → tự động trở thành Organization Admin | Lê C tạo "Công ty XYZ" → Lê C = Org Admin |
| **Hierarchical Permissions** | Quyền thấp hơn tiếng → bị giới hạn bởi cấp trên | Member không thể xóa group, nhưng Org Admin có thể |
| **Role Inheritance** | Org Admin từ org A không manage org B | Quyền được scope của từng entity |
| **Single Org Min** | Users phải thuộc ít nhất 1 Org để hoạt động | New user → assign vào Org |

---

# 🔐 CHI TIẾT TỪNG VAI TRÒ

---

## 👑👑 SYSTEM ADMIN - QUẢN TRỊ VIÊN HỆ THỐNG (TIER 1)

### 🎯 Mô tả
- Quản lý **toàn bộ hệ thống**
- Chỉ dành cho CTO, Technical Lead, IT Director
- **Số lượng:** 1-2 người max

### ✅ QUYỀN HẠN

#### (A) Quản lý Users & Organizations
- ✅ Xem tất cả users toàn hệ thống
- ✅ Xem tất cả organizations
- ✅ Tạo/sửa/xóa users
- ✅ Tạo/sửa/xóa organizations
- ✅ Gán/revoke Organization Admin role
- ✅ View all activity logs
- ✅ Reset passwords, disable/enable accounts
- ✅ Import/export users bulk

#### (B) Analytics & Insights
- ✅ Toàn bộ system analytics
- ✅ Per-organization analytics
- ✅ Per-group analytics  
- ✅ Per-user analytics
- ✅ Cost tracking system-wide
- ✅ Performance monitoring

#### (C) Billing & Cost Management
- ✅ System-wide budget settings
- ✅ Per-org budget limits
- ✅ Hard cost limits
- ✅ View all invoices & payments
- ✅ Export billing reports
- ✅ AI provider cost breakdown

#### (D) System Configuration
- ✅ AI provider settings (Google, OpenAI, etc.)
- ✅ Default settings for system
- ✅ Feature flags, toggles
- ✅ Email/notification configuration
- ✅ Security settings (2FA, JWT, etc.)
- ✅ API rate limits
- ✅ Storage limits per org/group

#### (E) Monitoring & Support
- ✅ System health check
- ✅ View error logs, API logs
- ✅ Active sessions monitoring
- ✅ Processing queue status
- ✅ Database troubleshooting
- ✅ User support tickets

### ❌ KHÔNG CÓ GIỚI HẠN GÌ
System Admin có thể làm **MỌII THỨ** - toàn quyền tuyệt đối.

---

## 👑 ORGANIZATION ADMIN - QUẢN TRỊ VIÊN TỔ CHỨC (TIER 2)

### 🎯 Mô tả
- Quản lý **một Tổ Chức/Công ty cụ thể**
- Thường là: VP, CTO, Trưởng phòng vận hành
- **Số lượng:** 1-3 per organization
- **Cấp cao hơn:** System Admin (can override)
- **Cấp thấp hơn:** Group Admins, Members

### ✅ QUYỀN HẠN (Trong Org của mình)

#### (A) Quản lý Users trong Org
| Chức năng | Được/Không |
|-----------|-----------|
| Xem tất cả users trong org | ✅ Có |
| Mời users vào org | ✅ Có (gửi email invite) |
| Remove users khỏi org | ✅ Có |
| Gán user vào groups | ✅ Có |
| Change user role (Member/Viewer) | ✅ Có |
| Reset user password | ✅ Có |
| Disable/enable user | ✅ Có |
| Xem user activity log | ✅ Có |
| Quản lý users ở org khác | ❌ KHÔNG |

#### (B) Quản lý Groups trong Org
| Chức năng | Được/Không |
|-----------|-----------|
| Xem tất cả groups trong org | ✅ Có |
| Tạo group mới cho org | ✅ Có |
| Sửa group info | ✅ Có |
| Xóa/archive group | ✅ Có (soft delete) |
| G án Group Admin | ✅ Có |
| Merge groups | ✅ Có |
| Set group storage limit | ✅ Có |
| Xem group analytics | ✅ Có |
| Quản lý groups ở org khác | ❌ KHÔNG |

#### (C) Org Settings & Analytics  
| Chức năng | Được/Không |
|-----------|-----------|
| Sửa org name, icon, description | ✅ Có |
| Xem org analytics | ✅ Có |
| Xem org cost | ✅ Có |
| Set org budget limit (trong system limit) | ✅ Có |
| View org-level reports | ✅ Có |
| Export org data | ✅ Có |

#### (D) Billing (Limited)
| Chức năng | Được/Không |
|-----------|-----------|
| Xem org bills | ✅ Có |
| Set budget alerts | ✅ Có |
| View cost by group/user | ✅ Có |
| Adjust budget (< system limit) | ✅ Có |
| Pay bills / manage payment | ❌ Chỉ System Admin |

### ❌ KHÔNG CÓ QUYỀN

| Chức năng | Lý do |
|-----------|-------|
| Quản lý system settings | Chỉ System Admin |
| Xem các org khác | Scope-limited để org |
| Tạo org mới | System Admin | 
| AI provider settings | System Admin |
| User support tickets | IT department |

### 📍 Scope Giới Hạn
- Chỉ thấy users, groups, meetings, costs **trong org mình**
- Không xem được thông tin org khác
- Quyền thấp hơn System Admin

---

## ⭐ GROUP ADMIN/OWNER - QUẢN TRỊ VIÊN NHÓM (TIER 3)

### 🎯 Mô tả
- Quản lý **một Group cụ thể** (thường là Group Creator)
- Vị trí: Team Lead, Project Manager, Trưởng nhóm
- **Số lượng:** 1-2 per group
- **Cấp cao hơn:** Org Admin, System Admin
- **Cấp thấp hơn:** Members, Viewers

### ✅ QUYỀN HẠN (Trong Group của mình)

#### (A) Quản lý Members
| Chức năng | Chi tiết |
|-----------|---------|
| Xem tất cả members | Danh sách, roles, activity |
| Mời members vào group | Send email invite |
| Remove members | Đá khỏi group |
| Change member role | Member ↔ Viewer |
| View member activity | Ai tham gia bao nhiêu meetings |
| Onboard members | Send welcome message |

#### (B) Quản lý Meetings
| Chức năng | Chi tiết |
|-----------|---------|
| Xem tất cả meetings | Group meetings list |
| Tạo meeting mới | Upload audio, điền info |
| Sửa meeting info | Title, date, attendees |
| Xóa meeting | Soft delete |
| Reprocess meeting | Re-run AI processing |
| Assign actions | Giao tasks cho members |

#### (C) Quản lý Content
| Chức năng | Chi tiết |
|-----------|---------|
| Xem transcripts | Tất cả meetings |
| Pin messages | In group chat |
| Delete messages | Remove từ chat |
| Add files to group | Upload documents |
| Manage storage | Xem/delete old files |

#### (D) Group Chat
| Chức năng | Chi tiết |
|-----------|---------|
| Gửi tin nhắn | Normal user |
| Pin messages | Highlight important |
| Delete messages | Moderate |
| Mention members | @notifications |

#### (E) Analytics & Settings
| Chức năng | Chi tiết |
|-----------|---------|
| Xem group analytics | Meetings, members, costs |
| View group cost | Tiền AI đã dùng |
| Group notifications settings | Configure alerts |
| Auto-summarize toggle | On/off automation |
| Retention period | Keep old meetings |
| Privacy level | Public/Private/Secret |

### ❌ KHÔNG CÓ QUYỀN

| Chức năng | Lý do |
|-----------|-------|
| Quản lý group khác | Scope-limited |
| Xem org settings | Org Admin only |
| Manage users system-wide | User management org level |
| Change group owner | Org/System Admin |
| Billing/costs | Org Admin |

### 📍 Scope Giới Hạn
- Chỉ quản lý **1 group**
- Chỉ thấy members/meetings **trong group**
- Quyền thấp hơn Org Admin

---

## 👤 MEMBER - THÀNH VIÊN BÌNH THƯỜNG (TIER 4)

### 🎯 Mô tả
- **Người dùng thường ngày** của hệ thống
- Tham gia meetings, upload audio, xem tóm tắt
- Chiếm 80% users
- Được mời vào groups bởi Org/Group Admin

### ✅ QUYỀN HẠN (Trong Group được phép)

#### (A) Xem & Tham gia Meetings
| Chức năng | Chi tiết |
|-----------|---------|
| Xem meetings group | Danh sách, filters |
| Xem meeting detail | Summary, transcript, actions |
| Listen audio | Play, pause, seek, speed controls |
| Read transcript |  Full text, with confidence scores |
| View key points | Decisions, topics |
| Read assigned actions | Xem tasks giao cho mình |
| Mark done actions | Hoàn thành tasks |
| Star/bookmark meeting | For easy access |

#### (B) Upload & Tạo Meetings
| Chức năng | Chi tiết |
|-----------|---------|
| Upload audio | Drag-drop or browse |
| Create meeting | Điền title, date, attendees |
| Configure AI options | STT provider, language, etc |
| Set reminders | Deadline notifications |
| Add attendees | Select from group members |

#### (C) My Actions Dashboard
| Chức năng | Chi tiết |
|-----------|---------|
| Xem overdue actions | 🔴 Quá hạn |
| View due soon | 🟡 Sắp hết hạn |
| View on-track | 🟢 Đúng hạn |
| Mark done | Complete tasks |
| Add comments | Discuss action items |
| Filter by status/group | Custom views |

#### (D) Group Communication
| Chức năng | Chi tiết |
|-----------|---------|
| Send messages | Group chat |
| Reply messages | Thread replies |
| @mention members | Notifications |
| React to messages | 👍 ❤️ 😂 |
| Search chat | Find discussions |

#### (E) Export & Share
| Chức năng | Chi tiết |
|-----------|---------|
| Export meeting | PDF, DOCX, TXT |
| Download transcript | Full text |
| Download summary | Key points |
| Share with external | Via link (Org Admin control) |

#### (F) Profile & Preferences
| Chức năng | Chi tiết |
|-----------|---------|
| Edit profile | Name, avatar, timezone |
| Change password | Security |
| Notification settings | Email, in-app alerts |
| Language preference | UI language |
| View my activity log | Meetings I created/joined |

### ❌ KHÔNG CÓ QUYỀN

| Chức năng | Lý do |
|-----------|-------|
| Manage members | Only Group Admin |
| Delete meetings | Only Group Admin |
| Assign actions to others | Only Group Admin |
| View other groups | Not a member → no access |
| Org/Group settings | Admin only |
| System settings | System Admin |

### 📍 Scope Giới Hạn
- Chỉ xem **groups được mời vào**
- Chỉ xem **meetings trong groups**
- **Non-members KHÔNG thấy gì** từ group khác

---

## 👁️ VIEWER - CHỈ XEM (TIER 5)

### 🎯 Mô tả
- **Read-only access** vào group
- Investor, executive, auditor, guest
- Chỉ xem, không chỉnh sửa gì

### ✅ QUYỀN HẠN (Read-only)

| Chức năng | Chi tiết |
|-----------|---------|
| Xem meetings | List & detail |
| Read transcript | Full text |
| Read summary | Key points, decisions |
| Download meeting | Export PDF/DOCX |
| View group analytics | Stats dashboard |
| Read group chat | See discussions |

### ❌ KHÔNG CÓ QUYỀN

| Chức năng | Lý do |
|-----------|-------|
| Upload audio | Member+ only |
| Create meeting | Member+ only |
| Mark done actions | Member+ only |
| Send messages | Member+ only |
| Delete anything | Member+ only |
| Change any setting | Admin+ only |

---

## 📋 COMPARISON TABLE - QUY ỨNG CẤP QUYỀN


| Chức năng | Sys Admin | Org Admin | Group Admin | Member | Viewer |
|-----------|----------|------------|-----------|--------|--------|
| **Tạo Organization** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Quản lý Org** | ✅ | ✅(own) | ❌ | ❌ | ❌ |
| **Xem tất cả Orgs** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tạo Group** | ✅ | ✅(in org) | ❌ | ❌ | ❌ |
| **Quản lý Group** | ✅ | ✅(in org)  | ✅(own) | ❌ | ❌ |
| **Quản lý Users** | ✅ | ✅(in org) | ❌ | ❌ | ❌ |
| **Mời Users** | ✅ | ✅(to org) | ✅(to group) | ❌ | ❌ |
| **Upload Audio** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create Meeting** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Assign Actions** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Mark Done Actions** | ✅ | ❌ | ✅ | ✅ | ❌ |
| **View Meetings** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Export Reports** | ✅ | ✅(org) | ✅(group) | ✅ | ✅ |
| **View Analytics** | ✅ | ✅(org) | ✅(group) | ✅* | ❌ |
| **System Settings** | ✅ | ❌ | ❌ | ❌ | ❌ |

\* Members thấy personal analytics, không thấy org-wide

---

## 🎭 REAL-WORLD SCENARIOS

### Scenario 1: User mới join company
```
1. System Admin creates Org "ABC Company"
   ↓
2. Org Admin (VP) mời Email: john@abc.com vào Org
   ↓
3. John joins Org → tự động thành Member
   ↓
4. Group Admin (Team Lead) mời John vào "Kinh Doanh" Group
   ↓
5. John = Member trong "Kinh Doanh" → Full access meetings, upload, create
```

### Scenario 2: John tạo group mới
```
1. John (Member) tạo private group "Project X"
   ↓
2. Hệ thống: John = Group Owner/Admin tự động
   ↓
3. John can:
   - Mời Members vào group
   - Manage all meetings
   - Assign actions
   - Delete group
   ↓
4. Nhưng:
   - Không quản lý "Kinh Doanh" group
   - Không xem groups khác
```

### Scenario 3: Executive xem meetings
```
1. System Admin mời Exec "Sarah@abc.com" vào Org
   ↓
2. Org Admin adds Sarah to "Ban Giám Đốc" group as VIEWER
   ↓
3. Sarah:
   - ✅ Xem tất cả meetings, transcripts
   - ✅ Download reports
   - ❌ Upload audio, create meetings
   - ❌ Assign actions
```

---

## 🔄 ROLE TRANSITIONS

```
NEW USER
  ↓
User joins via invited link
  ↓
Automatically = MEMBER (default)
  ↓
Can be changed to:
├─ VIEWER (read-only)
├─ GROUP ADMIN (by Org/System Admin)
└─ ORG ADMIN (by System Admin only)

GROUP ADMIN can promote:
├─ MEMBER → leave as is
└─ (Cannot promote to higher roles)

When user LEAVES GROUP:
├─ Loses all permissions in that group
├─ Keeps permissions in other groups
└─ Can re-join if invited again
```

---

## 🛡️ SECURITY & ISOLATION

| Scenario | Result | Protection |
|----------|--------|-----------|
| Non-member tries to access group | 🔴 403 Forbidden | Prevent cross-org access |
| Member tries to delete group | 🔴 403 Forbidden | Only Group Admin can delete |
| Org Admin manages other org | 🔴 403 Forbidden | Org isolation |
| Viewer uploads audio | 🔴 403 Forbidden | Member+ only |
| Group Admin creates new org | 🔴 403 Forbidden | Org Admin+ only |

