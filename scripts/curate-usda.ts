// Offline curation, never called by the app. Download SR Legacy CSV separately.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parseCsv } from './catalogPipeline';
const root = process.argv[2];
if (!root) throw new Error('Pass extracted USDA SR Legacy directory');
const table = (name: string) => {
  const [header, ...rows] = parseCsv(
    readFileSync(join(root, name + '.csv'), 'utf8'),
  );
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ''])));
};
const foods = table('food'),
  nutrients = table('food_nutrient'),
  portions = table('food_portion');
const nutrientDefinitions = table('nutrient');
for (const [id, unit] of [
  ['1005', 'G'],
  ['1079', 'G'],
  ['1008', 'KCAL'],
]) {
  if (nutrientDefinitions.find((n) => n.id === id)?.unit_name !== unit)
    throw new Error('Unexpected source nutrient unit: ' + id);
}
// Exact FDC records and source portion IDs; no whole Vietnamese dish equivalence.
const selection = [
  [
    'cabbage',
    '169976',
    'Bắp cải luộc, để ráo, không muối',
    'bắp cải luộc',
    'VEGETABLE',
    '85799',
    '½ cốc đong bắp cải theo nguồn (75 g)',
  ],
  [
    'bok-choy',
    '170391',
    'Cải thìa luộc, để ráo, không muối',
    'cải thìa luộc',
    'VEGETABLE',
    '86553',
    '1 cốc cải thìa theo nguồn (170 g)',
  ],
  [
    'carrot',
    '170394',
    'Cà rốt luộc, để ráo, không muối',
    'cà rốt luộc',
    'VEGETABLE',
    '86566',
    '1 củ theo nguồn (46 g)',
  ],
  [
    'tomato',
    '170457',
    'Cà chua đỏ chín, ăn sống',
    'cà chua sống',
    'VEGETABLE',
    '86686',
    '1 quả vừa theo nguồn (123 g)',
  ],
  [
    'brown-rice',
    '169704',
    'Cơm gạo lứt hạt dài, đã nấu',
    'cơm gạo lứt',
    'STARCH',
    '85378',
    '1 cốc đong theo nguồn (202 g)',
  ],
  [
    'sticky-rice',
    '169711',
    'Gạo nếp trắng, đã nấu',
    'cơm nếp|xôi trắng không thêm nguyên liệu',
    'STARCH',
    '85385',
    '1 cốc đong theo nguồn (174 g)',
  ],
  [
    'rice-noodles',
    '168914',
    'Sợi mì gạo, đã chín (USDA)',
    'mì gạo chín',
    'STARCH',
    '83974',
    '1 cốc đong theo nguồn (176 g)',
  ],
  [
    'egg-noodles',
    '169762',
    'Mì trứng, đã chín, có muối',
    'mì trứng chín',
    'STARCH',
    '85467',
    '1 cốc đong theo nguồn (160 g)',
  ],
  [
    'bread',
    '172675',
    'Bánh mì kiểu Pháp, không nhân',
    'bánh mì không nhân|bánh mì kiểu Pháp',
    'STARCH',
    '',
    '',
  ],
  [
    'potato',
    '170440',
    'Khoai tây luộc, bỏ vỏ, không muối',
    'khoai tây luộc',
    'STARCH',
    '86653',
    '1 củ vừa theo nguồn (167 g)',
  ],
  [
    'sweet-potato',
    '168484',
    'Khoai lang luộc, bỏ vỏ',
    'khoai lang luộc',
    'STARCH',
    '83173',
    '1 củ vừa theo nguồn (151 g)',
  ],
  [
    'corn',
    '169999',
    'Ngô ngọt vàng luộc, để ráo, không muối',
    'ngô luộc|bắp luộc',
    'STARCH',
    '85851',
    '1 bắp vừa theo nguồn (103 g hạt)',
  ],
  [
    'kidney-beans',
    '173740',
    'Đậu thận luộc, không muối',
    'đậu thận chín',
    'STARCH',
    '93205',
    '1 cốc đong theo nguồn (177 g)',
  ],
  [
    'banana',
    '173944',
    'Chuối tươi, phần ăn được',
    'chuối',
    'OTHER',
    '93515',
    '1 quả vừa theo nguồn (118 g)',
  ],
  [
    'mango',
    '169910',
    'Xoài tươi, phần ăn được',
    'xoài',
    'OTHER',
    '85651',
    '1 cốc miếng xoài theo nguồn (165 g)',
  ],
  [
    'papaya',
    '169926',
    'Đu đủ tươi, phần ăn được',
    'đu đủ',
    'OTHER',
    '85692',
    '1 cốc miếng đu đủ theo nguồn (145 g)',
  ],
  [
    'watermelon',
    '167765',
    'Dưa hấu tươi, phần ăn được',
    'dưa hấu',
    'OTHER',
    '81933',
    '1 cốc miếng dưa theo nguồn (152 g)',
  ],
  [
    'orange',
    '169097',
    'Cam tươi, phần ăn được',
    'cam',
    'OTHER',
    '84230',
    '1 quả theo nguồn (131 g)',
  ],
  [
    'milk',
    '172217',
    'Sữa bò nguyên kem 3,25%, không thêm đường',
    'sữa nguyên kem',
    'BEVERAGE',
    '90101',
    '1 cốc theo nguồn (244 g)',
  ],
  [
    'yogurt',
    '171284',
    'Sữa chua nguyên kem, không thêm đường',
    'sữa chua không đường',
    'OTHER',
    '88362',
    '1 hộp theo nguồn (170 g)',
  ],
  [
    'green-tea',
    '171917',
    'Trà xanh pha, không đường',
    'trà xanh không đường',
    'BEVERAGE',
    '89558',
    '1 cốc theo nguồn (245 g)',
  ],
  [
    'cola',
    '174852',
    'Nước cola có đường (công thức USDA)',
    'cola có đường',
    'BEVERAGE',
    '95017',
    '1 lon theo nguồn (12 fl oz; 370 g)',
  ],
  [
    'sugar',
    '169655',
    'Đường cát trắng',
    'đường cát',
    'CONDIMENT',
    '85287',
    '1 thìa cà phê theo nguồn (4,2 g)',
  ],
  [
    'soy-sauce',
    '174277',
    'Nước tương đậu nành và lúa mì (shoyu)',
    'nước tương shoyu',
    'CONDIMENT',
    '94068',
    '1 thìa canh theo nguồn (16 g)',
  ],
  [
    'chicken-breast',
    '171477',
    'Ức gà nướng, bỏ da và xương',
    'ức gà nướng',
    'PROTEIN',
    '88819',
    '1/2 ức theo nguồn (86 g)',
  ],
  [
    'tofu',
    '172475',
    'Đậu phụ cứng, chưa chế biến, kết tủa calcium sulfate',
    'đậu phụ cứng',
    'PROTEIN',
    '90684',
    '1/4 miếng theo nguồn (81 g)',
  ],
] as const;
const records = selection.map(
  ([id, fdcId, nameVi, aliases, category, portionId, portionLabel]) => {
    const food = foods.find((f) => f.fdc_id === fdcId);
    if (!food) throw new Error('Missing source food ' + fdcId);
    const values = Object.fromEntries(
      ['1005', '1079', '1008'].map((n) => {
        const row = nutrients.find(
          (r) => r.fdc_id === fdcId && r.nutrient_id === n,
        );
        if (!row || !row.amount?.trim())
          throw new Error('Missing nutrient ' + fdcId + ':' + n);
        return [n, { amount: Number(row.amount), rowId: row.id }];
      }),
    );
    const p = portions.find((p) => p.id === portionId);
    const volume = portions.find(
      (p) => p.fdc_id === fdcId && p.modifier === 'fl oz' && p.amount === '1',
    );
    if (portionId && p?.fdc_id !== fdcId)
      throw new Error('Portion identity mismatch');
    return {
      id,
      nameVi,
      aliases: aliases.split('|'),
      category,
      sourceFoodId: fdcId,
      sourceDescription: food.description,
      nutrients: values,
      household: p
        ? {
            sourcePortionId: p.id,
            sourceAmount: Number(p.amount),
            sourceModifier: p.modifier,
            grams: Number(p.gram_weight),
            labelVi: portionLabel,
          }
        : null,
      volumePortion: volume
        ? {
            sourcePortionId: volume.id,
            gramsPerUsFlOz: Number(volume.gram_weight),
          }
        : null,
      sourceRef:
        'https://fdc.nal.usda.gov/food-details/' + fdcId + '/nutrients',
    };
  },
);
// Portion evidence for existing foods; source nutrient values are NOT substituted.
const legacyPortions = [
  ['rice', '85462'],
  ['egg', '92500'],
  ['cucumber', '83049'],
].map(([foodId, id]) => ({ foodId, ...portions.find((p) => p.id === id) }));
const result = {
  sourceId: 'usda-sr-2018',
  release: 'April 2018',
  accessedAt: '2026-10-02',
  download:
    'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
  files: ['food', 'food_nutrient', 'food_portion', 'nutrient'].map((name) => ({
    name: name + '.csv',
    sha256: createHash('sha256')
      .update(readFileSync(join(root, name + '.csv')))
      .digest('hex'),
  })),
  records,
  legacyPortions,
};
writeFileSync(
  'catalog-src/usda-curated.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  'Curated ' +
    records.length +
    ' basic food records with original nutrient/portion row IDs',
);
