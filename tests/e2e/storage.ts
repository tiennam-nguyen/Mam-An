import type { Page } from './fixtures';
export async function seedDatabase(
  page: Page,
  tables: Record<string, unknown[]>,
  version = 20,
) {
  await page.route('**/__seed', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Synthetic test setup</title>',
    }),
  );
  await page.goto('/__seed');
  await page.evaluate(
    async ({ tables, version }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('mam-an', version);
        request.onupgradeneeded = () => {
          const specs: Record<string, string[]> = {
            meals: ['createdAt', 'isDemo'],
            glucoseReadings: ['measuredAt', 'mealId', 'isDemo'],
            thumbnails: ['mealId', 'isDemo'],
            settings: [],
            meta: [],
          };
          for (const [name, indexes] of Object.entries(specs)) {
            const store = request.result.createObjectStore(name, {
              keyPath: name === 'settings' || name === 'meta' ? 'key' : 'id',
            });
            indexes.forEach((key) => store.createIndex(key, key));
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(Object.keys(tables), 'readwrite');
        for (const [table, rows] of Object.entries(tables))
          rows.forEach((row) => tx.objectStore(table).put(row));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { tables, version },
  );
}
export async function readDatabase(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('mam-an');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tables: Record<string, any[]> = {};
    for (const name of ['meals', 'glucoseReadings', 'settings', 'meta'])
      tables[name] = await new Promise<any[]>((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    const version = db.version;
    db.close();
    return { version, tables };
  });
}
