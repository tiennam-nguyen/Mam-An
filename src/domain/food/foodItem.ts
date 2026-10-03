import type { ComponentRole } from '../meal/mealEntry';
import type { FoodId } from '../common/brandedIds';
import type { PortionUnit } from '../meal/mealEntry';
export interface NutritionBasis {
  amount: number;
  unit: 'G' | 'ML';
  preparationState: string;
  ediblePortionNote: string;
  carbohydrateDefinition: 'AVAILABLE_BY_DIFFERENCE';
  energyDefinition: string;
}
export interface FoodProvenance {
  sourceId: string;
  sourceFoodId: string;
  sourceDescription: string;
  sourceVersion: string;
  sourceRef: string;
  accessedAt: string;
  notes: string;
}
export interface FoodItem {
  id: FoodId;
  category?: ComponentRole | 'MIXED';
  nameVi: string;
  aliases: readonly string[];
  servingLabel: string;
  carbPerServing: number | null;
  kcalPerServing: number | null;
  gi: number | null;
  gl: number | null;
  sourceRefs: readonly string[];
  catalogVersion: string;
  nutrientBasis?: NutritionBasis;
  provenance?: FoodProvenance;
  referenceServingId?: string;
  portionUnits?: readonly PortionUnit[];
  defaultPortionId?: string;
}
