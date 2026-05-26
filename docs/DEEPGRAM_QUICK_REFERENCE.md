# Deepgram Nova 3 - Quick Reference Guide

## 🚀 Quick Start

### 1. Setup (30 seconds)
```bash
# Install SDK
pip install deepgram-sdk>=3.0.0

# Add to .env
STT_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_key_here
DEEPGRAM_MODEL=nova-3
DEEPGRAM_LANGUAGE=vi
```

### 2. Test
```bash
cd backend
python tests/manual/deepgram_nova3_runner.py --info
```

### 3. Use in Code
```python
from src.stt.service import STTService

stt = STTService()
result = stt.transcribe_audio("meeting.mp3")
print(result["text"])
```

---

## 📋 Configuration Cheat Sheet

| Option | Value | Note |
|--------|-------|------|
| Provider | `deepgram` | Set in `.env` |
| Model | `nova-3` | Latest model |
| Language | `vi` | Vietnamese |
| API Key | From Deepgram Console | Required |

---

## 🎤 Supported Audio Formats

| Format | Extension | Quality |
|--------|-----------|---------|
| MP3 | .mp3 | 128kbps+ |
| WAV | .wav | 16-bit PCM |
| WebM | .webm | VP8/VP9 |
| FLAC | .flac | Lossless |
| OGG | .ogg | Vorbis |
| M4A | .m4a | AAC |

---

## 📊 Features

✓ **Diarization** - Phân biệt người nói tự động  
✓ **Smart Format** - Định dạng số/tiền/thời gian  
✓ **Punctuation** - Tự động thêm dấu câu  
✓ **Paragraphs** - Chia thành đoạn (Nova 3)  
✓ **Utterances** - Phân câu  

---

## 🔍 Result Structure

```python
{
    "text": "Full transcript...",
    "segments": [
        {
            "start": 0.0,      # Bắt đầu (giây)
            "end": 5.2,        # Kết thúc (giây)
            "text": "Câu...",  # Nội dung
            "speaker": "Speaker 1"  # Người nói
        }
    ]
}
```

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| API Key Error | Check `.env` file |
| SDK Not Installed | `pip install deepgram-sdk>=3.0.0` |
| Audio Format Error | Convert to MP3/WAV |
| Timeout | Increase `REQUEST_TIMEOUT` |

---

## 💰 Pricing (Approximate)

- **Nova 3**: $0.0043/min
- **Nova 2**: $0.0040/min  
- Billing per 15 seconds

---

## 📞 Resources

- [Deepgram Docs](https://developers.deepgram.com/docs)
- [API Reference](https://developers.deepgram.com/reference)
- [Pricing](https://deepgram.com/pricing)
- [Status](https://status.deepgram.com)

---

## 🧪 Test Commands

```bash
# Check setup
cd backend
python tests/manual/deepgram_nova3_runner.py --info

# Transcribe file
python tests/manual/deepgram_nova3_runner.py path/to/audio.mp3

# Compare models
python tests/manual/deepgram_nova3_runner.py path/to/audio.mp3 --compare
```

---

## 🎯 Integration Examples

### Example 1: Simple Transcription
```python
from src.stt.service import STTService

stt = STTService()
result = stt.transcribe_audio("recording.mp3")
print(f"Text: {result['text']}")
```

### Example 2: Access Segments
```python
for segment in result["segments"]:
    print(f"{segment['speaker']}: {segment['text']}")
```

### Example 3: With Custom Model
```python
from src.providers.deepgram import DeepgramProvider

provider = DeepgramProvider()
result = provider.transcribe("audio.mp3", model="nova-3")
```

---

## ✅ Verification Checklist

- [ ] API Key from Deepgram Console
- [ ] `.env` file updated
- [ ] `deepgram-sdk` installed
- [ ] Test script passes
- [ ] Audio file works
- [ ] Segments are extracted
- [ ] Diarization working

---

**Last Updated**: 2024-05-06  
**Version**: Nova 3  
**Language**: Tiếng Việt (vi)
