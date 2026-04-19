# ✅ PROJECT VERIFICATION GUIDE

**Purpose:** Verify that MultiMinutes AI project still runs correctly after cleanup  
**Estimated Time:** 10-15 minutes  
**Last Updated:** 2024

---

## 🔍 VERIFICATION CHECKLIST

### ✅ STEP 1: Verify Directory Structure

```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI

# Check root directory
ls -la | grep -E "^\-" | wc -l
# Expected: 12 files

# Check key directories exist
ls -d src frontend docs scripts tests config database data 2>/dev/null && echo "✅ All core directories present"
```

**Expected Output:**
```
✅ All core directories present
```

---

### ✅ STEP 2: Verify Python Environment

```bash
# Check Python version
python3 --version
# Expected: Python 3.11+ (or check in .env)

# Check virtual environment exists
ls -la | grep venv
# Expected: venv directory should exist

# Activate venv (macOS/Linux)
source venv/bin/activate
# or on Windows: venv\Scripts\activate

# Verify activation
which python
# Expected: Should point to venv/bin/python
```

**Expected Output:**
```
Python 3.11.x (or higher)
/Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI/venv/bin/python
```

---

### ✅ STEP 3: Verify Python Dependencies

```bash
# Check if all required packages are installed
python -c "import fastapi; import google; import openai; import pyannote; import crewai" && echo "✅ All key Python packages installed"

# Or run requirements check
pip list | grep -E "FastAPI|google-generativeai|openai|pyannote|crewai"
```

**Expected Output:**
```
✅ All key Python packages installed
FastAPI
google-generativeai
openai
pyannote-audio
crewai
```

---

### ✅ STEP 4: Verify Backend Code Integrity

```bash
# Check src directory structure
ls -la src/
# Expected: __init__.py, api/, providers/, stt/, diarization/, translation/, crewai/, cost/

# Check main API file exists
file src/api/main.py
# Expected: ASCII text file

# Check for syntax errors
python -m py_compile src/api/main.py && echo "✅ Backend code has no syntax errors"
```

**Expected Output:**
```
✅ Backend code has no syntax errors
src/api/main.py: ASCII text
```

---

### ✅ STEP 5: Verify Node.js & Frontend

```bash
# Check Node.js version
node --version
# Expected: v18+ (v20+ recommended)

# Check npm version
npm --version
# Expected: 9.0+

# Check frontend directory
ls frontend/src/
# Expected: pages/, components/, services/, context/, hooks/, App.tsx, main.tsx

# Check node_modules exists (should have 600+ packages)
ls node_modules/ | head -5
# Expected: Various package directories

# Check frontend code
file frontend/src/App.tsx
# Expected: ASCII text
```

**Expected Output:**
```
v20.x.x (or similar)
10.x.x
✅ Frontend dependencies installed
```

---

### ✅ STEP 6: Test Backend Startup

**Terminal 1: Backend**

```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI
source venv/bin/activate  # or appropriate activation
python src/api/main.py

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**To verify backend is running:**

```bash
# In another terminal
curl -s http://localhost:8000/docs | grep -q "FastAPI" && echo "✅ Backend is running"

# Or check health
curl http://localhost:8000/api/health 2>&1
# Expected: {"status": "ok"} or similar
```

**Verification:**
- ✅ Server starts on `http://localhost:8000`
- ✅ API docs available at `http://localhost:8000/docs`
- ✅ No import errors in console

---

### ✅ STEP 7: Test Frontend Startup

**Terminal 2: Frontend**

```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI/frontend
npm run dev

# Expected output:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

**To verify frontend is running:**

```bash
# In another terminal
curl -s http://localhost:5173 | grep -q "DOCTYPE" && echo "✅ Frontend is running"
```

**Verification:**
- ✅ Dev server starts on `http://localhost:5173`
- ✅ No TypeScript or build errors
- ✅ React application loads

---

### ✅ STEP 8: Test API Connectivity

```bash
# Check if frontend can reach backend
curl -s http://localhost:8000/api/users/me \
  -H "Authorization: Bearer test" | head -20

# Expected: Should not return "connection refused"
```

**Verification:**
- ✅ Backend API responds to requests
- ✅ CORS headers present (should allow localhost:5173)
- ✅ Authentication check works

---

### ✅ STEP 9: Test Database Initialization

```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI

# Check if MySQL is available
mysql --version
# Expected: mysql  Ver 8.0.x or higher

# Run database initialization script
python scripts/init_mysql.py

# Expected output:
# ✅ Database initialized successfully
# or
# Database already exists
```

**Verification:**
- ✅ MySQL connection successful or skipped if not needed
- ✅ Database schema created or verified
- ✅ No SQL errors

---

### ✅ STEP 10: Run Test Suite

```bash
cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI

# Activate venv if not already active
source venv/bin/activate

# Run all tests
pytest tests/ -v --tb=short

# Expected output:
# tests/test_alert_service.py ✅
# tests/test_cost_api.py ✅
# tests/test_stt_service.py ✅
# ... (8 test files total)
# ====== X passed in X.XXs ======
```

**Verification:**
- ✅ Most tests pass (some may skip if services unavailable)
- ✅ No fatal errors
- ✅ Test framework loads correctly

---

### ✅ STEP 11: Verify Docker Setup

