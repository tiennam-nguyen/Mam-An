import { readFileSync } from 'node:fs';
import {
  FoodSchema,
  SourceRegistrySchema,
} from '../src/infrastructure/catalog/catalogSchemas';
import { normalizeFoodName } from '../src/domain/food/normalizeFoodName';
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if (c === '\n' && !quoted) {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}
export const catalogVersion = 'v2';
export function buildCatalog(csv: string, registry: unknown) {
  const sources = SourceRegistrySchema.parse(registry);
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new Error('Missing header');
  const ids = new Set<string>(),
    aliases = new Map<string, string>();
  const foods = rows
    .filter((r) => r.some(Boolean))
    .map((row) => {
      if (row.length !== header.length) throw new Error('CSV column mismatch');
      const r = Object.fromEntries(header.map((h, i) => [h, row[i] ?? '']));
      const num = (key: string) => {
        const text = r[key] ?? '';
        if (!text.trim()) return null;
        const n = Number(text);
        if (!Number.isFinite(n) || n < 0) throw new Error('Invalid nutrient');
        return n;
      };
      const derive = (source: string, explicit: string) => {
        const base = num(source),
          grams = num('serving_quantity_g'),
          entered = num(explicit);
        const value =
          base === null
            ? entered
            : grams !== null && grams > 0
              ? (base * grams) / 100
              : NaN;
        if (
          !Number.isFinite(value ?? 0) ||
          (base !== null && r.derivation_method !== 'PER_100G')
        )
          throw new Error('Invalid derivation');
        if (
          entered !== null &&
          value !== null &&
          Math.abs(entered - value) > 1e-9
        )
          throw new Error('Serving mismatch');
        return value;
      };
      const carb = derive('source_carb_per_100g', 'carb_per_serving'),
        kcal = derive('source_kcal_per_100g', 'kcal_per_serving');
      if (
        carb !== null ||
        kcal !== null ||
        num('gi') !== null ||
        num('gl') !== null
      ) {
        if (
          r.review_status !== 'VERIFIED' ||
          !r.source_locator ||
          !sources.some((s) => s.source_id === r.source_id)
        )
          throw new Error('Missing verified provenance');
      }
      const food = FoodSchema.parse({
        id: r.id,
        nameVi: r.name_vi,
        aliases: r.aliases_pipe?.split('|').filter(Boolean) ?? [],
        servingLabel: r.serving_label,
        carbPerServing: carb,
        kcalPerServing: kcal,
        gi: num('gi'),
        gl: num('gl'),
        sourceRefs: r.source_id ? [r.source_id + ':' + r.source_locator] : [],
        catalogVersion,
      });
      if (ids.has(food.id)) throw new Error('Duplicate ID');
      ids.add(food.id);
      for (const alias of [food.nameVi, ...food.aliases]) {
        const key = normalizeFoodName(alias),
          owner = aliases.get(key);
        if (owner && owner !== food.id) throw new Error('Ambiguous alias');
        aliases.set(key, food.id);
      }
      return food;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    foods,
    sources,
    manifest: {
      schemaVersion: 1,
      catalogVersion,
      sourceSet: sources.map((s) => s.source_id),
      publishedAt: '2026-09-19',
    },
  };
}
export function readCatalog() {
  return buildCatalog(
    readFileSync('catalog-src/foods.csv', 'utf8'),
    JSON.parse(readFileSync('catalog-src/source-registry.json', 'utf8')),
  );
}
export const json = (data: unknown) => JSON.stringify(data, null, 2) + '\n';
