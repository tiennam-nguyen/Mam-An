export interface VoiceInputAdapter {
  isSupported(): boolean;
  transcribe(signal: AbortSignal): Promise<string>;
}
