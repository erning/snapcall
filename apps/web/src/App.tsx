import { useReducer, useMemo } from "react";
import { appReducer, initialState } from "./reducer";
import { useEquity } from "./hooks/useEquity";
import { BoardSection } from "./components/BoardSection";
import { HeroSection } from "./components/HeroSection";
import { VillainsSection } from "./components/VillainsSection";
import { PotOddsSection } from "./components/PotOddsSection";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const boardStr = useMemo(
    () => state.board.filter(Boolean).join(""),
    [state.board],
  );
  const heroStr = useMemo(
    () => state.hero.filter(Boolean).join(""),
    [state.hero],
  );

  const villainStrs = useMemo(
    () => state.villains.map((slots) => slots.filter(Boolean).join("")),
    [state.villains],
  );

  const { equities, mode, samples, isCalculating, error } = useEquity(
    boardStr,
    heroStr,
    villainStrs,
  );

  // Collect all cards used across board + hero for disabling in pickers
  const boardCards = useMemo(
    () => state.board.filter((c): c is string => c !== null),
    [state.board],
  );
  const heroCards = useMemo(
    () => state.hero.filter((c): c is string => c !== null),
    [state.hero],
  );

  const villainCards = useMemo(
    () =>
      state.villains.flatMap((slots) =>
        slots.filter((c): c is string => c !== null),
      ),
    [state.villains],
  );

  const globalDisabledCards = useMemo(
    () => [...boardCards, ...heroCards, ...villainCards],
    [boardCards, heroCards, villainCards],
  );

  return (
    <main className="h-screen flex flex-col bg-stone-50">
      {/* Fixed top: Header + Board + Hero */}
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-6 space-y-4">
        <header className="px-1">
          <h1 className="text-xl font-bold text-stone-900">SnapCall</h1>
          {mode && samples !== null && (
            <p className="text-xs text-stone-400 mt-0.5">
              {mode} &middot; {samples.toLocaleString()} samples
            </p>
          )}
        </header>

        <BoardSection
          slots={state.board}
          disabledCards={[...heroCards, ...villainCards]}
          onChange={(slots) => dispatch({ type: "SET_BOARD", value: slots })}
        />

        <HeroSection
          slots={state.hero}
          equity={equities ? equities[0] : null}
          isCalculating={isCalculating}
          disabledCards={[...boardCards, ...villainCards]}
          onChange={(slots) => dispatch({ type: "SET_HERO", value: slots })}
        />

        {error && (
          <div className="px-1">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-stone-900">
            Villains ({state.villains.length})
          </h2>
          <button
            type="button"
            className="text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors duration-200"
            onClick={() => dispatch({ type: "ADD_VILLAIN" })}
          >
            + Add villain
          </button>
        </div>
      </div>

      {/* Scrollable bottom: Villain rows + PotOdds */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
          <VillainsSection
            villains={state.villains}
            equities={equities}
            isCalculating={isCalculating}
            disabledCards={globalDisabledCards}
            onSetVillain={(i, v) =>
              dispatch({ type: "SET_VILLAIN", index: i, value: v })
            }
            onRemoveVillain={(i) =>
              dispatch({ type: "REMOVE_VILLAIN", index: i })
            }
          />

          <PotOddsSection
            potSize={state.potSize}
            callAmount={state.callAmount}
            heroEquity={equities ? equities[0] : null}
            onSetPotSize={(v) => dispatch({ type: "SET_POT_SIZE", value: v })}
            onSetCallAmount={(v) =>
              dispatch({ type: "SET_CALL_AMOUNT", value: v })
            }
          />
        </div>
      </div>
    </main>
  );
}
