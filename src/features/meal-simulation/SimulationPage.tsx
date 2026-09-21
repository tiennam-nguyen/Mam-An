import { MealEvidence } from '../personal-response/MealEvidence';
import { useSyncExternalStore, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import {
  Completeness,
  ErrorNotice,
  formatNumber,
  SafetyNote,
} from '../../shared/ui/common';
import { referencePortion, foodRole } from '../../domain/meal/mealEntry';
import type { FoodId } from '../../domain/common/brandedIds';
import type { ScenarioOperation } from '../../domain/meal/decisionSimulator';
export function SimulationPage() {
  const { session, catalog } = useServices();
  const { draft, error } = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
  );
  const navigate = useNavigate();
  const [addFood, setAddFood] = useState(catalog.listDemoFoods()[0]?.id ?? '');
  if (!draft || !['REVIEW_READY', 'SAVE_ERROR'].includes(draft.analysisState))
    return <Navigate to="/meal/review" replace />;
  const scenario = session.getScenario();
  const entries = scenario?.resultingEntries ?? draft.entries;
  const append = (op: ScenarioOperation) =>
    session.simulate([...(scenario?.operations ?? []), op]);
  return (
    <>
      <h1>Thử phương án khác</h1>
      <p>
        Phương án chỉ dùng để so sánh. Sau khi áp dụng, bạn vẫn cần bấm Lưu bữa
        ăn.
      </p>
      <div className="metric-grid">
        <section className="card">
          <h2>Bữa ban đầu</h2>
          <p>
            {formatNumber(draft.totalCarbEstimate)} g carb ·{' '}
            {formatNumber(draft.totalKcalEstimate)} kcal
          </p>
          <Completeness value={draft.completeness} />
          <ul>
            {draft.entries
              .flatMap((e) => e.components)
              .map((c) => (
                <li key={c.componentId}>
                  {c.displayName} · {c.portion.quantity} ×{' '}
                  {c.portion.displayLabelSnapshot}
                </li>
              ))}
          </ul>
        </section>
        <section className="card">
          <h2>Phương án đang thử</h2>
          <p aria-live="polite">
            {formatNumber(
              scenario?.after.totalCarbEstimate ??
                (scenario ? null : draft.totalCarbEstimate),
            )}{' '}
            g carb ·{' '}
            {formatNumber(
              scenario?.after.totalKcalEstimate ??
                (scenario ? null : draft.totalKcalEstimate),
            )}{' '}
            kcal
          </p>
          <p>
            Chênh lệch: {formatNumber(scenario?.carbDeltaVsBaseline ?? null)} g
            carb · {formatNumber(scenario?.kcalDeltaVsBaseline ?? null)} kcal
          </p>
          <Completeness
            value={scenario?.after.completeness ?? draft.completeness}
          />
        </section>
      </div>
      {entries.map((e) => (
        <section key={e.entryId} className="card">
          <h2>{e.displayName}</h2>
          {e.components.map((c) => (
            <div className="food-card" key={c.componentId}>
              <h3>{c.displayName}</h3>
              <div className="chips">
                {[0.5, 1, 1.5, 2].map((quantity) => (
                  <button
                    key={quantity}
                    aria-pressed={quantity === c.portion.quantity}
                    onClick={() =>
                      append({
                        type: 'CHANGE_PORTION',
                        targetComponentId: c.componentId,
                        newPortion: { ...c.portion, quantity },
                      })
                    }
                  >
                    {quantity} × {c.portion.displayLabelSnapshot}
                  </button>
                ))}
              </div>
              <label>
                Thay thành phần
                <select
                  value=""
                  onChange={(event) => {
                    const food = catalog.getFoodById(
                      event.target.value as FoodId,
                    );
                    if (food)
                      append({
                        type: 'REPLACE_COMPONENT',
                        targetComponentId: c.componentId,
                        replacementFoodId: food.id,
                        newPortion: referencePortion(food),
                      });
                  }}
                >
                  <option value="">Chọn món thay thế</option>
                  {catalog.listDemoFoods().map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nameVi}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="quiet"
                onClick={() =>
                  append({
                    type: 'REMOVE_COMPONENT',
                    targetComponentId: c.componentId,
                  })
                }
              >
                Bỏ {c.displayName}
              </button>
            </div>
          ))}
          <label>
            Thêm thành phần
            <select
              value={addFood}
              onChange={(event) => setAddFood(event.target.value)}
            >
              {catalog.listDemoFoods().map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nameVi}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const food = catalog.getFoodById(addFood as FoodId);
              if (food)
                append({
                  type: 'ADD_COMPONENT',
                  targetEntryId: e.entryId,
                  foodId: food.id,
                  role: foodRole(food),
                  portion: referencePortion(food),
                });
            }}
          >
            ＋ Thêm vào phương án
          </button>
        </section>
      ))}
      <MealEvidence
        draft={draft}
        mode={draft.source === 'DEMO_SAMPLE' ? 'DEMO' : 'USER'}
        scenario={scenario}
      />
      <section className="card">
        <h2>Thay đổi đã thử</h2>
        <ol>
          {scenario?.operationLabels.map((label, i) => (
            <li key={i}>{label}</li>
          ))}
        </ol>
        <ErrorNotice error={error} />
        <div className="actions">
          <button
            className="primary"
            disabled={!scenario}
            onClick={() => {
              session.applySimulation();
              if (!session.getScenario()) navigate('/meal/review');
            }}
          >
            Áp dụng vào bữa chưa lưu
          </button>
          <button
            onClick={() => {
              session.discardSimulation();
              navigate('/meal/review');
            }}
          >
            Bỏ phương án
          </button>
        </div>
        <SafetyNote />
      </section>
    </>
  );
}
