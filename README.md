# 🚀 MultiMinutes AI

> **Codename: CONVIA** · Hệ thống biên bản cuộc họp AI cho tổ chức — STT tiếng Việt + AI summary + collaboration

![Status](https://img.shields.io/badge/Status-Beta-yellow)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![FastAPI](https://img.shields.io/badge/FastAPI-1.0--beta-009688)
![React](https://img.shields.io/badge/React-19.2-61DAFB)
![Vite](https://img.shields.io/badge/Vite-8-646CFF)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1)
![STT](https://img.shields.io/badge/STT-Deepgram%20Nova--3-blueviolet)
![LLM](https://img.shields.io/badge/LLM-Groq%20Router-orange)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

---

## 📋 Mục Lục

1. [Tổng quan](#-tổng-quan)
2. [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
3. [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
4. [Tech Stack](#️-tech-stack)
5. [Yêu cầu & Cài đặt nhanh](#-yêu-cầu--cài-đặt-nhanh)
6. [Biến môi trường](#-biến-môi-trường)
7. [Docker Compose](#-docker-compose)
8. [API Surface](#-api-surface-rest--websocket)
9. [Domain Models](#-domain-models-24-entities)
10. [Frontend Pages & Features](#-frontend-pages--features)
11. [AI Pipeline](#-ai-pipeline-thực-tế)
12. [Testing](#-testing)
13. [Troubleshooting](#-troubleshooting)
14. [Tài liệu & Roadmap](#-tài-liệu--roadmap)

---

## 🎯 Tổng Quan

**MultiMinutes AI** (codename **CONVIA**) là nền tảng quản lý cuộc họp và biên bản tự động cho tổ chức, hướng đến giảm thời gian xử lý nội dung họp từ **2-3 giờ** xuống **15-30 phút**.

### Tính năng chính

- 🏢 **Tổ chức nhiều cấp** — System Admin → Organization → Group → Member, RBAC 5 tầng.
- 🎙️ **STT tiếng Việt** — Deepgram Nova-3 (chính) qua `STT_PROVIDER=deepgram`, ViWhisper là adapter dự phòng (lazy load, có thể chạy mock khi `TRANSFORMERS_OFFLINE=true`).
- 🤖 **AI summary** — Toàn bộ pipeline (summary, transcript polish, context correction) gọi `RouterLLMAdapter` → **Groq** (`ROUTER_MODEL=qwen/qwen3-32b`). Code có sẵn adapter Google/OpenAI nhưng hiện không nằm trong pipeline runtime chính.
- ✅ **Action items** — Tự động trích xuất từ transcript, gán người phụ trách, theo dõi status.
- 📅 **Lịch & cuộc họp** — FullCalendar, lập lịch / mời / điểm danh / livestream STT qua WebSocket.
- 💬 **Chat & cộng tác** — Group chat, message pinning, reactions, reply thread.
- 🔔 **Notifications** — Phân loại Urgent / Today / Recent, broadcast cấp hệ thống và tổ chức.
- 📄 **Export** — PDF, DOCX, CSV; gửi email.
- 💰 **Cost tracking** — Theo dõi chi phí từng provider, alert ngưỡng tháng/ngày.
- 🛡️ **Audit log** — Mọi thay đổi cấu hình, role, prompt đều ghi log.
- 🧪 **Diagnostics** — Endpoint chẩn đoán chất lượng audio + STT confidence cho từng upload job.

> **Đối tượng**: Tổ chức cần quản trị nội dung họp tập trung, theo dõi action items qua nhiều team, và lưu giữ tri thức.

---

## 🏗 Kiến trúc hệ thống

```
                    ┌─────────────────────────────┐
                    │  Frontend (React 19 + Vite) │
                    │   - Pages / Features        │
                    │   - Zustand + React Query   │
                    └─────────────┬───────────────┘
                                  │  HTTP / WebSocket
                                  ▼
                    ┌─────────────────────────────┐
                    │  FastAPI Backend (CONVIA)   │
                    │  - 13 routers + middleware  │
                    │  - SQLAlchemy 2.x + Pydantic│
                    │  - lifespan + rate limit    │
                    │  - in-memory UPLOAD_JOB_QUEUE
                    └──┬───────────┬──────────────┘
                       │           │
              ┌────────┘           └────────────────────────────┐
              ▼                                                  ▼
       ┌─────────────┐                  ┌──────────────────────────────┐
       │  MySQL 8    │                  │  AI providers (qua adapter)  │
       │ (SQLite     │                  │   • Deepgram Nova-3  (STT)   │
       │  fallback)  │                  │   • Groq (qwen3-32b) LLM     │
       └─────────────┘                  │   • PhoBERT + BARTpho local  │
                                        │   • ViWhisper / Pyannote     │
                                        │     (offline / mock fallback)│
                                        └──────────────────────────────┘
```

**Trạng thái triển khai thực tế**:

- Backend chạy 1 instance uvicorn, MySQL local (port 3307 qua docker hoặc 3306 native), Nginx phục vụ frontend tĩnh.
- **Redis hiện CHƯA được dùng trong code** — `docker-compose.yml` có service Redis và `.env.example` có `REDIS_URL`, nhưng không có `import redis` nào trong `backend/src/`. Đây là dependency dự phòng cho Phase 3 STT overhaul (queue RQ).
- **Gemini / OpenAI**: adapter còn nguyên trong `providers/google_llm.py` và `providers/llm.py`, được tham chiếu từ `chat.py`, `translation/service.py`, `factory.py`. Pipeline production chính (summary, transcript post-process, context correction) đều route qua `RouterLLMAdapter` → endpoint Groq.
- **Pyannote**: cấu hình `HF_HUB_OFFLINE=true` + `TRANSFORMERS_OFFLINE=true` → chạy mock; chỉ kích hoạt khi tắt offline mode + có `HUGGINGFACE_TOKEN` hợp lệ.

---

## 📁 Cấu trúc thư mục

```
MUTI_AI/
├── README.md                       # File này
├── GEMINI.md                       # Quy tắc agentic / orchestration
├── TESTING_GUIDE.md                # Hướng dẫn test chi tiết
├── docker-compose.yml              # 5 service stack
├── nginx.conf                      # Reverse proxy FE + API
├── .env                            # Env runtime (gitignored nên rotate keys)
├── .gitignore
│
├── backend/                        # FastAPI service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example                # Template biến môi trường
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py             # Entry point (uvicorn target)
│   │   │   ├── app.py              # create_app() + middleware stack
│   │   │   ├── routes/             # 12 router (admin, meetings, stt, ...)
│   │   │   ├── core/               # Business logic (operations + support)
│   │   │   ├── models.py           # 24 SQLAlchemy entities
│   │   │   ├── schemas.py          # Pydantic v2 shapes
│   │   │   ├── database.py         # Engine + session factory
│   │   │   ├── export.py           # PDF / DOCX / CSV
│   │   │   ├── auth.py, chat.py, jobs.py, ...
│   │   │   └── middleware files
│   │   ├── providers/              # AI adapters
│   │   │   ├── deepgram.py         # STT chính (Nova-3)
│   │   │   ├── viwhisper.py        # STT fallback (NhutP/ViWhisper-small)
│   │   │   ├── router_llm.py       # OpenAI-compatible router (Groq mặc định)
│   │   │   ├── google_llm.py       # Google Gemini
│   │   │   ├── llm.py              # OpenAI direct
│   │   │   ├── diarization.py      # Pyannote wrapper
│   │   │   ├── nlp_eval.py         # BLEU / WER / ROUGE-L
│   │   │   ├── factory.py, errors.py
│   │   ├── cost/                   # Cost logger + alerts
│   │   ├── crewai/                 # Multi-agent orchestration
│   │   ├── diarization/            # Service wrapper
│   │   ├── nlp/                    # PhoBERT, BARTpho, dialect classifier
│   │   ├── stt/                    # STT service abstraction
│   │   └── translation/            # Multi-language helper
│   ├── database/
│   │   └── mysql_schema.sql        # Schema MySQL 8 (init Docker)
│   ├── prompts/                    # Prompt templates
│   ├── data/, uploads/, logs/
│   ├── scripts/                    # Init DB, smoke runners, benchmarks
│   └── tests/                      # pytest suites (api, providers, stt, ...)
│
├── frontend/                       # React 19 + Vite
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx                # Entry
│   │   ├── App.tsx                 # Router + providers + route guards
│   │   ├── pages/                  # Trang theo URL (admin/, group/, meeting/, org/, profile/)
│   │   ├── features/               # admin, calendar, meeting, meeting-room, notifications
│   │   ├── components/             # layout, meeting, group, landing, ui
│   │   ├── services/               # axios api.ts + service modules
│   │   ├── stores/                 # Zustand
│   │   ├── context/                # AuthContext
│   │   ├── hooks/                  # useAuth, usePermission, useAudioRecorder, ...
│   │   ├── layouts/                # Layout + AdminLayout
│   │   └── utils/, types/, lib/, constants/, assets/
│   └── tests/                      # Vitest suites
│
├── docs/                           # Tài liệu kỹ thuật & worklog
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_FRONTEND_PLAN.md
│   ├── 03_BACKEND_PLAN.md
│   ├── 04_TEST_STRATEGY.md
│   ├── 05_E2E_SCENARIOS.md
│   ├── DEEPGRAM_QUICK_REFERENCE.md
│   ├── DEEPGRAM_VIETNAMESE_SETUP.md
│   └── WORKLOG_2026-05-25.md
│
├── PLANS/                          # Kế hoạch lớn
├── archive/                        # Script cũ / dump
├── external_tools/                 # ECC standards (everything-claude-code)
├── AUDIO/                          # Sample audio (gitignored)
└── logs/                           # Application logs (gitignored)
```

---

## ⚙️ Tech Stack

### Backend

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Web framework | **FastAPI** + Uvicorn | Async, OpenAPI tự động |
| ORM | **SQLAlchemy 2.x** | Async session + connection pool |
| Validation | **Pydantic v2** | Schema/contract |
| DB driver | PyMySQL + cryptography | MySQL chính, SQLite fallback |
| Auth | python-jose, passlib[bcrypt] | JWT + password hashing |
| Files | aiofiles, python-multipart | Upload async |
| Export | fpdf2, python-docx, jinja2 | PDF / DOCX / template |
| Real-time | websockets | STT streaming + meeting room |
| STT | **deepgram-sdk ≥ 3.0** | Nova-3 (chính) |
| ML local | torch, transformers, sentencepiece | ViWhisper + PhoBERT |
| Resilience | tenacity | Retry/backoff |

### Frontend

| Lớp | Công nghệ |
|---|---|
| Framework | **React 19.2** + React DOM 19.2 |
| Build | **Vite 8** + TypeScript 6 |
| Routing | React Router DOM 7 |
| Server state | TanStack React Query 5.62 |
| Client state | Zustand 5 |
| Forms | React Hook Form 7 + Zod 3 + @hookform/resolvers |
| Styling | Tailwind CSS 3.4 + @tailwindcss/forms + @tailwindcss/typography + tailwind-merge + clsx |
| Tables / lists | @tanstack/react-table 8, react-window 1.8 |
| Calendar | @fullcalendar/* 6.1 (daygrid, timegrid, interaction) |
| Audio | wavesurfer.js 7.8 |
| Charts | Recharts 2.15 |
| Animations | Framer Motion 11 |
| HTTP | Axios 1.14 |
| Misc | date-fns 4, lucide-react, react-hot-toast, qrcode.react, xlsx |
| Testing | Vitest 3, Testing Library, fast-check, jsdom |

### AI Providers — thực tế đang chạy

| Loại | Provider | Trạng thái runtime |
|---|---|---|
| **STT chính** | **Deepgram Nova-3** | ✅ Active. `STT_PROVIDER=deepgram`, `DEEPGRAM_MODEL=nova-3`, `DEEPGRAM_LANGUAGE=vi`. Có diarize, smart-format, paragraphs. Wire ở `providers/deepgram.py`, `core/stt_support.py`, `routes/stt.py`. |
| **LLM chính** | **Groq qua RouterLLMAdapter** | ✅ Active. `ROUTER_API_BASE_URL=https://api.groq.com/openai/v1`, `ROUTER_MODEL=qwen/qwen3-32b`. Dùng cho summary, transcript polish, context correction (`transcript_support.py`, `nlp/context_corrector.py`). |
| **NLP local (tiếng Việt)** | **PhoBERT (vinai/phobert-base-v2)** | ✅ Active. `PHOBERT_ENABLED=true`, `PHOBERT_LOAD_MODEL=true`. Dialect classifier + correction. |
| **NLP local (tiếng Việt)** | **BARTpho (vinai/bartpho-word-base)** | ✅ Active. `BARTPHO_ENABLED=true`, `BARTPHO_LOAD_MODEL=true`. Polish transcript finalize. |
| Agent orchestration | **CrewAI** | ✅ Có dùng — `api/jobs.py` import `MultiMinutesOrchestrator`. |
| STT fallback | ViWhisper (NhutP/ViWhisper-small) | ⚠️ Adapter có sẵn, lazy load; mặc định mock khi `TRANSFORMERS_OFFLINE=true`. |
| Diarization fallback | Pyannote.audio | ⚠️ Adapter có sẵn nhưng đang ở chế độ offline/mock; cần tắt offline + có `HUGGINGFACE_TOKEN` để dùng thật. Diarization production thực ra do Deepgram đảm nhiệm. |
| LLM adapter dự phòng | Google Gemini (`google_llm.py`) | ⚠️ Code còn, được tham chiếu từ `chat.py`, `translation/service.py`, `factory.py` — không nằm trong pipeline summary/STT runtime hiện tại. |
| LLM adapter dự phòng | OpenAI (`llm.py`) | ⚠️ Tương tự — adapter còn nhưng không có call chain runtime chính. |
| LLM adapter dự phòng | Anthropic | ⚠️ Chỉ có config flag (`ANTHROPIC_API_KEY`, validation trong `config.py`), chưa có adapter. |

### Storage & DevOps

| Service | Trạng thái |
|---|---|
| Database | **MySQL 8.0** (UTF8MB4) — chính. SQLite fallback khi `DATABASE_URL=sqlite:///...` |
| Cache | **Redis 7-alpine có trong `docker-compose.yml` nhưng app chưa connect** — không có `import redis` trong backend. Để dành cho Phase 3 STT overhaul (Redis/RQ queue). |
| Job queue | **In-memory** (`UPLOAD_JOB_QUEUE` trong `core/upload_jobs.py`) — sẽ mất khi restart backend. Phase 3 sẽ thay bằng Redis/RQ. |
| Container | Docker + Docker Compose |
| Reverse proxy | Nginx (alpine) |
| DB UI | phpMyAdmin (port 5050) |
| Audio system deps | ffmpeg, libsndfile1, portaudio19-dev |

---

## 🚀 Yêu cầu & Cài đặt nhanh

### Prerequisites

- **Python 3.11+** (test với 3.11)
- **Node.js 18+** (khuyến nghị 20+)
- **MySQL 8.0+** (hoặc dùng Docker)
- **ffmpeg + portaudio + libsndfile** (audio processing cho PhoBERT/BARTpho/ViWhisper)
- **API keys bắt buộc cho pipeline chạy thật**:
  - `DEEPGRAM_API_KEY` — STT
  - `GROQ_API_KEY` — LLM router (summary, context correction)
- **Optional**: `HUGGINGFACE_TOKEN` (chỉ cần nếu muốn Pyannote thật), `GOOGLE_API_KEY`/`OPENAI_API_KEY` (chỉ cần nếu bật module `chat.py` / `translation/service.py`)

### Option A — Docker Compose (nhanh nhất)

```bash
# 1. Sao chép env mẫu
cp backend/.env.example backend/.env
# Edit backend/.env — điền API keys + đảm bảo DATABASE_URL khớp docker-compose

# 2. Build & start all services
docker compose up -d

# 3. Kiểm tra
docker compose ps
docker compose logs -f backend
```

| Service | URL |
|---|---|
| Frontend (Nginx) | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |
| phpMyAdmin | http://localhost:5050 |
| MySQL | localhost:3307 (mapped từ 3306 container) |
| Redis | localhost:6379 |

### Option B — Local dev (backend uvicorn + frontend vite)

```bash
# ─── Backend ───
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # Sửa DATABASE_URL nếu cần
# Khởi tạo schema (lựa chọn 1: MySQL)
mysql -u root -p multiminutes < database/mysql_schema.sql
# Khởi tạo schema (lựa chọn 2: SQLite — set DATABASE_URL=sqlite:///./multiminutes.db trong .env)

uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# ─── Frontend ───
cd frontend
npm install
npm run dev                          # Vite dev server @ http://localhost:5173
```

### Option C — Hybrid (DB qua Docker, app local)

```bash
docker compose up -d db redis phpmyadmin   # Chỉ start DB stack
cd backend && uvicorn src.api.main:app --reload --port 8000
cd frontend && npm run dev
```

> 💡 **Mẹo**: Lần đầu cài torch + transformers có thể nặng (~2 GB). Nếu chỉ test Deepgram + Gemini, có thể bỏ qua PhoBERT/ViWhisper bằng cách set `PHOBERT_ENABLED=false` và không tải `VIWHISPER_MODEL_ID`.

---

## 🔐 Biến môi trường

Toàn bộ template ở `backend/.env.example`. Phân nhóm:

### Server

| Biến | Mặc định | Mô tả |
|---|---|---|
| `ENVIRONMENT` | development | `development` tắt rate limit |
| `DEBUG` | true | Bật trace/log chi tiết |
| `SECRET_KEY` | — | ≥ 32 ký tự trong production |
| `HOST` / `PORT` | 0.0.0.0 / 8000 | Bind uvicorn |
| `RELOAD` / `WORKERS` | true / 1 | Dev vs prod |
| `CORS_ORIGINS` | `*` | List origin |
| `CORS_CREDENTIALS` | true | |
| `REQUEST_TIMEOUT` | 300 | Giây |
| `MAX_UPLOAD_SIZE` | 52428800 | 50 MB |
| `RATE_LIMIT_RPM` / `RATE_LIMIT_WINDOW` | 100 / 60 | Chỉ áp dụng khi `ENVIRONMENT != development` |

### Database

| Biến | Ví dụ |
|---|---|
| `DATABASE_URL` | `mysql+pymysql://multiminutes:multiminutes_password@localhost:3306/multiminutes` |
| (SQLite fallback) | `sqlite:///./multiminutes.db` |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` / `DB_POOL_TIMEOUT` / `DB_POOL_RECYCLE` | 10 / 20 / 30 / 3600 |
| `DB_USE_SSL` / `DB_SSL_CA` | false / path/to/ca.pem |
| `DB_ECHO` | false |

### STT — Deepgram (bắt buộc)

| Biến | Giá trị thực tế trong `backend/.env` | Ghi chú |
|---|---|---|
| `STT_PROVIDER` | `deepgram` | Bắt buộc để route qua Deepgram |
| `DEEPGRAM_API_KEY` | — | Lấy ở https://console.deepgram.com/ |
| `DEEPGRAM_MODEL` | `nova-3` | |
| `DEEPGRAM_LANGUAGE` | `vi` | Tiếng Việt |
| `REALTIME_STT_MODE` | `deepgram_streaming` | Cho WS live STT |

### LLM — Router (Groq) (bắt buộc)

| Biến | Giá trị thực tế | Ghi chú |
|---|---|---|
| `GROQ_API_KEY` | — | https://console.groq.com/keys |
| `ROUTER_API_BASE_URL` | `https://api.groq.com/openai/v1` | OpenAI-compatible endpoint |
| `ROUTER_MODEL` | `qwen/qwen3-32b` | Model production hiện tại |
| `ROUTER_API_KEY` / `ROUTER_API_URL` | (rỗng) | Override nếu dùng provider khác |
| `ROUTER_TIMEOUT_SECONDS` | 60 | |
| `AI_TEMPERATURE` / `AI_MAX_RETRIES` | 0.2 / 3 | |

### LLM — Adapter dự phòng (không bắt buộc)

> Code còn nguyên adapter Google/OpenAI/Anthropic; có thể kích hoạt sau, nhưng hiện không nằm trong pipeline summary/STT runtime chính.

| Biến | Khi nào cần |
|---|---|
| `LLM_PROVIDER` | Mặc định `google` trong `.env` thực tế nhưng pipeline đi qua RouterLLMAdapter. Nếu muốn `factory.get_llm_adapter()` trả Google/OpenAI thì set tại đây. |
| `GOOGLE_API_KEY`, `GEMINI_MODEL` | Khi bật module `chat.py` hoặc `translation/service.py` với Gemini. |
| `OPENAI_API_KEY` | Khi muốn dùng `OpenAIAdapter` (qua `factory.py`). |
| `ANTHROPIC_API_KEY` | Hiện chưa có adapter Anthropic — chỉ là placeholder cho validation. |
| `WHISPER_MODEL` | Chỉ liên quan nếu cài Whisper local; pipeline thực không dùng. |

### NLP local — PhoBERT + BARTpho (tiếng Việt)

| Biến | Giá trị thực tế | Ghi chú |
|---|---|---|
| `PHOBERT_ENABLED` | `true` | Bật correction tiếng Việt |
| `PHOBERT_LOAD_MODEL` | `true` | Lazy load model |
| `PHOBERT_MODEL` | `vinai/phobert-base-v2` | |
| `PHOBERT_DEVICE` | `auto` | CPU/GPU |
| `PHOBERT_DIALECT_ENABLED` | `true` | Dialect classifier |
| `PHOBERT_MLM_CORRECTION_ENABLED` | `false` | Tắt mặc định (chậm) |
| `PHOBERT_MAX_LENGTH` | 256 | |
| `BARTPHO_ENABLED` | `true` | Bật transcript polish |
| `BARTPHO_LOAD_MODEL` | `true` | |
| `BARTPHO_MODEL` | `vinai/bartpho-word-base` | |
| `BARTPHO_DEVICE` | `auto` | |
| `BARTPHO_MAX_LENGTH` | 256 | |
| `HF_HUB_OFFLINE` / `TRANSFORMERS_OFFLINE` | `true` / `true` | Offline mode — cần pre-cache model trước khi chạy lần đầu |

### Diarization (optional)

| Biến | Ghi chú |
|---|---|
| `HUGGINGFACE_TOKEN` | Chỉ cần khi muốn Pyannote thật. Mặc định Pyannote ở chế độ mock vì offline. Diarization production do Deepgram đảm nhiệm. |

### Cost tracking

| Biến | Mặc định |
|---|---|
| `COST_TRACKING_ENABLED` | true |
| `COST_MONTHLY_LIMIT` | 10.0 (USD) |
| `COST_DAILY_LIMIT` | 1.0 |
| `COST_ALERT_THRESHOLD` | 0.8 |

### Optional services

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`, `FRONTEND_URL`
- ~~Redis: `REDIS_URL=redis://localhost:6379/0`~~ — biến có trong `.env.example` nhưng **code backend chưa connect tới Redis**. Bỏ qua được trong môi trường hiện tại; sẽ thành bắt buộc khi Phase 3 STT overhaul triển khai queue RQ.
- Logging: `LOG_LEVEL=INFO`, `LOG_FILE=logs/app.log`

> ⚠️ **Cảnh báo**: File `.env` ở root và `backend/.env` hiện chứa API key thực (Deepgram, Groq, HuggingFace, Google, OpenAI). **Rotate ngay** trước khi public hoặc đẩy lên CI.

---

## 🐳 Docker Compose

`docker-compose.yml` định nghĩa 5 service:

| Service | Container | Port host | Vai trò |
|---|---|---|---|
| `backend` | multiminutes-backend | 8000 | FastAPI uvicorn — **service chính** |
| `db` | multiminutes-db | 3307 → 3306 | MySQL 8 (init từ `mysql_schema.sql`) |
| `redis` | multiminutes-redis | 6379 | ⚠️ Container chạy nhưng **backend chưa connect tới**. Để dành cho Phase 3. |
| `frontend` | multiminutes-frontend | 80 | Nginx serve `frontend/` |
| `phpmyadmin` | multiminutes-phpmyadmin | 5050 | DB UI |

> 💡 Để tiết kiệm tài nguyên, có thể chạy `docker compose up -d backend db frontend phpmyadmin` và bỏ qua `redis` — backend hiện không cần Redis.

**Healthcheck**: backend `/health` (30s), MySQL `mysqladmin ping`, Redis `redis-cli ping` (chỉ kiểm tra container, không phải app dependency).

**Volume persistence**: `mysql-data`, `redis-data`, `./backend/{data,logs,uploads,exports}`.

Lệnh thường dùng:

```bash
docker compose up -d                 # Khởi động toàn bộ
docker compose logs -f backend       # Theo dõi log
docker compose restart backend       # Reload code
docker compose down                  # Dừng (giữ data)
docker compose down -v               # Dừng + xoá volumes
docker compose build --no-cache      # Build lại sạch
```

---

## 📡 API Surface (REST + WebSocket)

App đăng ký 13 router. Đầy đủ schema xem `/docs` (Swagger UI) hoặc `/redoc` khi backend chạy.

### Auth & Profile — `auth_profile.py`

- `POST /api/auth/register` — Đăng ký
- `POST /api/auth/login` — Đăng nhập, trả JWT
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/auth/me` — User hiện tại
- `GET|PATCH /api/profile` — Profile CRUD
- `POST /api/profile/avatar` — Upload avatar
- Đổi mật khẩu

### Organizations — `organizations.py`

- CRUD `/api/organizations`
- Approve / reject / suspend
- Members (add / remove / update role)
- Audit logs riêng cho tổ chức
- Invitations: single + bulk + revoke + resend
- Search users để mời

### Groups — `groups.py`

- CRUD `/api/groups`
- Members + role
- Group messages: CRUD + pin/unpin + reactions + reply
- Search users trong scope

### Meetings — `meetings.py`

- CRUD `/api/meetings` (filter theo group/org/status)
- Lifecycle: `queued` → `processing` → `completed` / `failed` / `live` / `upcoming` / `canceled`
- Participants: invite, RSVP (accept/decline), tự join, kick
- Speaker mapping (gán speaker label → user)
- Meeting messages (chat trong cuộc họp)
- WebSocket `/api/meetings/{id}/stream` — Live event stream
- WebSocket `/api/meetings/{id}/stt-stream` — Live STT

### STT & Upload — `stt.py`

- `POST /api/upload` — Upload 1 file, tạo `UploadJob`
- `POST /api/uploads/batch` — Multipart batch
- WebSocket `/api/test-stt/stream` — Test STT realtime
- `POST /api/transcribe/{job_id}` — Trigger lại transcription
- `GET /api/audio/{meeting_id}` — Stream file audio
- Analyze endpoint cho chunk

### Action items — `action_items.py`

- CRUD `/api/action-items`
- Assignee management (multi-assignee)
- Status: open / in_progress / completed
- Filter theo meeting / user / priority

### Notifications — `notifications.py`

- `GET /api/notifications` (filter priority, type, read state)
- `PATCH /api/notifications/{id}` — mark read
- `POST /api/notifications/mark-all-read`
- Dismiss notification

### Analytics — `analytics.py`

- `GET /api/dashboard/stats`
- `GET /api/analytics/meetings`
- `GET /api/analytics/performance`

### Jobs — `jobs.py`

- `GET /api/jobs/{id}` — Status của 1 upload job
- `POST /api/upload/jobs/{id}/retry`
- Batch job status

### Search — `search.py`

- `GET /api/search?q=...` — Unified search (meetings, users, groups, action items)

### System — `system.py`

- `GET /health`, status, maintenance toggle

### Admin (system-admin only) — `admin.py`

- Cost dashboard, user list / role management
- AI services: list provider, toggle, health
- Prompt management
- Broadcast notification
- Audit logs (hệ thống)
- Settings KV
- **`GET /api/admin/upload-jobs/{job_id}/diagnostics`** — Audio metrics + STT confidence chi tiết (Phase 1 STT overhaul)

### Export — `export.py`

- `GET /api/meetings/{id}/export/pdf`
- `GET /api/meetings/{id}/export/docx`
- `GET /api/meetings/{id}/export/csv`

### Interactive docs

| URL | Mô tả |
|---|---|
| `/docs` | Swagger UI |
| `/redoc` | ReDoc |
| `/openapi.json` | OpenAPI 3 spec |

---

## 🗃 Domain Models (24 entities)

Định nghĩa tại `backend/src/api/models.py`. RBAC 5 tầng: **system-admin · org-admin · group-admin · member · viewer**.

### Identity

| Entity | Trường chính |
|---|---|
| `User` | id, username, email, password_hash, role, profile, is_active, is_verified |
| `Organization` | name, description, domain, logo_url, settings (JSON) |
| `UserOrganization` | user_id, org_id, role (org-admin/member), unique (user, org) |

### Collaboration

| Entity | Mô tả |
|---|---|
| `Group` | org_id, name, visibility, join_policy (invite_only / request_approval / open_join) |
| `GroupMembership` | group_id, user_id, role (group-admin / member) |
| `GroupMessage` | text, reply_to_id, reactions (JSON), is_pinned |
| `Invitation` | email, org_id, group_id, role, token_hash, status (pending/accepted/revoked/expired) |
| `Notification` | recipient_id, type, priority (urgent/today/recent), title, message, metadata (JSON), is_read |

### Meetings

| Entity | Mô tả |
|---|---|
| `Meeting` | title, scheduled/actual start-end, duration, meeting_type, status, URLs, is_pinned |
| `MeetingParticipant` | speaker_label, email, name, invite_status |
| `MeetingMessage` | text, reply_to_id, reactions |
| `MeetingSpeakerMapping` | speaker_label ↔ user_id |
| `AudioFile` | original_filename, file_path, duration, file_size, format |
| `Transcript` | raw_content, post_processed, nlp_metadata, quality_metadata |
| `TranscriptSegment` | start_time, end_time, speaker_label, text, language, original_text, nlp_metadata |
| `MeetingSummary` | executive_summary, key_points, action_items, risks, open_questions, timeline_highlights, speaker_summaries |

### Tasks

- `ActionItem` — title, description, assigned_to, priority, status, due_date
- `ActionItemAssignee` — many-to-many với user

### Output & Ops

- `ExportFile` — file_type (pdf/docx/csv), generated_by
- `CostTracking` — provider, operation, cost (USD)
- `AuditLog` — user_id, entity_type, entity_id, action, old_value, new_value, ip_address
- `AdminKV` — key-value config (feature flags, prompts)
- `AdminBroadcast` — title, message, priority

Schema MySQL chi tiết: `backend/database/mysql_schema.sql`.

---

## 🎨 Frontend Pages & Features

### Public

| Trang | File |
|---|---|
| Landing | `pages/Landing.tsx` |
| Login / Register / ForgotPassword | `pages/Login.tsx`, `Register.tsx`, `ForgotPassword.tsx` |
| Invite handler | `pages/Invite.tsx` |
| Not found / Forbidden | `pages/NotFound.tsx`, `Forbidden.tsx` |

### Workspace (protected)

| Trang | Vai trò |
|---|---|
| `Dashboard.tsx` | Tổng quan tổ chức, recent meetings, action items, notification |
| `MeetingList.tsx` | Bảng cuộc họp với filter, sort theo `scheduled_start` |
| `MeetingDetail.tsx` | Chi tiết: transcript, summary, action items, chat, export |
| `MeetingRoom.tsx` | Phòng họp live với WebRTC + STT realtime |
| `CreateMeeting.tsx`, `JoinMeeting.tsx` | Lập lịch / tham gia bằng code |
| `ActionItems.tsx` | Quản lý task cá nhân |
| `Notifications.tsx` | Notification center |
| `OrganizationSetup.tsx` | Setup sau khi đăng ký |
| `pages/meeting/Calendar.tsx` | FullCalendar (day / week / month) |
| `pages/meeting/UploadAudio.tsx` | Upload audio batch để transcribe |

### Admin

| Khu vực | Component |
|---|---|
| System admin console | `pages/admin/SystemAdminConsole.tsx` + tabs `AdminOrganizations`, `AdminUsers`, `AdminAIServices`, `AdminPrompts`, `AdminNotifications`, `AdminAuditLogs`, `AdminSettings` |
| Org admin console | `pages/org/OrgAdminConsole.tsx` + tabs `OrgGroupsTab`, `OrgUsersTab`, `OrgSettingsTab`, `OrgAuditLogsTab` |

### Group

- `pages/group/CreateGroup.tsx`
- `pages/group/GroupDetail.tsx` với tabs: Meetings, Members, Chat, Settings, Stats

### Profile

- `pages/profile/Profile.tsx` (info + password + avatar)

### Features (feature-based folders)

- `features/admin/` — store + components admin
- `features/calendar/CalendarView.tsx`
- `features/meeting/` + `features/meeting-room/`
- `features/notifications/`

### Hooks

- `useAuth()`, `usePermission()`, `useCurrentRole()` — Auth & RBAC
- `useGroupMembers()`
- `useWebSocket()` — Generic WS hook
- `useAudioRecorder()`, `useLiveTestRecorder()` — Recording audio cho meeting room & STT test

### State

- **Zustand stores**: `appStore`, `authStore`, `calendarStore`, `groupStore`, `orgStore`, `uiStore`, `notificationStore`
- **TanStack Query**: server state (meetings, action items, notifications, ...)
- **Context**: `AuthContext` (single source of truth cho session)

### Tests (Vitest)

- `tests/pages/` — page-level (Login, MeetingList, GroupDetail, OrgAdminConsole, ...)
- `tests/components/` — UI / meeting / group / layout
- `tests/services/` — mappers
- Property-based tests bằng `fast-check`

---

## 🔄 AI Pipeline thực tế

1. **Upload** — User chọn audio (web `UploadAudio.tsx` hoặc batch). Backend tạo `UploadJob` trong `UPLOAD_JOB_QUEUE` (in-memory, `core/upload_jobs.py`).
2. **Audio quality check** — `core/audio_quality.py` tính loudness, SNR, duration, sample-rate. Lưu vào `audio_metrics` của job.
3. **STT** — `providers/deepgram.py` gọi Nova-3 (Vietnamese) với `STT_PROVIDER=deepgram`, thu word-level confidence + diarization. Adapter ViWhisper có sẵn nhưng mặc định mock vì `TRANSFORMERS_OFFLINE=true`.
4. **Diarization** — Deepgram native (chính). Pyannote adapter có sẵn nhưng đang mock; nếu cần dùng thật phải tắt `HF_HUB_OFFLINE` + có `HUGGINGFACE_TOKEN`.
5. **Post-process NLP** — `core/transcript_support.py` chạy PhoBERT (`vinai/phobert-base-v2`) + BARTpho (`vinai/bartpho-word-base`) qua `core/nlp_support.py` + `src/nlp/` để sửa chính tả, normalize danh từ riêng, gắn dialect/language. **Đây là phần NLP local thật sự chạy**.
6. **AI summary & context correction** — `providers/router_llm.py` → Groq (`qwen/qwen3-32b`). Được gọi từ `core/transcript_support.py`, `routes/stt.py`, `nlp/context_corrector.py`. Pipeline CrewAI (`api/jobs.py` → `MultiMinutesOrchestrator`) cũng dùng `RouterLLMAdapter`. Adapter Google Gemini / OpenAI có sẵn trong code nhưng không nằm trong call chain runtime hiện tại.
7. **Action items** — `core/action_item_operations.py` + `action_item_support.py` trích xuất task, gợi ý assignee dựa vào speaker mapping.
8. **Cost & audit** — `src/cost/cost_logger.py` ghi `CostTracking`; `AuditLog` ghi mọi mutation cấu hình.
9. **Export & notify** — `api/export.py` sinh PDF/DOCX/CSV; `core/notifications_support.py` broadcast.
10. **Diagnostics** — `GET /api/admin/upload-jobs/{id}/diagnostics` (system-admin) trả block `audio_metrics`, `processed_audio_metrics`, `deepgram_quality` (request_id, avg/min confidence, low_conf_word_ratio).

> **Metrics**: BLEU / WER / ROUGE-L được implement tại `providers/nlp_eval.py`. Theo dõi qua Admin Dashboard → AI Services.

---

## 🧪 Testing

### Backend (pytest)

```bash
cd backend
pytest tests/                               # Toàn bộ
pytest tests/api/routes/ -v                 # Theo module
pytest tests/providers/test_deepgram.py     # 1 file
pytest -k upload                            # Theo keyword
```

Thư mục: `api/`, `providers/`, `stt/`, `nlp/`, `diarization/`, `cost/`, `crewai/`, `translation/`, `smoke/`, `manual/`.

### Frontend (Vitest)

```bash
cd frontend
npm test                # Run once (vitest --run)
npm run test:watch      # Watch mode
```

Thư mục: `tests/pages/`, `tests/components/`, `tests/services/`. Setup ở `tests/setup.ts`.

### Smoke & End-to-end

- Smoke runners: `backend/tests/smoke/` (Deepgram, Google LLM, OpenAI, hardened configs).
- E2E scenarios chi tiết: `docs/05_E2E_SCENARIOS.md` (10 acceptance scenarios).
- Hướng dẫn tổng thể: `TESTING_GUIDE.md` ở root.

---

## 🐛 Troubleshooting

| Vấn đề | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `OperationalError: Can't connect to MySQL` | Port lệch (compose map 3307, app config 3306) | `.env` thực tế đang dùng `localhost:3307` (khớp Docker). Khớp port host trong `DATABASE_URL` |
| `401 Unauthorized` từ Deepgram | Thiếu / sai `DEEPGRAM_API_KEY` | Lấy lại key tại https://console.deepgram.com/ |
| `Groq 401` / `Router API timeout` | Thiếu `GROQ_API_KEY` hoặc `ROUTER_API_BASE_URL` sai | Check `backend/.env`: `GROQ_API_KEY` + `ROUTER_API_BASE_URL=https://api.groq.com/openai/v1` |
| PhoBERT/BARTpho không load | `TRANSFORMERS_OFFLINE=true` mà chưa pre-cache model | Tắt offline lần đầu để tải, hoặc set `PHOBERT_LOAD_MODEL=false` để skip |
| `torch` cài chậm / lỗi CUDA | torch CPU-only đủ cho dev | `pip install torch --index-url https://download.pytorch.org/whl/cpu` |
| Port 8000 / 5173 đã chiếm | Tiến trình cũ chưa tắt | `lsof -i :8000` / `lsof -i :5173` rồi `kill -9` |
| Upload báo `413 Request Entity Too Large` | Vượt `MAX_UPLOAD_SIZE` (50 MB) hoặc `client_max_body_size` Nginx | Tăng env + edit `nginx.conf` |
| Backend chạy nhưng FE không gọi được API | CORS / origin sai | Set `CORS_ORIGINS=http://localhost:5173` |
| Upload job biến mất sau khi restart | Queue đang in-memory (`UPLOAD_JOB_QUEUE`) | Hạn chế restart trong lúc xử lý; sẽ giải quyết ở Phase 3 (Redis/RQ) |
| Rebuild Docker không reflect code | Cache cũ | `docker compose build --no-cache backend` |

Log mặc định:

- Backend: `backend/logs/app.log` (set bởi `LOG_FILE`)
- Docker: `docker compose logs -f <service>`
- Frontend: console trình duyệt + Vite terminal

---

## 📚 Tài liệu & Roadmap

### Tài liệu kỹ thuật

| File | Nội dung |
|---|---|
| [docs/01_PROJECT_OVERVIEW.md](./docs/01_PROJECT_OVERVIEW.md) | Tổng quan hệ thống & domain |
| [docs/02_FRONTEND_PLAN.md](./docs/02_FRONTEND_PLAN.md) | Lộ trình frontend 5 phase |
| [docs/03_BACKEND_PLAN.md](./docs/03_BACKEND_PLAN.md) | Kiến trúc backend + migration MySQL V2 |
| [docs/04_TEST_STRATEGY.md](./docs/04_TEST_STRATEGY.md) | Chiến lược test TDD |
| [docs/05_E2E_SCENARIOS.md](./docs/05_E2E_SCENARIOS.md) | 10 acceptance scenarios |
| [docs/DEEPGRAM_QUICK_REFERENCE.md](./docs/DEEPGRAM_QUICK_REFERENCE.md) | Config Deepgram Nova-3 |
| [docs/DEEPGRAM_VIETNAMESE_SETUP.md](./docs/DEEPGRAM_VIETNAMESE_SETUP.md) | Setup STT tiếng Việt |
| [docs/WORKLOG_2026-05-25.md](./docs/WORKLOG_2026-05-25.md) | Nhật ký V2 migration |
| [GEMINI.md](./GEMINI.md) | Quy tắc orchestration / agentic |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Hướng dẫn test chi tiết |

### Roadmap (đang triển khai)

**Upload + STT overhaul** — đã chia 4 phase tuần tự:

- ✅ **Phase 1 — Diagnostics**: `audio_quality.py`, Deepgram quality block, `UploadMeetingJob.diagnostics()`, endpoint `/api/admin/upload-jobs/{id}/diagnostics`, panel "STT diagnostics" trong `AdminAIServices.tsx`.
- 🔄 **Phase 2 — Adaptive preprocessing**: Tuning ngưỡng strategy dựa trên data thực (loudness/SNR/avg_confidence) — chờ user cung cấp mẫu STT tốt + xấu.
- ⏳ **Phase 3 — Reliability**: `tus-py-server` + `tus-js-client` cho resumable upload, Redis/RQ thay in-memory `UPLOAD_JOB_QUEUE`, mỗi file = 1 mutation độc lập trên FE.
- ⏳ **Phase 4 — Per-org STT settings**: Bảng `stt_settings` per organization (model, keyterms, thresholds), job list view + waveform thumbnail cho admin debug.

Chi tiết & roadmap khác xem `docs/03_BACKEND_PLAN.md`.

---

## 🤝 Đóng góp

Theo Test-Driven Development (xem `GEMINI.md` cho quy tắc orchestration):

1. Viết test (RED)
2. Implement tối thiểu cho pass (GREEN)
3. Refactor (REFACTOR)
4. Commit kèm note thay đổi pattern hoặc đánh dấu skill đã dùng

Quy chuẩn code tham khảo `external_tools/everything-claude-code/`.

---

## 📞 Hỗ trợ

- Xem [`/docs`](./docs/) trước khi mở issue
- Chạy backend ở local rồi mở `http://localhost:8000/docs` để xem schema API thực tế
- Log toàn cục: `backend/logs/app.log` hoặc `docker compose logs -f backend`

---

## 📄 License

© 2026 **MultiMinutes AI Team**. All rights reserved.

---

**Last Updated**: 2026-05-28  ·  **Status**: 🟢 Active Development  ·  **Codename**: CONVIA API v1.0.0-beta
