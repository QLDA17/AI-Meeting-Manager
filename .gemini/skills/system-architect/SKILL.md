---
name: system-architect
description: Chuyên gia thiết kế hệ thống backend (FastAPI), Cơ sở dữ liệu (SQLAlchemy) và Điều phối AI (CrewAI) cho dự án MUTI_AI. Ưu tiên tính ổn định, Clean Architecture và bảo mật.
---

# System Architect - MUTI_AI

Kỹ năng này hướng dẫn Gemini CLI thực hiện các thay đổi phức tạp ở tầng hệ thống của dự án MUTI_AI một cách nhất quán và an toàn.

## 🛠 Nguyên tắc cốt lõi

1.  **Stability First**: Luôn đảm bảo API ổn định trước khi tích hợp logic AI phức tạp.
2.  **Clean Architecture**: Tuân thủ luồng: `Model (DB)` -> `Schema (Pydantic)` -> `CRUD (Logic)` -> `Router (API)`.
3.  **UUID**: Tất cả Primary Keys trong Database phải sử dụng UUID v4 (String 36).
4.  **Type Safety**: Sử dụng Type Hints cho tất cả các hàm và biến.

## 🚀 Workflow: Thêm Tính năng Backend mới

Khi được yêu cầu thêm một tính năng backend (ví dụ: Quản lý Template báo cáo), hãy thực hiện theo thứ tự sau:

### Bước 1: Cấu trúc Database (src/api/models.py)
- Thêm Class mới kế thừa `Base`.
- Sử dụng `generate_uuid` làm mặc định cho ID.
- Đảm bảo có `created_at` và `updated_at`.

### Bước 2: Pydantic Schemas (Thường nằm trong file router hoặc file riêng)
- Tạo schema `Base`, `Create`, và `Out`.
- Đảm bảo `Out` schema có `from_attributes = True` (trước đây là `orm_mode`).

### Bước 3: Logic nghiệp vụ (src/api/crud.py)
- Viết các hàm tương tác với DB (create, get, update, delete).
- Luôn nhận `db: Session` làm tham số.

### Bước 4: API Endpoint (src/api/routers/...)
- Tạo router mới hoặc thêm vào router hiện có.
- Sử dụng Dependency Injection cho `db` và `current_user`.
- Đăng ký router trong `src/api/main.py`.

## 🤖 Workflow: Cấu hình CrewAI Agent

Khi cần thêm một Agent mới cho quy trình xử lý AI:

1.  **Config**: Cập nhật `config/agents/agent_config.yaml` với `role`, `goal`, và `backstory`.
2.  **Tools**: Nếu cần tool mới, thêm vào `src/crewai/tools.py`.
3.  **Agent Class**: Cập nhật `src/crewai/agents.py` để khởi tạo agent với tool tương ứng.
4.  **Orchestrator**: Cập nhật `src/crewai/orchestrator.py` để đưa agent vào quy trình xử lý.

## 📂 Tài liệu tham khảo
- [FastAPI Patterns](references/fastapi-patterns.md): Mẫu code router và dependency.
- [Database Standards](references/database-standards.md): Quy chuẩn về schema và migration.
- [CrewAI Integration](references/crewai-integration.md): Cách tích hợp Agent vào pipeline.
