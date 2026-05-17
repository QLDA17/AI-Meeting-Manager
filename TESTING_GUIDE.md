# Hướng dẫn Test — Calendar & Meetings Flow

## Chuẩn bị

```bash
# Terminal 1: Backend
cd backend && source .venv/bin/activate && python -m uvicorn src.api.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```

Mở 2 trình duyệt (hoặc 1 normal + 1 incognito) đăng nhập 2 tài khoản khác nhau trong cùng 1 tổ chức.

---

## 1. Tạo Instant Live Meeting

**Mục đích:** Kiểm tra live meeting không cần chọn ngày/giờ.

**Steps:**
1. Vào `/meetings` → click "Tạo live"
2. Nhập tiêu đề, chọn nhóm, chọn participants
3. Click "Vào phòng họp"

**Kết quả mong đợi:**
- Không có trường ngày/giờ bắt buộc
- Meeting được tạo với `status = "live"`
- Redirect vào `/room/{code}`
- Code hiển thị là server-generated (3x3 format, ví dụ `ABC-DEF-GHI`)

---

## 2. Tạo Scheduled Meeting (Calendar)

**Mục đích:** Kiểm tra lên lịch cuộc họp từ Calendar.

**Steps:**
1. Vào `/calendar` → click "+" hoặc slot trên calendar
2. Nhập tiêu đề, chọn nhóm, chọn ngày/giờ
3. Chọn participants → click "Xác nhận lên lịch"

**Kết quả mong đợi:**
- Meeting hiện trên calendar với màu xanh dương (upcoming)
- Participants nhận notification "Bạn được mời tham gia cuộc họp"
- Participants có `invite_status = "pending"`

---

## 3. RSVP Flow

**Mục đích:** Kiểm tra chấp nhận/từ chối lời mời.

**Steps:**
1. Đăng nhập tài khoản participant (không phải người tạo)
2. Vào `/meetings/{meeting_id}` (scheduled meeting vừa tạo)
3. Thấy banner "Bạn được mời tham gia cuộc họp này"
4. Click "Chấp nhận tham gia"

**Kết quả mong đợi:**
- Banner chuyển thành badge xanh "Đã chấp nhận tham gia"
- Gọi `PUT /api/participants/{id}/rsvp` với `invite_status = "accepted"`

**Test từ chối:**
1. Tạo scheduled meeting mới
2. Đăng nhập participant khác
3. Click "Từ chối"
4. Badge chuyển thành đỏ "Đã từ chối tham gia"

---

## 4. Status Transition — Upcoming → Live

**Mục đích:** Kiểm tra meeting tự chuyển trạng thái.

**Cách A: Tự động (scheduler)**
1. Tạo scheduled meeting với `scheduled_start` cách hiện tại 1-2 phút
2. Chờ đến giờ

**Kết quả mong đợi:**
- Scheduler tự chuyển `upcoming → live`
- Calendar đổi màu từ xanh dương → đỏ
- MeetingList section "Đang diễn ra" xuất hiện meeting mới

**Cách B: Manual**
1. Tạo scheduled meeting
2. Đăng nhập organizer → click "Vào phòng họp"
3. MeetingRoom gọi `PUT /api/meetings/{id}` với `status = "live"`

**Kết quả mong đợi:**
- Calendar cập nhật ngay thành "Live" (màu đỏ)
- Không cần reload trang

---

## 5. Status Transition — Live → Completed

**Mục đích:** Kiểm tra finalize meeting.

**Steps:**
1. Vào phòng họp (live meeting)
2. Nói vài câu → click "Kết thúc cuộc họp"
3. Chờ AI xử lý xong

**Kết quả mong đợi:**
- Status chuyển: `live → processing → completed`
- MeetingList section "Cần xử lý" → "Đã hoàn tất"
- Audio player hiện trong MeetingDetail

---

## 6. Status Transition Rules (Validation)

**Mục đích:** Kiểm tra backend chặn chuyển status không hợp lệ.

**Steps:**
```bash
# Thử chuyển completed → live (không hợp lệ)
curl -X PUT http://localhost:8000/api/meetings/{completed_meeting_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "live"}'
```

**Kết quả mong đợi:**
- HTTP 400: `"Cannot transition from 'completed' to 'live'"`

