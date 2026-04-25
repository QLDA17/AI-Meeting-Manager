# PLAN — FE Schema Alignment + Action Layer (FE-first, TDD, MockData)

> Mục tiêu: **Đồng bộ FE với CSDL canonical (MySQL 8.0+) đã chốt**, đồng thời
> chuẩn hoá tầng truy cập dữ liệu (**Action Layer**) để khi BE sẵn sàng chỉ cần
> thay đổi 1 file (mock ↔ HTTP) là chạy được. Toàn bộ thay đổi đi theo **TDD**:
> *Red → Green → Refactor*. Hiện tại **chỉ chạy FE**, mọi dữ liệu là **mock**.

Tham chiếu CSDL: schema do user cung cấp (file này: `database/canonical_schema.sql`).
Tham chiếu UI: `docs/FE_IMPLEMENTATION_PLAN_v2.md`, `docs/UI_REDESIGN_PLAN_v2.md`,
`docs/ROLES_AND_PERMISSIONS_v2.md`.

---

## 0. Quy ước chung

- **TDD bắt buộc**: viết test fail trước, code đến khi pass, refactor sau.
  `npm test -- --run` là cổng xanh. Không commit khi test đỏ.
- **Mock-first**: mọi action gọi qua `services/actions/*` — phía sau là in-memory
  store (mock-store) hôm nay, sẽ swap sang `axios` khi BE bật.
- **Schema-first**: kiểu dữ liệu trong `frontend/src/types/db.ts` phản ánh **đúng**
  cột DB (snake_case). Layer `frontend/src/types/index.ts` (camelCase) là
  *view-model* để UI tiêu thụ. Mapper ở `frontend/src/lib/mappers/`.
- **No `any`**: lint phải sạch ở các file mới. File legacy gắn TODO.
- **Không xoá** các API/file cũ trong khi UI vẫn dùng — bọc qua adapter.

---

## 1. Bản đồ ánh xạ (DB ↔ FE)

| DB table              | FE entity (camelCase)        | Trạng thái        | Ghi chú |
| --------------------- | ---------------------------- | ----------------- | ------- |
| `users`               | `User`                        | ⚠ Lệch tên trường | DB: `username/full_name/role(admin\|manager\|staff)`. FE đang dùng `firstName/lastName/systemRole(5-tier)`. **Giữ FE 5-tier** + thêm `username`, `fullName`, `role` legacy phía DB; mapper hai chiều. |
| `organizations`       | `Organization`                | ✅ OK              | thêm `domain`, `settings(JSON)`. |
| `user_organizations`  | `OrgUser`                     | ✅ OK              | DB role: `owner/admin/member`; FE đang dùng `org-admin/member/viewer`. Mapper map `owner→org-admin`. |
| `projects`            | `Group` (alias)               | ⚠ Đổi tên         | UI/UX gọi là *Group*, DB là *project*. Giữ `Group` ở UI, thêm alias `Project = Group`, mapper xử lý `organization_id ↔ orgId`, `created_by ↔ createdBy`. |
| `meetings`            | `Meeting`                     | ⚠ Bổ sung field   | thêm `meetingType`, `scheduledStart/End`, `actualStart/End`, `location`, `sourceFileName/Path`, `llmSource`. |
| `meeting_participants`| `MeetingParticipant` (mới)    | ❌ Chưa có         | tạo type + mock + action. |
| `audio_files`         | `AudioFile` (mới)             | ❌                 | |
| `transcripts`         | `Transcript` (mới)            | ❌                 | |
| `transcript_segments` | `TranscriptSegment`           | ⚠ Bổ sung         | hiện đã có; thêm `speakerLabel`, `wordsJson`, `confidence`. |
| `meeting_summaries`   | `MeetingSummary` (mới)        | ❌                 | tách ra khỏi `Meeting`. |
| `action_items`        | `ActionItem`                  | ⚠ Bổ sung         | thêm `assigneeUserId`, `createdBy`, `priority`, `status`, `dueDate(date)`. |
| `ai_quality_metrics`  | `AIQualityMetric` (mới)       | ❌                 | |
| `ai_cost_logs`        | `AICostLog` (mới)             | ❌                 | |
| `chat_messages`       | `ChatMessage` (mới)           | ❌                 | |
| `export_files`        | `ExportFile` (mới)            | ❌                 | |
| `notifications`       | `Notification` (mới)          | ❌                 | đã có store, thêm type chuẩn. |
| `api_usage_logs`      | `ApiUsageLog` (mới)           | ❌                 | |
| `glossary_terms`      | `GlossaryTerm` (mới)          | ❌                 | |
| `settings`            | `Setting` (mới)               | ❌                 | |

---

## 2. Kiến trúc Action Layer (Mock-first → BE-ready)

```
frontend/src/
├── types/
│   ├── db.ts                    # snake_case, mirror DB schema
│   └── index.ts                 # camelCase view-models (UI tiêu thụ)
├── lib/
│   ├── mappers/                 # toView / toDb cho từng entity
│   │   ├── userMapper.ts
│   │   ├── meetingMapper.ts
│   │   └── ...
│   └── mockStore/               # in-memory CRUD store (singleton)
│       ├── store.ts             # Map<table, Map<id, row>>
│       ├── seed.ts              # nạp từ data/*.ts
│       └── delay.ts             # simulate latency
└── services/
    ├── actions/                 # ★ ACTION LAYER — UI chỉ gọi vào đây
    │   ├── userActions.ts       # listUsers, getUser, createUser, ...
    │   ├── orgActions.ts
    │   ├── projectActions.ts    # alias group
    │   ├── meetingActions.ts
    │   ├── participantActions.ts
    │   ├── transcriptActions.ts
    │   ├── summaryActions.ts
    │   ├── actionItemActions.ts
    │   ├── chatActions.ts
    │   ├── notificationActions.ts
    │   ├── glossaryActions.ts
    │   ├── exportActions.ts
    │   └── index.ts             # barrel
    ├── api.ts                   # axios (giữ nguyên, dùng khi BE bật)
    └── transport.ts             # ★ chuyển đổi mock ↔ http qua flag VITE_USE_MOCK
```

