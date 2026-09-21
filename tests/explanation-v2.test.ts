import { it, expect } from 'vitest';
import { draft } from './fixtures/helpers';
import { buildEvidenceBundle, minimizeEvidence, templateExplanation, validateGeneratedExplanation, retrieveKnowledge } from '../src/domain/explanation/explanation';
import { buildPatternEvidence } from '../src/domain/personal/personalResponse';
import data from '../src/infrastructure/catalog/generated/catalog.v2.json';
it('minimizes trace and notes; deterministic retrieval and template remain local', () => {
  const d = {...draft(),note:'PRIVATE NOTE'};
  const pattern = buildPatternEvidence(d,[],[],'USER'); pattern.matchedMealIds=['PRIVATE ID'];
  const bundle=buildEvidenceBundle(d,pattern,data.knowledge), p=minimizeEvidence(bundle);
  expect(JSON.stringify(p)).not.toMatch(/PRIVATE|matchedMealIds|glucoseObservations|readingId/);
  expect(templateExplanation(p).generationMode).toBe('TEMPLATE');
  expect(retrieveKnowledge(data.knowledge,['portion','starch'])[0]!.id).toBe('portion');
});
it('rejects invented numbers, unsafe prose, false personal certainty and unknown refs', () => {
  const p=minimizeEvidence(buildEvidenceBundle(draft(),null,[]));
  const out={summaryVi:'Ước tính từ thành phần đã ghi.',personalObservationVi:null,optionExplanationsVi:[],uncertaintyNoteVi:'Dữ liệu chưa đầy đủ.',evidenceRefs:['meal.current']};
  expect(validateGeneratedExplanation(out,p)).toBe(true);
  for(const summaryVi of ['Có 999 g carb.','Tăng liều insulin.','Món này gây tăng đường huyết.','Phương án an toàn.','Cơ thể bạn chắc chắn ổn.']) expect(validateGeneratedExplanation({...out,summaryVi},p)).toBe(false);
  expect(validateGeneratedExplanation({...out,personalObservationVi:'Trong các lần bạn đã ghi...'},p)).toBe(false);
  expect(validateGeneratedExplanation({...out,evidenceRefs:['unknown']},p)).toBe(false);
});
