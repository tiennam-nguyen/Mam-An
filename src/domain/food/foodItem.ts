import type { FoodId } from '../common/brandedIds';
export interface FoodItem {
  id: FoodId;
  nameVi: string;
  aliases: readonly string[];
  servingLabel: string;
  carbPerServing: number | null;
  kcalPerServing: number | null;
  gi: number | null;
  gl: number | null;
  sourceRefs: readonly string[];
  catalogVersion: string;
}
