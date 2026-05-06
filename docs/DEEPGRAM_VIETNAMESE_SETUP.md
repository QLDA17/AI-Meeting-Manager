# Hướng Dẫn Sử Dụng Deepgram Nova 3 Cho Tiếng Việt

## Tổng Quan
Deepgram Nova 3 là model ngôn ngữ mới nhất cung cấp khả năng nhận dạng tiếng Việt với độ chính xác cao và độ trễ thấp. Tài liệu này hướng dẫn cách thiết lập và sử dụng Deepgram Nova 3 trong ứng dụng MultiMinutes AI.

## Yêu Cầu

### 1. Cài Đặt SDK
```bash
pip install deepgram-sdk>=3.0.0
```

### 2. API Key
Lấy API key từ [Deepgram Console](https://console.deepgram.com)
- Tạo tài khoản Deepgram
- Truy cập Console
- Tạo API Key mới
- Copy key vào `.env` file

## Cấu Hình Ứng Dụng

### 1. File `.env`
```env
# STT Configuration
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_api_key_here
DEEPGRAM_MODEL=nova-3
DEEPGRAM_LANGUAGE=vi
```

### 2. Tùy Chọn Cấu Hình

| Biến | Mô Tả | Giá Trị Mặc Định |
|------|-------|-----------------|
| `STT_PROVIDER` | Provider STT | `deepgram` |
| `DEEPGRAM_API_KEY` | API Key Deepgram | (bắt buộc) |
| `DEEPGRAM_MODEL` | Model sử dụng | `nova-3` |
| `DEEPGRAM_LANGUAGE` | Ngôn ngữ | `vi` |

## Sử Dụng

### 1. Trong Code Python
```python
from src.stt.service import STTService

# Tự động dùng cấu hình từ .env
stt_service = STTService()

# Transcribe audio file
result = stt_service.transcribe_audio("path/to/audio.mp3")

# Kết quả
print(result["text"])  # Toàn bộ nội dung
print(result["segments"])  # Phân đoạn từng người nói
```

### 2. Chỉ Định Model Cụ Thể
```python
from src.providers.deepgram import DeepgramProvider

# Sử dụng Nova 3
provider_v3 = DeepgramProvider()
result_v3 = provider_v3.transcribe("audio.mp3", model="nova-3")

# Hoặc Nova 2 (nếu cần)
result_v2 = provider_v3.transcribe("audio.mp3", model="nova-2")
```

### 3. Qua API HTTP
```bash
curl -X POST http://localhost:8000/api/transcribe \
  -H "Content-Type: multipart/form-data" \
  -F "file=@meeting.mp3"
```

## Tính Năng Hỗ Trợ

### Xử Lý Ngôn Ngữ Tiếng Việt
- **Smart Format**: Tự động định dạng số, tiền, thời gian theo kiểu Việt
- **Punctuate**: Tự động thêm dấu câu
- **Diarize**: Phân biệt người nói (Speaker 1, Speaker 2, ...)
- **Utterances**: Chia thành câu/phát biểu riêng lẻ
- **Paragraphs**: Nhóm thành đoạn văn (Nova 3)

### Định Dạng Audio Hỗ Trợ
- MP3
- WAV
- WebM
- FLAC
- OGG
- M4A
- Và nhiều định dạng khác

## Ví Dụ Kết Quả

### Input
```
File audio: meeting_20240506.mp3 (tiếng Việt)
```

### Output
```json
{
  "text": "Xin chào, đây là cuộc họp về kế hoạch quý II. Chúng ta cần thảo luận về ngân sách...",
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Xin chào, đây là cuộc họp về kế hoạch quý II.",
      "speaker": "Speaker 1"
    },
    {
      "start": 5.2,
      "end": 12.5,
      "text": "Chúng ta cần thảo luận về ngân sách...",
      "speaker": "Speaker 1"
    }
  ]
}
```

## Khác Biệt Nova 3 vs Nova 2

| Tính Năng | Nova 2 | Nova 3 |
|-----------|--------|--------|
| Độ chính xác | Tốt | Tốt hơn (+5-10%) |
| Latency | Trung bình | Thấp hơn |
| Hỗ trợ Paragraphs | Không | Có |
| Tiếng Việt | ✓ | ✓ (tốt hơn) |
| Chi phí | Rẻ hơn | Cao hơn đôi chút |

## Khám Phá Diarization (Phân Biệt Người Nói)

### Cách Hoạt Động
Deepgram tự động phát hiện và phân biệt:
- Số lượng người nói
- Thời gian mỗi người nói
- Nội dung từng người nói

### Kết Quả Diarization
```python
result = stt_service.transcribe_audio("meeting.mp3")

for segment in result["segments"]:
    speaker = segment.get("speaker", "Unknown")
    text = segment["text"]
    start = segment["start"]
    end = segment["end"]
    
    print(f"[{start:.1f}s - {end:.1f}s] {speaker}: {text}")
```

## Tối Ưu Hóa Chi Phí

### So Sánh Chi Phí Providers
```
Deepgram Nova 3: ~$0.0043 mỗi phút
Google Speech-to-Text: ~$0.0060 mỗi phút
OpenAI Whisper: ~$0.0003 mỗi phút (nhưng không diarize, accuracy thấp hơn)
```

### Tiết Kiệm Chi Phí
1. Sử dụng cache cho audio giống nhau
2. Xử lý batch nếu có thể
3. Chỉ transcribe phần cần thiết của audio

## Xử Lý Lỗi

### Lỗi Phổ Biến

#### 1. API Key Không Hợp Lệ
```python
ValueError: DEEPGRAM_API_KEY is required
```
**Giải Pháp**: Kiểm tra `.env` file có chứa `DEEPGRAM_API_KEY`

#### 2. SDK Không Cài Đặt
```python
ImportError: deepgram-sdk not installed
```
**Giải Pháp**: `pip install deepgram-sdk>=3.0.0`

#### 3. Định Dạng Audio Không Hỗ Trợ
```
Error: Unsupported audio format
```
**Giải Pháp**: Convert audio sang MP3 hoặc WAV

#### 4. Timeout
```
Error: Request timed out
```
**Giải Pháp**: 
- Kiểm tra kết nối internet
- Tăng timeout: `REQUEST_TIMEOUT=600` trong `.env`
- Split file audio thành các phần nhỏ

## Test & Debug

### 1. Test Deepgram Connection
```python
from src.providers.deepgram import DeepgramProvider

provider = DeepgramProvider()
print("✓ Deepgram provider initialized successfully")
```

### 2. Transcribe File Test
```bash
# Chạy từ terminal
cd backend
python -c "
from src.stt.service import STTService
stt = STTService()
result = stt.transcribe_audio('path/to/test_audio.mp3')
print('Text:', result['text'][:100])
print('Segments:', len(result['segments']))
"
```

### 3. Kiểm Tra Logs
```bash
tail -f logs/app.log | grep -i deepgram
```

## API Reference

### DeepgramProvider.transcribe()
```python
def transcribe(self, audio_path: str, model: str = None) -> Dict[str, Any]:
    """
    Transcribe audio file via Deepgram API.
    
    Args:
        audio_path (str): Đường dẫn tới file audio
        model (str): Model sử dụng (nova-3, nova-2). Default: nova-3
    
    Returns:
        Dict: {
            "text": "Full transcript",
            "segments": [
                {
                    "start": 0.0,
                    "end": 5.2,
                    "text": "Segment text",
                    "speaker": "Speaker 1"
                }
            ]
        }
    """
```

## Tích Hợp Với Cuộc Họp

### Workflow Đầy Đủ
```
1. Ghi Âm Cuộc Họp (MP3/WAV)
         ↓
2. Upload lên API
         ↓
3. Deepgram Transcribe
         ↓
4. Phân Biệt Người Nói (Diarization)
         ↓
5. Lưu Segments
         ↓
6. Tóm Tắt với LLM
         ↓
7. Hiển Thị Kết Quả
```

### Ví Dụ Tích Hợp
```python
from src.stt.service import STTService
from src.crewai.agent import SummarizeAgent

# Transcribe
stt = STTService()
transcript_result = stt.transcribe_audio("meeting.mp3")

# Tóm tắt
summarizer = SummarizeAgent()
summary = summarizer.summarize(
    transcript=transcript_result["text"],
    language="vi"
)

# Kết quả
print("Nội dung cuộc họp:")
print(transcript_result["text"])
print("\nTóm tắt:")
print(summary)
```

## Liên Hệ & Support

- **Deepgram Docs**: https://developers.deepgram.com/docs
- **API Status**: https://status.deepgram.com
- **Community**: https://github.com/deepgram/deepgram-python-sdk

---

**Cập nhật lần cuối**: 2024-05-06
**Phiên bản Deepgram SDK**: 3.0.0+
**Model**: Nova 3
**Ngôn ngữ**: Tiếng Việt (vi)
