import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { parseCsv } from './catalogPipeline';
import { componentRoles } from '../src/domain/meal/mealEntry';
export function readV2Catalog(foodIds: string[]) {
  const sources = JSON.parse(
    readFileSync('catalog-src/source-registry.json', 'utf8'),
  ) as { source_id: string }[];
  const sourceValid = (ref: string) =>
    sources.some((s) => ref.startsWith(s.source_id + ':'));
  const [header, ...rows] = parseCsv(
    readFileSync('catalog-src/portions.csv', 'utf8'),
  );
  const portions = rows
    .filter((r) => r.some(Boolean))
    .map((row) => {
      const r = Object.fromEntries(header!.map((h, i) => [h, row[i]]));
      if (
        !foodIds.includes(r.food_id!) ||
        !sources.some((s) => s.source_id === r.source_id) ||
        !r.source_locator ||
        !r.derivation_method ||
        r.review_status !== 'REVIEWED'
      )
        throw new Error('Invalid portion provenance');
      return z
        .object({
          foodId: z.string(),
          id: z.string().min(1),
          labelVi: z.string().min(1),
          factorToReference: z.number().finite().positive(),
          aliases: z.array(z.string()),
          sourceRef: z.string(),
          derivationMethod: z.string(),
          reviewStatus: z.literal('REVIEWED'),
        })
        .parse({
          foodId: r.food_id,
          id: r.id,
          labelVi: r.label_vi,
          factorToReference: Number(r.factor),
          aliases: r.aliases_pipe?.split('|'),
          sourceRef: r.source_id + ':' + r.source_locator,
          derivationMethod: r.derivation_method,
          reviewStatus: r.review_status,
        });
    });
  const templates = z
    .array(
      z.object({
        id: z.string(),
        nameVi: z.string(),
        aliases: z.array(z.string()),
        catalogVersion: z.string(),
        sourceRef: z.string(),
        defaultComponents: z.array(
          z.object({
            key: z.string(),
            labelVi: z.string(),
            role: z.enum(componentRoles),
            foodId: z.string().nullable(),
            optional: z.boolean(),
          }),
        ),
      }),
    )
    .parse(JSON.parse(readFileSync('catalog-src/dish-templates.json', 'utf8')));
  const knowledge = z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        sourceLabel: z.string(),
        sourceRef: z.string(),
        knowledgeVersion: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .parse(
      JSON.parse(readFileSync('catalog-src/knowledge/chunks.json', 'utf8')),
    );
  const unique = (values: string[]) => {
    if (new Set(values).size !== values.length)
      throw new Error('Duplicate v2 catalog identifier');
  };
  unique(portions.map((p) => p.foodId + ':' + p.id));
  unique(templates.map((t) => t.id));
  unique(knowledge.map((k) => k.id));
  const aliases = new Map<string, string>();
  for (const t of templates) {
    if (
      !sourceValid(t.sourceRef) ||
      t.defaultComponents.some((c) => c.foodId && !foodIds.includes(c.foodId))
    )
      throw new Error('Invalid template reference');
    unique(t.defaultComponents.map((c) => c.key));
    for (const a of [t.nameVi, ...t.aliases]) {
      const key = a.normalize('NFC').trim().toLocaleLowerCase('vi');
      if (aliases.has(key) && aliases.get(key) !== t.id)
        throw new Error('Ambiguous template alias');
      aliases.set(key, t.id);
    }
  }
  if (knowledge.some((k) => !sourceValid(k.sourceRef)))
    throw new Error('Missing knowledge provenance');
  return {
    portions,
    templates,
    knowledge,
    catalogVersion: 'v2',
    knowledgeVersion: 'knowledge-v1',
  };
}
