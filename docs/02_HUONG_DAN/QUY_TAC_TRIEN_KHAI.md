# 📋 Quy Tắc Thực Hiện & Triết Lý Dự Án

> **Tài liệu này là linh hồn của dự án.** Bất kỳ kỹ sư, PM, hoặc agent mới nào phải đọc và tuân thủ trước khi đóng góp.

---

## 🎯 1) Bản sắc Dự án (Linh hồn)

MultiMinutes AI không chỉ là một app speech-to-text.
Đây là **hệ thống thông minh cuộc họp** biến các cuộc thảo luận thô thành:
- **Bản ghi đáng tin cậy** (trusted transcript)
- **Quyết định có cấu trúc** (structured decisions)  
- **Nhiệm vụ có thể hành động** (actionable tasks)
- **Hồ sơ hoạt động có thể kiểm toán** (auditable records)

### 🚀 Sứ mệnh cốt lõi
- Giảm 80% công sức ghi biên bản thủ công
- Bảo tồn trí nhớ tổ chức  
- Thực thi trách nhiệm (ai nói gì, ai chịu trách nhiệm gì, khi nào)

### ⚡ Nguyên tắc không thể thương lượng
- **Không thành công giả.**
- Mọi tuyên bố "hoàn thành" phải có thể tái tạo với commands và artifacts.

---

## 🧠 2) Triết lý Triển khai Chiến lược

### 📦 2.1 Chiến lược Giao hàng
- Xây dựng theo các lô nhỏ, có thể kiểm chứng.
- Mỗi lô phải có tiêu chí vào và ra rõ ràng.
- Ưu tiên "fallback an toàn + khả năng quan sát" hơn "con đường hoàn hảo mong manh."

### 🔍 2.2 Chiến lược Chất lượng
- Phân biệt rõ:
  - `PASS` (đáp ứng đầy đủ yêu cầu)
  - `PASS_WITH_LIMITATIONS` (sử dụng được với các ràng buộc đã biết)
  - `QC-BLOCKED` (chặn bên ngoài)
  - `FAIL` (phải sửa trước khi tiếp tục)

### ⚠️ 2.3 Chiến lược Rủi ro
- Coi hạn ngạch/chi phí của nhà cung cấp là ràng buộc vận hành, không phải thất bại của nhà phát triển.
- Luôn duy trì đường dẫn fallback để tránh sập pipeline.
- Ghi log và hiển thị trạng thái live/fallback trong cả API và UI.

---

## 👤 3) Tính cách và Phong cách làm việc của PM

Vai trò PM trong dự án này phải:
- **Nghiêm túc:** tiêu chuẩn rõ ràng, không có sự mơ hồ về chất lượng.
- **Cẩn thận:** xác minh bằng bằng chứng, không bao giờ tin vào tuyên bố bằng lời.
- **Súc tích:** trạng thái ngắn gọn, tín hiệu cao, không có nhiễu.
- **Quyết đoán:** đóng vòng lặp nhanh (pass/fail + hành động tiếp theo ngay lập tức).
- **Hệ thống:** suy nghĩ theo sự phụ thuộc, không phải các tác vụ cô lập.

### 📝 Phong cách giao tiếp PM
- Chỉ dùng định dạng 4 dòng:
  - Kết quả
  - Số liệu
  - Rủi ro  
  - Hành động tiếp theo

### ⚖️ Quy tắc hoạt động PM
- Nếu có sự không chắc chắn, chạy xác minh độc lập trước khi chấp nhận.

---

## 🛠️ 4) Quy ước Kỹ thuật

### 📁 4.1 Quy ước Đặt tên

#### Files và folders
- Python modules: `snake_case.py`
- Frontend components/pages: `PascalCase.tsx`
- Scripts: `run_<stage>_<purpose>.py`
- Docs: `UPPERCASE_OR_CLEAR_NAME.md` hoặc tên thường có nghĩa với ngày nếu là báo cáo

#### Symbols
- Classes: `PascalCase`
- Functions/variables: `snake_case` (Python), `camelCase` (TypeScript)
- Enums/constants: `UPPER_SNAKE_CASE`

#### Tasks
- Sử dụng IDs theo giai đoạn:
  - `R3-*` cho track provider/tin cậy
  - `R4-*` cho UI và sản phẩm hóa
- Trạng thái phải rõ ràng: `TODO`, `IN_PROGRESS`, `QC`, `DONE`, `QC-BLOCKED`

### 🌐 4.2 Quy ước API
- Giữ tên endpoint rõ ràng và ổn định.
- Trả về JSON thân thiện với máy có các trường có thể dự đoán.
- Hiển thị trạng thái xử lý (`queued`, `processing`, `completed`, `failed`).
- Bao gồm marker nguồn nếu có liên quan (`live`, `fallback`, `none`).

### 🎨 4.3 Quy ước Frontend
- Route guard theo vai trò là bắt buộc.
- UI phải degrade gracefully khi nhà cung cấp thất bại.
- Luôn bao gồm loading/error/empty states.
- Không bao giờ ẩn chế độ fallback; hiển thị rõ ràng.

---

## 📂 5) Cấu trúc Repository (Chuẩn)

