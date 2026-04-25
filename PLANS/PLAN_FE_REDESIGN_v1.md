# PLAN — FE Redesign Toàn Diện theo CSDL Canonical

> **Mục tiêu:** Thiết kế lại toàn bộ FE để **mọi màn hình đều có DB-backing**,
> mọi luồng dữ liệu đi qua **Action Layer** (mock-first, sẵn sàng swap HTTP),
> đồng thời bổ sung các màn còn thiếu để **tận dụng triệt để** các bảng DB.
>
> Áp dụng skills: `tdd-workflow`, `action-layer-architect`, `mock-data-architect`,
> `db-schema-alignment`, `frontend-architect`. Mọi PR phải đi qua Red→Green→Refactor.

CSDL nguồn: `database/canonical_schema.sql` (MySQL 8.0+).
Plan tiền nhiệm (Phase 0 đã ship): `PLANS/PLAN_FE_SCHEMA_ALIGNMENT.md`.

---

## 1. Bản đồ Màn hình ↔ Bảng DB ↔ Trạng thái

| Màn hình hiện có | Bảng DB chính | Trạng thái | Vấn đề / lệch chuẩn |
| --- | --- | --- | --- |
| `Landing`, `Login`, `Register`, `ForgotPassword` | `users` | ✅ giữ nguyên UI | Cần wire Auth → `userActions.login/register` (mock) |
| `Dashboard` | `meetings`, `projects`, `users`, `ai_cost_logs` | ⚠ dùng `mockMeetings/mockGroups` trực tiếp qua Zustand | Refactor sang `useQuery` + actions; thêm card AI cost & usage |
| `MeetingList` | `meetings` | ⚠ filter trên local mock | Server-style: query `meetingActions.list({ orgId, projectId, status, search, page })` |
| `MeetingDetail` | `meetings`, `transcripts`, `transcript_segments`, `meeting_summaries`, `meeting_participants`, `audio_files`, `chat_messages` | ❌ dữ liệu nhúng trong `Meeting` | Tách 4 actions riêng; redesign 4 tab: Summary / Transcript (có editor) / AI Notes / Actions |
| `CreateMeeting` | `meetings` (write) | ⚠ thiếu `meeting_type`, `scheduled_*`, `location` | Thêm field, validate Zod |
| `MeetingRoom` (live) | `meetings`, `audio_files` | ⚠ không lưu state | Khi end → tạo `audio_files` mock, set status=`processing` |
| `JoinMeeting` | `meetings`, `meeting_participants` | ❌ chưa lưu participant | Thêm `participantActions.join` |
| `UploadAudio` | `audio_files`, `meetings` | ❌ chưa link bảng | Dùng `audioFileActions.upload` (mock URL) |
| `Calendar` | `meetings.scheduled_*` | ✅ OK, nguồn từ actions | Đổi `useAppStore.meetings` → `meetingActions.listScheduled` |
| `ActionItems` | `action_items` | ⚠ FE field hẹp | Thêm `priority` (DB), `assignee_user_id`, mở rộng status enum |
| `Notifications` | `notifications` | ⚠ store inline 6 hard-coded | Wire `notificationActions.list/markRead/dismiss` |
| `GroupDetail / Tabs` | `projects`, `meetings`, `user_organizations` (members), `chat_messages`?? | ⚠ "group chat" không có bảng | (Q) — *xem mục 4* |
| `OrgAdminConsole / Tabs` | `organizations`, `projects`, `user_organizations`, `glossary_terms`, `settings` | ⚠ tab Settings chưa wire | Wire `orgActions`, `projectActions`, `settingActions` |
| `SystemAdminConsole / Tabs` | `organizations`, `users`, `ai_cost_logs`, `ai_quality_metrics`, `api_usage_logs`, `notifications`, `settings` | ⚠ stats từ mock arrays | Wire qua `*ActionsAdmin` (hoặc list với filter system-wide) |
| `Profile` | `users`, `user_organizations` | ⚠ chỉnh inline | `userActions.updateProfile`, `userOrgActions.list` |

---

## 2. Màn hình **CHƯA CÓ** — đề xuất tạo mới (tận dụng bảng DB chưa dùng)

| Màn mới | Bảng DB | Mục đích | Phase |
| --- | --- | --- | --- |
| **`MeetingTranscriptEditor`** (tab nâng cấp) | `transcripts`, `transcript_segments` | Sửa đoạn text, gán speaker, tìm-thay thế, jump-to-time | P3 |
| **`MeetingSummaryPanel`** (tab nâng cấp) | `meeting_summaries` | Key points / decisions / action items được tạo từ AI; có lịch sử version | P3 |
| **`AudioLibrary`** (mới) | `audio_files` | Quản lý các file đã upload, trạng thái xử lý (queued/processing/completed/failed) | P3 |
| **`AnalyticsCostDashboard`** (mới) | `ai_cost_logs`, `ai_quality_metrics`, `api_usage_logs` | Biểu đồ chi phí AI theo provider/ngày/org; chất lượng; throttle | P4 |
| **`ExportCenter`** (mới) | `export_files` | Lịch sử PDF/DOCX/CSV đã xuất, re-download | P4 |
| **`GlossaryTermsManager`** (mới — sub của Glossary hiện có) | `glossary_terms` | CRUD term trong từng glossary collection | P4 |
| **`SettingsPanel` (Org & User)** | `settings` | Map JSON `organizations.settings` + `settings` table thành form | P4 |
| **`MeetingParticipantsManager`** (sub-tab) | `meeting_participants` | Mời, đánh dấu attended, xem joined_at/left_at | P3 |
| **`AdminApiUsageMonitor`** | `api_usage_logs` | Theo dõi usage theo endpoint, status code, response time | P4 |

