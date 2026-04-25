---
name: action-layer-architect
description: Chuẩn thiết kế và mở rộng tầng "Action Layer" của FE MUTI_AI. Mỗi action là async function thuần, mock-first qua mockStore, sẵn sàng swap sang HTTP qua services/transport.ts. UI tuyệt đối KHÔNG import data/* hay mockStore/* trực tiếp.
---

# Action Layer Architect — MUTI_AI

## Mục tiêu

Tầng `services/actions/*` là **biên giới duy nhất** giữa UI (components/pages/hooks)
và nguồn dữ liệu. Hôm nay nguồn là mock in-memory; ngày mai là HTTP. UI không
biết và không cần biết.

## Quy ước hợp đồng

Mỗi action có chữ ký:

```ts
export async function <verb><Entity>(input?: <Input>): Promise<ApiResponse<<Output>>>
```

- `verb` ∈ { `list`, `get`, `create`, `update`, `delete`, `count`, `search` }.
- `ApiResponse<T>` từ `types/index.ts`:
  ```ts
  { success: boolean; data?: T; error?: string; statusCode: number }
  ```
- **Không throw** — luôn trả `ApiResponse`. Lỗi nghiệp vụ → `success:false`,
  `statusCode` 4xx; lỗi hạ tầng → 5xx.
- **Tham số snake_case-friendly**: input mô phỏng query params, không nhúng
  Date object — dùng ISO string ở biên (UI hook tự `new Date(...)`).

## Cấu trúc thư mục

```
services/actions/
├── userActions.ts
├── orgActions.ts
├── projectActions.ts          # alias group
├── meetingActions.ts
├── participantActions.ts
├── transcriptActions.ts
├── summaryActions.ts
├── actionItemActions.ts
├── chatActions.ts
├── notificationActions.ts
├── glossaryActions.ts
├── exportActions.ts
└── index.ts                    # barrel: export * from each
```

## Mẫu chuẩn (template)

```ts
// services/actions/userActions.ts
import type { User, ApiResponse, PaginatedResponse } from '../../types';
import { transport } from '../transport';
import { toUserView } from '../../lib/mappers/userMapper';

export interface ListUsersInput {
  orgId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function listUsers(
  input: ListUsersInput = {},
): Promise<ApiResponse<PaginatedResponse<User>>> {
  return transport.run('users.list', input, (rows) => {
    const filtered = rows.filter((r) =>
      input.search ? (r.full_name ?? '').toLowerCase().includes(input.search.toLowerCase()) : true,
    );
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize).map(toUserView),
      total: filtered.length,
      page,
      pageSize,
      hasMore: start + pageSize < filtered.length,
    };
  });
}

export async function getUser(id: string): Promise<ApiResponse<User>> {
  return transport.runOne('users.get', { id }, toUserView);
}
```

## `services/transport.ts` — switch mock ↔ http

```ts
import { mockStore } from '../lib/mockStore/store';
const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export const transport = {
  async run<TRow, TOut>(
    op: string,
    input: unknown,
    mockHandler: (rows: TRow[], input: unknown) => TOut,
  ): Promise<ApiResponse<TOut>> {
    if (USE_MOCK) {
      const table = op.split('.')[0];           // e.g. "users"
      const rows = mockStore.list<TRow>(table);
      const data = mockHandler(rows, input);
      return { success: true, data, statusCode: 200 };
    }
    // HTTP branch (Phase 5):
    // const res = await api.post(`/rpc/${op}`, input); ...
    throw new Error('HTTP transport not enabled yet');
  },
  async runOne<TRow, TOut>(...): Promise<ApiResponse<TOut>> { /* analogous */ }
};
```

## Quy tắc bắt buộc

1. **UI không import** `data/*`, `lib/mockStore/*`, `axios` trực tiếp.
2. **Components dùng React Query**: `useQuery({ queryKey:['users',input], queryFn: () => listUsers(input) })`.
3. Mỗi action phải có **test TDD** trong file kề bên: seed mockStore → gọi
   action → assert.
4. Khi thêm cột mới ở DB schema, cập nhật **theo thứ tự**: `types/db.ts` →
   mapper → mock seed → action → test → UI.
5. Đặt tên op `<table>.<verb>` để dễ map ra HTTP route khi BE bật.

## Khi nào tạo action mới?

- Component cần dữ liệu mới → kiểm tra action tương ứng đã có chưa.
- Có hành vi *không phải CRUD thuần*? Đặt tên động từ rõ:
  `meetingActions.startProcessing(id)`, `chatActions.askLLM(meetingId, question)`.
