# 👥 Vai Trò Trong Hệ Thống - MultiMinutes AI

> **Mô hình phân quyền:** 4 cấp độ - Super Admin, Group Admin, Member, Viewer

---

## 📋 BẢNG TỔNG QUAN VAI TRÒ

| Vai trò | Ký hiệu | Phạm vi | Mô tả |
|---------|---------|---------|-------|
| **Super Admin** | 👑 | Toàn hệ thống | Quản trị viên cao nhất, quản lý mọi thứ |
| **Group Admin** | 👤 | Trong group được giao | Quản lý group: members, meetings, content |
| **Member** | 👤 | Trong group tham gia | Nhân viên bình thường, tham gia meetings |
| **Viewer** | 👁️ | Trong group tham gia | Chỉ xem, không chỉnh sửa |

---

# ============================================
# 👑 SUPER ADMIN - QUẢN TRỊ VIÊN HỆ THỐNG
# ============================================

## 🎯 Mô tả
- Là người **quản lý toàn bộ hệ thống** MultiMinutes AI
- Có quyền **cao nhất** - có thể làm mọi thứ
- Thường là: IT Manager, CTO, hoặc người vận hành hệ thống

## ✅ ĐƯỢC LÀM GÌ

### 1️⃣ Quản lý Users (Toàn hệ thống)

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách tất cả users | Xem 24+ users với thông tin chi tiết |
| Tạo user mới | Thêm user vào hệ thống, gán role |
| Sửa thông tin user | Đổi name, email, role của user khác |
| Vô hiệu hóa user | Khóa user không cho đăng nhập |
| Kích hoạt lại user | Mở khóa user bị disable |
| Xóa user vĩnh viễn | Xóa hẳn user khỏi hệ thống |
| Đặt lại mật khẩu | Reset password cho user quên mật khẩu |
| Xem lịch sử hoạt động | Biết user làm gì, online khi nào |
| Gán user vào groups | Thêm user vào các groups |
| Bulk actions | Chọn nhiều user → change role, deactivate, delete |

### 2️⃣ Quản lý Groups (Toàn hệ thống)

| Chức năng | Mô tả |
|-----------|-------|
| Xem tất cả groups | Phòng Kinh Doanh, Kỹ Thuật, Marketing... |
| Tạo group mới | Tên, mô tả, icon, privacy level |
| Sửa thông tin group | Đổi tên, mô tả, privacy |
| Xóa group | Soft delete group không dùng nữa |
| Gán Group Admin | Chỉ định ai là admin của group |
| Transfer ownership | Chuyển quyền sở hữu group cho người khác |
| Set storage limit | Giới hạn dung lượng cho mỗi group |
| Xem thống kê group | Meetings count, members count, cost |

### 3️⃣ Quản lý Chi phí AI

| Chức năng | Mô tả |
|-----------|-------|
| Xem tổng chi phí | Total cost toàn hệ thống |
| Cài monthly budget | Giới hạn chi phí hàng tháng (VD: $2.00) |
| Cost by provider | Google STT, Gemini, OpenAI, Whisper - mỗi cái tốn bao nhiêu |
| Cost by group | Mỗi group tốn bao nhiêu tiền AI |
| Cost by user | Mỗi user tốn bao nhiêu tiền AI |
| Cost log chi tiết | Từng request AI: model gì, tokens bao nhiêu, cost bao nhiêu |
| Cảnh báo budget | Email alert khi đạt 80% budget |
| Hard limit | Tự động dừng xử lý khi vượt 100% budget |
| Export CSV | Tải báo cáo chi phí về máy |
| Cost projection | Dự kiến chi phí cuối tháng |

### 4️⃣ Insights & Analytics

| Chức năng | Mô tả |
|-----------|-------|
| Total meetings | Tổng số meetings toàn hệ thống |
| Total time | Tổng thời gian họp |
| Active users | Số users đang hoạt động |
| Actions completion | Tỷ lệ action items hoàn thành |
| Meetings trend | Biểu đồ meetings theo ngày/tuần/tháng |
| AI provider usage | Pie chart phân bổ AI providers |
| Top groups | Groups hoạt động nhiều nhất |
| Top users | Users đóng góp nhiều nhất |
| Avg processing time | Thời gian TB xử lý 1 meeting |
| Quality metrics | STT accuracy, diarization accuracy, summary quality |
| Compare periods | So sánh tháng này với tháng trước |
| Export report | Tải báo cáo analytics |

