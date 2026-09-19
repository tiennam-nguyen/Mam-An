import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  );
const forbidden = [
  'dangerouslySetInnerHTML',
  'insulinCalculator',
  'medicationAdvisor',
  'diagnosisEngine',
  'glucoseTargetClassifier',
  'mealCausalityDetector',
];
for (const file of files('src')) {
  const text = readFileSync(file, 'utf8');
  for (const word of forbidden)
    if (text.includes(word)) throw new Error('Forbidden feature: ' + file);
}
for (const file of files('dist').filter((p) => p.endsWith('.js'))) {
  const text = readFileSync(file, 'utf8');
  for (const name of [
    'GROQ_API_KEY',
    'OPENROUTER_API_KEY',
    'api.groq.com',
    'openrouter.ai/api',
  ])
    if (text.includes(name)) throw new Error('Server boundary leaked: ' + file);
}
console.log(
  'Safety inventory and client/server bundle boundary checks passed. Curated Vietnamese copy reviewed separately; this is not a clinical audit.',
);
