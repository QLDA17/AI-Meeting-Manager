# 📋 TÓM TẮT DỰ ÁN MULTIMINUTES AI

---

## 🎯 **TỔNG QUAN DỰ ÁN**

**MultiMinutes AI** là một hệ thống quản lý nội dung cuộc họp thông minh, tích hợp công nghệ AI hiện đại để:
- Tự động chuyển đổi giọng nói sang văn bản (Speech-to-Text)
- Phân tách danh tính người nói (Speaker Diarization)
- Dịch thuật tự động sang nhiều ngôn ngữ
- Tóm tắt và trích xuất quyết định/hành động
- Xuất báo cáo PDF/DOCX chuyên nghiệp

**Mục đích:** Giảm 80% công sức ghi biên bản thủ công từ 2-3 giờ xuống 15-30 phút.

---

## 📊 **THÔNG TIN CĂN BẢN**

| Tiêu chỉ | Chi tiết |
|---------|---------|
| **Tên dự án** | MultiMinutes AI |
| **Phiên bản** | v1.0 (Beta) |
| **Trạng thái** | 🟢 Milestone 2 - 60% hoàn thành |
| **Thời gian dự trù** | 10 tuần (231 giờ) |
| **Ngày Demo cuối** | Tuần 10 |
| **Tổng Tasks** | 33 tasks |

---

## 🏗️ **KIẾN TRÚC HỆ THỐNG**

### **1. Backend (Python FastAPI)**
```
src/
├── api/
│   ├── main.py              # Entry point
│   ├── auth.py              # Authentication
│   ├── chat.py              # Chat endpoints
│   └── ...
├── providers/               # AI adapters
│   ├── google.py            # Google Gemini
│   ├── openai.py            # OpenAI Whisper
│   └── anthropic.py
├── stt/                     # Speech-to-Text
├── diarization/             # Speaker separation
├── translation/             # Multi-language support
├── crewai/                  # AI Agents orchestration
└── cost/                    # Cost tracking
```

**Chính năng:**
- REST API endpoints cho upload, chat, export
- Google Gemini AI tích hợp
- Xử lý bất đồng bộ (Async/Background Tasks)
- Logging chi phí và budget alerts
- Preflight health checks

---

### **2. Frontend (React 18 + TypeScript)**
```
frontend/src/
├── pages/
│   ├── Login.tsx            # Đăng nhập
│   ├── Dashboard.tsx        # Bảng điều khiển
│   ├── MeetingDetail.tsx    # Chi tiết cuộc họp
│   ├── Analytics.tsx        # Thống kê
│   └── ...
├── components/              # UI components
│   ├── UploadModal.tsx
│   ├── ChatComponent.tsx
│   └── ...
├── services/                # API calls
├── hooks/                   # Custom hooks
├── context/                 # Auth context
└── stores/                  # State management
```

**Giao diện:**
- Dashboard với statistics
- Upload audio file
- Real-time transcript viewing
- Chat với nội dung cuộc họp
- Meeting analytics
- Export PDF/DOCX

---

### **3. Pipeline Xử Lý (9 Bước)**

```
1. 🎙️  Audio Input        → Backend nhận file
2. 📝  STT (Whisper)       → Chuyển thành văn bản + timestamps
3. 👥  Diarization         → Gán nhãn Speaker_1, Speaker_2, ...
4. ✏️  Spellcheck          → Soát lỗi chính tả, chuẩn hóa tên riêng
5. 🌍  Translation         → Dịch sang tiếng Anh/Nhật
6. 📊  Summarization       → Trích xuất Key Points, Decisions, Action Items
7. 📈  NLP Evaluation      → Tính BLEU/ROUGE scores
8. 💰  Cost Tracking       → Log token & chi phí
9. 📄  Export              → Render UI, xuất PDF/DOCX
```

---

## 🛠️ **TECH STACK**

