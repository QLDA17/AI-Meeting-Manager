# 🧠 MultiMinutes AI - Hệ Điều Hành & Điều Phối Agentic 🚀

Đây là file ghi nhớ vĩnh viễn các quy tắc vận hành và trạng thái dự án của Gemini CLI cho dự án MUTI_AI.

## 🛡️ Nguyên tắc Cốt lõi (Core Mandates)
1. **Ưu tiên TDD (Test-Driven Development)**: Tuyệt đối KHÔNG viết mã nguồn tính năng nếu chưa có bài kiểm thử ở trạng thái **RED** (thất bại). Mọi thay đổi phải đi qua chu trình: *Viết Test -> Chạy Test (Fail) -> Viết Code -> Chạy Test (Pass) -> Tối ưu (Refactor)*.
2. **Kỹ năng từ ECC**: Luôn áp dụng các tiêu chuẩn và mẫu code (Best Practices) từ `external_tools/everything-claude-code`.
3. **Điều phối Thông minh (Smart Orchestration)**: Tự động nạp chồng các Skill phù hợp với ngữ cảnh (FE, BE, AI, Security) mà không cần người dùng chỉ định lại.

## ⚙️ Ma trận Điều phối Kỹ năng (Skill Matrix)
| Ngữ cảnh | Skill phối hợp |
| :--- | :--- |
| **Backend (Python/FastAPI)** | `python-patterns` + `python-testing` + `security-review` |
| **Frontend (React/TS)** | `frontend-architect` + `tdd-workflow` + `action-layer-architect` |
| **Mock Data / Schema** | `mock-data-architect` + `db-schema-alignment` |
| **AI & Prompt (CrewAI)** | `ai-first-engineering` + `prompt-optimizer` |

> Skills mới (Phase 0 — FE Schema Alignment): xem `.gemini/skills/{tdd-workflow,action-layer-architect,mock-data-architect,db-schema-alignment}/SKILL.md`.
> Kế hoạch tổng thể: `PLANS/PLAN_FE_SCHEMA_ALIGNMENT.md`. CSDL canonical: `database/canonical_schema.sql`.

## 📊 Trạng thái Dự án & Nhiệm vụ Hiện tại
- **Giai đoạn hiện tại**: Phase 2 Frontend (Organization & Group UI).
- **Thành tựu vừa đạt được**: 
    - Triển khai thành công hệ thống Lịch (Calendar) và Kho kiến thức (Glossary).
    - Hoàn thành `CreateGroupModal.tsx` theo chuẩn TDD và tích hợp vào Sidebar.
- **Nhiệm vụ tiếp theo**: 
    - Xây dựng trang **Chi tiết Nhóm (Group Detail)** với các Tab: *Cuộc họp, Thành viên, Cài đặt*.
    - Áp dụng TDD cho logic phân quyền hiển thị trong Group Detail.

## 📂 Tài liệu tham khảo quan trọng
- Kế hoạch tổng thể: `docs/FE_IMPLEMENTATION_PLAN_v2.md`
- Kế hoạch FE Schema Alignment (đang chạy): `PLANS/PLAN_FE_SCHEMA_ALIGNMENT.md`
- CSDL canonical: `database/canonical_schema.sql`
- Quy chuẩn code: `external_tools/everything-claude-code/.gemini/GEMINI.md`

---
*Ghi chú cho Gemini: Mỗi khi bắt đầu phiên làm việc, hãy đọc file này để khôi phục "bộ não" điều phối.*