### 5️⃣ System Settings

| Tab | Cấu hình |
|-----|----------|
| **AI Providers** | • Chọn LLM provider (Google/OpenAI)<br>• Chọn STT provider (Google/Whisper)<br>• Chọn Diarization provider (Pyannote)<br>• Chọn Fallback provider<br>• Quản lý API keys (Google, OpenAI, HuggingFace)<br>• Test API keys<br>• Cấu hình model (temperature, max tokens, timeout)<br>• Model health monitoring |
| **Budget & Alerts** | • Monthly budget limit<br>• Alert threshold (%)<br>• Hard limit (%)<br>• Notification email<br>• Webhook URL (Slack)<br>• Toggle notification channels |
| **General** | • Default language<br>• Default timezone<br>• Date format<br>• Auto-summarize toggle<br>• Auto-extract actions toggle<br>• Auto-translate toggle<br>• Max upload size<br>• Meeting retention period<br>• Default group storage limit |
| **Security** | • JWT secret key (regenerate)<br>• Token expiry time<br>• Max login attempts<br>• Lockout duration<br>• Email verification toggle<br>• 2FA toggle<br>• API request logging<br>• CORS origins |

### 6️⃣ Giám sát hệ thống

| Chức năng | Mô tả |
|-----------|-------|
| Health check | Kiểm tra DB, API, external services |
| API request logs | Xem lịch sử gọi API |
| Error logs | Xem lỗi hệ thống |
| Active sessions | Xem ai đang đăng nhập |
| Processing queue | Xem meetings đang xử lý |
| System performance | CPU, memory, response time |

## ❌ KHÔNG BỊ GIỚI HẠN GÌ
- Super Admin có thể làm **MỌI THỨ** trong hệ thống
- Không có chức năng nào bị chặn

---

# ============================================
# 👤 GROUP ADMIN - QUẢN TRỊ VIÊN GROUP
# ============================================

## 🎯 Mô tả
- Là người **quản lý một group cụ thể**
- Được Super Admin hoặc Group Owner chỉ định
- Có quyền **trong phạm vi group** được giao
- Thường là: Team Lead, Project Manager, Trưởng phòng

## ✅ ĐƯỢC LÀM GÌ (Trong group của mình)

### 1️⃣ Quản lý Members của Group

| Chức năng | Mô tả |
|-----------|-------|
| Xem danh sách members | Ai đang trong group, vai trò gì |
| Mời người vào group | Gửi invite qua email |
| Hủy lời mời | Cancel pending invite |
| Gửi lại lời mời | Resend invite |
| Gán vai trò | Admin, Member, Viewer |
| Xóa member | Remove người khỏi group |
| Xem activity | Member đó tham gia bao nhiêu meetings, last active khi nào |

### 2️⃣ Quản lý Meetings trong Group

| Chức năng | Mô tả |
|-----------|-------|
| Xem meetings group | Danh sách meetings của group |
| Tạo meeting mới | Điền info, upload audio |
| Sửa thông tin meeting | Đổi title, date, attendees |
| Xóa meeting | Soft delete meeting |
| Gán action items | Giao task cho members trong group |
| Star meeting | Đánh dấu meeting quan trọng |
| Compare meetings | So sánh meetings trong group |

### 3️⃣ Group Chat

| Chức năng | Mô tả |
|-----------|-------|
| Gửi tin nhắn | Chat với members trong group |
| Reply messages | Reply tin nhắn cụ thể |
| Mention members | @username để thông báo |
| Link meetings | Gắn link meeting vào chat |
| Emoji reactions | Thả tim, 👍 cho messages |
| Pin messages | Ghim tin nhắn quan trọng |

### 4️⃣ Xem Thống kê Group

| Chức năng | Mô tả |
|-----------|-------|
| Meetings count | Tổng số meetings của group |
| Total time | Tổng thời gian họp |
| Avg attendees | TB số người tham gia |
| Action completion | Tỷ lệ actions hoàn thành |
| Meetings per week | Chart meetings theo tuần |
| Top active members | Ai tham gia nhiều nhất |
| Avg duration | TB thời lượng cuộc họp |
| Top topics | Chủ đề meetings phổ biến |
| AI usage | Provider nào được dùng nhiều |
| Group cost | Group tốn bao nhiêu tiền AI |

### 5️⃣ Quản lý Files

