# ⚙️ KẾ HOẠCH PHÁT TRIỂN BACKEND (v2)

---

## 🚀 TỔNG KẾT MIGRATION V2 (BIG BANG)
Backend đã hoàn thành việc đồng bộ hóa với **MySQL Schema V2**.
- **SQLAlchemy 2.0:** Sử dụng `Mapped` types.
- **Modular CRUD:** Tách thành các package `src/api/crud/`.
- **Pydantic v2:** Schemas chuẩn hóa cho 15 entities.

---

## 🔐 HỆ THỐNG PHÂN QUYỀN (5 CẤP)

| Role | Phạm vi | Quyền hạn chính |
|------|---------|-----------------|
| **System Admin** | Toàn hệ thống | Quản lý Org, User, Global Billing, System Settings. |
| **Org Admin** | Một Tổ chức | Quản lý Group, User trong Org, Org Billing. |
| **Group Admin** | Một Nhóm | Quản lý Member, Meeting, Action Items trong Group. |
| **Member** | Một Nhóm | Upload audio, Tạo meeting, Xem tóm tắt, Chat AI. |
| **Viewer** | Một Nhóm | Chỉ xem (Read-only) nội dung cuộc họp. |

**Qui tắc cốt lõi:**
- Người tạo Org → Org Admin.
- Người tạo Group → Group Admin.
- Cách ly dữ liệu tuyệt đối giữa các Org (403 Forbidden nếu truy cập sai scope).

---

## 🏗️ LỘ TRÌNH PHÁT TRIỂN (ROADMAP)

### 1. Refactor Core Models (✅ DONE)
- Ánh xạ 1:1 với `mysql_schema.sql`.
- Relationship (Many-to-Many cho User_Organizations).

### 2. Tầng CRUD & Schemas (✅ DONE)
- Tách file theo module: `user`, `org`, `meeting`, `ai_data`, `system`.
- Validation dữ liệu đầu vào bằng Pydantic & Zod.

### 3. CrewAI & AI Pipeline (🔄 ĐANG TỐI ƯU)
- Tích hợp 15 Agents xử lý song song.
- Lưu trữ kết quả phân mảnh (Segments) để hỗ trợ tìm kiếm ngữ nghĩa.
- Theo dõi chi phí (Cost Tracking) chi tiết đến từng Token.

### 4. Security Hardening (⏳ SẮP TỚI)
- Input Sanitization cho Chat & Upload.
- Rate Limiting per Org/User.
- CORS Configuration cho Production.

---

## ✅ KẾ HOẠCH KIỂM THỬ (TDD)
- **Unit Tests:** `tests/test_crud/` (37/37 passed).
- **Integration Tests:** `tests/test_api/` (Auth, Meetings).
- **Smoke Tests:** Kiểm tra pipeline AI từ đầu đến cuối.

---
**File quan trọng:** `src/api/models.py`, `database/mysql_schema.sql`
**Cập nhật:** 2026-04-28
