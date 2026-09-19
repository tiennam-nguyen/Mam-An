import { readFileSync } from 'node:fs';
import { readCatalog, json } from './catalogPipeline';
const data = readCatalog();
for (const [name, value] of Object.entries({
  'foods.vi.v1': data.foods,
  'source-registry': data.sources,
  manifest: data.manifest,
}))
  if (
    readFileSync(
      'src/infrastructure/catalog/generated/' + name + '.json',
      'utf8',
    ) !== json(value)
  )
    throw new Error('Generated catalog drift: ' + name);
console.log('Catalog valid and reproducible');
