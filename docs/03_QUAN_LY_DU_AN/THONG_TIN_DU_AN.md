# 🚀 MULTIMINUTES AI
## Hệ thống Ghi Biên Bản & Tổng Hợp Nội Dung Cuộc Họp bằng AI

> **Báo cáo Tổng hợp Dự án** — Kèm Sprint Backlog, Lộ trình triển khai & Hướng dẫn Multi-AI Agents

| Tổng PBI | Nhóm chức năng | Tổng Tasks | Thời gian | Tổng giờ KH | Thời hạn Demo |
|----------|---------------|------------|-----------|-------------|---------------|
| 510 | 6 nhóm | 33 | T-00 đến T-25c | 231h (~23h/tuần × 10 tuần) | Tuần 10 — Milestone 3 · Live demo |

**Phiên bản:** 1.0 | **Cập nhật:** Tuần 3 (Sprint 2 đang chạy)

---

## 1. Tổng Quan Dự Án

MultiMinutes AI là hệ thống quản lý nội dung cuộc họp theo mô hình **Tài sản tri thức số**. Mỗi cuộc họp là một đối tượng dữ liệu duy nhất, gắn liền với định danh (ID), thời gian thực tế và hồ sơ nội dung điện tử (Transcript & Summary).

### 1.1 Vấn Đề Giải Quyết

- **Loại bỏ tình trạng "họp xong để đấy"** — quên mất quyết định do ghi chép thủ công không đầy đủ.
- **Loại bỏ rào cản ngôn ngữ** và sự chậm trễ trong soạn thảo biên bản thủ công.
- **Rút ngắn thời gian** hoàn thiện biên bản từ 2–3 giờ xuống còn 15–30 phút (nâng cao hiệu suất **80%**).

### 1.2 Giá Trị Cốt Lõi

- Chuyển đổi âm thanh hỗn độn thành văn bản **có cấu trúc, có thể truy vết và tìm kiếm ngữ nghĩa**.
- Xây dựng **"Kho lưu trữ tri thức tập thể"**: ai nói gì, quyết định gì, ai chịu trách nhiệm gì và deadline khi nào.

### 1.3 Công Nghệ Sử Dụng

| Tầng | Công nghệ | Mô tả |
|------|-----------|-------|
| Backend | Python (FastAPI) | Xử lý logic nghiệp vụ, điều phối AI |
| Frontend | React.js + TailwindCSS | Dashboard responsive, real-time |
| STT | OpenAI Whisper | Chuyển đổi giọng nói sang văn bản |
| Diarization | pyannote.audio v3 | Phân tách danh tính người nói |
| AI LLM | GPT-4o-mini | Dịch thuật & tóm tắt đa ngữ |
| AI Orchestration | CrewAI Framework | 15 Agents chuyên biệt |
| Database | MySQL + Redis | Lưu trữ metadata, cache dịch thuật |
| DevOps | Docker + GitHub Actions | CI/CD, containerization |
| Deploy | Render / Vercel | Backend / Frontend cloud |

---

## 2. Mục Tiêu Dự Án

### 2.1 Mục Tiêu Kỹ Thuật & Công Nghệ

- **Tối ưu hóa nhận dạng giọng nói:** Tích hợp thành công mô hình STT với độ chính xác cao đối với tiếng Việt.
- **Xây dựng Pipeline Diarization:** Triển khai luồng phân biệt danh tính các thành viên trong cuộc họp nhóm, đảm bảo tính minh bạch về nội dung phát ngôn.
- **Đa ngôn ngữ hóa:** Tích hợp LLM để dịch thuật và tóm tắt tự động — tập trung xử lý tốt tiếng Việt, tiếng Anh và tiếng Nhật.

### 2.2 Mục Tiêu Chức Năng & Trải Nghiệm

- **Tự động hóa End-to-End:** Thu âm → Chuyển đổi văn bản → Dịch/Tóm tắt → Xuất PDF/Word chuẩn văn phòng.
- **Tối ưu UX/UI:** Dashboard quản trị trực quan, dễ theo dõi, chỉnh sửa và tra cứu lịch sử phiên họp.

