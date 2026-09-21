import { readV2Catalog } from './catalogV2Pipeline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readCatalog, json } from './catalogPipeline';
const data = readCatalog();
const dir = 'src/infrastructure/catalog/generated';
mkdirSync(dir, { recursive: true });
for (const [name, value] of Object.entries({
  'catalog.v2': readV2Catalog(data.foods.map((f) => f.id)),
  'foods.vi.v1': data.foods,
  'source-registry': data.sources,
  manifest: data.manifest,
}))
  writeFileSync(dir + '/' + name + '.json', json(value));
console.log('Catalog generated: ' + data.foods.length + ' foods');
