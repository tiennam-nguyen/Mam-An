import { PortionControls } from '../../shared/ui/PortionControls';
import { VoiceInput } from '../../shared/ui/VoiceInput';
import { instantiateTemplate } from '../../domain/meal/dishTemplate';
import {
  selectPortion,
  resolvePortionPhrase,
} from '../../domain/food/portionResolver';
import { useState } from 'react';
import type { FoodCatalog } from '../../application/ports/foodCatalog';
import type { FoodId } from '../../domain/common/brandedIds';
import {
  foodRole,
  defaultPortion,
  type MealComponent,
  type MealEntry,
} from '../../domain/meal/mealEntry';
import { newId } from '../../shared/ids/newId';
import { formatNumber } from '../../shared/ui/common';
export const roleLabels = {
  STARCH: 'Tinh bột',
  PROTEIN: 'Đạm',
  VEGETABLE: 'Rau',
  BROTH: 'Nước dùng',
  CONDIMENT: 'Gia vị / sốt',
  BEVERAGE: 'Đồ uống',
  TOPPING: 'Ăn kèm',
  OTHER: 'Khác',
};
export function newComponent(
  catalog: FoodCatalog,
  foodId: FoodId | null = null,
): MealComponent {
  const food = foodId ? catalog.getFoodById(foodId) : null;
  return {
    componentId: newId(),
    foodId,
    displayName: food?.nameVi ?? 'Thành phần tự nhập',
    role: foodRole(food),
    portion: defaultPortion(food),
    carbEstimate: null,
    kcalEstimate: null,
    nutritionState: 'UNKNOWN',
    source: 'USER',
    userCorrected: true,
    includedInTotal: true,
    matchState: food ? 'MATCHED' : 'UNMATCHED',
  };
}
export function EntryEditor({
  entries,
  catalog,
  onChange,
  disabled = false,
}: {
  entries: readonly MealEntry[];
  catalog: FoodCatalog;
  onChange: (entries: readonly MealEntry[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const components = entries.flatMap((e) => e.components);
  const correctionId = (
    components.find((c) => !c.userCorrected && c.matchState !== 'MATCHED') ??
    components.find((c) => !c.foodId)
  )?.componentId;
  const change = (id: string, patch: Partial<MealComponent>) =>
    onChange(
      entries.map((e) => ({
        ...e,
        displayName:
          e.components.length === 1 &&
          e.components[0]?.componentId === id &&
          !e.dishTemplateId &&
          patch.displayName !== undefined
            ? patch.displayName
            : e.displayName,
        userCorrected:
          e.components.some((c) => c.componentId === id) || e.userCorrected,
        components: e.components.map((c) =>
          c.componentId === id ? { ...c, ...patch, userCorrected: true } : c,
        ),
      })),
    );
  return (
    <fieldset className="bare" disabled={disabled}>
      {entries.map((entry) => (
        <article className="card" key={entry.entryId}>
          <h2>{entry.displayName}</h2>
          {(entry.components.length !== 1 || entry.dishTemplateId) && (
            <details>
              <summary>Đổi tên món</summary>
              <label>
                Tên món / nhóm
                <input
                  value={entry.displayName}
                  maxLength={120}
                  onChange={(e) =>
                    onChange(
                      entries.map((x) =>
                        x.entryId === entry.entryId
                          ? {
                              ...x,
                              displayName: e.target.value,
                              userCorrected: true,
                            }
                          : x,
                      ),
                    )
                  }
                />
              </label>
            </details>
          )}
          {entry.components.map((c) => (
            <details
              key={c.componentId}
              open={
                entry.components.length === 1 || c.componentId === correctionId
              }
              className="food-card"
            >
              <summary>
                {entry.components.length === 1 ? 'Khẩu phần' : c.displayName} ·{' '}
                {formatNumber(c.carbEstimate)}{' '}
                {c.carbEstimate !== null ? 'g carb' : ''}
                {!c.userCorrected &&
                (c.matchState !== 'MATCHED' || c.source === 'TEMPLATE')
                  ? ' · Cần xem lại'
                  : ''}
              </summary>
              <PortionControls
                food={c.foodId ? catalog.getFoodById(c.foodId) : null}
                portion={c.portion}
                onChange={(portion) => change(c.componentId, { portion })}
              />
              <details
                className="component-edit"
                open={c.componentId === correctionId}
              >
                <summary>Chỉnh món này</summary>
                <label>
                  Tên thành phần
                  <input
                    value={c.displayName}
                    maxLength={120}
                    onChange={(e) =>
                      change(c.componentId, { displayName: e.target.value })
                    }
                  />
                </label>
                <small>
                  Tên bạn ghi có thể khác tên trong danh mục dinh dưỡng.
                </small>
                <VoiceInput
                  label="tên thành phần"
                  onConfirm={(text) => {
                    change(c.componentId, { displayName: text.slice(0, 120) });
                  }}
                />
                <VoiceInput
                  label="khẩu phần"
                  onConfirm={(text) => {
                    const resolved = resolvePortionPhrase(
                      text,
                      c.foodId
                        ? (catalog.getPortionUnits?.(c.foodId) ?? [])
                        : [],
                    );
                    if (resolved.state !== 'RESOLVED') return false;
                    change(c.componentId, {
                      portion: selectPortion(resolved.matches[0]!),
                    });
                  }}
                />
                <label>
                  Chọn thực phẩm phù hợp
                  <select
                    value={c.foodId ?? ''}
                    onChange={(e) => {
                      const f = catalog.getFoodById(e.target.value as FoodId);
                      change(c.componentId, {
                        foodId: f?.id ?? null,
                        role: foodRole(f),
                        portion: defaultPortion(f),
                        matchState: f ? 'MATCHED' : 'UNMATCHED',
                      });
                    }}
                  >
                    <option value="">Tự nhập · dinh dưỡng chưa biết</option>
                    {catalog.listDemoFoods().map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nameVi}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  Chọn trong danh mục đã kiểm tra để tính dinh dưỡng. Chọn “Tự
                  nhập” nếu không có món phù hợp; tên bạn ghi được giữ nguyên.
                </p>
                {!c.foodId && (
                  <p>
                    Chưa có dữ liệu dinh dưỡng cho món tự nhập. Bạn vẫn có thể
                    lưu tên và khẩu phần.
                  </p>
                )}
                <p>
                  {c.carbEstimate === null
                    ? 'Carb chưa biết'
                    : `${formatNumber(c.carbEstimate)} g carb`}{' '}
                  ·{' '}
                  {c.kcalEstimate === null
                    ? 'Năng lượng chưa biết'
                    : `${formatNumber(c.kcalEstimate)} kcal ước tính`}
                </p>
                {c.foodId && (
                  <div>
                    <p>Nguồn và chỉ số tham khảo</p>
                    <small>
                      {catalog.getFoodById(c.foodId)?.sourceRefs.join(' · ') ||
                        'Chưa có nguồn dinh dưỡng đã xác minh'}
                    </small>
                    {catalog.getFoodById(c.foodId)?.gi != null && (
                      <p>GI tham khảo: {catalog.getFoodById(c.foodId)?.gi}</p>
                    )}
                    {catalog.getFoodById(c.foodId)?.gl != null && (
                      <p>GL tham khảo: {catalog.getFoodById(c.foodId)?.gl}</p>
                    )}
                  </div>
                )}
              </details>
              {!c.userCorrected &&
                (c.matchState !== 'MATCHED' || c.source === 'TEMPLATE') && (
                  <button onClick={() => change(c.componentId, {})}>
                    Xác nhận thành phần này
                  </button>
                )}
              <button
                className="quiet"
                onClick={() =>
                  onChange(
                    entries.map((e) => ({
                      ...e,
                      components: e.components.filter(
                        (x) => x.componentId !== c.componentId,
                      ),
                    })),
                  )
                }
              >
                Xóa {c.displayName}
              </button>
            </details>
          ))}
          <details className="entry-options">
            <summary>Thêm hoặc bỏ thành phần</summary>
            <button
              onClick={() =>
                onChange(
                  entries.map((e) =>
                    e.entryId === entry.entryId
                      ? {
                          ...e,
                          components: [...e.components, newComponent(catalog)],
                        }
                      : e,
                  ),
                )
              }
            >
              ＋ Thành phần
            </button>
            <button
              className="quiet"
              onClick={() =>
                onChange(entries.filter((e) => e.entryId !== entry.entryId))
              }
            >
              Xóa nhóm
            </button>
          </details>
        </article>
      ))}
      <details className="card add-dish" open={entries.length === 0}>
        <summary>Thêm món</summary>
        <div className="chips">
          {catalog.listDishTemplates?.().map((t) => (
            <button
              key={t.id}
              onClick={() =>
                onChange([
                  ...entries,
                  instantiateTemplate(t, newId(), (id) =>
                    catalog.getFoodById(id as FoodId),
                  ),
                ])
              }
            >
              ＋ {t.nameVi} gồm nhiều thành phần
            </button>
          ))}
        </div>
        <label>
          Tìm món trong danh mục
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="chips">
          {catalog.search(query).map((f) => (
            <button
              key={f.id}
              onClick={() =>
                onChange([
                  ...entries,
                  {
                    entryId: newId(),
                    dishTemplateId: null,
                    displayName: f.nameVi,
                    components: [newComponent(catalog, f.id)],
                    userCorrected: true,
                  },
                ])
              }
            >
              ＋ {f.nameVi}
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            onChange([
              ...entries,
              {
                entryId: newId(),
                dishTemplateId: null,
                displayName: 'Món tự nhập',
                components: [newComponent(catalog)],
                userCorrected: true,
              },
            ])
          }
        >
          ＋ Món tự nhập
        </button>
      </details>
    </fieldset>
  );
}