### 2.3 Mục Tiêu Ứng Dụng Thực Tiễn

- **Số hóa quy trình ghi chép:** Giải quyết triệt để bài toán lãng phí thời gian và sai sót khi làm biên bản thủ công.
- **Tiết kiệm nguồn lực:** Rút ngắn thời gian hoàn thiện biên bản từ 2–3 giờ xuống 15–30 phút, **nâng cao hiệu suất 80%**.

### 2.4 Mục Tiêu Vận Hành & Bảo Mật

- **Tính ổn định:** Hoàn thiện các tính năng cốt lõi để hệ thống hoạt động ổn định, không crash trong buổi Live Demo (tuần 10).
- **An toàn thông tin:** Quản lý API Key an toàn, mã hóa dữ liệu âm thanh, đảm bảo quyền riêng tư nội dung cuộc họp.

---

## 3. Kiến Trúc Hệ Thống

### 3.1 Pipeline Xử Lý 9 Bước

```
1. Audio vào          → Backend Audio Agent (noise cancel, buffer chunk 30s)
2. Whisper STT        → Full transcript + timestamps
3. Diarization        → Gán nhãn Speaker_1, Speaker_2, Speaker_N
4. Spellcheck         → Soát lỗi chính tả, chuẩn hóa tên riêng theo Glossary
5. Dịch thuật         → Inject Glossary → GPT-4o-mini batch 500 tokens
6. Tóm tắt           → JSON: key_points / decisions / action_items
7. NLP Evaluation     → Tính BLEU/Rouge-L → lưu chỉ số chất lượng vào DB
8. Cost Tracking      → Log token/cost_usd → kiểm tra ngưỡng $2/tháng
9. Dashboard + Export → Render UI → xuất PDF/DOCX, gửi email notification
```

### 3.2 Kiến Trúc Đa Tầng

**Backend**
- Python FastAPI — REST API, BackgroundTasks, realtime polling

**Frontend**
- React.js + TailwindCSS — Audio sync UI, Dashboard

**AI Stack**
- Whisper (STT), Pyannote (Diarization), GPT-4o-mini (Dịch & Tóm tắt)

**Database**
- MySQL → metadata & content
- Redis → caching
- Vector DB → semantic search *(tuỳ chọn)*

**DevOps**
- Docker, GitHub Actions (CI/CD), Deploy: Vercel / Render

### 3.3 Cấu Trúc Dữ Liệu Mỗi Cuộc Họp

```json
{
  "meeting_id": "",
  "transcript": "",
  "speakers": [],
  "key_points": [],
  "decisions": [],
  "action_items": [
    {
      "task": "",
      "owner": "",
      "deadline": "YYYY-MM-DD or null"
    }
  ]
}
```

---

## 4. Quy Trình Nghiệp Vụ

### 4.1 So Sánh Quy Trình Cũ vs Mới

| | Quy trình cũ (Thủ công) | Quy trình mới (AI) |
|--|------------------------|-------------------|
| **Bước 1** | Họp → Ghi chép tay / Ghi âm | Họp & Thu âm real-time |
| **Bước 2** | Nghe lại (tốn 2–3h) | AI xử lý tức thì |
| **Bước 3** | Gõ lại văn bản | Có bản nháp sau 5–10 phút |
| **Bước 4** | Gửi email xác nhận | Thư ký chỉnh sửa nhanh |
| **Kết quả** | Dễ thất lạc, sai lệch | Phê duyệt & Lưu trữ tập trung, tra cứu dễ dàng |

### 4.2 Cơ Chế Xác Thực Dữ Liệu (Human-in-the-loop)

Áp dụng cơ chế **"Hậu kiểm nội dung"**: Giao diện so sánh song song giữa âm thanh/văn bản gốc và nội dung AI tóm tắt. Nhân viên chỉ có thể nhấn "Hoàn thành" sau khi đã kiểm tra các con số, tên riêng quan trọng — đảm bảo tính pháp lý của biên bản trước khi ban hành.

