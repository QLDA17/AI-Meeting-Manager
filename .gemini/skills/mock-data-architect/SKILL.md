---
name: mock-data-architect
description: Chuẩn thiết kế dữ liệu mock cho FE MUTI_AI. Toàn bộ mock chảy qua mockStore (Map<table, Map<id,row>>) với row ở dạng snake_case mirror DB. Seed từ data/*.ts. Mọi action chỉ đọc/ghi qua mockStore — không mutate seed gốc.
---

# Mock Data Architect — MUTI_AI

## Triết lý

- **DB-shape**: row trong mockStore mirror **đúng** DB schema (snake_case,
  CHAR(36) UUID, DATETIME ISO string).
- **Singleton store**: 1 instance toàn app, sống trong tab; reset thủ công qua
  `mockStore.reset()` (dùng trong `beforeEach` của test).
- **Seed deterministic**: ID cố định (vd `user-001`) để snapshot test ổn định.
- **Latency mô phỏng**: `delay(80–250ms)` trong `transport.ts` để UI test loading.

## API mockStore

```ts
class MockStore {
  list<T>(table: string): T[];
  get<T>(table: string, id: string): T | undefined;
  create<T>(table: string, row: T): T;             // throws on duplicate id
  update<T>(table: string, id: string, patch: Partial<T>): T | undefined;
  remove(table: string, id: string): boolean;
  query<T>(table: string, predicate: (r: T) => boolean): T[];
  reset(): void;                                    // reload from seed
  seed(data: Record<string, unknown[]>): void;
}
```

## Cấu trúc seed

```
src/
├── data/                # ← seed nguồn (legacy, đang dùng)
│   ├── users.ts         # mockUsers in CAMELcase view-model
│   └── ...
└── lib/mockStore/
    ├── seed.ts          # convert mockUsers → users(snake_case rows) via mappers
    └── store.ts         # singleton + CRUD
```

`seed.ts` chạy 1 lần khi module load:

```ts
import { mockUsers } from '../../data/users';
import { toUserDb } from '../mappers/userMapper';
mockStore.seed({
  users: mockUsers.map(toUserDb),
  organizations: ...,
  projects: mockGroups.map(toProjectDb),
  meetings: ...,
});
```

## Quy tắc khi thêm bảng/cột mới

1. Cập nhật `database/canonical_schema.sql` (giữ nguyên CSDL gốc).
2. Thêm interface row vào `types/db.ts` (snake_case).
3. Thêm view-model vào `types/index.ts` (camelCase).
4. Viết mapper `lib/mappers/<entity>Mapper.ts`:
   - `toView(row): Entity`
   - `toDb(entity): Row`
   - Property-based test bằng `fast-check`: `toView(toDb(x)) ≡ x`.
5. Bổ sung seed vào `data/<entity>.ts` rồi map qua `seed.ts`.
6. Action tương ứng + test (xem skill `action-layer-architect`).

## Conventions cho ID & ngày

- ID: UUID string 36 ký tự cho production; mock dùng prefix `<table>-NNN`
  (vd `meeting-001`) để debug dễ.
- Ngày trong row: **ISO 8601 UTC** string (không Date object) — Date object chỉ
  xuất hiện ở view-model.
- Boolean DB: dùng `0/1` trong row (TINYINT(1)) để khớp dump SQL nếu cần.

## Cấm

- Sửa trực tiếp `mockUsers` trong test (mutate seed).
- Lưu trạng thái runtime trong `data/*.ts` (chỉ là seed, immutable).
- Bỏ qua mapper, đọc thẳng row vào UI.
