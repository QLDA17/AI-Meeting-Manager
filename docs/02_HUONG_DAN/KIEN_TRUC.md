# 🚀 Hướng Dẫn Dự Án MultiMinutes AI

## 📋 Tổng quan

MultiMinutes AI là hệ thống quản lý nội dung cuộc họp thông minh, biến các cuộc thảo luận thô thành:
- **Bản ghi đáng tin cậy** (Trusted transcript)
- **Quyết định có cấu trúc** (Structured decisions)  
- **Nhiệm vụ có thể hành động** (Actionable tasks)
- **Hồ sơ hoạt động có thể kiểm toán** (Auditable records)

### 🎯 Sứ mệnh cốt lõi
- Giảm 80% công sức ghi biên bản thủ công
- Bảo tồn trí nhớ tổ chức
- Thực thi trách nhiệm (ai nói gì, ai chịu trách nhiệm gì, khi nào)

---

## 🏗️ Kiến trúc hệ thống

### 🔄 Pipeline xử lý 9 bước
```
1. Audio vào → Backend Audio Agent (noise cancel, buffer 30s)
2. Whisper STT → Full transcript + timestamps  
3. Diarization → Gán nhãn Speaker_1, Speaker_2, Speaker_N
4. Spellcheck → Soát lỗi chính tả, chuẩn hóa tên riêng
5. Dịch thuật → Inject Glossary → GPT-4o-mini batch 500 tokens
6. Tóm tắt → JSON: key_points/decisions/action_items
7. NLP Evaluation → Tính BLEU/Rouge-L → lưu chỉ số chất lượng
8. Cost Tracking → Log token/cost_usd → kiểm tra ngưỡng $2/tháng
9. Dashboard + Export → Render UI → xuất PDF/DOCX
```

### 🏛️ Kiến trúc đa tầng
- **Backend:** FastAPI (Python) + REST API + WebSocket
- **Frontend:** React 18 + TypeScript + TailwindCSS
- **AI Stack:** Google Gemini + OpenAI Whisper + Pyannote.audio
- **Database:** MySQL + Redis + Vector DB (tùy chọn)
- **DevOps:** Docker + GitHub Actions + Deploy: Vercel/Render

---

## 👥 Phân quyền hệ thống

### 🔑 **ADMIN - Quản trị viên**
- Toàn quyền hệ thống, thiên về vận hành
- Quản lý người dùng: xem, tìm kiếm, mở/khoá tài khoản
- Giám sát bảo mật: lịch sử đăng nhập, phát hiện bất thường
- Kiểm soát chi phí vận hành, hiển thị báo cáo

### 👔 **MANAGER - Cán bộ quản lý**  
- Điều phối trong phạm vi nhóm/dự án
- Quản trị nhân sự: mời thành viên, xóa thành viên, thay đổi quyền
- Vận hành cuộc họp: tạo mới, chỉnh sửa, xóa phiên họp
- Phê duyệt báo cáo và phân công nhiệm vụ

### 👤 **STAFF - Nhân viên**
- Ghi âm & Upload file âm thanh để AI xử lý
- Xem transcript, bản dịch và tóm tắt cuộc họp
- Theo dõi và cập nhật trạng thái Action Items được giao

---

## 📊 Cấu trúc dữ liệu cuộc họp

```json
{
  "meeting_id": "uuid-string",
  "transcript": "full_text_content",
  "speakers": ["Speaker_1", "Speaker_2", "Speaker_N"],
  "key_points": ["point1", "point2", ...],
  "decisions": ["decision1", "decision2", ...],
  "action_items": [
    {
      "task": "task_description",
      "owner": "person_name", 
      "deadline": "YYYY-MM-DD or null"
    }
  ]
}
```

---

## 🎯 Product Backlog (510 PBI)

### 📦 **6 Nhóm chức năng (85 PBI mỗi nhóm)**

| Nhóm | Tên nhóm | Phạm vi | Ưu tiên Cao | Trung bình | Thấp | Tổng |
|------|----------|---------|-------------|------------|------|------|
| G1 | Quản trị người dùng | Đăng nhập, phân quyền, quản lý tài khoản | 34 | 34 | 17 | 85 |
| G2 | Ghi âm & STT | Real-time recording, Whisper STT, noise cancellation | 34 | 34 | 17 | 85 |
| G3 | Lõi AI (Dịch & Tóm tắt) | 15 agents, dịch 5 ngôn ngữ, tóm tắt, Glossary | 34 | 34 | 17 | 85 |
| G4 | Dashboard Web | React transcript, WebSocket, audio sync, search | 34 | 34 | 17 | 85 |
| G5 | Xuất báo cáo | PDF, DOCX, email notification, chuẩn doanh nghiệp | 34 | 34 | 17 | 85 |
| G6 | Bảo mật & Kiểm thử | CI/CD, Unit Test, Integration Test, OWASP audit | 34 | 34 | 17 | 85 |

