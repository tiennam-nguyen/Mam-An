import { afterEach, expect, it, vi } from 'vitest';
import { BrowserVoiceInput } from '../src/infrastructure/voice/browserVoiceInput';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('unsupported and pre-aborted voice never start recording', async () => {
  vi.stubGlobal('SpeechRecognition', undefined);
  vi.stubGlobal('webkitSpeechRecognition', undefined);
  const voice = new BrowserVoiceInput();
  expect(voice.isSupported()).toBe(false);
  await expect(
    voice.transcribe(new AbortController().signal),
  ).rejects.toThrow();
  const start = vi.fn();
  vi.stubGlobal(
    'SpeechRecognition',
    class {
      start = start;
    },
  );
  await expect(voice.transcribe(AbortSignal.abort())).rejects.toThrow();
  expect(start).not.toHaveBeenCalled();
});
it.each(['result', 'error', 'end', 'cancel', 'timeout', 'start-throw'])(
  'voice %s settles once and stops recording',
  async (kind) => {
    vi.useFakeTimers();
    let instance: any;
    const abort = vi.fn();
    vi.stubGlobal(
      'SpeechRecognition',
      class {
        onresult: any;
        onerror: any;
        onend: any;
        abort = abort;
        constructor() {
          instance = this;
        }
        start() {
          if (kind === 'start-throw') throw new Error('denied');
        }
      },
    );
    const parent = new AbortController();
    const pending = new BrowserVoiceInput().transcribe(parent.signal);
    const check =
      kind === 'result'
        ? expect(pending).resolves.toBe('đã nói')
        : expect(pending).rejects.toThrow();
    if (kind === 'result')
      instance.onresult({ results: [[{ transcript: '  đã nói  ' }]] });
    if (kind === 'error') instance.onerror();
    if (kind === 'end') instance.onend();
    if (kind === 'cancel') parent.abort();
    if (kind === 'timeout') await vi.advanceTimersByTimeAsync(15000);
    await check;
    expect(abort).toHaveBeenCalledTimes(1);
    expect(instance.onresult).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  },
);
