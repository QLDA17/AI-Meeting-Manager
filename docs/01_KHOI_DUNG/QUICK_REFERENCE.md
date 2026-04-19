# ⚡ QUICK REFERENCE CARD

**MultiMinutes AI - Essential Commands & Shortcuts**

---

## 🚀 START PROJECT (Most Common)

```bash
# Terminal 1: Backend
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI
python src/api/main.py

# Terminal 2: Frontend
cd frontend
npm run dev

# Result:
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# Docs: http://localhost:8000/docs
```

---

## 📁 PROJECT STRUCTURE

```
MUTI_AI/
├── src/              Backend FastAPI 
├── frontend/         React UI
├── docs/             Documentation (10 files)
├── scripts/          Utilities
├── tests/            Test suite (8 files)
├── config/           Configuration
├── database/         Schemas
└── data/             Sample data
```

---

## 📄 KEY FILES TO READ

| File | Read When |
|------|-----------|
| README.md | First time setup |
| CLEANUP_LOG.md | Want to know what was deleted |
| VERIFICATION_GUIDE.md | Verify project works |
| NEXT_STEPS.md | What to do next |
| docs/HUONG_DAN_DU_AN.md | Understand architecture |
| docs/KE_HOACH_TONG_QUAN.md | See project timeline |

---

## 🐍 PYTHON / BACKEND

```bash
# Activate venv
source venv/bin/activate

# Install/update dependencies
pip install -r requirements.txt

# Run backend
python src/api/main.py

# Run tests
pytest tests/ -v

# Run specific test
pytest tests/test_security.py -v

# Initialize database
python scripts/init_mysql.py
```

---

## 🟢 NODE.JS / FRONTEND

```bash
# Install dependencies
cd frontend
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

---

## 🐳 DOCKER

```bash
# Build all containers
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild & restart
docker-compose up -d --build
```

---

## 🧪 TESTING

```bash
# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run specific test file
pytest tests/test_security.py -v

# Run with coverage
pytest --cov=src tests/

# Run specific test function
pytest tests/test_security.py::test_auth -v
```

---

## 📊 API ENDPOINTS (Common)

```
GET    /api/health              - Health check
GET    /api/users/me            - Current user info
POST   /api/auth/login          - Login
POST   /api/meetings/upload     - Upload audio
GET    /api/meetings/{id}       - Get meeting
GET    /api/meetings/{id}/export/pdf - Export to PDF
POST   /api/chat/message        - Send chat message

Full docs: http://localhost:8000/docs
```

---

## 🔑 ENVIRONMENT (.env)

```env
# Create from template
cp .env.example .env

# Fill these (minimum required):
GOOGLE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/multiminutes
VITE_API_URL=http://localhost:8000
```

---

## 🐛 TROUBLESHOOTING

```bash
# Backend won't start
lsof -i :8000                    # Check if port 8000 in use
python src/api/main.py 2>&1     # See detailed error

# Frontend won't start
lsof -i :5173                    # Check port 5173
rm -rf node_modules package-lock.json && npm install

# Database connection fails
mysql -u root -p -e "SELECT 1"   # Test MySQL connection
python scripts/init_mysql.py     # Reinitialize

# Clear cache
rm -rf .pytest_cache/
rm -rf .ruff_cache/
rm -rf frontend/dist/
```

---

## 📚 DOCUMENTATION PATHS

```
docs/
├── HUONG_DAN_DU_AN.md         - System architecture
├── KE_HOACH_TONG_QUAN.md      - Project plan & timeline
├── TIEN_DO_HIEN_TAI.md        - Current progress
├── QUY_TAC_THUC_HIEN.md      - Implementation rules
├── THONGTINDUAN.md            - Project info
├── MOBILE_RESPONSIVE.md       - Mobile UI design
├── THIETKEFE.md               - Frontend design
├── BANG_GHI_CHUYEN_GIAO.md   - Handover notes
├── BAO_CAO_TIEN_DO.md        - Progress reports
└── NHAT_KY_LAM_VIEC.md       - Work logs
```

---

## 🎯 CURRENT PROJECT STATUS

**Milestone:** 2 / 3 (60% complete)  
**Target:** Live demo Week 10  

**Current Tasks (R4-06 → R4-08):**
- [ ] R4-06: Export & Document Generation
- [ ] R4-07: Data Persistence (Repository pattern)
- [ ] R4-08: Security Hardening

---

## 🔄 GIT WORKFLOW

```bash
# See changes
git status
git diff

# Commit changes
git add .
git commit -m "feat: description"

# Push to remote
git push origin branch-name

# Pull latest
git pull origin main

# Create new branch
git checkout -b feature/name

# Delete branch
git branch -d feature/name
```

---

## 📞 QUICK CONTACT POINTS

| Task | Reference |
|------|-----------|
| Project overview | README.md or TOM_TAT_DU_AN.md |
| Setup first time | README.md |
| Architecture | docs/HUONG_DAN_DU_AN.md |
| Timeline | docs/KE_HOACH_TONG_QUAN.md |
| Development rules | docs/QUY_TAC_THUC_HIEN.md |
| Verify after cleanup | VERIFICATION_GUIDE.md |
| Next tasks | NEXT_STEPS.md |
| What was cleaned | CLEANUP_LOG.md |

---

## 💾 IMPORTANT REMINDERS

1. ✅ Never commit `.env` file (has secrets)
2. ✅ Always activate venv before Python work
3. ✅ Run tests before committing code
4. ✅ Update documentation when changing structure
5. ✅ Use .gitignore patterns (35+ patterns already configured)
6. ✅ Database URL uses MySQL (important for production)
7. ✅ Frontend port is 5173 (Vite default)
8. ✅ Backend port is 8000 (FastAPI default)

---

## ⚡ MOST USED COMMANDS

```bash
# 1. Setup (one-time)
cp .env.example .env  # Configure with your secrets

# 2. Start development (daily)
python src/api/main/py          # Terminal 1
cd frontend && npm run dev       # Terminal 2

# 3. Commit work
git add . && git commit -m "..."

# 4. Run tests
pytest tests/ -v

# 5. Deploy
docker-compose up -d
```

---

## 🎓 LEARNING RESOURCES

**Tech Stack Documentation:**
- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/
- Tailwind CSS: https://tailwindcss.com/
- SQLAlchemy: https://www.sqlalchemy.org/

**Project Resources:**
- Start: README.md
- Architecture: docs/HUONG_DAN_DU_AN.md
- Timeline: docs/KE_HOACH_TONG_QUAN.md
- Rules: docs/QUY_TAC_THUC_HIEN.md

---

## ✅ READY?

Everything is set up! Just run:

```bash
python src/api/main.py &       # Backend
cd frontend && npm run dev     # Frontend
```

Then open http://localhost:5173 and start building! 🚀

---

*Quick Reference v1.0 - Last Updated: 2024*  
*For full guides, see the documentation files listed above*
