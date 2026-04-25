---
name: db-schema-alignment
description: Hướng dẫn ánh xạ giữa CSDL canonical (MySQL 8.0+) và FE view-models của MUTI_AI. Mỗi khi schema DB thay đổi hoặc khi UI cần thêm cột mới, áp dụng skill này để cập nhật đồng bộ types/db.ts ↔ types/index.ts ↔ mappers ↔ seeds ↔ actions.
---

# DB Schema Alignment — MUTI_AI

## Nguồn sự thật

`database/canonical_schema.sql` — KHÔNG sửa file này nếu user chưa duyệt.
Mọi field trong file này phải xuất hiện ở FE (theo dạng phù hợp).

## Bản đồ tên trường

| DB column           | FE field        | Quy ước |
| ------------------- | --------------- | ------- |
| `snake_case`        | `camelCase`     | mapper chịu trách nhiệm |
| `CHAR(36)` (UUID)   | `string`        | giữ nguyên |
| `DATETIME`          | `Date` ở view-model, `string` ISO ở row |
| `TINYINT(1)`        | `boolean`       | `1↔true, 0↔false` |
| `JSON`              | đối tượng TS được khai báo type rõ |
| `ENUM('a','b')`     | union type `'a' \| 'b'` |

## Khác biệt cần xử lý

### 1. `users.role` (ENUM 3-tier) ↔ FE `systemRole` (5-tier)

DB có `admin/manager/staff`, FE có `system-admin/org-admin/group-admin/member/viewer`.

**Quyết định**: giữ FE 5-tier vì UI/UX bám vào nó. Mapper:

```ts
// userMapper.ts
const dbToFe: Record<UserRowRole, SystemRole> = {
  admin: 'system-admin',
  manager: 'org-admin',     // hoặc 'group-admin' tuỳ context
  staff: 'member',
};
const feToDb = invert(dbToFe, { default: 'staff' });
```

Khi context là group-admin/viewer (DB không phân biệt), khi `toDb` map về
`staff` và đính cờ tinh chỉnh ở `user_organizations.role` (`owner/admin/member`).

### 2. `projects` ↔ FE `Group`

UI gọi là **Group**, DB gọi là **project**. Trong code:

- `types/db.ts` định nghĩa `ProjectRow` (đúng tên DB).
- `types/index.ts` giữ `Group` (UI tiêu thụ).
- `lib/mappers/projectMapper.ts` chuyển hai chiều.
- `services/actions/projectActions.ts` là alias chính thức; có thể re-export
  dưới tên `groupActions` cho tương thích.

### 3. `meetings.duration` (VARCHAR) ↔ FE `Meeting.duration` (number minutes)

DB lưu chuỗi mềm (`'pending'`, `'90 min'`, ...). Mapper parse:

```ts
toDuration(s: string): number  // 'pending' → 0, '90 min' → 90, '01:30:00' → 90
toDurationStr(n: number): string
```

### 4. `meetings.date` (VARCHAR) vs `scheduled_start/end` (DATETIME)

Ưu tiên dùng `scheduled_start/scheduled_end` trong UI; `date` chỉ là display
fallback. View-model `Meeting.startTime/endTime` map từ
`scheduled_start/scheduled_end` (hoặc `actual_*` nếu meeting đã kết thúc).

### 5. Action items

DB có riêng bảng `action_items` (ngoài đoạn schema còn cắt). Khi nhận đầy đủ
schema, bổ sung field `priority`, `status('pending'|'in_progress'|'completed'|'cancelled')`,
`assignee_user_id`, `due_date(DATE)`, `created_by`. View-model giữ tên cũ
nhưng align type.

## Quy trình thay đổi schema

1. User đăng `canonical_schema.sql` mới → diff với bản hiện tại.
2. Cập nhật `types/db.ts` cho từng cột thay đổi.
3. Cập nhật mapper (toView/toDb) + property-based test.
4. Bổ sung seed nếu là cột not-null.
5. Cập nhật action signature nếu input/output thay đổi.
6. Chạy `npm test -- --run` → toàn bộ phải xanh trước khi commit.

## Checklist khi thêm bảng mới

- [ ] `types/db.ts`: interface `<Table>Row`.
- [ ] `types/index.ts`: view-model + barrel.
- [ ] `lib/mappers/<table>Mapper.ts`: toView + toDb + test.
- [ ] `data/<table>.ts`: seed array (camelCase view-model).
- [ ] `lib/mockStore/seed.ts`: nạp vào store.
- [ ] `services/actions/<table>Actions.ts`: list/get/create/update/delete + test.
- [ ] `PLANS/PLAN_FE_SCHEMA_ALIGNMENT.md`: tick mục tương ứng ở Section 1.
