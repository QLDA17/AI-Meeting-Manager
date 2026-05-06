#!/usr/bin/env python
"""
Test script for Deepgram Nova 3 Vietnamese transcription.
Validates setup, connectivity, and transcription quality.

Usage:
    python backend/scripts/test_deepgram_nova3.py <audio_file>
    python backend/scripts/test_deepgram_nova3.py --info
"""

import os
import sys
import argparse
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_path))

def test_deepgram_setup():
    """Test 1: Verify Deepgram setup and configuration."""
    print("\n" + "="*60)
    print("TEST 1: Deepgram Setup Validation")
    print("="*60)
    
    # Check API Key
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ DEEPGRAM_API_KEY not found in environment")
        return False
    else:
        print(f"✓ API Key configured: {api_key[:10]}...{api_key[-5:]}")
    
    # Check SDK installed
    try:
        from deepgram import DeepgramClient, PrerecordedOptions
        print("✓ deepgram-sdk is installed")
    except ImportError:
        print("❌ deepgram-sdk not installed. Run: pip install deepgram-sdk>=3.0.0")
        return False
    
    # Check model configuration
    model = os.getenv("DEEPGRAM_MODEL", "nova-3")
    print(f"✓ Configured model: {model}")
    
    language = os.getenv("DEEPGRAM_LANGUAGE", "vi")
    print(f"✓ Configured language: {language}")
    
    return True


def test_deepgram_client():
    """Test 2: Initialize Deepgram client."""
    print("\n" + "="*60)
    print("TEST 2: Deepgram Client Initialization")
    print("="*60)
    
    try:
        from src.providers.deepgram import DeepgramProvider
        provider = DeepgramProvider()
        print("✓ DeepgramProvider initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize DeepgramProvider: {e}")
        return False


def test_transcribe_audio(audio_path: str):
    """Test 3: Transcribe audio file."""
    print("\n" + "="*60)
    print("TEST 3: Audio Transcription")
    print("="*60)
    
    if not os.path.exists(audio_path):
        print(f"❌ Audio file not found: {audio_path}")
        return False
    
    file_size = os.path.getsize(audio_path) / (1024 * 1024)
    print(f"✓ Audio file found: {Path(audio_path).name} ({file_size:.2f} MB)")
    
    try:
        from src.stt.service import STTService
        
        stt = STTService()
        print("Transcribing audio with Nova 3...")
        
        result = stt.transcribe_audio(audio_path)
        
        if "error" in result:
            print(f"❌ Transcription error: {result['error']}")
            return False
        
        text = result.get("text", "")
        segments = result.get("segments", [])
        
        print(f"✓ Transcription completed")
        print(f"  - Total length: {len(text)} characters")
        print(f"  - Segments: {len(segments)}")
        
        if len(text) > 0:
            print(f"\nTranscript preview (first 200 chars):")
            print(f"  {text[:200]}...")
        
        if len(segments) > 0:
            print(f"\nFirst 3 segments:")
            for i, seg in enumerate(segments[:3], 1):
                speaker = seg.get("speaker", "Unknown")
                start = seg.get("start", 0)
                end = seg.get("end", 0)
                seg_text = seg.get("text", "")[:50]
                print(f"  [{i}] {speaker} [{start:.1f}s-{end:.1f}s]: {seg_text}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_model_comparison(audio_path: str):
    """Test 4: Compare Nova 3 vs Nova 2."""
    print("\n" + "="*60)
    print("TEST 4: Model Comparison (Nova 3 vs Nova 2)")
    print("="*60)
    
    if not os.path.exists(audio_path):
        print(f"Audio file not found: {audio_path}")
        return False
    
    try:
        from src.providers.deepgram import DeepgramProvider
        
        provider = DeepgramProvider()
        
        print("Testing Nova 3...")
        result_v3 = provider.transcribe(audio_path, model="nova-3")
        
        print("Testing Nova 2...")
        result_v2 = provider.transcribe(audio_path, model="nova-2")
        
        text_v3 = result_v3.get("text", "")
        text_v2 = result_v2.get("text", "")
        
        print(f"\nNova 3 transcript length: {len(text_v3)} chars")
        print(f"Nova 2 transcript length: {len(text_v2)} chars")
        
        print(f"\nNova 3 segments: {len(result_v3.get('segments', []))}")
        print(f"Nova 2 segments: {len(result_v2.get('segments', []))}")
        
        if text_v3 and text_v2:
            # Simple similarity check
            common_words = len(set(text_v3.split()) & set(text_v2.split()))
            total_words = max(len(text_v3.split()), len(text_v2.split()))
            similarity = (common_words / total_words * 100) if total_words > 0 else 0
            print(f"\nSimilarity: {similarity:.1f}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Comparison failed: {e}")
        return False


def show_system_info():
    """Show system and Deepgram info."""
    print("\n" + "="*60)
    print("SYSTEM INFORMATION")
    print("="*60)
    
    import platform
    print(f"Python version: {platform.python_version()}")
    print(f"Platform: {platform.platform()}")
    
    try:
        import deepgram
        print(f"deepgram-sdk version: {deepgram.__version__ if hasattr(deepgram, '__version__') else 'Unknown'}")
    except:
        pass
    
    print(f"\nEnvironment Configuration:")
    print(f"  STT_PROVIDER: {os.getenv('STT_PROVIDER', 'not set')}")
    print(f"  DEEPGRAM_MODEL: {os.getenv('DEEPGRAM_MODEL', 'nova-3')}")
    print(f"  DEEPGRAM_LANGUAGE: {os.getenv('DEEPGRAM_LANGUAGE', 'vi')}")
    print(f"  DEEPGRAM_API_KEY: {('Set' if os.getenv('DEEPGRAM_API_KEY') else 'Not set')}")


def main():
    parser = argparse.ArgumentParser(
        description="Test Deepgram Nova 3 Vietnamese transcription setup"
    )
    parser.add_argument(
        "audio_file",
        nargs="?",
        help="Path to audio file to transcribe (MP3, WAV, etc.)"
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Show system information only"
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Compare Nova 3 vs Nova 2 (requires audio file)"
    )
    
    args = parser.parse_args()
    
    # Load environment
    from pathlib import Path
    from dotenv import load_dotenv
    env_file = Path(__file__).resolve().parents[1] / ".env"
    load_dotenv(env_file)
    
    show_system_info()
    
    if args.info:
        return 0
    
    # Test 1: Setup validation
    if not test_deepgram_setup():
        return 1
    
    # Test 2: Client initialization
    if not test_deepgram_client():
        return 1
    
    # Test 3: Audio transcription (if file provided)
    if args.audio_file:
        if not test_transcribe_audio(args.audio_file):
            return 1
        
        # Test 4: Model comparison (if requested)
        if args.compare:
            if not test_model_comparison(args.audio_file):
                return 1
    else:
        print("\n" + "="*60)
        print("Skipping transcription test (no audio file provided)")
        print("="*60)
        print("To test transcription, run:")
        print("  python backend/scripts/test_deepgram_nova3.py path/to/audio.mp3")
        print("\nTo compare Nova 3 vs Nova 2:")
        print("  python backend/scripts/test_deepgram_nova3.py path/to/audio.mp3 --compare")
    
    print("\n" + "="*60)
    print("✓ All tests passed successfully!")
    print("="*60 + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