| Lớp | Công nghệ | Mô tả |
|-----|-----------|-------|
| **Backend** | Python 3.11+ | Ngôn ngữ chính |
| | FastAPI | REST API framework |
| | Google Gemini | AI LLM cho chat & tóm tắt |
| | OpenAI Whisper | Speech-to-Text |
| | Pyannote.audio | Speaker diarization |
| **Frontend** | React 18 | UI framework |
| | TypeScript | Type safety |
| | Vite | Build tool (siêu nhanh) |
| | TailwindCSS | Styling |
| | Lucide React | Icons |
| | Axios | HTTP client |
| **Database** | MySQL | Metadata & content |
| | Redis | Caching |
| **DevOps** | Docker | Containerization |
| | Docker Compose | Multi-container orchestration |
| | GitHub Actions | CI/CD |
| **Deployment** | Render/Vercel | Cloud hosting |

---

## 📋 **CÁC TÍNH NĂNG CHÍNH**

### **1. Dashboard 📊**
- Thống kê tổng quát: số cuộc họp, chi phí, hiệu suất
- Model health monitoring (Admin only)
- Quick actions: New Recording, View Meetings

### **2. Upload & Processing 📤**
- Upload audio file (.wav, .mp3, max 50MB)
- Real-time processing status tracking
- Polling job status
- Progress badges

### **3. Viewing Meeting 📝**
- Full transcript với timestamps
- Speaker labels (Speaker_1, Speaker_2, ...)
- AI-powered summary:
  - **Key Points**: Những điểm chính
  - **Decisions**: Các quyết định
  - **Action Items**: Công việc cần làm

### **4. Chat Interface 💬**
- Hỏi đáp về nội dung cuộc họp
- Semantic search trong transcript
- Powered by Google Gemini
- Source attribution với confidence scores

### **5. Analytics 📈**
- Meeting trends over time
- Provider distribution (Whisper/Fallback)
- Action item tracking
- Topic analysis

### **6. Export & Reports 📄**
- PDF export với formatting chuẩn
- DOCX export cho Word
- Professional report layout
- File size < 5MB

### **7. Role-based Access Control 🔐**
- **Admin**: Toàn quyền hệ thống, giám sát chi phí
- **Manager**: Quản lý team, duyệt báo cáo
- **Staff**: Xem meeting, update tasks

---

## ✅ **HOÀN THÀNH (Milestone 1 & 2)**

### **Backend Foundation**
- ✅ Google Gemini adapter tích hợp
- ✅ Whisper STT hoạt động ổn định
- ✅ Pyannote diarization (DER < 15%)
- ✅ Translation service (BLEU ≥ 0.72)
- ✅ Cost tracking & budget alerts
- ✅ CrewAI 15 agents orchestration
- ✅ Email/webhook alert channels
- ✅ Production hardening

### **Frontend Development**
- ✅ Login UI với CSS đúng
- ✅ Dashboard layout
- ✅ Upload modal & real-time status
- ✅ Meeting list & detail view
- ✅ Transcript viewer
- ✅ Chat component
- ✅ Analytics dashboards
- ✅ Export buttons

### **Infrastructure**
- ✅ FastAPI backend
- ✅ React frontend
- ✅ Docker & docker-compose
- ✅ File upload validation
- ✅ Real-time polling
- ✅ Mock authentication

---

## 🔄 **ĐANG THỰC HIỆN (In Progress)**

### **R4-06: Export & Document Generation**
- 🔄 PDF export API endpoint
- 🔄 DOCX export API endpoint
- 🔄 Frontend export buttons
- 🔄 Progress tracking UI

### **R4-07: Data Persistence**
- 🔄 Repository pattern
- 🔄 JSON-based file storage
- 🔄 Meeting data persistence
- 🔄 Migration from in-memory data

### **R4-08: Security Hardening**
- ⏳ Input sanitization (Chat, Upload)
- ⏳ File type validation
- ⏳ Rate limiting
- ⏳ CORS configuration

---

## ⏳ **SẮP TỚI (Upcoming - Milestone 3)**

### **R5-01: Production Deployment**
- Docker containerization
- Environment configuration
- Database setup (MySQL)
- Redis cache setup
- Load balancer configuration
- SSL/TLS setup

### **R5-02: Performance Optimization**
- Query optimization
- Cache strategies
- Frontend bundle size
- API response time