---

## 5. Phân Quyền Hệ Thống

### ADMIN — Quản trị viên
- Toàn quyền hệ thống, thiên về vận hành
- Quản lý người dùng: xem, tìm kiếm, mở/khoá tài khoản
- Giám sát bảo mật: lịch sử đăng nhập, phát hiện bất thường
- Kiểm soát chi phí vận hành, hiển thị biểu đồ báo cáo

### MANAGER — Cán bộ quản lý
- Vai trò trung tâm điều phối trong phạm vi nhóm / dự án
- Quản trị nhân sự: mời thành viên, xóa thành viên, thay đổi quyền
- Vận hành cuộc họp: tạo mới, chỉnh sửa, xóa phiên họp
- Phê duyệt báo cáo và phân công nhiệm vụ

### STAFF — Nhân viên
- Ghi âm & Upload file âm thanh để AI xử lý
- Xem transcript, bản dịch và tóm tắt cuộc họp
- Theo dõi và cập nhật trạng thái Action Items được giao

---

## 6. Product Backlog — Tổng hợp 510 PBI

510 Product Backlog Items phân bổ đều vào **6 nhóm chức năng**, mỗi nhóm **85 PBI** trải qua 5 sprint với 3 mức độ ưu tiên.

| Nhóm | Tên nhóm | Phạm vi chức năng | Cao | Trung | Thấp | Tổng |
|------|----------|------------------|-----|-------|------|------|
| G1 | Quản trị người dùng | Đăng nhập, phân quyền ADMIN/MANAGER/STAFF, quản lý tài khoản, mời thành viên | 34 | 34 | 17 | 85 |
| G2 | Ghi âm & STT | Real-time recording, Whisper STT, noise cancellation, fallback local, upload file | 34 | 34 | 17 | 85 |
| G3 | Lõi AI (Dịch & Tóm tắt) | CrewAI 15 agents, dịch 5 ngôn ngữ, tóm tắt, Glossary 300+ thuật ngữ, Prompt A/B | 34 | 34 | 17 | 85 |
| G4 | Dashboard Web | React transcript real-time, WebSocket, audio sync, speaker management, search | 34 | 34 | 17 | 85 |
| G5 | Xuất báo cáo | PDF WeasyPrint, DOCX python-docx, email notification, biên bản chuẩn doanh nghiệp | 34 | 34 | 17 | 85 |
| G6 | Bảo mật & Kiểm thử | CI/CD GitHub Actions, Unit Test, Integration Test, OWASP audit, load testing, backup | 34 | 34 | 17 | 85 |
| **TỔNG** | 6 nhóm · 5 sprints/nhóm | | **204** | **204** | **102** | **510** |

---

## 7. Sprint Backlog — Chi Tiết 9 Sprints

| Sprint | Tuần | Giờ KH | Story Pts | Trọng tâm & Deliverables |
|--------|------|--------|-----------|--------------------------|
| Sprint 0 | Tuần 1 | 4h | 0 | Chọn đề tài · Phân công nhóm · Lập kế hoạch 10 tuần ✅ |
| Sprint 1 | Tuần 2 | 35h | 22 | GitHub CI/CD · DB Schema MySQL · Glossary 300+ · Ghi âm module · Whisper + Phowhisper STT ✅ |
| Sprint 2 | Tuần 3 | 32h | 26 | CrewAI 15 Agents · Diarization · Dịch thuật 5 ngữ · Prompt A/B · Budget Alert 🔄 |
| Sprint 3 | Tuần 4 | 33h | 33 | Tóm tắt · Noise Cancellation · Fallback Local · Dashboard React · REST API |
| Sprint 4 | Tuần 5 | 31h | 16 | Xuất PDF · Xuất DOCX · Back-translation test · Security Audit · E2E Test |
| Sprint 5 | Tuần 6 | 20h | 12 | Dashboard Beta · Tối ưu cost API · Redis Cache · Performance Tuning |
| Sprint 6 | Tuần 7 | 18h | 10 | Ghi họp nội bộ 1 · UX Bug Fix · Milestone 2 Verification 🏁 |
| Sprint 7 | Tuần 8–9 | 22h | 10 | Ghi họp nội bộ 2&3 · Tài liệu đầy đủ · Final QA & Regression Test |
| Sprint 8 | Tuần 10 | 16h | 14 | Demo Slide · Báo cáo cuối kỳ · Nộp source code 🏁 |

