import { afterEach, expect, it, vi } from 'vitest';
import { draft, catalog } from './fixtures/helpers';
import { createScenario } from '../src/domain/meal/decisionSimulator';
import {
  buildEvidenceBundle,
  minimizeEvidence,
  validateGeneratedExplanation,
} from '../src/domain/explanation/explanation';
import { BrowserVoiceInput } from '../src/infrastructure/voice/browserVoiceInput';

it.each(['entry', 'component'])(
  'rejects duplicate baseline %s IDs before targeting a scenario',
  (kind) => {
    const d = draft();
    if (kind === 'entry') d.entries[1]!.entryId = d.entries[0]!.entryId;
    else
      d.entries[1]!.components[0]!.componentId =
        d.entries[0]!.components[0]!.componentId;
    expect(() =>
      createScenario(
        d,
        [
          {
            type: 'REMOVE_COMPONENT',
            targetComponentId: d.entries[0]!.components[0]!.componentId,
          },
        ],
        catalog,
      ),
    ).toThrow(/Duplicate/);
  },
);

const payload = minimizeEvidence(buildEvidenceBundle(draft(), null, []));
payload.meal.totalCarbEstimate = 20;
const output = {
  summaryVi: '',
  personalObservationVi: null,
  optionExplanationsVi: [],
  uncertaintyNoteVi: 'Dữ liệu còn thiếu.',
  evidenceRefs: ['meal.current'],
};
it.each([
  'Có 20% carb.',
  'Bạn mắc bệnh tiểu đường.',
  'Bữa này gây biến động đường huyết.',
  'ĐƯỢC ĂN bữa này.',
])('rejects unsupported claim: %s', (summaryVi) => {
  expect(validateGeneratedExplanation({ ...output, summaryVi }, payload)).toBe(
    false,
  );
});
it.each([
  'Có 20 g carb ước tính.',
  'Dữ liệu từ các thành phần bạn đã ghi.',
  'Ước tính chưa bao gồm thành phần chưa biết.',
])('preserves benign Vietnamese: %s', (summaryVi) => {
  expect(validateGeneratedExplanation({ ...output, summaryVi }, payload)).toBe(
    true,
  );
});

afterEach(() => vi.unstubAllGlobals());
it.each(['', '   '])('rejects empty voice result %j', async (transcript) => {
  class Recognition {
    onresult?: (e: unknown) => void;
    start() {
      queueMicrotask(() => this.onresult?.({ results: [[{ transcript }]] }));
    }
    abort() {}
  }
  vi.stubGlobal('SpeechRecognition', Recognition);
  await expect(
    new BrowserVoiceInput().transcribe(new AbortController().signal),
  ).rejects.toThrow('CAPABILITY_UNAVAILABLE');
});
