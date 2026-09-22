import { expect, it } from 'vitest';
import {
  buildEvidenceBundle,
  minimizeEvidence,
  validateGeneratedExplanation,
} from '../src/domain/explanation/explanation';
import { ExplanationOutputSchema } from '../src/infrastructure/ai/explanationSchemas';
import { draft } from './fixtures/helpers';
const p = minimizeEvidence(buildEvidenceBundle(draft(), null, []));
p.meal.totalCarbEstimate = 20;
const out = {
  summaryVi: 'Tóm tắt thành phần đã ghi.',
  personalObservationVi: null,
  optionExplanationsVi: [],
  uncertaintyNoteVi: 'Dữ liệu chưa đầy đủ.',
  evidenceRefs: ['meal.current'],
};
it.each([
  'Bữa này gây bệnh.',
  'Hãy giảm liều.',
  'Bạn mắc tiểu đường.',
  'Uống 20 viên mỗi ngày.',
  'Thay đổi điều trị.',
  'Tiêm insulin.',
  'Bữa này không an toàn.',
  'Cơ thể bạn chắc chắn ổn.',
])('rejects clinical claim %s', (summaryVi) => {
  expect(validateGeneratedExplanation({ ...out, summaryVi }, p)).toBe(false);
});
it.each(['SPARSE', 'NONCOMPARABLE', 'NO_DATA'] as const)(
  'rejects personal observation under %s',
  (dataQuality) => {
    expect(
      validateGeneratedExplanation(
        { ...out, personalObservationVi: 'Trong các lần bạn đã ghi.' },
        {
          ...p,
          pattern: {
            evidenceKey: 'pattern.summary',
            dataQuality,
            sampleCount: 1,
            timingBucketMinutes: 30,
            medianPostMealMgDl: null,
            medianDeltaFromPremealMgDl: null,
            caveats: [],
          },
        },
      ),
    ).toBe(false);
  },
);
it.each([
  '3 lần quanh 30 phút, trung vị 120 mg/dL.',
  'Chênh lệch -14,7 g carb.',
  'Chênh lệch -14.7 g carb.',
])(
  'accepts grounded count, timing, glucose and signed delta: %s',
  (summaryVi) => {
    const payload = {
      ...p,
      scenario: {
        evidenceKey: 'scenario.delta' as const,
        carbBefore: 29.4,
        carbAfter: 14.7,
        carbDelta: -14.7,
        operationLabels: [],
      },
      pattern: {
        evidenceKey: 'pattern.summary' as const,
        dataQuality: 'SUFFICIENT_FOR_DESCRIPTION' as const,
        sampleCount: 3,
        timingBucketMinutes: 30,
        medianPostMealMgDl: 120,
        medianDeltaFromPremealMgDl: null,
        caveats: [],
      },
    };
    expect(validateGeneratedExplanation({ ...out, summaryVi }, payload)).toBe(
      true,
    );
  },
);
it.each([
  'Có 15 g carb.',
  'Có 120 mg/dL.',
  'Có 3 lần.',
  'Sau 30 phút.',
  'Từ 20 đến 21 g carb.',
  'Có 20%.',
])('rejects novel numeric claim: %s', (summaryVi) => {
  expect(validateGeneratedExplanation({ ...out, summaryVi }, p)).toBe(false);
});
it.each(['20%', '20％', '20 phần trăm'])(
  'percentage %s needs percentage evidence, not an equal carb value',
  (value) => {
    const summaryVi = `Nguồn tham khảo ghi ${value}.`;
    expect(validateGeneratedExplanation({ ...out, summaryVi }, p)).toBe(false);
    expect(
      validateGeneratedExplanation(
        { ...out, summaryVi },
        {
          ...p,
          knowledge: [
            {
              evidenceKey: 'knowledge.test',
              title: 'Test only',
              body: 'Tỷ lệ 20% trong ví dụ tổng hợp.',
              sourceLabel: 'Synthetic fixture',
            },
          ],
        },
      ),
    ).toBe(true);
  },
);
it.each([
  {},
  { ...out, summaryVi: 1 },
  { ...out, rawHistory: [] },
  { ...out, optionExplanationsVi: 'wrong' },
  { ...out, personalObservationVi: undefined },
])(
  'strict generated output schema rejects malformed structure %#',
  (candidate) => {
    expect(ExplanationOutputSchema.safeParse(candidate).success).toBe(false);
  },
);
it('rejects HTML and empty references but retains useful uncertainty wording', () => {
  expect(
    validateGeneratedExplanation({ ...out, summaryVi: '<b>Tóm tắt</b>' }, p),
  ).toBe(false);
  expect(validateGeneratedExplanation({ ...out, evidenceRefs: [] }, p)).toBe(
    false,
  );
  expect(
    validateGeneratedExplanation(
      {
        ...out,
        summaryVi: 'Dữ liệu từ thành phần đã ghi; kết quả còn hạn chế.',
      },
      p,
    ),
  ).toBe(true);
});
