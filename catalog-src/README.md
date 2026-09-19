# Catalog curation

Three numeric entries are manually transcribed from [ASEANFOODS 2014](https://inmu.mahidol.ac.th/aseanfoods/doc/OnlineASEAN_FCD_V1_2014.pdf), accessed 2026-09-19. Locators in foods.csv identify exact rows and PDF pages. Source nutrient is available carbohydrate by difference (CHOAVLDF), not an AI estimate. Rice 29.4 g/129 kcal, boiled egg 1.2 g/152 kcal, cucumber 2.8 g/16 kcal per 100 g edible portion.

[ASSUMED] App reference weights (100/50/100 g) are explicit illustrative portions, not measured household bowl sizes. Egg excludes shell. User adjusts multipliers. Mixed dishes such as phở remain UNKNOWN until recipe and serving mapping are curated.

[READ] ASEANFOODS is the LLD secondary source. Appropriate Vietnam FCT entries were not verified in this implementation; no primary-source equivalence is claimed. ASEANFOODS acknowledgement retained. Reuse/licensing for public/commercial redistribution remains a review item; this is a tiny noncommercial prototype subset, not a mirrored database.

Author foods.csv; run npm run catalog:build. Generated JSON is committed; npm run catalog:check rejects drift. CSV deliberately supports quoted fields and escaped quotes.
