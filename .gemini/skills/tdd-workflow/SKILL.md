---
name: tdd-workflow
description: Quy trình TDD bắt buộc cho dự án MUTI_AI. Mọi tính năng, action, mapper hoặc bug-fix đều phải đi qua chu trình Red → Green → Refactor. Skill này định nghĩa thứ tự các bước, lệnh chạy test, và checklist Definition-of-Done.
---

# TDD Workflow — MUTI_AI

> **Nguyên tắc 1:** KHÔNG viết bất kỳ code chức năng nào nếu chưa có test ở trạng
> thái RED. **Nguyên tắc 2:** mỗi PR phải đi kèm ít nhất 1 test mới.

## Chu trình Red → Green → Refactor

1. **RED — viết test trước**
   - Tạo file `*.test.ts(x)` cạnh module sẽ implement (hoặc trong `__tests__/`).
   - Mô tả 1 hành vi cụ thể bằng `it('should ...', ...)`.
   - Test phải **fail** với lý do đúng (không phải vì lỗi import).
   - Lệnh: `npm test -- <path/to/file.test.ts>`.

2. **GREEN — code tối thiểu để pass**
   - Chỉ viết đủ code để test xanh. Không thêm tính năng phụ.
   - Không sửa test để hợp với code (trừ khi test sai, và phải nói rõ lý do
     trong commit).

3. **REFACTOR**
   - Tách helper, đặt tên rõ, loại bỏ trùng lặp.
   - Đảm bảo `npm run lint` không thêm error mới.
   - Re-run test sau mỗi lần refactor lớn.

## Lệnh chuẩn

```bash
# Watch mode (development):
cd frontend && npm run test:watch

# CI mode (must be green before commit):
cd frontend && npm test -- --run

# Lint:
cd frontend && npm run lint

# Build:
cd frontend && npm run build
```

## Cấu trúc test ưu tiên

```
src/
├── lib/mockStore/store.ts
├── lib/mockStore/store.test.ts        # ← unit
├── services/actions/userActions.ts
├── services/actions/userActions.test.ts
└── pages/Dashboard.tsx
    └── pages/Dashboard.test.tsx        # ← integration (Testing Library)
```

## Mocking guidelines

- `vi.mock('../path')` đặt **trước** `import` của module under test (Vitest hoist).
- Khi test component lazy-loaded, **luôn** wrap bằng `<Suspense fallback>` hoặc
  mock `React.lazy` để tránh treo (đã thấy ở `GroupDetail.test.tsx`).
- Reset mock ở `beforeEach` để tránh leak giữa các test.

## Property-based testing

- Cho mappers (toView/toDb), dùng `fast-check` để fuzz: `fc.assert(fc.property(...))`.
- Bất biến cần kiểm: `toView(toDb(view)) ≡ view` cho mọi input hợp lệ.

## Definition of Done (mỗi feature/PR)

- [ ] Tất cả test mới + cũ xanh ở `npm test -- --run`.
- [ ] `npm run lint` không có error mới ở file đã chạm.
- [ ] `npm run build` xanh.
- [ ] Không có `any`, `@ts-ignore` mới mà không có comment giải thích.
- [ ] PR mô tả rõ test case nào cover hành vi nào.

## Anti-patterns (cấm)

- Viết code trước rồi mới viết test.
- `it.skip` để cho qua.
- Test phụ thuộc thứ tự (mỗi test phải seed lại `mockStore`).
- Mock cả module under test.
