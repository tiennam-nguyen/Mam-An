import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildCatalog,
  parseCsv,
  readCatalog,
} from '../scripts/catalogPipeline';
const csv = readFileSync('catalog-src/foods.csv', 'utf8'),
  registry = JSON.parse(
    readFileSync('catalog-src/source-registry.json', 'utf8'),
  ) as unknown;
it('catalog numeric values have registered source and locators', () => {
  const result = readCatalog();
  expect(result.foods.filter((f) => f.carbPerServing !== null)).toHaveLength(3);
  expect(result.foods.find((f) => f.id === 'egg')?.carbPerServing).toBe(0.6);
});
it('rejects missing provenance, invalid portions, duplicates and derivation drift', () => {
  expect(() =>
    buildCatalog(csv.replace('AAA63 PDF page 34 table page 1', ''), registry),
  ).toThrow();
  expect(() =>
    buildCatalog(csv.replace(',100,29.4,129', ',0,29.4,129'), registry),
  ).toThrow();
  expect(() =>
    buildCatalog(csv.replace('egg,Trứng', 'rice,Trứng'), registry),
  ).toThrow();
  expect(() =>
    buildCatalog(csv.replace(',29.4,129,,,', ',30,129,,,'), registry),
  ).toThrow();
});
it('CSV quoting is explicit', () =>
  expect(parseCsv('a,b\n"x,y","z""q"\n')).toEqual([
    ['a', 'b'],
    ['x,y', 'z"q'],
  ]));