---

## 3. Lệch chuẩn cần xử lý

1. **Tên thực thể `Group` ↔ `Project`**
   - UI giữ "Group" (đã quen với user), DB là `projects`. Mapper xử lý hai chiều.
   - File `projectActions.ts` là chính thống; `groupActions.ts` re-export.

2. **Role 5-tier ↔ 3-tier DB**
   - DB `users.role`: `admin/manager/staff`.
   - FE `systemRole`: `system-admin/org-admin/group-admin/member/viewer`.
   - Bridge ở `userMapper`. Vai trò chi tiết theo ngữ cảnh: `user_organizations.role`
     (DB: `owner/admin/member`) phụ trách phân quyền *trong* org.

3. **Chat scope**
   - DB `chat_messages` gắn với meeting (theo schema bạn gửi).
   - Hiện FE có `GroupChatTab` (chat nhóm). **Câu hỏi cho user**:
     a) Muốn giữ "group chat" → cần thêm bảng `group_chat_messages` vào schema.
     b) Hoặc bỏ tab này, chuyển sang **per-meeting chat** trong `MeetingDetail`?
   - **Mặc định plan này**: chọn (b) — bỏ Group Chat, chat là theo cuộc họp,
     tránh phình DB. Có thể đổi nếu user không đồng ý.

4. **`meetings.duration` (VARCHAR)**
   - DB lưu free-text (`'pending'`, `'90 min'`). View-model dùng `number`
     phút. Mapper `parseDurationVarchar` / `formatDuration`.

5. **`Meeting.status`**
   - DB enum: `queued/processing/completed/failed`.
   - FE thêm `live/upcoming/canceled` (UX). Khi `toDb`: clamp về `queued`
     cho `upcoming`, `processing` cho `live`, `failed` cho `canceled`. Lưu
     trạng thái "ảo" ở `lib/domain/meetingStatus.ts`.

6. **`notification.type` (UX) ↔ DB**
   - FE: `success/error/warning/info`.
   - Cần thêm field DB-style: `event_type` (`meeting.completed`, `action.assigned`,
     `org.invited`, ...) và severity (UX). Mapper biết suy ra severity từ event_type.

7. **`Glossary` (collection) ↔ `glossary_terms` (term)**
   - Schema có `glossary_terms` (term). Cần thêm bảng `glossaries` (parent
     collection) — **đề xuất với user** ở Phase 4.
   - Trước mắt FE: tách `Glossary` (collection) và `Term` (item).

8. **Action Items**
   - DB `action_items` (đoạn schema bạn gửi bị cắt). Đề xuất các cột:
     `priority ENUM('low','medium','high')`, `status ENUM('pending','in_progress','completed','cancelled')`,
     `assignee_user_id CHAR(36) NULL`, `created_by CHAR(36)`, `due_date DATE`.
   - **Câu hỏi cho user**: confirm enum/columns trên ổn không?

---

## 4. Câu hỏi cần user duyệt trước khi vào code

> *Tôi sẽ block sau khi gửi plan này để đợi câu trả lời.*

- **Q1 — Group Chat**: bỏ `GroupChatTab` và chuyển chat sang `MeetingDetail`
  (per-meeting), hay giữ và bổ sung bảng `group_chat_messages` vào schema?
- **Q2 — Action Items columns**: enum priority/status + cột `assignee_user_id`,
  `created_by`, `due_date` như mục 3.8 có đúng ý không?
- **Q3 — Glossary collections**: thêm bảng `glossaries (id, org_id, name,
  description, scope ENUM('global','organization'))` để bao `glossary_terms`?
- **Q4 — Org settings**: gộp vào `organizations.settings JSON` (đã có) hay
  dùng bảng `settings(scope, key, value)` (đã có) hay cả hai?
- **Q5 — Meeting types**: ngoài 4 enum (`meeting/interview/training/review`),
  có cần thêm gì không (vd `daily-standup`, `1-1`)?
- **Q6 — Branch chiến lược**: mỗi phase = 1 PR riêng vào nhánh `m`, OK?

---

## 5. Phasing (có TDD)

### Phase 1 — Action Layer cho thực thể cốt lõi (PR #2)
**Bảng**: `users`, `organizations`, `user_organizations`, `projects`, `meetings`.