| Chức năng | Mô tả |
|-----------|-------|
| Xem files group | Tất cả files của group |
| Upload files | Upload documents, notes |
| Download files | Tải files về máy |
| Delete files | Xóa files không cần |
| Link to meeting | Gắn file với meeting cụ thể |
| View storage usage | Group đã dùng bao nhiêu dung lượng |

### 6️⃣ Cài đặt Group

| Chức năng | Mô tả |
|-----------|-------|
| Đổi tên group | Sửa tên, mô tả, icon |
| Đổi privacy | Public, Private, Secret |
| Auto-summarize | Bật/tắt tự động tóm tắt |
| Auto-extract actions | Bật/tắt tự động trích xuất actions |
| Auto-translate | Bật/tắt tự động dịch thuật |
| Storage limit | Cài giới hạn dung lượng |
| Retention period | Cài thời gian lưu meetings |
| Notifications | Cấu hình thông báo cho group |

## ❌ KHÔNG ĐƯỢC LÀM

| Chức năng | Lý do |
|-----------|-------|
| Quản lý users hệ thống | Chỉ Super Admin làm được |
| Tạo group mới | Chỉ Super Admin làm được |
| Xóa group | Chỉ Super Admin / Owner làm được |
| Xem costs hệ thống | Chỉ thấy costs của group mình |
| System settings | Chỉ Super Admin làm được |
| Analytics toàn hệ thống | Chỉ thấy analytics của group mình |
| Quản lý groups khác | Chỉ quản lý group được giao |

---

# ============================================
# 👤 MEMBER - THÀNH VIÊN BÌNH THƯỜNG
# ============================================

## 🎯 Mô tả
- Là **nhân viên bình thường** sử dụng hệ thống
- Được mời vào group bởi Group Admin
- Sử dụng hàng ngày để tham gia meetings, xem biên bản, thực hiện tasks
- Chiếm **đa số** users trong hệ thống

## ✅ ĐƯỢC LÀM GÌ

### 1️⃣ Dashboard Cá Nhân

| Chức năng | Mô tả |
|-----------|-------|
| Xem thống kê cá nhân | Meetings tham gia, total time, actions pending |
| Upcoming meetings | Meetings sắp tới trong groups |
| Recent notifications | Thông báo gần đây |
| My action items | Tasks quá hạn, sắp hết hạn, đúng hạn |
| Activity chart | Hoạt động 7 ngày qua |
| Quick Actions | Upload Audio, Create Meeting, Search |

### 2️⃣ Tham gia Groups

| Chức năng | Mô tả |
|-----------|-------|
| Xem groups của mình | Danh sách groups được mời vào |
| Xem meetings group | List meetings trong group |
| Filter meetings | By status, date, search |
| Click meeting → Detail | Xem chi tiết meeting |

### 3️⃣ Xem Meeting Detail

| Tab | Được làm gì |
|-----|-------------|
| 📝 **Summary** | • Xem tổng quan meeting<br>• Xem key points, decisions<br>• Xem action items<br>• Star meeting<br>• Quick chat AI |
| 🗣️ **Transcript** | • Xem toàn bộ transcript<br>• Nghe audio (play, pause, seek, speed)<br>• Lọc theo speaker<br>• Search trong transcript<br>• Xem confidence score<br>• Copy text<br>• Pin segments<br>• Export transcript |
| ✅ **Actions** | • Xem action items từ meeting<br>• **Mark Done** nếu được giao task<br>• Add comment<br>• Export actions |
| 💬 **Chat AI** | • Hỏi AI về nội dung meeting<br>• Xem gợi ý câu hỏi<br>• Copy câu trả lời |
| 📊 **Quality** | • Xem STT accuracy<br>• Xem diarization accuracy<br>• Xem summary quality<br>• Xem processing timeline<br>• Xem cost<br>• Xem low confidence segments |

### 4️⃣ Upload Audio / Tạo Meeting

| Bước | Được làm gì |
|------|-------------|
| Step 1: Basic Info | • Điền tiêu đề<br>• Chọn group<br>• Chọn ngày giờ<br>• Chọn thời lượng<br>• Điền địa điểm, mô tả<br>• Chọn attendees |
| Step 2: Upload Audio | • Drag & drop file<br>• Browse file<br>• Xem progress upload<br>• Preview audio<br>• Xóa file |
| Step 3: AI Options | • Chọn STT provider<br>• Chọn ngôn ngữ<br>• Bật/tắt speaker detection<br>• Bật/tắt summarize<br>• Bật/tắt extract actions<br>• Xem thời gian & chi phí dự kiến |
| Submit | • Xem processing queue<br>• Xem tiến độ, ETA |

