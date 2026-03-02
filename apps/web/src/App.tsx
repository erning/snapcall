import { useMemo } from "react";
import { usePersistedReducer } from "./hooks/usePersistedReducer";
import { useEquity } from "./hooks/useEquity";
import { BoardSection } from "./components/BoardSection";
import { HeroSection } from "./components/HeroSection";
import { VillainsSection } from "./components/VillainsSection";

export default function App() {
  const [state, dispatch] = usePersistedReducer();

  const boardStr = useMemo(
    () => state.board.filter(Boolean).join(""),
    [state.board],
  );
  const heroStr = useMemo(
    () => state.hero.filter(Boolean).join(""),
    [state.hero],
  );

  const villainStrs = useMemo(
    () =>
      state.villains.map((v) =>
        v.mode === "cards" ? v.slots.filter(Boolean).join("") : v.range,
      ),
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
      state.villains.flatMap((v) =>
        v.mode === "cards"
          ? v.slots.filter((c): c is string => c !== null)
          : [],
      ),
    [state.villains],
  );

  const globalDisabledCards = useMemo(
    () => [...boardCards, ...heroCards, ...villainCards],
    [boardCards, heroCards, villainCards],
  );

  const potSizeNum = parseInt(state.potSize, 10) || 0;
  const callAmountNum = parseInt(state.callAmount, 10) || 0;

  return (
    <main className="h-screen flex flex-col bg-stone-50">
      {/* Fixed: Header + Board + Hero + status + Villains header */}
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-6 space-y-4">
        <header className="px-1 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">SnapCall</h1>
          </div>
          <button
            type="button"
            className="text-xs font-medium text-stone-400 hover:text-stone-600 px-2 py-1 transition-colors duration-200"
            onClick={() => dispatch({ type: "RESET" })}
          >
            Reset
          </button>
        </header>

        <BoardSection
          slots={state.board}
          disabledCards={[...heroCards, ...villainCards]}
          onChange={(slots) => dispatch({ type: "SET_BOARD", value: slots })}
          potSize={potSizeNum}
          onSetPotSize={(v) =>
            dispatch({ type: "SET_POT_SIZE", value: String(v) })
          }
        />

        <HeroSection
          slots={state.hero}
          equity={equities ? equities[0] : null}
          isCalculating={isCalculating}
          disabledCards={[...boardCards, ...villainCards]}
          onChange={(slots) =>
            dispatch({ type: "SET_HERO", value: slots })
          }
          callAmount={callAmountNum}
          onSetCallAmount={(v) =>
            dispatch({ type: "SET_CALL_AMOUNT", value: String(v) })
          }
          potSize={potSizeNum}
        />

        <div className="px-1 min-h-[20px]">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : mode && samples !== null ? (
            <p className="text-xs text-stone-400">
              {mode} &middot; {samples.toLocaleString()} samples
            </p>
          ) : null}
        </div>

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

      {/* Scrollable: only VillainsSection */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 pb-24">
          <VillainsSection
            villains={state.villains}
            equities={equities}
            isCalculating={isCalculating}
            disabledCards={globalDisabledCards}
            onSetVillain={(i, v) =>
              dispatch({ type: "SET_VILLAIN", index: i, value: v })
            }
            onSetVillainRange={(i, range) =>
              dispatch({ type: "SET_VILLAIN_RANGE", index: i, range })
            }
            onSetVillainMode={(i, mode) =>
              dispatch({ type: "SET_VILLAIN_MODE", index: i, mode })
            }
            onRemoveVillain={(i) =>
              dispatch({ type: "REMOVE_VILLAIN", index: i })
            }
          />
        </div>
      </div>
    </main>
  );
}