- [ ] `types/db.ts`: bổ sung row interface đầy đủ (đã có khung từ Phase 0).
- [ ] Mappers: `orgMapper`, `userOrganizationMapper`, `projectMapper`, `meetingMapper`.
- [ ] Seed `lib/mockStore/seed.ts` từ `data/orgs.ts`, `data/groups.ts`, `data/meetings.ts`, `data/roleMappings.ts`.
- [ ] Actions: `orgActions`, `userOrgActions`, `projectActions` (alias `groupActions`), `meetingActions`.
- [ ] Refactor stores: `orgStore`, `groupStore`, `appStore` thành thin wrapper trên React Query (giữ API cũ trong 1 phase để không vỡ UI).
- [ ] Refactor pages: `Dashboard`, `MeetingList` (đọc qua actions).
- [ ] Test TDD cho từng action + integration cho 2 page trên.

**DoD:** `npm test`, `npm run build`, `npm run lint --` các file mới sạch.

### Phase 2 — Auth & Profile thật (PR #3)
**Bảng**: `users`, `user_organizations`, `settings`.

- [ ] `userActions.login/register/logout/updateProfile` (mock).
- [ ] `AuthContext` đọc/ghi qua actions, không từ `mockUsers` trực tiếp.
- [ ] `Profile` page wire đầy đủ; trang `Settings` (user-level) chuẩn.
- [ ] `usePermission` lấy role từ `user_organizations.role` thay vì cache trong context.

### Phase 3 — Meeting Subsystem đầy đủ (PR #4)
**Bảng**: `meetings`, `meeting_participants`, `audio_files`, `transcripts`,
`transcript_segments`, `meeting_summaries`.

- [ ] Types/mappers/seeds/actions cho 5 bảng còn lại.
- [ ] `MeetingDetail` redesign 4 tab:
  - Summary → đọc `meeting_summaries` (lịch sử version).
  - Transcript → segment editor (jump-to-time, sửa text, đổi speaker label).
  - AI Notes → key_points / decisions từ summary.
  - Participants → CRUD `meeting_participants`.
- [ ] `CreateMeeting` thêm `meeting_type`, `scheduled_start/end`, `location`.
- [ ] `MeetingRoom` end → mock pipeline: `audio_files (uploaded) → meeting.status=processing → meeting_summaries (1 row mock) → meeting.status=completed`.
- [ ] `UploadAudio` wire `audioFileActions`.
- [ ] `JoinMeeting` wire `participantActions.join`.
- [ ] **Trang mới**: `AudioLibrary`.

### Phase 4 — Action Items / Notifications / Chat / Analytics / Glossary / Export / Settings (PR #5)
**Bảng**: `action_items`, `notifications`, `chat_messages`, `ai_cost_logs`,
`ai_quality_metrics`, `api_usage_logs`, `export_files`, `glossary_terms`,
`settings` (+ `glossaries` mới nếu user duyệt).

- [ ] Actions cho từng bảng.
- [ ] Pages refactor:
  - `ActionItems` → `actionItemActions`.
  - `Notifications` → `notificationActions`.
  - `MeetingDetail.Chat` (mới) → `chatActions`.
  - `OrgGlossariesTab`, `GlossariesAdmin` → `glossaryActions` + `termActions`.
- [ ] **Trang mới**: `AnalyticsCostDashboard`, `ExportCenter`, `GlossaryTermsManager`,
  `SettingsPanel`, `AdminApiUsageMonitor`.
- [ ] Polish: empty states, loading skeletons, error boundary chuẩn.

### Phase 5 — BE-ready Switch (PR #6)
- [ ] Bật `services/transport.ts` HTTP mode.
- [ ] `docs/API_CONTRACT.md` sinh từ chữ ký action.
- [ ] Postman/Hoppscotch collection (tuỳ chọn).

---

## 6. Quy ước thi công

- **TDD**: test trước, code sau, refactor sau.
- **No `any`** ở file mới hoặc đã refactor.
- **Storybook?** không bắt buộc trong các phase này, chỉ thêm khi user yêu cầu.
- **Performance**: `react-window` cho list ≥ 200 dòng.
- **i18n**: tiếng Việt là default, giữ string trong component (chưa làm i18n đầy
  đủ — đề xuất Phase 6 nếu user cần).

---

## 7. Rủi ro

| Rủi ro | Xử lý |
| --- | --- |
| Refactor stores có thể vỡ tests legacy (vd `OrgAdminConsole.test.tsx`) | Mỗi phase chạy lại full test; nếu vỡ → fix ngay trong phase đó. |
| Số lượng PR lớn | Mỗi phase = 1 PR, có DoD rõ → user có thể merge từng đợt. |
| `GroupDetail.test.tsx` đang treo | Fix ở Phase 1 (mock React.lazy + Suspense). |
| Schema chưa đầy đủ (action_items, glossaries...) | Block ở Section 4 cho user duyệt. |

---

## 8. Tổng kết một dòng

> **Mỗi phase ship 1 PR vào `m`, đều theo TDD; sau Phase 5 chỉ cần đổi 1 cờ
> `VITE_USE_MOCK=false` là FE chạy được với BE thật.**
