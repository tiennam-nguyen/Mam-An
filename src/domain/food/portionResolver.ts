import type { PortionUnit, PortionSelection } from '../meal/mealEntry';
const normalize = (s: string) =>
  s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
export function resolvePortionPhrase(
  phrase: string,
  units: readonly PortionUnit[],
) {
  const matches = units.filter((u) =>
    [u.labelVi, ...u.aliases].some((a) => normalize(a) === normalize(phrase)),
  );
  return {
    state:
      matches.length === 1
        ? ('RESOLVED' as const)
        : matches.length
          ? ('AMBIGUOUS' as const)
          : ('UNRESOLVED' as const),
    matches,
  };
}
export function selectPortion(
  unit: PortionUnit,
  quantity = 1,
): PortionSelection {
  return {
    unitId: unit.id,
    quantity,
    factorToReferenceSnapshot: unit.factorToReference,
    displayLabelSnapshot: unit.labelVi,
  };
}