```bash
# Check if Docker is running
docker --version
# Expected: Docker version 20.10+

# Check docker-compose
docker-compose --version
# Expected: Docker Compose version 2.0+

# Build Docker image (dry-run)
docker-compose config | grep -q "services" && echo "✅ Docker-compose.yml is valid"

# To fully test Docker (optional):
docker-compose build --no-cache
# This builds the container image
```

**Verification:**
- ✅ Docker installed and running
- ✅ docker-compose.yml is valid YAML
- ✅ Container builds without errors

---

### ✅ STEP 12: Verify Configuration Files

```bash
# Check all required config files exist
for file in .env.example requirements.txt package.json docker-compose.yml nginx.conf; do
  [ -f "$file" ] && echo "✅ $file" || echo "❌ $file MISSING"
done

# Check .env setup
ls -la .env* 
# Expected: .env and .env.example present

# Check requirements.txt
grep -c "^[a-zA-Z]" requirements.txt
# Expected: 20+ packages

# Check package.json
grep -c '"dependencies"' frontend/package.json
# Expected: 1 (dependencies section exists)
```

**Verification:**
- ✅ All 6 core config files present
- ✅ .env and .env.example exist
- ✅ 20+ Python packages defined
- ✅ Frontend dependencies defined

---

## 🎯 QUICK VERIFICATION SCRIPT

Save this as `verify_project.sh`:

```bash
#!/bin/bash

echo "🔍 Project Cleanup Verification"
echo "================================"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅${NC} $2"
  else
    echo -e "${RED}❌${NC} $2"
  fi
}

cd /Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI

# Check directory structure
echo ""
echo "📁 Directory Structure:"
[ -d "src" ] && [ -d "frontend" ] && [ -d "docs" ] && [ -d "scripts" ]
check $? "Core directories present"

# Check Python
echo ""
echo "🐍 Python Environment:"
python3 --version > /dev/null 2>&1
check $? "Python 3 installed"

source venv/bin/activate 2>/dev/null
python -c "import fastapi" 2>/dev/null
check $? "FastAPI installed"

# Check Node.js
echo ""
echo "🟢 Node.js & Frontend:"
node --version > /dev/null 2>&1
check $? "Node.js installed"

[ -d "node_modules" ] && [ "$(ls -1 node_modules | wc -l)" -gt 100 ]
check $? "Frontend dependencies installed"

# Check configuration files
echo ""
echo "⚙️ Configuration Files:"
[ -f ".env.example" ] && [ -f "requirements.txt" ] && [ -f "package.json" ]
check $? "Core config files present"

[ -f "docker-compose.yml" ] && [ -f "nginx.conf" ]
check $? "Docker & Nginx config present"

# Check files count
ROOT_FILES=$(find . -maxdepth 1 -type f | wc -l)
echo ""
echo "📊 File Count: $ROOT_FILES (Expected: 12)"
[ $ROOT_FILES -eq 12 ]
check $? "Root directory has exactly 12 files"

echo ""
echo "✅ Verification Complete!"
```

**Run it:**
```bash
chmod +x verify_project.sh
./verify_project.sh
```

---

## 🚀 FULL SYSTEM TEST

If all above steps pass, do a **full system test**:

**Terminal 1: Backend**
```bash
python src/api/main.py
```
Wait for: `INFO:     Uvicorn running on http://0.0.0.0:8000`

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
```
Wait for: `Local:   http://localhost:5173/`

**Terminal 3: Test**
```bash
sleep 3
curl -s http://localhost:8000/docs | head -10
curl -s http://localhost:5173 | head -10
echo "✅ Both servers responding"
```

**Browser Test:**
1. Open `http://localhost:5173`
2. Login with `admin` + any password
3. Upload a meeting recording
4. Wait for transcription
5. View results

---

## ⚠️ IF SOMETHING FAILS

### Backend won't start
```bash
# Check logs
python src/api/main.py 2>&1 | head -30

# Check if port 8000 is in use
lsof -i :8000

# Check Python packages
pip list | grep -i fastapi

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend won't start
```bash
# Check logs
npm run dev 2>&1 | head -30

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

### Database connection fails
```bash
# Check MySQL is running
mysql --version
mysql -u root -p -e "SELECT 1"

# Run init script with verbose output
python -v scripts/init_mysql.py
```

### Tests fail
```bash
# Run with verbose output
pytest tests/ -v --tb=long

# Run single test for debugging
pytest tests/test_alert_service.py -v
```

---

## ✨ EXPECTED VERIFICATION RESULTS

After passing all steps:

```
✅ Directory structure professional and clean
✅ All 12 root files present
✅ Python environment functional with 20+ packages
✅ Node.js environment functional with 600+ packages
✅ Backend starts on http://localhost:8000
✅ Frontend starts on http://localhost:5173
✅ API documentation available at /docs
✅ Database initialized successfully
✅ Tests pass (8+ test files)
✅ Docker image builds successfully
✅ Project ready for development or deployment
```

---

**Next Steps After Verification:**
1. ✅ Project cleanup verified
2. 🔄 Ready to proceed with Milestone 2 development
3. 🚀 Ready for deployment with Docker
4. 👥 Ready for team collaboration

---

*Last verified: [Date]  
Verification Status: ✅ Passed*
