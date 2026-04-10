import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export class GeminiLiveClient {
  private ai: GoogleGenAI;
  private session: any;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: {
    onopen?: () => void;
    onmessage?: (message: LiveServerMessage) => void;
    onerror?: (error: any) => void;
    onclose?: () => void;
  }, systemInstruction: string) {
    this.session = await this.ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onopen: callbacks.onopen || (() => {}),
        onmessage: callbacks.onmessage || (() => {}),
        onerror: callbacks.onerror || (() => {}),
        onclose: callbacks.onclose || (() => {}),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction,
      },
    });
    return this.session;
  }

  sendAudio(base64Data: string) {
    if (this.session) {
      this.session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
      });
    }
  }

  sendText(text: string) {
    if (this.session) {
      this.session.sendRealtimeInput({ text });
    }
  }

  close() {
    if (this.session) {
      this.session.close();
    }
  }
}