### 7.1 Chi Tiết Sprint 2 — Việc Cần Làm Ngay (Tuần 3)

**Mục tiêu:** Tích hợp CrewAI Framework, Diarization, Dịch thuật đa ngữ. Kết thúc sprint = đạt **Milestone 1**.

| Task ID | Tên task | Mô tả | Giờ KH | PM | Trạng thái |
|---------|---------|-------|--------|-----|------------|
| T-06 | Cài đặt CrewAI + 15 AI Agents | pip install crewai → agent_config.yaml 15 agents → định nghĩa 3 nhóm → test routing 10/10 → log JSON | 8h | Huyền | 🔄 Đang làm |
| T-07 | Diarization — phân tách người nói | pyannote.audio v3 → DiarizationService → align STT → test 3/5 người → DER < 15% → API PATCH /speakers | 8h | Huyền | 🔄 Đang làm |
| T-08 | Dịch thuật đa ngữ 5 ngôn ngữ + Glossary | TranslationService → inject Glossary → batch 500 token/request → test VI↔EN/JA/ZH/KO → BLEU ≥ 0.65 | 8h | Huyền | ⏳ Chưa bắt đầu |
| T-09 | Prompt Engineering — A/B Test | 3 phiên bản prompt dịch + tóm tắt → chạy A/B test 10 transcript → đo BLEU/Rouge-L/cost → lưu /prompts/*.yaml | 7h | Oanh | ⏳ Chưa bắt đầu |
| T-10 | Budget Alert & Cost Dashboard | Hard limit $2/tháng → CostLogger middleware → email alert → API GET /admin/costs → báo cáo thứ 6 | 3h | Nhật | ⏳ Chưa bắt đầu |

---

## 8. Hệ Thống Multi-AI Agents (CrewAI)

Sử dụng **15 AI Agents chuyên biệt** thay vì 1 prompt đơn lẻ, giúp nâng cao độ chính xác và khả năng kiểm soát từng bước xử lý.

### 8.1 Nhóm 1 — Technical (6 Agents)

| Tên Agent | Nhiệm vụ chuyên biệt |
|-----------|---------------------|
| Backend Core Agent | STT pipeline, translation service, summarization, REST API endpoints |
| Backend Audio Agent | Real-time recording, noise cancellation, WAV processing, chunk 30s |
| Frontend Agent | React dashboard, PDF/DOCX export, UI components, WebSocket |
| DB Designer Agent | MySQL schema, migration scripts, indexing, seed data |
| DevOps Agent | CI/CD GitHub Actions, Docker, Fallback Whisper local, deploy |
| Architect Agent | CrewAI setup, task routing, system design, integration |

### 8.2 Nhóm 2 — Schedule & Cost (4 Agents)

| Tên Agent | Nhiệm vụ chuyên biệt |
|-----------|---------------------|
| Cost Estimator Agent | OpenAI token budget, $2 hard limit, cost log/call, weekly report |
| Resource Optimizer Agent | Redis cache, Gemini fallback, batch API, token compression |
| Prompt Engineer Agent | A/B test prompts, prompt library YAML, version control |
| Tech Writer Agent | README, Swagger API docs, User Guide PDF, CHANGELOG |

### 8.3 Nhóm 3 — Quality (5 Agents)

| Tên Agent | Nhiệm vụ chuyên biệt |
|-----------|---------------------|
| QA Tester Agent | E2E integration tests, back-translation 50 test cases, regression |
| Security Auditor Agent | Bandit static analysis, OWASP Top 10, TLS 1.3 audit, SQL injection check |
| NLP Evaluator Agent | BLEU score, Rouge-L, WER measurement, glossary accuracy test |
| Diarization Specialist | pyannote.audio, DER < 15%, speaker alignment, timestamp accuracy |
| Spellcheck Agent | Soát lỗi chính tả transcript, chuẩn hóa tên riêng, glossary proper nouns |

---

## 9. Prompt Mẫu Cho Các AI Agent

### 9.1 Translation Agent — System Prompt

```
You are a professional translator specializing in Vietnamese, English, and Japanese business meeting transcripts.

RULES:
- Always check the Glossary first. If a term exists, use the exact translation provided.
- Preserve speaker labels exactly: [Speaker_1], [Manager], etc.
- Keep timestamps intact: [00:01:23]
- Output ONLY the translated text, no explanations.
- Translate in chunks of max 500 tokens.

GLOSSARY CONTEXT: {glossary_terms}
SOURCE LANGUAGE: {source_lang}  |  TARGET LANGUAGE: {target_lang}
TRANSCRIPT CHUNK: {transcript_chunk}
```

### 9.2 Summarization Agent — System Prompt

```
You are an expert meeting analyst. Extract structured information from meeting transcripts.

OUTPUT FORMAT (JSON only, no markdown):
{
  "key_points": ["string", ...],
  "decisions": ["string", ...],
  "action_items": [{"task":"string","owner":"string","deadline":"YYYY-MM-DD or null"}],
  "meeting_summary": "2-3 sentence summary"
}

RULES: key_points max 7 items | decisions = firm decisions only | Output ONLY valid JSON
Output language: {output_language} | TRANSCRIPT: {full_transcript}
```

### 9.3 Spellcheck Agent — System Prompt

```
You are a Vietnamese/English/Japanese text corrector for meeting transcripts.

RULES:
- Fix spelling errors ONLY, NEVER change meaning
- Preserve ALL timestamps [00:01:23] and speaker labels [Speaker_1]
- Standardize proper nouns using GLOSSARY — do NOT translate

GLOSSARY: {glossary_proper_nouns}
RAW TRANSCRIPT: {raw_transcript}
```

---

## 10. Dashboard & Tính Năng Giao Diện

- **Transcript real-time** — hiển thị chuyển đổi giọng nói tức thì
- **Audio Sync** — click vào từng đoạn văn bản để nghe lại âm thanh tại đúng thời điểm
- **Speaker Rename** — chỉnh sửa trực tiếp tên người nói (Speaker_1 → Giám đốc)
- **Summary Display** — hiển thị key points, decisions, action items
- **Bộ lọc động:**
  - Lọc theo ngôn ngữ (Việt / Anh / Nhật)
  - Lọc theo quyết định (Ngân sách, Nhân sự...)
  - Lọc theo Action Items chưa hoàn thành của nhân viên cụ thể
- **Timeline View** — danh sách cuộc họp theo dòng thời gian hoặc theo dự án
- **Export** — PDF / DOCX chuẩn biên bản doanh nghiệp
- **Email Notification** — thông báo tự động đến người tham gia

---

## 11. Input / Output

### Đầu vào (Input)
- File âm thanh: `.mp3`, `.wav`
- Luồng real-time từ Microphone (WebRTC)
- Từ điển thuật ngữ chuyên ngành (Glossary)

### Đầu ra (Output)
- Dashboard tương tác (Transcript & Summary)
- File biên bản chuyên nghiệp: `.pdf`, `.docx` chuẩn văn phòng
- Email thông báo tự động đến người tham gia

### Lưu trữ
- **MySQL:** Metadata, nội dung văn bản, danh sách người dùng, log hệ thống
- **Redis:** Cache dịch thuật, tăng tốc xử lý
- **Vector DB *(tuỳ chọn)*:** Lưu embedding để thực hiện Semantic Search

---

## 12. Bảo Mật & Ràng Buộc

- Bảo vệ API keys — KHÔNG commit lên GitHub
- Mã hóa file âm thanh, đảm bảo quyền riêng tư nội dung họp
- Phòng chống SQL injection
- Giới hạn chi phí API: **~$2/tháng** (hard limit trên OpenAI dashboard)
- Kiểm tra bảo mật OWASP Top 10

---

## 13. Hướng Dẫn Bắt Đầu & Môi Trường Cài Đặt

### 13.1 Python Environment

```bash
# Python 3.11+ với virtual environment
pip install crewai pyannote.audio openai noisereduce librosa fastapi celery redis
```

### 13.2 Frontend Environment

```bash
# Node.js 20+ cho React frontend (backend dùng Python FastAPI)
npx create-react-app multiminutes-ui --template typescript
```

### 13.3 Database & Services

```bash
# MySQL 8+ và Redis 7+ qua Docker Compose
docker-compose up -d mysql redis
```

### 13.4 API Keys (.env — KHÔNG commit)

```
OPENAI_API_KEY=...         # Đặt hard limit $2/tháng trên OpenAI dashboard
HUGGINGFACE_TOKEN=...      # Download pyannote.audio pretrained model
```

### 13.5 Thứ Tự Ưu Tiên Sprint 2

1. Hoàn thành **T-06**: Cài CrewAI, test 15 agents định tuyến đúng task
2. Hoàn thành **T-07**: Diarization DER < 15% trên audio test set
3. Bắt đầu **T-08**: TranslationService + Glossary injection + batch 500 token
4. **T-09**: Chạy A/B test prompt, chọn prompt tốt nhất (cải thiện ≥ 10%)
5. **T-10**: Đặt $2 hard limit + CostLogger middleware trước khi chạy nhiều API call

---

## 14. Definition of Done — Sprint 2

- 15 AI Agents định nghĩa đúng role/goal/backstory, task routing đúng **10/10 test case**
- **DER (Diarization Error Rate) < 15%** trên test audio 3 người và 5 người nói
- **BLEU score dịch thuật ≥ 0.65** trên 5 cặp ngôn ngữ
- Prompt A/B test: phiên bản tốt nhất cải thiện **≥ 10%** so với baseline
- Budget alert email nhận được trong **< 5 phút** khi mock trigger
- Cost log sai số **< 0.1%** so với actual OpenAI usage

---

## 15. Milestone Chính Cần Đạt

| Milestone | Tuần | Yêu cầu đạt được |
|-----------|------|------------------|
| **Milestone 1** | Tuần 3 | CrewAI 15 agents hoạt động · Diarization DER < 15% · Dịch thuật BLEU ≥ 0.65 |
| **Milestone 2** | Tuần 7 | Dashboard Beta · Xuất PDF/DOCX · Ghi họp nội bộ 1 thành công · Zero critical bug |
| **Milestone 3** | Tuần 10 | Demo live không crash · Đủ 3 biên bản thực tế · Nộp đầy đủ hồ sơ · Release v1.0.0 |

---

## 16. Quy Tắc Tư Duy Hệ Thống

- Luôn **phân chia task thành các module** nhỏ, rõ ràng
- Sử dụng **async processing** cho xử lý âm thanh
- **Tối ưu chi phí**: batch API, cache Redis, tái sử dụng kết quả
- Ưu tiên **structured JSOa output** cho mọi AI response
- Thiết kế **kiến trúc có khả năng mở rộng** (scalable)

---

## 17. Kết Quả Kỳ Vọng

- Giảm thời gian ghi chép biên bản **~80%**
- Cung cấp kho tri thức cuộc họp **có thể tìm kiếm ngữ nghĩa**
- **Theo dõi nhiệm vụ** trực tiếp từ nội dung cuộc họp

---

## 18. Định Hướng Phát Triển Tương Lai

- **Real-time AI assistant** hỗ trợ trong lúc họp
- **Voice command query** — tra cứu bằng giọng nói
- **Tích hợp Jira / Notion** — đồng bộ Action Items tự động
- **Advanced Semantic Search** — tìm kiếm theo ý nghĩa qua toàn bộ lịch sử họp

---

*MultiMinutes AI Team · Cập nhật tuần 3 · Chúc sprint thành công! 🚀*
