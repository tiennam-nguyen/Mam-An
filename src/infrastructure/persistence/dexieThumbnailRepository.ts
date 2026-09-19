import type { ThumbnailRepository } from '../../application/ports/thumbnailRepository';
import type { ThumbnailId } from '../../domain/common/brandedIds';
import { MamAnDb } from './mamAnDb';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export class DexieThumbnailRepository implements ThumbnailRepository {
  constructor(private db: MamAnDb) {}
  async get(id: ThumbnailId) {
    try {
      const row = await this.db.thumbnails.get(id);
      if (
        row &&
        (!(row.blob instanceof Blob) ||
          !['image/jpeg', 'image/webp'].includes(row.blob.type))
      )
        throw new Error('Invalid thumbnail');
      return ok(row ?? null);
    } catch {
      return fail('STORAGE_READ_FAILED', 'STORAGE', true);
    }
  }
}
