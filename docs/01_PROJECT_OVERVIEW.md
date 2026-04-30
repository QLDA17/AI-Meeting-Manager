# 📋 TỔNG QUAN DỰ ÁN MULTIMINUTES AI

---

## 🎯 TỔNG QUAN
**MultiMinutes AI** là hệ thống quản lý nội dung cuộc họp thông minh, tích hợp AI để tự động hóa việc ghi biên bản, tóm tắt và quản lý công việc.
- **Mục tiêu:** Giảm 80% công sức ghi chép thủ công.
- **Chức năng chính:** STT, Phân tách người nói, Tóm tắt AI, Quản lý Action Items, Xuất báo cáo.

---

## 🏗️ KIẾN TRÚC HỆ THỐNG (v2)

### 1. Mô hình Phân cấp
`System → Organization → Group → Meeting`
- **Multi-org:** Hỗ trợ nhiều tổ chức trên cùng một hệ thống.
- **Isolation:** Dữ liệu được cách ly hoàn toàn giữa các tổ chức và nhóm.

### 2. Tech Stack
| Lớp | Công nghệ |
|-----|-----------|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 |
| **AI Services** | Google Gemini (LLM), OpenAI Whisper (STT), Pyannote (Diarization) |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Zustand |
| **Database** | MySQL (Metadata), Redis (Caching) |
| **DevOps** | Docker, Docker Compose, GitHub Actions |

---

## 📁 CẤU TRÚC THƯ MỤC CHÍNH

```bash
MUTI_AI/
├── src/ api/ models.py, crud/, main.py     # Backend
├── frontend/ src/ pages/, components/      # Frontend
├── docs/                                   # Tài liệu (3 file chính)
├── database/                               # SQL Schemas
├── tests/                                  # TDD Test suite
└── scripts/                                # Công cụ hỗ trợ
```

---

## 🚀 LỆNH CHẠY NHANH (QUICK REFERENCE)

### Backend
```bash
# Cài đặt
pip install -r requirements.txt
# Chạy server
python src/api/main.py
```
- API Docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- URL: `http://localhost:5173`

### Testing
```bash
pytest tests/test_crud/ -v
```

---

## 📅 TRẠNG THÁI DỰ ÁN
- **Giai đoạn:** Phase 2 Frontend (Organization & Group UI).
- **Tiến độ:** ~60% Milestone 2.
- **Mục tiêu:** Release v1.0.0 tại Tuần 10.

---
**Last Updated:** 2026-04-28
