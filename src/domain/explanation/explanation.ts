import type { MealDraft } from '../meal/mealDraft';
import type { MealScenario } from '../meal/decisionSimulator';
import type {
  PatternEvidence,
  PatternDataQuality,
} from '../personal/personalResponse';
export interface KnowledgeChunk {
  id: string;
  title: string;
  body: string;
  sourceLabel: string;
  sourceRef: string;
  knowledgeVersion: string;
  tags: readonly string[];
}
export interface EvidenceBundle {
  currentMealFacts: {
    entryLabels: string[];
    componentLabels: string[];
    totalCarbEstimate: number | null;
    totalKcalEstimate: number | null;
    completeness: MealDraft['completeness'];
  };
  selectedScenarioDelta: null | {
    carbBefore: number | null;
    carbAfter: number | null;
    carbDelta: number | null;
    operations: readonly string[];
    completeness: MealDraft['completeness'];
  };
  personalPattern: PatternEvidence | null;
  retrievedKnowledge: readonly KnowledgeChunk[];
  uncertaintyFlags: string[];
  prohibitedTopics: readonly ['DIAGNOSIS', 'MEDICATION_CHANGE', 'INSULIN_DOSE'];
}
export interface ExplanationTransportPayload {
  meal: {
    evidenceKey: 'meal.current';
    entryLabels: string[];
    componentLabels: string[];
    totalCarbEstimate: number | null;
    completeness: MealDraft['completeness'];
  };
  scenario: null | {
    evidenceKey: 'scenario.delta';
    carbBefore: number | null;
    carbAfter: number | null;
    carbDelta: number | null;
    operationLabels: readonly string[];
  };
  pattern: null | {
    evidenceKey: 'pattern.summary';
    sampleCount: number;
    timingBucketMinutes: number | null;
    medianPostMealMgDl: number | null;
    medianDeltaFromPremealMgDl: number | null;
    dataQuality: PatternDataQuality;
    caveats: string[];
  };
  knowledge: {
    evidenceKey: string;
    title: string;
    body: string;
    sourceLabel: string;
  }[];
  uncertaintyFlags: string[];
}
export interface ExplanationResult {
  summaryVi: string;
  personalObservationVi: string | null;
  optionExplanationsVi: string[];
  uncertaintyNoteVi: string;
  evidenceRefs: string[];
  generationMode: 'LLM' | 'TEMPLATE';
}
export function retrieveKnowledge(
  chunks: readonly KnowledgeChunk[],
  tags: readonly string[],
  limit = 3,
) {
  return chunks
    .map((chunk) => ({
      chunk,
      score: new Set(chunk.tags.filter((t) => tags.includes(t))).size,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, Math.max(0, limit))
    .map((x) => x.chunk);
}
export function buildEvidenceBundle(
  draft: Pick<
    MealDraft,
    'entries' | 'totalCarbEstimate' | 'totalKcalEstimate' | 'completeness'
  >,
  pattern: PatternEvidence | null,
  chunks: readonly KnowledgeChunk[],
  scenario: MealScenario | null = null,
): EvidenceBundle {
  const tags = [
    'meal-logging',
    ...draft.entries.flatMap((e) =>
      e.components.map((c) => c.role.toLowerCase()),
    ),
    ...(draft.entries.some((e) => e.components.length > 1)
      ? ['mixed-dish']
      : []),
    ...(draft.completeness !== 'COMPLETE' ? ['uncertainty'] : []),
    ...(pattern ? ['personal-pattern'] : []),
    ...(scenario?.operations.some((o) => o.type === 'CHANGE_PORTION')
      ? ['portion']
      : []),
  ];
  return {
    currentMealFacts: {
      entryLabels: draft.entries.map((e) => e.displayName),
      componentLabels: draft.entries.flatMap((e) =>
        e.components.map((c) => c.displayName),
      ),
      totalCarbEstimate: draft.totalCarbEstimate,
      totalKcalEstimate: draft.totalKcalEstimate,
      completeness: draft.completeness,
    },
    selectedScenarioDelta: scenario
      ? {
          carbBefore: scenario.before.totalCarbEstimate,
          carbAfter: scenario.after.totalCarbEstimate,
          carbDelta: scenario.carbDeltaVsBaseline,
          operations: scenario.operationLabels,
          completeness: scenario.after.completeness,
        }
      : null,
    personalPattern: pattern,
    retrievedKnowledge: retrieveKnowledge(chunks, tags),
    uncertaintyFlags: [
      ...(draft.completeness !== 'COMPLETE' ? ['NUTRITION_INCOMPLETE'] : []),
      ...(pattern?.dataQuality !== 'SUFFICIENT_FOR_DESCRIPTION'
        ? ['PERSONAL_EVIDENCE_INSUFFICIENT']
        : []),
    ],
    prohibitedTopics: ['DIAGNOSIS', 'MEDICATION_CHANGE', 'INSULIN_DOSE'],
  };
}
export function minimizeEvidence(
  bundle: EvidenceBundle,
): ExplanationTransportPayload {
  const f = bundle.currentMealFacts,
    p = bundle.personalPattern,
    s = bundle.selectedScenarioDelta;
  return {
    meal: {
      evidenceKey: 'meal.current',
      entryLabels: [...f.entryLabels],
      componentLabels: [...f.componentLabels],
      totalCarbEstimate: f.totalCarbEstimate,
      completeness: f.completeness,
    },
    scenario: s
      ? {
          evidenceKey: 'scenario.delta',
          carbBefore: s.carbBefore,
          carbAfter: s.carbAfter,
          carbDelta: s.carbDelta,
          operationLabels: [...s.operations],
        }
      : null,
    pattern: p
      ? {
          evidenceKey: 'pattern.summary',
          sampleCount: p.sampleCount,
          timingBucketMinutes: p.statistics.timingBucketMinutes,
          medianPostMealMgDl: p.statistics.medianPostMealMgDl,
          medianDeltaFromPremealMgDl: p.statistics.medianDeltaFromPremealMgDl,
          dataQuality: p.dataQuality,
          caveats: [...p.caveats],
        }
      : null,
    knowledge: bundle.retrievedKnowledge.map((k) => ({
      evidenceKey: 'knowledge.' + k.id,
      title: k.title,
      body: k.body,
      sourceLabel: k.sourceLabel,
    })),
    uncertaintyFlags: [...bundle.uncertaintyFlags],
  };
}
const number = (n: number | null) =>
  n === null
    ? 'chưa biết'
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(n);
export function patternCopy(p: ExplanationTransportPayload['pattern']): string {
  if (!p || p.dataQuality === 'NO_DATA')
    return 'Chưa có số đo phù hợp cho các bữa tương tự đã ghi.';
  if (p.dataQuality === 'SPARSE')
    return 'Chưa đủ các lần ghi tương tự để mô tả xu hướng cá nhân.';
  if (p.dataQuality === 'NONCOMPARABLE')
    return 'Các số đo có thời điểm chưa tương đồng; chưa tổng hợp thành xu hướng.';
  return `Trong các lần bạn đã ghi, ${p.sampleCount} bữa tương tự có số đo quanh ${p.timingBucketMinutes} phút; trung vị ${number(p.medianPostMealMgDl)} mg/dL. Đây là ghi nhận liên quan, không chứng minh nguyên nhân.`;
}
export function templateExplanation(
  payload: ExplanationTransportPayload,
): ExplanationResult {
  return {
    summaryVi: `Bữa hiện tại có ${number(payload.meal.totalCarbEstimate)} g carb ước tính.${payload.meal.completeness !== 'COMPLETE' ? ' Tổng chưa bao gồm đầy đủ các thành phần chưa biết.' : ''}`,
    personalObservationVi: patternCopy(payload.pattern),
    optionExplanationsVi: payload.scenario
      ? [
          `Phương án: ${number(payload.scenario.carbBefore)} → ${number(payload.scenario.carbAfter)} g carb; chênh lệch ${number(payload.scenario.carbDelta)} g ước tính.`,
        ]
      : [],
    uncertaintyNoteVi:
      'Thông tin hỗ trợ ghi nhận và so sánh, không phải chẩn đoán hay chỉ định điều trị.',
    evidenceRefs: [
      'meal.current',
      ...(payload.pattern ? ['pattern.summary'] : []),
      ...(payload.scenario ? ['scenario.delta'] : []),
      ...payload.knowledge.map((k) => k.evidenceKey),
    ],
    generationMode: 'TEMPLATE',
  };
}
const numericTokens = (s: string) =>
  (s.match(/[-+]?\d+(?:[.,]\d+)?/g) ?? []).map((v) =>
    Number(v.replace(',', '.')),
  );
export function validateGeneratedExplanation(
  output: Omit<ExplanationResult, 'generationMode'>,
  payload: ExplanationTransportPayload,
): boolean {
  const text = [
    output.summaryVi,
    output.personalObservationVi ?? '',
    ...output.optionExplanationsVi,
    output.uncertaintyNoteVi,
  ].join(' ');
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
  if (
    /[<>%％]/.test(text) ||
    /phan tram|mac benh|ban bi benh|ban bi tieu duong|gay bien dong/.test(
      normalized,
    ) ||
    /insulin|\btiem\b|nen an|nen chon|khuyen|tot nhat|recommend|best|nguyen nhan|lam tang|lam giam|thuoc|medicat|prescri|treatment|diagnos|chan doan|dieu tri|gay ra|gay tang|gay giam|caus(?:e|ed|es)|an toan|nguy hiem|duoc an|cam an|safe|unsafe|forbidden|allowed|chac chan|dam bao|co the ban|your body/.test(
      normalized,
    )
  )
    return false;
  if (
    payload.pattern?.dataQuality !== 'SUFFICIENT_FOR_DESCRIPTION' &&
    (output.personalObservationVi !== null ||
      /xu huong|pattern|trong cac lan|lich su cua ban/.test(normalized))
  )
    return false;
  const refs = [
    'meal.current',
    ...(payload.scenario ? ['scenario.delta'] : []),
    ...(payload.pattern ? ['pattern.summary'] : []),
    ...payload.knowledge.map((k) => k.evidenceKey),
  ];
  if (
    !output.evidenceRefs.length ||
    output.evidenceRefs.some((ref) => !refs.includes(ref))
  )
    return false;
  // Only structured numeric facts and curated knowledge authorize numbers, never user labels.
  const allowed = new Set<number>();
  const collect = (v: unknown): void => {
    if (typeof v === 'number') {
      allowed.add(v);
      allowed.add(Math.round(v * 10) / 10);
    } else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') Object.values(v).forEach(collect);
  };
  collect({
    carb: payload.meal.totalCarbEstimate,
    scenario: payload.scenario
      ? {
          before: payload.scenario.carbBefore,
          after: payload.scenario.carbAfter,
          delta: payload.scenario.carbDelta,
        }
      : null,
    pattern: payload.pattern,
  });
  payload.knowledge.forEach((k) =>
    numericTokens(k.body).forEach((n) => allowed.add(n)),
  );
  return numericTokens(text).every((n) => allowed.has(n));
}