### **R5-03: Production Ready**
- Live demo không crash
- ≥ 3 biên bản thực tế
- Release v1.0.0
- Final documentation

---

## 🚀 **CÁCH CHẠY DỰ ÁN**

### **Backend (Terminal 1)**
```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI
pip install -r requirements.txt
python scripts/init_mysql.py
python src/api/main.py
```
🌐 Backend chạy tại: **http://localhost:8000**
📚 API Docs: **http://localhost:8000/docs**

### **Frontend (Terminal 2)**
```bash
cd frontend
npm install
npm run dev
```
🌐 Frontend chạy tại: **http://localhost:5173**

### **Đăng Nhập (Demo Credentials)**
- Username: `admin`, `manager`, hoặc `staff`
- Password: Bất kỳ mật khẩu nào

---

## 📁 **CẤU TRÚC THƯ MỤC**

```
MUTI_AI/
├── 📄 README.md                    # Main documentation
├── 📄 requirements.txt             # Python dependencies
├── 📄 .env.example                 # Environment template
│
├── 📁 src/                         # Backend code
│   ├── api/                        # FastAPI endpoints
│   ├── providers/                  # AI adapters
│   ├── stt/                        # Speech-to-Text
│   ├── diarization/                # Speaker separation
│   ├── translation/                # Multi-language
│   ├── crewai/                     # AI Agents
│   └── cost/                       # Cost tracking
│
├── 📁 frontend/                    # React frontend
│   ├── src/
│   │   ├── pages/                  # Page components
│   │   ├── components/             # UI components
│   │   ├── services/               # API calls
│   │   └── context/                # State
│   ├── package.json
│   └── vite.config.ts
│
├── 📁 docs/                        # Project documentation
│   ├── KE_HOACH_TONG_QUAN.md      # Overall plan
│   ├── TIEN_DO_HIEN_TAI.md        # Current progress
│   ├── HUONG_DAN_DU_AN.md         # Project guide
│   ├── THONGTINDUAN.md            # Project info
│   ├── QUY_TAC_THUC_HIEN.md       # Implementation rules
│   ├── NHAT_KY_LAM_VIEC.md        # Work log
│   └── ...
│
├── 📁 config/                      # Configuration
│   └── agents/
│       └── agent_config.yaml       # CrewAI config
│
├── 📁 data/                        # Data files
│   ├── ab_test_dataset.jsonl
│   ├── meetings.json
│   └── uploads/
│
├── 📁 database/                    # Database scripts
│   ├── mysql_schema.sql
│   └── schema.sql
│
├── 📁 tests/                       # Test files
│   ├── test_alert_service.py
│   ├── test_cost_api.py
│   ├── test_diarization_metrics.py
│   ├── test_provider_failover.py
│   ├── test_routing.py
│   ├── test_security.py
│   ├── test_stt_service.py
│   └── test_translation_service.py
│
└── 📁 scripts/                     # Helper scripts
    ├── benchmark_stt.py
    ├── init_mysql.py
    ├── run_r3_*.py
    └── test_pipeline.py
```

---

## 👥 **PHÂN QUYỀN HỆ THỐNG**

### **🔑 ADMIN - Quản trị viên**
- Toàn quyền hệ thống
- Quản lý người dùng (xem, tìm kiếm, khoá/mở tài khoản)
- Giám sát bảo mật, lịch sử đăng nhập
- Kiểm soát chi phí vận hành
- Xem báo cáo admin

### **👔 MANAGER - Cán bộ quản lý**
- Quản lý trong phạm vi nhóm/dự án
- Quản trị nhân sự (mời, xóa, thay đổi quyền)
- Vận hành cuộc họp (tạo, chỉnh sửa, xóa)
- Phê duyệt báo cáo
- Phân công nhiệm vụ

### **👤 STAFF - Nhân viên**
- Ghi âm & upload file âm thanh
- Xem transcript, bản dịch, tóm tắt
- Theo dõi & cập nhật action items
- Đọc báo cáo cuộc họp

---

## 📊 **CẤU TRÚC DỮ LIỆU CUỘC HỌP**