**Test các transition hợp lệ:**
```bash
# upcoming → live ✓
# upcoming → canceled ✓
# live → completed ✓
# live → canceled ✓
# completed → (none) ✗
# canceled → (none) ✗
```

---

## 7. MeetingList Sections

**Mục đích:** Kiểm tra layout phân sections.

**Steps:**
1. Tạo nhiều meetings với các status khác nhau
2. Vào `/meetings`

**Kết quả mong đợi:**
- Section "Đang diễn ra": chỉ hiện live meetings, badge đỏ
- Section "Sắp tới": chỉ hiện upcoming meetings, badge xanh dương
- Section "Cần xử lý": chỉ hiện processing/queued, badge cam
- Section "Đã hoàn tất": hiện 6 card đầu, nút "Xem thêm"
- Section "Lỗi": chỉ hiện failed meetings, badge đỏ đậm

**Test status filter:**
1. Chọn "Sắp tới" trong dropdown filter
2. Chỉ hiện upcoming meetings

---

## 8. Reminder Notification

**Mục đích:** Kiểm tra reminder trước giờ họp.

**Steps:**
1. Tạo scheduled meeting cách hiện tại 10 phút
2. Chờ ~5 phút (scheduler check mỗi 60s)

**Kết quả mong đợi:**
- Participants nhận notification: "Cuộc họp 'X' bắt đầu trong ~15 phút"
- Notification có priority "urgent"
- Meeting có `reminder_sent = true` (không gửi lại)

---

## 9. Shared Components

**Mục đích:** Kiểm tra ScheduleMeetingModal và CreateMeeting dùng chung components.

**Steps:**
1. Mở `/calendar` → click tạo meeting → kiểm tra form
2. Mở `/meetings/create` → kiểm tra form

**Kết quả mong đợi:**
- Cả 2 có cùng UI cho: GroupSelector, ParticipantSelector, AIConfigSection
- Nếu sửa logic trong shared component → cả 2 đều cập nhật

---

## 10. Audio Recording (từ session trước)

**Mục đích:** Kiểm tra ghi âm và lưu trữ.

**Steps:**
1. Tạo live meeting → vào phòng
2. Bật micro → nói vài câu
3. Kết thúc meeting → chờ finalize

**Kết quả mong đợi:**
- Audio chunks được lưu trong `backend/uploads/audio/{meeting_id}/`
- Final audio file trong MeetingDetail
- AudioPlayer hiện và phát được

---

## 11. Meeting Edit từ MeetingList

**Mục đích:** Kiểm tra edit full (title, ngày, giờ, participants).

**Steps:**
1. Vào `/meetings`
2. Hover card → click icon sửa
3. Modal mở với đầy đủ fields

**Kết quả mong đợi:**
- EditMeetingModal mở (không phải EditTitleModal)
- Sửa được title, ngày, giờ, participants
- Save → card cập nhật

---

## 12. Meeting Code Uniqueness

**Mục đích:** Kiểm tra code không trùng.

**Steps:**
1. Tạo 10 meetings liên tiếp
2. Kiểm tra tất cả codes

**Kết quả mong đợi:**
- Mỗi meeting có code unique (3x3, ví dụ `ABC-DEF-GHI`)
- Không có code trùng nhau
- Code dùng chars: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bỏ I, O, 0, 1 để tránh nhầm)

---

## Bảng kiểm tra nhanh

| # | Test case | Trạng thái |
|---|-----------|-----------|
| 1 | Tạo instant live meeting | [ ] |
| 2 | Tạo scheduled meeting | [ ] |
| 3 | RSVP accept | [ ] |
| 4 | RSVP decline | [ ] |
| 5 | Auto status upcoming → live | [ ] |
| 6 | Manual status upcoming → live | [ ] |
| 7 | Finalize live → completed | [ ] |
| 8 | Block invalid transition | [ ] |
| 9 | MeetingList sections hiển thị đúng | [ ] |
| 10 | Status filter hoạt động | [ ] |
| 11 | Reminder notification | [ ] |
| 12 | Shared components hoạt động | [ ] |
| 13 | Audio recording + playback | [ ] |
| 14 | Edit meeting full từ list | [ ] |
| 15 | Meeting code unique | [ ] |
