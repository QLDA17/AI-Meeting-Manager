class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.config = {
      silenceThreshold: 0.008,
      minSpeechSeconds: 0.3,
      maxChunkSeconds: 8,
      preRollMs: 300,
      hangoverMs: 1500,
    };
    this.overlapMs = 300;

    this.preRollSize = Math.floor(sampleRate * (this.config.preRollMs / 1000));
    this.hangoverSize = Math.floor(sampleRate * (this.config.hangoverMs / 1000));
    this.minSpeechSize = Math.floor(sampleRate * this.config.minSpeechSeconds);
    this.maxChunkSize = Math.floor(sampleRate * this.config.maxChunkSeconds);

    this.preRoll = new Float32Array(this.preRollSize);
    this.preRollIndex = 0;
    this.preRollFilled = 0;
    this.chunk = [];
    this.isSpeechActive = false;
    this.silentSamples = 0;
    this.speechSamples = 0;
    this.totalSamples = 0;
    this.chunkStartSample = 0;

    this.port.onmessage = (event) => {
      if (event.data?.type === "config") {
        this.configure(event.data.config || {});
      }
      if (event.data?.type === "flush") {
        this.flush("manual");
      }
    };
  }

  configure(nextConfig) {
    this.config = { ...this.config, ...nextConfig };
    this.preRollSize = Math.floor(sampleRate * (this.config.preRollMs / 1000));
    this.hangoverSize = Math.floor(sampleRate * (this.config.hangoverMs / 1000));
    this.minSpeechSize = Math.floor(sampleRate * this.config.minSpeechSeconds);
    this.maxChunkSize = Math.floor(sampleRate * this.config.maxChunkSeconds);
    this.preRoll = new Float32Array(this.preRollSize);
    this.preRollIndex = 0;
    this.preRollFilled = 0;
    this.resetSpeechState();
  }

  resetSpeechState(overlapSamples) {
    if (overlapSamples && overlapSamples.length > 0) {
      this.chunk = [...overlapSamples];
      this.isSpeechActive = true;
      this.silentSamples = 0;
      this.speechSamples = overlapSamples.length;
      this.chunkStartSample = this.totalSamples - overlapSamples.length;
    } else {
      this.chunk = [];
      this.isSpeechActive = false;
      this.silentSamples = 0;
      this.speechSamples = 0;
      this.chunkStartSample = this.totalSamples;
    }
  }

  rms(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * input[i];
    }
    return Math.sqrt(sum / input.length);
  }

  appendPreRoll(input) {
    if (this.preRollSize <= 0) return;
    for (let i = 0; i < input.length; i++) {
      this.preRoll[this.preRollIndex] = input[i];
      this.preRollIndex = (this.preRollIndex + 1) % this.preRollSize;
      this.preRollFilled = Math.min(this.preRollFilled + 1, this.preRollSize);
    }
  }

  getPreRollSamples() {
    if (!this.preRollFilled) return [];
    const samples = [];
    const start = this.preRollFilled === this.preRollSize ? this.preRollIndex : 0;
    for (let i = 0; i < this.preRollFilled; i++) {
      samples.push(this.preRoll[(start + i) % this.preRollSize]);
    }
    return samples;
  }

  startSpeech(input) {
    const preRollSamples = this.getPreRollSamples();
    this.chunk = [...preRollSamples, ...input];
    this.isSpeechActive = true;
    this.silentSamples = 0;
    this.speechSamples = input.length;
    this.chunkStartSample = Math.max(0, this.totalSamples - preRollSamples.length);
  }

  appendSpeech(input, isSpeech) {
    for (let i = 0; i < input.length; i++) {
      this.chunk.push(input[i]);
    }
    if (isSpeech) {
      this.silentSamples = 0;
      this.speechSamples += input.length;
    } else {
      this.silentSamples += input.length;
    }
  }

  flush(reason) {
    if (!this.chunk.length || this.speechSamples < this.minSpeechSize) {
      this.resetSpeechState();
      return;
    }

    const samples = new Float32Array(this.chunk);
    this.port.postMessage({
      type: "chunk",
      samples,
      startMs: Math.round((this.chunkStartSample / sampleRate) * 1000),
      endMs: Math.round(((this.chunkStartSample + samples.length) / sampleRate) * 1000),
      reason,
    });

    // On max-duration flush, keep tail as overlap for next chunk to avoid word clipping
    if (reason === "max-duration" && this.chunk.length > 0) {
      const overlapSize = Math.floor(sampleRate * (this.overlapMs / 1000));
      const tail = this.chunk.slice(-overlapSize);
      this.resetSpeechState(tail);
    } else {
      this.resetSpeechState();
    }
  }

  process(inputs) {
    const input = inputs[0][0]; // mono channel
    if (!input) return true;

    const frame = new Float32Array(input);
    const hasSpeech = this.rms(frame) >= this.config.silenceThreshold;

    if (hasSpeech && !this.isSpeechActive) {
      this.startSpeech(frame);
    } else if (this.isSpeechActive) {
      this.appendSpeech(frame, hasSpeech);
      if (this.chunk.length >= this.maxChunkSize) {
        this.flush("max-duration");
      } else if (!hasSpeech && this.silentSamples >= this.hangoverSize) {
        this.flush("silence");
      }
    }

    this.appendPreRoll(frame);
    this.totalSamples += frame.length;
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
