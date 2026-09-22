import type { FoodId, MealDraftItemId } from '../common/brandedIds';
import type { MealDraftItem } from './mealDraft';
import type { FoodItem } from '../food/foodItem';
import {
  calculateItemNutrition,
  calculateMealNutrition,
} from './nutritionCalculator.js';

export const componentRoles = [
  'STARCH',
  'PROTEIN',
  'VEGETABLE',
  'BROTH',
  'CONDIMENT',
  'BEVERAGE',
  'TOPPING',
  'OTHER',
] as const;
export type ComponentRole = (typeof componentRoles)[number];
export interface PortionUnit {
  id: string;
  labelVi: string;
  factorToReference: number;
  aliases: readonly string[];
}
export interface PortionSelection {
  unitId: string;
  quantity: number;
  factorToReferenceSnapshot: number;
  displayLabelSnapshot: string;
}
export interface MealComponent {
  componentId: string;
  foodId: FoodId | null;
  displayName: string;
  role: ComponentRole;
  portion: PortionSelection;
  carbEstimate: number | null;
  kcalEstimate: number | null;
  nutritionState: 'KNOWN' | 'UNKNOWN';
  source: 'AI' | 'TEMPLATE' | 'USER' | 'MIGRATION';
  userCorrected: boolean;
  includedInTotal: boolean;
  matchState: 'MATCHED' | 'AMBIGUOUS' | 'UNMATCHED';
}
export interface MealEntry {
  entryId: string;
  dishTemplateId: string | null;
  displayName: string;
  components: readonly MealComponent[];
  userCorrected: boolean;
}
export interface DishTemplate {
  id: string;
  nameVi: string;
  aliases: readonly string[];
  catalogVersion: string;
  sourceRef: string;
  defaultComponents: readonly {
    key: string;
    labelVi: string;
    role: ComponentRole;
    foodId: string | null;
    optional: boolean;
  }[];
}
export function referencePortion(food: FoodItem | null): PortionSelection {
  return {
    unitId: 'reference',
    quantity: 1,
    factorToReferenceSnapshot: 1,
    displayLabelSnapshot: food?.servingLabel ?? '1 phần chưa xác định',
  };
}
export function validatePortion(p: PortionSelection) {
  if (
    !p.unitId ||
    !p.displayLabelSnapshot ||
    !Number.isFinite(p.quantity) ||
    p.quantity <= 0 ||
    !Number.isFinite(p.factorToReferenceSnapshot) ||
    p.factorToReferenceSnapshot <= 0
  )
    throw new Error('Invalid portion');
}
export function calculateComponent(
  c: MealComponent,
  food: FoodItem | null,
): MealComponent {
  validatePortion(c.portion);
  return {
    ...c,
    ...calculateItemNutrition(
      c.includedInTotal ? food : null,
      c.portion.quantity * c.portion.factorToReferenceSnapshot,
    ),
  };
}
/** Compatibility projection for v1 display/summary callers. Entries own v2 edits. */
export function flattenEntries(entries: readonly MealEntry[]): MealDraftItem[] {
  return entries.flatMap((e) =>
    e.components.map((c) => ({
      itemId: c.componentId as MealDraftItemId,
      foodId: c.foodId,
      displayName: c.displayName,
      portionMultiplier:
        c.portion.quantity * c.portion.factorToReferenceSnapshot,
      portionLabel: c.portion.displayLabelSnapshot,
      carbEstimate: c.carbEstimate,
      kcalEstimate: c.kcalEstimate,
      nutritionState: c.nutritionState,
      userCorrected: c.userCorrected,
      includedInTotal: c.includedInTotal,
    })),
  );
}
export function entriesFromItems(
  items: readonly MealDraftItem[],
  source: MealComponent['source'],
): MealEntry[] {
  return items.map((i) => ({
    entryId: i.itemId + ':entry',
    dishTemplateId: null,
    displayName: i.displayName,
    userCorrected: i.userCorrected,
    components: [
      {
        componentId: i.itemId,
        foodId: i.foodId,
        displayName: i.displayName,
        role: 'OTHER',
        portion: {
          unitId:
            source === 'MIGRATION' ? 'legacy-reference-serving' : 'reference',
          quantity: i.portionMultiplier,
          factorToReferenceSnapshot: 1,
          displayLabelSnapshot: i.portionLabel,
        },
        carbEstimate: i.carbEstimate,
        kcalEstimate: i.kcalEstimate,
        nutritionState: i.nutritionState,
        source,
        userCorrected: i.userCorrected,
        includedInTotal: i.includedInTotal,
        matchState: i.foodId ? 'MATCHED' : 'UNMATCHED',
      },
    ],
  }));
}
export function entryTotals(entries: readonly MealEntry[]) {
  return calculateMealNutrition(flattenEntries(entries));
}
export function cloneEntries(entries: readonly MealEntry[]): MealEntry[] {
  return entries.map((e) => ({
    ...e,
    components: e.components.map((c) => ({ ...c, portion: { ...c.portion } })),
  }));
}

export function foodRole(food: FoodItem | null): ComponentRole {
  return food?.category && food.category !== 'MIXED' ? food.category : 'OTHER';
}