### 5️⃣ My Actions (Quan trọng!)

| Chức năng | Mô tả |
|-----------|-------|
| Xem TẤT CẢ actions của mình | Từ mọi groups tham gia |
| 🔴 Overdue | Actions quá hạn → Mark Done, Comment, Escalate |
| 🟡 Due Soon | Actions sắp hết hạn → Mark Done, Comment |
| 🟢 On Track | Actions đúng hạn → Mark Done, Comment |
| ✅ Completed | Actions đã xong → Xem history |
| Filters | By status, group, priority, date |
| Sort | By deadline, priority, created date |
| Search | Tìm trong actions |
| Tạo thủ công | Tự tạo action cho mình (title, deadline, priority) |

### 6️⃣ Starred Meetings

| Chức năng | Mô tả |
|-----------|-------|
| Xem meetings đã star | Danh sách meetings đánh dấu |
| Filter by group | Lọc theo group |
| Sort by date | Sắp xếp theo ngày |
| Unstar | Bỏ đánh dấu |

### 7️⃣ Notifications

| Loại thông báo | Khi nào nhận |
|----------------|--------------|
| 🔴 Action Overdue | Khi action item quá hạn |
| ✅ Meeting Processed | Khi AI xử lý xong meeting |
| 📤 Export Ready | Khi file export sẵn sàng tải |
| 👤 New Action Assigned | Khi được giao task mới |
| 👋 Welcome to Group | Khi được mời vào group mới |
| 💬 Mentioned in Chat | Khi ai đó @mention mình |

| Chức năng | Mô tả |
|-----------|-------|
| Xem notifications | Danh sách thông báo |
| Filter by type | Actions, Meetings, Exports, Chat |
| Filter by read | Unread, Read, All |
| Mark as read | Đánh dấu đã đọc |
| Mark all read | Đánh dấu tất cả |
| Clear all | Xóa tất cả |
| Delete | Xóa thông báo cụ thể |

### 8️⃣ Group Chat

| Chức năng | Mô tả |
|-----------|-------|
| Gửi tin nhắn | Chat với members trong group |
| Reply messages | Reply tin nhắn cụ thể |
| Mention members | @username để thông báo |
| Link meetings | Gắn link meeting vào chat |
| Emoji reactions | Thả tim, 👍 cho messages |
| Xem online members | Ai đang online trong group |

### 9️⃣ Group Stats

| Chức năng | Mô tả |
|-----------|-------|
| Meetings count | Tổng meetings group |
| Total time | Tổng thời gian họp |
| Avg attendees | TB số người tham gia |
| Action completion | Tỷ lệ actions hoàn thành |
| Meetings per week | Chart meetings theo tuần |
| Top active members | Ai tham gia nhiều nhất |
| Avg duration | TB thời lượng cuộc họp |
| Top topics | Chủ đề meetings phổ biến |
| AI usage | AI provider usage trong group |
| Group cost | Cost của group |

### 🔟 Files của Group

| Chức năng | Mô tả |
|-----------|-------|
| Xem files | Tất cả files của group |
| Download files | Tải files về |
| Preview | Xem trước file (nếu hỗ trợ) |
| Xem source meeting | File từ meeting nào |
| Xem download count | Đã tải bao nhiêu lần |
| Storage usage | Group đã dùng bao nhiêu dung lượng |

### 1️⃣1️⃣ Compare Meetings

| Chức năng | Mô tả |
|-----------|-------|
| Chọn 2+ meetings | Meetings trong cùng group |
| So sánh metrics | Duration, speakers, key points, decisions, actions, accuracy, quality, time, cost |
| Common topics | Chủ đề chung giữa meetings |
| Trend analysis | Xu hướng thay đổi |

### 1️⃣2️⃣ Profile & Account

| Chức năng | Mô tả |
|-----------|-------|
| Xem profile | Name, email, role, avatar, groups, stats |
| Đổi mật khẩu | Current password → New password |
| Sửa thông tin | Name, email (cần verify), avatar |
| Activity log | Meetings đã tạo, tham gia, actions đã xong |

### 1️⃣3️⃣ Help Center