---

## 🏁 Milestones quan trọng

| Milestone | Tuần | Yêu cầu đạt được |
|-----------|------|------------------|
| **Milestone 1** | Tuần 3 | CrewAI 15 agents hoạt động · Diarization DER < 15% · BLEU ≥ 0.65 |
| **Milestone 2** | Tuần 7 | Dashboard Beta · Xuất PDF/DOCX · Ghi họp nội bộ thành công |
| **Milestone 3** | Tuần 10 | Demo live không crash · Đủ 3 biên bản thực tế · Release v1.0.0 |

---

## 🛠️ Môi trường phát triển

### 📦 **Backend Dependencies**
```bash
pip install fastapi uvicorn openai openai-whisper pyannote.audio
pip install python-dotenv requests torch numpy transformers
pip install accelerate jiwer google-generativeai google-genai
```

### 🌐 **Frontend Dependencies**
```bash
npm install react react-dom react-router-dom
npm install axios lucide-react tailwindcss
npm install @types/react @types/react-dom typescript
```

### 🔧 **Environment Variables (.env)**
```bash
OPENAI_API_KEY=...         # Hard limit $2/tháng trên OpenAI dashboard
GOOGLE_API_KEY=...        # Google Gemini API key
HUGGINGFACE_TOKEN=...     # Download pyannote.audio model
LLM_PROVIDER=openai       # openai|google
STT_FORCE_MOCK=false      # true|false
COST_HARD_LIMIT=2.0       # USD/tháng
APP_ENV=development       # development|production
```

---

## 🚀 Quick Start

### 1️⃣ **Khởi động Backend**
```bash
# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env với API keys của bạn

# Start server
python src/api/main.py
# Hoặc: uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2️⃣ **Khởi động Frontend**
```bash
cd frontend
npm install
npm run dev
```

### 3️⃣ **Truy cập ứng dụng**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 🔐 **Demo Credentials**
- Username: `admin`, `manager`, hoặc `staff`
- Password: Bất kỳ mật khẩu nào

---

## 📋 API Endpoints

### 🔐 **Authentication**
- `POST /api/auth/login` - Mock authentication

### 📝 **Meetings**
- `GET /api/meetings` - Danh sách cuộc họp
- `GET /api/meetings/{id}` - Chi tiết cuộc họp
- `POST /api/upload` - Upload audio file
- `GET /api/jobs/{job_id}` - Kiểm tra trạng thái xử lý

### 📊 **Analytics**
- `GET /api/dashboard/stats` - Thống kê dashboard
- `GET /api/analytics/meetings` - Phân tích cuộc họp

### 💬 **Chat**
- `POST /api/meetings/{id}/chat` - Chat với nội dung cuộc họp

### 📄 **Export**
- `GET /api/meetings/{id}/export/pdf` - Xuất PDF
- `GET /api/meetings/{id}/export/docx` - Xuất Word

---

## 🧪 Testing & Quality

### 📏 **Chất lượng đầu ra**
- **DER (Diarization Error Rate)** < 15%
- **BLEU score dịch thuật** ≥ 0.65
- **WER (Word Error Rate)** < 10%
- **Cost logging accuracy** < 0.1% sai số

### 🔄 **Testing Commands**
```bash
# Backend tests
python -m pytest -q

# Frontend tests
cd frontend && npm test

# Regression tests
python scripts/run_regression.py

# Benchmark STT
python scripts/benchmark_stt.py
```

---

## 🔒 Bảo mật & Ràng buộc

- **Bảo vệ API keys** - KHÔNG commit lên GitHub
- **Mã hóa file âm thanh** - Đảm bảo quyền riêng tư
- **Giới hạn chi phí** - ~$2/tháng (hard limit)
- **Kiểm tra bảo mật** - OWASP Top 10 compliance
- **SQL injection prevention** - Parameterized queries

---

## 📈 Định hướng phát triển

### 🚀 **Tương lai gần**
- **Real-time AI assistant** hỗ trợ trong lúc họp
- **Voice command query** - Tra cứu bằng giọng nói
- **Tích hợp Jira/Notion** - Đồng bộ Action Items tự động

### 🎯 **Tương lai xa**
- **Advanced Semantic Search** - Tìm kiếm theo ý nghĩa
- **Multi-language real-time translation** - Dịch thuật real-time
- **Meeting sentiment analysis** - Phân tích cảm xúc cuộc họp

---

## 📞 Hỗ trợ & Liên hệ

- **Documentation:** `/docs` folder
- **Issues:** GitHub Issues
- **Team:** MultiMinutes AI Development Team

---

*MultiMinutes AI - Biến cuộc họp thành tri thức số* 🚀

*Cập nhật lần cuối: 08/04/2026*
