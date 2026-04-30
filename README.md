# 🚀 MultiMinutes AI - Hệ thống Ghi Biên Bản Cuộc Họp bằng AI

> Tự động hóa việc ghi biên bản cuộc họp bằng AI - Giảm 80% thời gian từ **2-3 giờ** xuống **15-30 phút**

![Status](https://img.shields.io/badge/Status-Beta-yellow) ![Version](https://img.shields.io/badge/Version-1.0-blue) ![Python](https://img.shields.io/badge/Python-3.11+-green) ![React](https://img.shields.io/badge/React-18+-blue)

---

## 📋 Tổng Quan

MultiMinutes AI là nền tảng quản lý nội dung cuộc họp thông minh, tích hợp các công nghệ AI tiên tiến để:

- 🎙️ **Chuyển đổi giọng nói** → Văn bản (Whisper STT)
- 👥 **Phân tách người nói** → Gán nhãn speaker (Pyannote Diarization)
- 🌍 **Dịch thuật tự động** → Tiếng Anh, Nhật (Google Gemini)
- 📊 **Tóm tắt nội dung** → Key Points, Decisions, Action Items
- 💬 **Chat AI** → Hỏi đáp về cuộc họp (Gemini LLM)
- 📄 **Xuất báo cáo** → PDF/DOCX chuyên nghiệp
- 📈 **Theo dõi chi phí** → Budget alerts & analytics

**Mục tiêu:** Phục vụ các tổ chức cần quản lý hiệu quả nội dung cuộc họp và bảo tồn tri thức tập thể.

---

## 📚 Tài Liệu & Hướng Dẫn

**👉 [Xem Bản Đồ Tài Liệu Đầy Đủ →](./docs/INDEX.md)**

Tài liệu dự án được tổ chức thành 5 chuyên mục:

| Chuyên Mục | Mô Tả | Dành Cho |
|-----------|-------|----------|
| 🚀 **[01_KHOI_DUNG](./docs/01_KHOI_DUNG/)** | Bắt đầu nhanh, lệnh cơ bản | 🆕 Người mới |
| 🔧 **[02_HUONG_DAN](./docs/02_HUONG_DAN/)** | Kiến trúc, quy tắc phát triển | 👨‍💻 Developer |
| 📅 **[03_QUAN_LY_DU_AN](./docs/03_QUAN_LY_DU_AN/)** | Tiến độ, kế hoạch, báo cáo | 👨‍💼 Manager |
| 🚢 **[04_DEVOPS](./docs/04_DEVOPS/)** | Triển khai, biên giao sản phẩm | 🔧 DevOps |
| ✅ **[05_TESTING](./docs/05_TESTING/)** | Kiểm tra, công việc tiếp theo | 🧪 QA |

**Nhanh:** [`QUICK_REFERENCE.md`](./docs/01_KHOI_DUNG/QUICK_REFERENCE.md) - Chỉ cần 5 lệnh!

---

## 🏗️ Kiến Trúc Hệ Thống

### 📁 Cấu Trúc Thư Mục (Sạch & Gọn)

```
MUTI_AI/
│
├── 📄 README.md                    # Tài liệu chính (file này)
├── 📄 TOM_TAT_DU_AN.md             # Tóm tắt chi tiết dự án
├── 📄 requirements.txt             # Dependencies Python
├── 📄 .env.example                 # Template environment variables
├── 📄 docker-compose.yml           # Docker Compose configuration
├── 📄 Dockerfile                   # Docker image definition
├── 📄 nginx.conf                   # Nginx web server config
├── 📄 package.json                 # Node.js dependencies
│
├── 📁 src/                         # Backend (Python FastAPI)
│   ├── api/
│   │   ├── main.py                 # FastAPI app entry
│   │   ├── auth.py                 # Authentication endpoints
│   │   ├── chat.py                 # Chat endpoints
│   │   └── meetings.py             # Meeting CRUD
│   ├── providers/                  # AI adapters
│   │   ├── google.py               # Google Gemini
│   │   ├── openai.py               # OpenAI Whisper
│   │   └── anthropic.py            # Fallback providers
│   ├── stt/                        # Speech-to-Text
│   ├── diarization/                # Speaker separation
│   ├── translation/                # Multi-language
│   ├── crewai/                     # AI Agents (15 agents)
│   ├── cost/                       # Cost tracking & alerts
│   └── __init__.py
│
├── 📁 frontend/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── App.tsx                 # Main app component
│   │   ├── main.tsx                # Vite entry point
│   │   ├── pages/
│   │   │   ├── Login.tsx           # Login page
│   │   │   ├── Dashboard.tsx       # Main dashboard
│   │   │   ├── MeetingDetail.tsx   # Meeting detail view
│   │   │   ├── Analytics.tsx       # Analytics page
│   │   │   └── ...
│   │   ├── components/             # Reusable UI components
│   │   │   ├── UploadModal.tsx
│   │   │   ├── ChatComponent.tsx
│   │   │   └── ...
│   │   ├── services/               # API call services
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── context/                # Global context (Auth)
│   │   ├── stores/                 # State management
│   │   └── styles/                 # Global styles
│   ├── public/                     # Static assets
│   ├── package.json                # Frontend dependencies
│   ├── vite.config.ts              # Vite bundler config
│   ├── tsconfig.json               # TypeScript config
│   └── tailwind.config.js          # Tailwind CSS config
│
├── 📁 docs/                        # Project documentation
│   ├── KE_HOACH_TONG_QUAN.md      # Overall plan & timeline
│   ├── TIEN_DO_HIEN_TAI.md        # Current progress status
│   ├── HUONG_DAN_DU_AN.md         # Project guide & architecture
│   ├── THONGTINDUAN.md            # Business info & goals
│   ├── MOBILE_RESPONSIVE.md        # Mobile UI guidelines
│   ├── QUY_TAC_THUC_HIEN.md       # Implementation rules
│   ├── BANG_GHI_CHUYEN_GIAO.md    # Handoff documentation
│   ├── BAO_CAO_TIEN_DO.md         # Progress report
│   └── NHAT_KY_LAM_VIEC.md        # Work log details
│
├── 📁 config/                      # Configuration files
│   └── agents/
│       └── agent_config.yaml       # CrewAI 15-agent setup
│
├── 📁 data/                        # Data & datasets
│   ├── ab_test_dataset.jsonl       # A/B test data
│   ├── meetings.json               # Sample meeting data
│   └── uploads/                    # Audio file uploads directory
│
├── 📁 database/                    # Database schemas
│   ├── mysql_schema.sql            # MySQL schema
│   └── schema.sql                  # SQL schema
│
├── 📁 scripts/                     # Utility scripts
│   ├── init_mysql.py               # Initialize MySQL database
│   ├── seed_db.py                  # Seed database with test data
│   ├── benchmark_stt.py            # Benchmark STT performance
│   ├── run_r3_06_smoke.py         # Smoke test suite
│   ├── run_r3_08_google_smoke.py  # Google Gemini tests
│   ├── run_r3_09_hardened_smoke.py # Security tests
│   ├── run_r3_10_openai_smoke.py  # OpenAI integration tests
│   ├── train_ai_prompts.py        # Train/optimize prompts
│   └── test_pipeline.py            # End-to-end pipeline test
│
├── 📁 tests/                       # Unit & integration tests
│   ├── test_alert_service.py       # Alert system tests
│   ├── test_cost_api.py            # Cost tracking tests
│   ├── test_cost_logger.py         # Cost logger unit tests
│   ├── test_diarization_metrics.py # Diarization DER tests
│   ├── test_provider_failover.py   # Fallover mechanism tests
│   ├── test_routing.py             # AI routing tests
│   ├── test_security.py            # Security validation tests
│   ├── test_stt_service.py         # STT quality tests
│   └── test_translation_service.py # Translation BLEU tests
│
└── 📁 logs/                        # Application logs (gitignored)
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | FastAPI + Python 3.11+ | REST API, async processing |
| **Frontend** | React 18 + TypeScript | Responsive UI |
| **Build** | Vite | Ultra-fast bundling |
| **Styling** | TailwindCSS | Utility-first CSS |
| **AI/ML** | Google Gemini | LLM for chat & summarization |
| | OpenAI Whisper | Speech-to-Text (STT) |
| | Pyannote.audio | Speaker diarization |
| | CrewAI | Multi-agent orchestration (15 agents) |
| **Database** | MySQL | Persistent metadata storage |
| | Redis | Caching layer |
| **DevOps** | Docker | Containerization |
| | Docker Compose | Multi-service orchestration |
| **Web Server** | Nginx | Reverse proxy & load balancing |

---

## 🚀 Cách Cài Đặt & Chạy

### **Prerequisites**
- Python 3.11+
- Node.js 18+
- MySQL 8.0+
- Docker & Docker Compose (optional)
- API Keys: Google Gemini, OpenAI

### **1️⃣ Backend Setup**

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Setup environment variables
cp .env.example .env
# Edit .env and add your API keys:
#   GOOGLE_API_KEY=xxx
#   OPENAI_API_KEY=xxx
#   DATABASE_URL=mysql+pymysql://user:pass@localhost/multiminutes

# 4. Initialize database
python scripts/init_mysql.py

# 5. Start backend server
python src/api/main.py
```

✅ Backend runs at: **http://localhost:8000**  
📚 API Documentation: **http://localhost:8000/docs**  
🏥 Health Check: **http://localhost:8000/health**

### **2️⃣ Frontend Setup**

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start development server
npm run dev
```

✅ Frontend runs at: **http://localhost:5173**

### **3️⃣ Demo Login**

Use any of these test accounts (password can be anything):
```
Username: admin     (Full system access)
Username: manager   (Team management)
Username: staff     (Basic user access)
```

---

## 📦 Using Docker (Optional)

### **Run All Services with Docker Compose**

```bash
# 1. Build Docker images
docker-compose build

# 2. Start all services
docker-compose up -d

# Services will be available at:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
# API Docs:  http://localhost:8000/docs
# MySQL:     localhost:3306
# Redis:     localhost:6379
```

### **Stop Services**
```bash
docker-compose down
```

---

## 🎯 Tính Năng Chính

### **📊 Dashboard**
- Thống kê cuộc họp, chi phí, AI performance
- Model health monitoring (Admin)
- Quick action buttons

### **🎤 Upload Meeting**
- Upload audio file (.wav, .mp3, max 50MB)
- Real-time processing status
- Progress tracking badges

### **📝 View Transcript**
- Full text with timestamps
- Speaker labels and colors
- AI-powered summary:
  - 🎯 **Key Points** - Những điểm chính
  - ✅ **Decisions** - Các quyết định
  - 📋 **Action Items** - Công việc cần làm

### **💬 Chat with Meeting**
- Ask questions about meeting content
- Semantic search across transcript
- Powered by Google Gemini
- Response with source citations

### **📈 Analytics**
- Meeting trends over time
- Provider distribution (Live vs Fallback)
- Topic analysis
- Cost tracking

### **📄 Export Reports**
- PDF professional layout
- DOCX for Microsoft Word
- Email delivery support
- File size optimization

### **🔐 Access Control**
- **Admin**: Full system, cost monitoring
- **Manager**: Team management, approvals
- **Staff**: View meetings, update tasks

---

## 📊 System Architecture

### **Processing Pipeline (9 Steps)**

```
1. 🎙️  Audio Input
   └─→ Receive audio file from user

2. 📝 Speech-to-Text (Whisper)
   └─→ Convert audio to text + timestamps

3. 👥 Speaker Diarization (Pyannote)
   └─→ Label speakers: Speaker_1, Speaker_2, ...

4. ✏️  Spell Check & Normalization
   └─→ Fix typos, normalize proper nouns

5. 🌍 Translation (Google Gemini)
   └─→ Translate to English, Japanese

6. 📊 Summarization (Gemini LLM)
   └─→ Extract: Key Points, Decisions, Action Items

7. 📈 Quality Evaluation
   └─→ Calculate BLEU, ROUGE-L scores

8. 💰 Cost Tracking
   └─→ Log tokens used, calculate USD cost

9. 📄 Export & Dashboard
   └─→ Render UI, generate PDF/DOCX, send alerts
```

### **API Endpoints**

```
Authentication:
  POST   /api/auth/login              - User login

Meetings:
  GET    /api/meetings                - List all meetings
  GET    /api/meetings/{id}           - Get meeting details
  POST   /api/upload                  - Upload audio file
  GET    /api/jobs/{job_id}           - Check processing status
  DELETE /api/meetings/{id}           - Delete meeting

Chat:
  POST   /api/meetings/{id}/chat      - Chat with meeting content

Export:
  GET    /api/meetings/{id}/export/pdf   - Export as PDF
  GET    /api/meetings/{id}/export/docx  - Export as DOCX

Analytics:
  GET    /api/dashboard/stats         - Dashboard statistics
  GET    /api/analytics/meetings      - Meeting analytics
```

---

## 🧪 Testing

### **Run All Tests**
```bash
# Backend tests
pytest tests/

# Frontend tests
cd frontend && npm test

# Specific test file
pytest tests/test_cost_api.py -v
```

### **Run end-to-end pipeline test**
```bash
python scripts/test_pipeline.py
```

---

## 📈 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| **STT Accuracy** | 95%+ | ✅ Achieved |
| **Diarization DER** | < 15% | ✅ 12.3% |
| **Translation BLEU** | ≥ 0.65 | ✅ 0.72 |
| **Export Time** | < 30s | ✅ Achieved |
| **Processing Speed** | < 5 min/hour audio | ✅ Achieved |
| **Uptime Target** | 99.5% | 🔄 Monitoring |

---

## 🐛 Troubleshooting

### **Backend won't start**
```bash
# Check dependencies
pip install -r requirements.txt

# Check MySQL connection
mysql -u root -p -e "SELECT 1"

# View backend logs
tail -f logs/backend.log
```

### **Frontend build issues**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Docker issues**
```bash
# Remove old containers
docker-compose down -v

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 Documentation

Full detailed documentation available in `/docs/`:
- 📋 **KE_HOACH_TONG_QUAN.md** - Timeline & milestones
- 📊 **TIEN_DO_HIEN_TAI.md** - Current progress
- 🏗️ **HUONG_DAN_DU_AN.md** - Architecture guide
- 💼 **THONGTINDUAN.md** - Business information
- 📱 **MOBILE_RESPONSIVE.md** - Mobile guidelines
- 🔒 **QUY_TAC_THUC_HIEN.md** - Implementation rules

---

## 🎯 Milestones

| Milestone | Timeline | Status |
|-----------|----------|--------|
| **Milestone 1: AI Foundation** | Week 1-2 | ✅ Complete |
| **Milestone 2: Beta Dashboard** | Week 3-7 | 🔄 In Progress (60%) |
| **Milestone 3: Production Ready** | Week 8-10 | ⏳ Upcoming |
| **v1.0 Release & Live Demo** | Week 10 | 🎯 Target Date |

---

## 🤝 Contributing

Development follows Test-Driven Development (TDD):
1. Write failing test
2. Implement feature
3. Make test pass
4. Refactor code

---

## 📝 Environment Variables

```env
# Database
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/multiminutes

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
GOOGLE_API_KEY=your-google-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-key

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

## 📞 Support & Questions

- Check `/docs` for detailed documentation
- Review test files in `/tests` for usage examples
- Check API docs at `http://localhost:8000/docs` when running

---

## 📄 License

© 2026 MultiMinutes AI Team. All rights reserved.

---

**Last Updated:** 12/04/2026 | **Status:** 🟢 Active Development