Cấu trúc cấp cao mong đợi:
```
src/
├── api/           # Backend API entrypoints
├── providers/     # Provider adapters (Google/OpenAI/STT/Diarization)
├── translation/   # Translation logic và marker guard
├── diarization/   # Diarization logic
└── cost/          # Cost logging và alerting

frontend/
├── src/
│   ├── pages/     # Main screens
│   ├── components/ # Reusable UI components
│   └── context/   # Auth và app context

scripts/          # Reproducible test/smoke/benchmark scripts
tests/            # Unit/integration tests
docs/             # Project governance, plans, handovers, reports
data/             # Fixture data cho controlled benchmarks
```

**Quy tắc:** Không tạo folders ad-hoc khi có domain folder hiện có phù hợp.

---

## 📚 6) Hợp đồng Documentation

Các file này là bắt buộc và phải được cập nhật:
- `docs/TODO.md` → Hàng đợi thực thi active
- `docs/WORKLOG.md` → Lịch sử hoàn thành với bằng chứng
- `docs/PM_MEMORY.md` → Baseline memory của PM
- `docs/PM_PROGRESS_REPORT_YYYY-MM-DD.md` → Báo cáo tiến độ hiện tại
- `docs/PM_HANDOVER_LOG_YYYY-MM-DD.md` → Chuyển giao liên tục

Tùy chọn nhưng khuyến nghị mỗi milestone:
- Một file báo cáo tập trung cho mỗi cổng chất lượng quan trọng.

---

## 🔄 7) Giao thức Chuyển giao

Khi chuyển giao công việc cho kỹ sư/agent khác:
1. Đưa thứ tự đọc:
   - Log chuyển giao PM
   - Log memory PM  
   - Báo cáo tiến độ
   - TODO
   - WORKLOG
2. Yêu cầu bằng chứng command-based cho mọi tuyên bố.
3. Yêu cầu tuyên bố rõ ràng: mock vs live mode.
4. Yêu cầu tóm tắt handoff 4 dòng.

**Không có chuyển giao nào được chấp nhận mà không có bằng chứng có thể tái tạo.**

---

## 🎯 8) Cổng Thực thi (Thực tế)

Trước khi đánh dấu bất kỳ tác vụ nào `DONE`, xác minh:
- build/lint/test pass nếu có
- smoke command pass
- không có warning/error quan trọng chưa giải quyết
- docs được cập nhật (`TODO` + `WORKLOG`)
- PM xác nhận trạng thái cuối cùng

---

## 🏭 9) Chiến lược Provider (Hiện tại)

### 🌟 **Đường dẫn cloud chính:**
- Google Gemini (hướng dẫn active hiện tại).

### 🔄 **Đường dẫn thứ cấp/trì hoãn:**
- OpenAI live integration (chỉ tiếp tục khi quota/billing có sẵn và Director xác nhận).

### 📋 **Chính sách:**
- Giữ abstraction provider nguyên vẹn.
- Không bao giờ hard-couple business logic với SDK của một nhà cung cấp.

---

## ✨ 10) "Tốt" trông như thế nào trong dự án này

Một đóng góp chất lượng cao ở đây là:
- **Kỹ thuật đúng**
- **Có thể đo lường**
- **Có thể đảo ngược nếu cần**
- **Được tài liệu hóa cho staff thay thế**
- **Vững chắc dưới failures quota/latency**

**Nếu nó chỉ hoạt động trong điều kiện hoàn hảo, nó chưa xong.**

---

## 🚀 11. Quick Start cho Staff mới

1. Đọc file này trước tiên.
2. Chạy:
   - `python -m pytest -q`
   - frontend build command
   - active smoke script từ phase TODO hiện tại
3. Chọn mục `IN_PROGRESS` ưu tiên cao nhất.
4. Giao hàng với tóm tắt 4 dòng + output command.

---

## 🔄 12. Vòng lặp Thực thi (Bắt buộc)

Mỗi chu kỳ phải theo:

1. **PM giao tác vụ theo lô** (với scope + ràng buộc)
2. **Kỹ sư/Agent thực thi**
3. **Kỹ sư gửi:**
   - code
   - output command
   - screenshots (nếu là UI)
4. **PM thực hiện QC:**
   - xác minh commands
   - xác minh behavior
5. **PM trả về:**
   - PASS / FAIL / QC-BLOCKED
6. **Hành động tiếp theo ngay lập tức**

**Không có khoảng trống idle được phép giữa các chu kỳ.**

---

## 🤖 13. Quy tắc nghiêm ngặt cho AI Agent

- **KHÔNG** tuyên bố hoàn thành mà không có:
  - command runnable
  - output visible

- **KHÔNG** tạo cấu trúc giả mà không có thực thi

- **Mọi tính năng phải bao gồm:**
  - điểm vào
  - test hoặc smoke command

- **Thời gian tốn không quan trọng; chỉ có output tính.**

**Vi phạm = tự động FAIL**

---

## ⏱️ 14. Tốc độ thực thi mong đợi (Hướng dẫn)

- **Tính năng backend đơn giản:** 30–90 phút
- **Module trung bình (provider/service):** 2–4 giờ
- **Nền tảng UI (multi-page):** 4–8 giờ

**Nếu không có tiến độ rõ ràng sau 2 giờ:**
- phải báo cáo blocker
- phải hiển thị output partial

---

## 🌐 15. Định nghĩa Mode

- **LIVE:**
  - API real, data real

- **MOCK:**
  - response simulated, không có external call

- **HYBRID:**
  - mix live + fallback

**Mọi response phải bao gồm:**
mode + provider source

---

*MultiMinutes AI - Xây dựng với chất lượng và minh bạch* 🚀

*Cập nhật lần cuối: 08/04/2026*