```json
{
  "meeting_id": "uuid-string",
  "title": "Meeting title",
  "date": "2026-04-12",
  "duration": 3600,
  "audio_file": "meetings/meeting_id.wav",
  "transcript": {
    "full_text": "...",
    "segments": [
      {
        "speaker": "Speaker_1",
        "text": "...",
        "start_time": 0,
        "end_time": 10
      }
    ]
  },
  "summary": {
    "key_points": ["point1", "point2"],
    "decisions": ["decision1", "decision2"],
    "action_items": [
      {
        "task": "task_description",
        "owner": "person_name",
        "deadline": "2026-04-20"
      }
    ]
  },
  "speakers": ["Speaker_1", "Speaker_2"],
  "translation": {
    "english": "...",
    "japanese": "..."
  },
  "quality_metrics": {
    "bleu_score": 0.72,
    "rouge_l": 0.68,
    "diarization_error_rate": 0.123
  },
  "cost": {
    "tokens_used": 2500,
    "cost_usd": 0.05
  }
}
```

---

## 🎯 **METRICS & KPI**

| Metric | Target | Achieved |
|--------|--------|----------|
| **STT Accuracy** | 95%+ | ✅ Achieved |
| **Diarization DER** | < 15% | ✅ 12.3% |
| **Translation BLEU** | ≥ 0.65 | ✅ 0.72 |
| **Export Time** | < 30s | ✅ Achieved |
| **Processing Speed** | < 5 min/hour | ✅ Achieved |
| **Cost/Month Budget** | < $200 | 🔄 Monitoring |
| **Live Demo Success** | 100% uptime | ⏳ Week 10 |

---

## ⚠️ **VẤN ĐỀ HIỆN TẠI**

| Vấn đề | Trạng thái | Giải pháp |
|--------|-----------|----------|
| Frontend npm dev server lỗi | 🔴 Minor | Dùng demo.html hoặc Python HTTP server |
| Export PDF/DOCX | 🟡 In Progress | Implement fpdf2/reportlab |
| Data persistence | 🟡 In Progress | Repository pattern + JSON storage |
| Security hardening | ⏳ Todo | Input validation, rate limiting |

---

## 📅 **TIMELINE & MILESTONES**

```
Tuần 1-2 (✅ DONE)   → Milestone 1: AI Foundation
  - CrewAI 15 agents
  - Diarization DER < 15%
  - Translation BLEU ≥ 0.65

Tuần 3-7 (🔄 IN PROGRESS) → Milestone 2: Beta Dashboard (60%)
  - Export PDF/DOCX
  - Data persistence
  - Security hardening
  - 3 internal meetings tested

Tuần 8-10 (⏳ UPCOMING) → Milestone 3: Production Ready
  - Live demo không crash
  - ≥ 3 real meeting records
  - Release v1.0.0
  - Final documentation
```

---

## 💡 **ĐIỂM NỔI BẬT**

✨ **Điểm mạnh:**
- Tích hợp đầy đủ AI/ML stack hiện đại
- UI/UX responsive và thân thiện
- Real-time processing với polling
- Cost tracking & budget alerts
- Đa ngôn ngữ (Tiếng Việt, Anh, Nhật)
- Role-based access control

🚀 **Công nghệ tiên tiến:**
- Google Gemini AI
- OpenAI Whisper
- Pyannote diarization
- FastAPI async
- React 18 hooks
- TailwindCSS styling

📊 **Impact:**
- Giảm 80% thời gian ghi biên bản
- Tăng độ chính xác lên 95%+
- Bảo tồn tri thức tổ chức
- Tự động hoá end-to-end

---

## 📞 **LIÊN HỆ & HỖ TRỢ**

**Backend Issues:**
```bash
python test_backend.py
curl http://localhost:8000/health
```

**Frontend Issues:**
```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
npm run build
```

**Database Issues:**
```bash
python scripts/init_mysql.py
mysql -u root -p multiminutes < database/mysql_schema.sql
```

---

**Cập nhật lần cuối:** 12/04/2026  
**Status:** 🟢 Đang tiến triển tốt - 60% Milestone 2 hoàn thành  
**Demo Target:** Tuần 10 - Live demo v1.0.0 (không crash!)

