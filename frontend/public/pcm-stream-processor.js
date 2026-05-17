class PCMStreamProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameMs = 200;
    this.frameSize = Math.floor(sampleRate * (this.frameMs / 1000));
    this.pending = [];

    this.port.onmessage = (event) => {
      if (event.data?.type === "config") {
        this.frameMs = Number(event.data.frameMs || 200);
        this.frameSize = Math.max(320, Math.floor(sampleRate * (this.frameMs / 1000)));
      }
    };
  }

  emitFrame() {
    if (this.pending.length < this.frameSize) return;
    const samples = this.pending.splice(0, this.frameSize);
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    this.port.postMessage({ type: "pcm", buffer, sampleRate }, [buffer]);
  }

  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;
    for (let i = 0; i < input.length; i += 1) {
      this.pending.push(input[i]);
    }
    while (this.pending.length >= this.frameSize) {
      this.emitFrame();
    }
    return true;
  }
}

registerProcessor("pcm-stream-processor", PCMStreamProcessor);