| Chức năng | Mô tả |
|-----------|-------|
| FAQ | Câu hỏi thường gặp |
| Hướng dẫn | Upload audio, xem meeting, chat AI, export |
| API Docs | Tài liệu API |
| Video tutorials | Video hướng dẫn |
| Contact Support | Liên hệ hỗ trợ |
| Send Feedback | Gửi góp ý |

## ❌ KHÔNG ĐƯỢC LÀM

| Chức năng | Lý do |
|-----------|-------|
| Quản lý users hệ thống | Không phải admin |
| Tạo group mới | Chỉ Admin làm được |
| Xóa group | Chỉ Admin làm được |
| Quản lý members group | Chỉ Group Admin làm được |
| Mời/xóa member | Chỉ Group Admin làm được |
| Sửa meeting | Chỉ Admin group làm được |
| Xóa meeting | Chỉ Admin group làm được |
| Gán actions cho người khác | Chỉ Admin group làm được |
| Xem costs hệ thống | Không phải admin |
| System settings | Không phải admin |
| Analytics hệ thống | Chỉ thấy stats group mình |

---

# ============================================
# 👁️ VIEWER - NGƯỜI CHỈ XEM
# ============================================

## 🎯 Mô tả
- Là người **chỉ có quyền xem** - read-only
- Được mời vào group với vai trò Viewer
- Không thể tạo, sửa, xóa bất cứ thứ gì
- Thường là: Thực tập sinh, Đối tác, Stakeholder

## ✅ ĐƯỢC LÀM GÌ

| Chức năng | Mô tả |
|-----------|-------|
| Xem meetings group | List meetings trong group |
| Xem meeting detail | Summary, Transcript, Quality |
| Xem transcript | Đọc transcript, nghe audio |
| Xem actions của mình | Chỉ actions được giao cho mình |
| Chat với AI | Hỏi AI về meeting |
| Group chat | Xem và gửi tin nhắn trong group chat |
| Group stats | Xem thống kê group |
| Files | Xem và download files |
| Notifications | Nhận thông báo |
| Profile | Xem/sửa profile cá nhân, đổi mật khẩu |

## ❌ KHÔNG ĐƯỢC LÀM

| Chức năng | Lý do |
|-----------|-------|
| Upload audio | Chỉ Member+ làm được |
| Tạo meeting | Chỉ Member+ làm được |
| Sửa meeting | Chỉ Admin làm được |
| Xóa meeting | Chỉ Admin làm được |
| Star meeting | ❌ (có thể được bật) |
| Export PDF/DOCX | ❌ (có thể được bật) |
| Mark action done | Chỉ làm actions của mình |
| Gán actions | Chỉ Admin làm được |
| Group files upload | Chỉ Member+ upload được |
| Group settings | Chỉ Admin làm được |

---

# ============================================
# 📊 BẢNG SO SÁNH ĐẦY ĐỦ
# ============================================