**Hợp đồng action**: mỗi action là một async function thuần
`(input) => Promise<ApiResponse<T>>`, ném lỗi qua `ApiResponse.error`. Không
component nào được import trực tiếp `data/*` hay `mockStore/*` — chỉ qua actions.

---

## 3. Các Phase

### Phase 0 — Hạ tầng (PR #1, **đang làm**)
- [x] Fix `tailwind.config.js` ESM (`require` → `import`).
- [x] Viết `PLAN.md` (file này).
- [x] Sao lưu canonical schema vào `database/canonical_schema.sql`.
- [x] Tạo skills `.gemini/skills/`: `tdd-workflow`, `action-layer-architect`,
      `mock-data-architect`, `db-schema-alignment`.
- [x] Tạo khung `types/db.ts`, `lib/mockStore/`, `services/actions/`,
      `services/transport.ts`.
- [x] **TDD**: smoke test cho `mockStore` (CRUD generic) + 1 action (`userActions`).

**Tiêu chí xong**: `npm run build` xanh; `npm test --run` xanh; lint không thêm
error mới.

### Phase 1 — Đồng bộ schema cốt lõi (PR #2)
- [ ] `types/db.ts`: users, organizations, user_organizations, projects, meetings.
- [ ] Mapper hai chiều (toView/toDb) + test property-based bằng `fast-check`.
- [ ] Cập nhật `data/*.ts` → seed `mockStore`.
- [ ] Actions: `userActions`, `orgActions`, `projectActions`, `meetingActions`.
- [ ] Refactor pages đang import `data/*` → dùng actions (qua hook
      `useQuery`/`useMutation`).
- [ ] Test TDD cho từng action (unit) + integration cho 1 page (Dashboard).

### Phase 2 — Meeting subsystem (PR #3)
- [ ] Types + mocks + actions cho: `meeting_participants`, `audio_files`,
      `transcripts`, `transcript_segments`, `meeting_summaries`.
- [ ] `MeetingDetail.tsx` ăn từ `meetingActions.getDetail()` (gộp các bảng con).
- [ ] State machine cho `Meeting.status` (`queued → processing → completed/failed`).

### Phase 3 — Action Items + Notifications + Chat (PR #4)
- [ ] `actionItemActions`: list/filter theo meeting/assignee/status.
- [ ] `notificationActions` + thay `notificationStore` thành thin wrapper.
- [ ] `chatActions`: gửi message vào `chat_messages` (mock LLM trả lời sau 1s).

### Phase 4 — AI/Cost/Quality + Glossary + Export (PR #5)
- [ ] `aiCostLogActions`, `aiQualityMetricActions` (chỉ list/aggregate).
- [ ] `glossaryActions` (đã có UI), `exportActions`, `apiUsageLogActions`.
- [ ] Trang Analytics đọc qua các actions này.

### Phase 5 — Sẵn sàng BE (PR #6)
- [ ] Implement `services/transport.ts` HTTP mode: cờ `VITE_USE_MOCK=false`.
- [ ] Mỗi action có 2 nhánh: `if (USE_MOCK) → mockStore else → api.<verb>(...)`.
- [ ] Khoá hợp đồng API: tạo `docs/API_CONTRACT.md` từ chữ ký action.

---

## 4. Quy trình TDD áp dụng cho mỗi action

1. Viết `*.test.ts` mô tả input/output kỳ vọng, mock-store seed sạch trong
   `beforeEach`.
2. Chạy `npm test -- <file>` → phải đỏ.
3. Implement action tối thiểu để xanh.
4. Refactor: tách helper, đảm bảo type chặt, không `any`.
5. Cập nhật `docs/API_CONTRACT.md` (chỉ ở Phase ≥ 1).

---

## 5. Định nghĩa Done của PR Phase 0 (PR này)

- `npm run build` xanh.
- `npm test -- --run` xanh (gồm test mới của `mockStore` & `userActions`).
- `npm run lint` không thêm error mới so với baseline.
- Có file `PLAN.md` (file này), `database/canonical_schema.sql`,
  `.gemini/skills/{tdd-workflow,action-layer-architect,mock-data-architect,db-schema-alignment}/SKILL.md`.
- Khung thư mục `types/db.ts`, `lib/mockStore/`, `services/actions/`,
  `services/transport.ts` đã có và được test smoke.

---

## 6. Rủi ro & xử lý

| Rủi ro | Xử lý |
| ------ | ----- |
| Pages cũ import trực tiếp `data/*` rất nhiều | Phase 0 không xoá `data/*`; Phase 1 mới refactor dần. |
| Lint legacy đang đỏ 154 lỗi | Không sửa lint legacy trong PR #1; chỉ đảm bảo file mới sạch. |
| Test `GroupDetail.test.tsx` treo (đã quan sát) | Không chặn Phase 0; ghi note ở `PLAN.md`, fix ở Phase 1 (`vi.mock` Suspense). |
| Conflict 5-tier role ↔ DB role 3-tier | Ánh xạ ở `userMapper`: `owner/admin/member` ↔ `system-admin/org-admin/group-admin/member/viewer`. |
