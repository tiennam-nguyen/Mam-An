# Reproducible catalog evidence

Accessed 2026-10-02. Runtime remains local; source download is a curation step.

## Incorporated

ASEANFOODS Electronic v1 (2014), https://inmu.mahidol.ac.th/aseanfoods/doc/OnlineASEAN_FCD_V1_2014.pdf: retained three existing records, AAA63 cooked white rice (PDF34/table1), AAH15 boiled chicken egg (PDF56/table23), AAD46 raw long cucumber (PDF39/table6). Values per 100 g edible; egg product reference is 50 g. Table 4 (PDF20) defines available carbohydrate by difference. Published energy retained. Copyright permits noncommercial use with acknowledgement; commercial redistribution requires review/permission. No change to that restriction is implied by this work.

USDA FoodData Central SR Legacy, final April 2018 release. Download: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip . Public domain/CC0 per https://fdc.nal.usda.gov/api-guide/ . Acknowledge USDA ARS FoodData Central. Original descriptions, FDC IDs, nutrient row IDs, household portion IDs, values and input-file SHA256 are retained in `catalog-src/usda-curated.json`. Food detail URLs resolve the selected identity. Curator selects basic food states, not Vietnamese mixed recipes or branded equivalents.

Reproduce by extracting the official archive, then running:

```
node --import tsx scripts/curate-usda.ts <extracted-directory>
npm run catalog:build
npm run catalog:check
```

The script selects nutrient 1005 (total carbohydrate by difference, g), 1079 (total dietary fiber, g), and 1008 (published energy, kcal). Canonical available carbohydrate = 1005 − 1079, rounded to six decimal places. This follows the difference between CHOCDF and CHOAVLDF in ASEAN Table 4; original total/fiber remain auditable. It is a derivation, not a direct USDA available-carbohydrate measurement. No selected food is alcoholic. Energy remains USDA's published energy, not recalculated with a new universal factor. Source preparation and edible states are retained in each record. No GI/GL imported.

Household masses come from `food_portion.csv`, and are ESTIMATED for the user's actual item. Cross-source rice/egg/cucumber masses are explicitly marked estimates; a source cup is never relabeled a Vietnamese bowl. Unmeasured bowls/loaves remain descriptive, with UNKNOWN nutrition. METRIC g is an exact mass identity. Milk/tea/cola ml use the selected source grams per US fluid ounce divided by 29.57353 ml, the conversion published in NIST SP811 Appendix B.9: https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9 . Density-derived ml remains ESTIMATED. No assumption that 1 ml = 1 g.

## Not incorporated

Vietnamese Food Composition Table 2007 is listed by FAO at https://www.fao.org/infoods/infoods/tables-and-databases/vietnam/en/ . A reusable authoritative dataset with verified licensing and exact locators was not obtained in this task. No values inferred from secondary snippets. No unsupported equivalence between USDA rice noodles and Vietnamese bún/bánh phở, nor between plain French bread and filled bánh mì. Phở, broth and arbitrary drinks remain unknown. Sauces/recipes/brands vary; the selected shoyu and regular cola are identified as such.

## Snapshot and unit contract

Nutrition references retain amount, unit, state, edible portion, carbohydrate definition, energy definition and provenance. User defaults are separate from references. Unit selection snapshots the label/factor with positive quantity. Reserved `describe:` unit IDs count descriptions only; the calculator returns unknown regardless of their identity count. No persisted schema migration and no recalculation of historical meal totals. New defaults only apply to new selections/edits.