| # | Chức năng | 👑 Super Admin | 👤 Group Admin | 👤 Member | 👁️ Viewer |
|---|-----------|:---:|:---:|:---:|:---:|
| **AUTHENTICATION** |
| 1 | Đăng nhập / Đăng xuất | ✅ | ✅ | ✅ | ✅ |
| 2 | Đổi mật khẩu | ✅ | ✅ | ✅ | ✅ |
| 3 | Quên mật khẩu (reset) | ✅ | ✅ | ✅ | ✅ |
| 4 | Sửa profile cá nhân | ✅ | ✅ | ✅ | ✅ |
| **DASHBOARD** |
| 5 | Xem dashboard hệ thống | ✅ | ❌ | ❌ | ❌ |
| 6 | Xem dashboard cá nhân | ✅ | ✅ | ✅ | ❌ |
| 7 | Xem upcoming meetings | ✅ | ✅ | ✅ | ❌ |
| 8 | Xem my action items | ✅ | ✅ | ✅ | ❌ |
| 9 | Xem notifications | ✅ | ✅ | ✅ | ✅ |
| 10 | Quick Actions bar | ✅ | ✅ | ✅ | ❌ |
| **GROUPS - HỆ THỐNG** |
| 11 | Xem tất cả groups | ✅ | ❌ | ❌ | ❌ |
| 12 | Tạo group mới | ✅ | ❌ | ❌ | ❌ |
| 13 | Sửa group info | ✅ | ❌ | ❌ | ❌ |
| 14 | Xóa group | ✅ | ❌ | ❌ | ❌ |
| 15 | Set storage limit | ✅ | ❌ | ❌ | ❌ |
| **GROUPS - TRONG GROUP** |
| 16 | Xem meetings group | ✅ | ✅ | ✅ | ✅ |
| 17 | Xem members group | ✅ | ✅ | ✅ | ✅ |
| 18 | Group chat | ✅ | ✅ | ✅ | ✅ |
| 19 | Group stats | ✅ | ✅ | ✅ | ✅ |
| 20 | Group files (xem/download) | ✅ | ✅ | ✅ | ✅ |
| 21 | Group files (upload) | ✅ | ✅ | ✅ | ❌ |
| 22 | Group settings | ✅ | ✅ | ❌ | ❌ |
| **MEMBERS** |
| 23 | Mời người vào group | ✅ | ✅ | ❌ | ❌ |
| 24 | Xóa member khỏi group | ✅ | ✅ | ❌ | ❌ |
| 25 | Đổi vai trò member | ✅ | ✅ | ❌ | ❌ |
| 26 | Hủy lời mời | ✅ | ✅ | ❌ | ❌ |
| **MEETINGS** |
| 27 | Xem meeting detail | ✅ | ✅ | ✅ | ✅ |
| 28 | Xem transcript | ✅ | ✅ | ✅ | ✅ |
| 29 | Xem summary | ✅ | ✅ | ✅ | ✅ |
| 30 | Chat với AI | ✅ | ✅ | ✅ | ✅ |
| 31 | Star meeting | ✅ | ✅ | ✅ | ❌ |
| 32 | Export PDF/DOCX | ✅ | ✅ | ✅ | ❌ |
| 33 | Compare meetings | ✅ | ✅ | ✅ | ✅ |
| 34 | Tạo meeting mới | ✅ | ✅ | ✅ | ❌ |
| 35 | Upload audio | ✅ | ✅ | ✅ | ❌ |
| 36 | Sửa meeting info | ✅ | ✅ | ❌ | ❌ |
| 37 | Xóa meeting | ✅ | ✅ | ❌ | ❌ |
| 38 | Retry failed meeting | ✅ | ✅ | ❌ | ❌ |
| **ACTIONS** |
| 39 | Xem actions toàn hệ thống | ✅ | ❌ | ❌ | ❌ |
| 40 | Xem actions group | ✅ | ✅ | ❌ | ❌ |
| 41 | Xem actions của mình | ✅ | ✅ | ✅ | ✅ |
| 42 | Mark done (actions mình) | ✅ | ✅ | ✅ | ✅ |
| 43 | Gán action cho người khác | ✅ | ✅ | ❌ | ❌ |
| 44 | Tạo action thủ công | ✅ | ✅ | ✅ | ❌ |
| 45 | Escalate overdue action | ✅ | ✅ | ✅ | ❌ |
| 46 | Add comment on action | ✅ | ✅ | ✅ | ❌ |
| **USERS (Hệ thống)** |
| 47 | Xem danh sách users | ✅ | ❌ | ❌ | ❌ |
| 48 | Tạo user mới | ✅ | ❌ | ❌ | ❌ |
| 49 | Sửa user info | ✅ | ❌ | ❌ | ❌ |
| 50 | Deactivate user | ✅ | ❌ | ❌ | ❌ |
| 51 | Delete user | ✅ | ❌ | ❌ | ❌ |
| 52 | Reset password user | ✅ | ❌ | ❌ | ❌ |
| 53 | Bulk actions users | ✅ | ❌ | ❌ | ❌ |
| **COSTS** |
| 54 | Xem total costs hệ thống | ✅ | ❌ | ❌ | ❌ |
| 55 | Xem costs theo group | ✅ | Chỉ group mình | ❌ | ❌ |
| 56 | Xem costs theo user | ✅ | ❌ | ❌ | ❌ |
| 57 | Cost log chi tiết | ✅ | ❌ | ❌ | ❌ |
| 58 | Set budget limit | ✅ | ❌ | ❌ | ❌ |
| 59 | Set alert threshold | ✅ | ❌ | ❌ | ❌ |
| 60 | Export cost CSV | ✅ | ❌ | ❌ | ❌ |
| **ANALYTICS** |
| 61 | System-wide insights | ✅ | ❌ | ❌ | ❌ |
| 62 | Group stats chi tiết | ✅ | ✅ | ✅ | ✅ |
| 63 | Personal analytics | ✅ | ✅ | ✅ | ❌ |
| 64 | Compare periods | ✅ | ❌ | ❌ | ❌ |
| 65 | Export analytics report | ✅ | ❌ | ❌ | ❌ |
| **SETTINGS** |
| 66 | AI Providers config | ✅ | ❌ | ❌ | ❌ |
| 67 | Budget settings | ✅ | ❌ | ❌ | ❌ |
| 68 | General settings | ✅ | ❌ | ❌ | ❌ |
| 69 | Security settings | ✅ | ❌ | ❌ | ❌ |
| 70 | Notification preferences | ✅ | ✅ | ✅ | ✅ |
| **HELP** |
| 71 | Help Center | ✅ | ✅ | ✅ | ✅ |
| 72 | API Docs | ✅ | ✅ | ✅ | ✅ |
| 73 | Contact Support | ✅ | ✅ | ✅ | ✅ |
| 74 | Send Feedback | ✅ | ✅ | ✅ | ✅ |

