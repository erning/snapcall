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

  const { equities, mode, samples, isCalculating, error } = useEquity(
    boardStr,
    heroStr,
    state.villains,
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

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
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
          disabledCards={heroCards}
          onChange={(slots) => dispatch({ type: "SET_BOARD", value: slots })}
        />

        <HeroSection
          slots={state.hero}
          equity={equities ? equities[0] : null}
          isCalculating={isCalculating}
          disabledCards={boardCards}
          onChange={(slots) => dispatch({ type: "SET_HERO", value: slots })}
        />

        {error && (
          <div className="px-1">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <VillainsSection
          villains={state.villains}
          equities={equities}
          isCalculating={isCalculating}
          onSetVillain={(i, v) =>
            dispatch({ type: "SET_VILLAIN", index: i, value: v })
          }
          onAddVillain={() => dispatch({ type: "ADD_VILLAIN" })}
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
    </main>
  );
}
