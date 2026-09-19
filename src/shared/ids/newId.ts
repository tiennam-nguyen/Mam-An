import type { Id } from '../../domain/common/brandedIds';
export const newId = <T extends string>(): Id<T> =>
  crypto.randomUUID() as Id<T>;