---

# ============================================
# 🔄 USER FLOWS ĐIỂN HÌNH
# ============================================

## 👑 Super Admin Flow
```
Login → Dashboard (system stats)
   ↓
Check Users → Create new user → Assign to groups
   ↓
Check Costs → Review budget → Set alert threshold
   ↓
Check Insights → Compare periods → Export report
   ↓
System Settings → Update AI provider → Test API key → Save
```

## 👤 Group Admin Flow
```
Login → Dashboard (personal + group stats)
   ↓
Open Group "Phòng Kinh Doanh"
   ↓
Members → Invite new member → Assign role: Member
   ↓
Meetings → Create meeting → Upload audio → Set AI options → Submit
   ↓
Meeting processed → Review summary → Assign actions to members
   ↓
Group Chat → Discuss meeting outcomes with team
```

## 👤 Member Flow
```
Login → Dashboard
   ↓
Check Notifications → See "New Action Assigned" → Click → View task
   ↓
Open Group "Phòng Kinh Doanh" → Meetings → Click latest meeting
   ↓
Meeting Detail → Summary tab → Read key points & decisions
   ↓
Transcript tab → Listen audio → Read transcript
   ↓
Actions tab → See task assigned → Mark Done → Add comment
   ↓
Chat AI tab → Ask "Who is responsible for deployment?"
   ↓
My Actions → See all tasks → Filter Overdue → Mark another Done
   ↓
Upload → Create new meeting → Upload audio → Watch progress
   ↓
Notification → "Meeting processed" → Click → View → Export PDF
```

## 👁️ Viewer Flow
```
Login → Dashboard (limited)
   ↓
Open Group "Phòng Kỹ Thuật"
   ↓
Meetings → Click meeting → Read summary & transcript
   ↓
Chat AI → Ask question about meeting
   ↓
Group Chat → Read messages → Send message
   ↓
Files → View & download files
```

---

# ============================================
# 📌 GHI CHÚ QUAN TRỌNG
# ============================================

## 🔄 Phân cấp quyền
```
Super Admin
   └── Có thể làm mọi thứ
   └── Quản lý tất cả Group Admins
       └── Group Admin
           └── Quản lý Members trong group
           └── Quản lý Meetings trong group
               └── Member
                   └── Tham gia meetings
                   └── Thực hiện actions
                   └── Upload audio
                       └── Viewer
                           └── Chỉ xem content
```

## 🔒 Nguyên tắc bảo mật
1. **User chỉ thấy groups mình tham gia** - Không thấy groups khác
2. **User chỉ thấy actions của mình** - Không thấy actions người khác
3. **Meeting chỉ visible với members của group đó**
4. **Cost data chỉ Admin thấy** - User thường không thấy chi phí
5. **Settings chỉ Super Admin** - Không ai khác truy cập được

## 📈 Số lượng users điển hình
| Role | Số lượng | Tỷ lệ |
|------|----------|-------|
| Super Admin | 1-3 | ~5% |
| Group Admin | 5-10 | ~15% |
| Member | 30-50 | ~70% |
| Viewer | 5-10 | ~10% |

---

> **Tóm tắt:** 
> - **Super Admin** = Quản lý TOÀN BỘ hệ thống
> - **Group Admin** = Quản lý GROUP được giao
> - **Member** = Sử dụng hàng ngày, tham gia meetings, thực hiện tasks
> - **Viewer** = Chỉ xem, không chỉnh sửa
