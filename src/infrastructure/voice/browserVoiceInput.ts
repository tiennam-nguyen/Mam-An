import type { VoiceInputAdapter } from '../../application/ports/voiceInputAdapter';
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type VoiceWindow = typeof globalThis & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export class BrowserVoiceInput implements VoiceInputAdapter {
  private constructorType() {
    const w = globalThis as VoiceWindow;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  }
  isSupported() {
    return !!this.constructorType();
  }
  transcribe(signal: AbortSignal): Promise<string> {
    const Constructor = this.constructorType();
    if (!Constructor || signal.aborted)
      return Promise.reject(new Error('CAPABILITY_UNAVAILABLE'));
    return new Promise((resolve, reject) => {
      const recognition = new Constructor();
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (text: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        recognition.onend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.abort();
        text !== null
          ? resolve(text.slice(0, 2000))
          : reject(new Error('CAPABILITY_UNAVAILABLE'));
      };
      const abort = () => finish(null);
      signal.addEventListener('abort', abort, { once: true });
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) =>
        finish(event.results[0]?.[0]?.transcript ?? null);
      recognition.onerror = () => finish(null);
      recognition.onend = () => finish(null);
      timer = setTimeout(abort, 15000);
      try {
        recognition.start();
      } catch {
        finish(null);
      }
    });
  }
}
