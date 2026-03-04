import { useMemo, useState } from "react";

import { usePersistedReducer } from "./hooks/usePersistedReducer";
import { useEquity } from "./hooks/useEquity";
import { useSettings } from "./hooks/useSettings";
import { BoardSection } from "./components/BoardSection";
import { HeroSection } from "./components/HeroSection";
import { VillainsSection } from "./components/VillainsSection";
import { SettingsPage } from "./components/SettingsPage";
import { HeaderMenu } from "./components/HeaderMenu";

export default function App() {
  const [state, dispatch] = usePersistedReducer();
  const { settings, updateSettings } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const boardStr = useMemo(
    () => state.board.filter(Boolean).join(""),
    [state.board],
  );
  const heroStr = useMemo(
    () => state.hero.filter(Boolean).join(""),
    [state.hero],
  );

  const activeIndices = useMemo(
    () => state.villains.map((v, i) => (!v.folded ? i : -1)).filter((i) => i >= 0),
    [state.villains],
  );

  const villainStrs = useMemo(
    () =>
      activeIndices.map((i) => {
        const v = state.villains[i];
        return v.mode === "cards" ? v.slots.filter(Boolean).join("") : v.range;
      }),
    [state.villains, activeIndices],
  );

  const { equities: rawEquities, mode, samples, isCalculating, error, recalc } = useEquity(
    boardStr,
    heroStr,
    villainStrs,
    settings.iterations,
  );

  // Map equities back: hero at [0], then one per villain (folded → null)
  const equities = useMemo(() => {
    if (!rawEquities) return null;
    if (rawEquities.length !== activeIndices.length + 1) return null;
    const heroEquity = rawEquities[0];
    const villainEquities = state.villains.map((v, i) => {
      if (v.folded) return null;
      const activeIdx = activeIndices.indexOf(i);
      return activeIdx >= 0 ? (rawEquities[activeIdx + 1] ?? null) : null;
    });
    return [heroEquity, ...villainEquities] as (number | null)[];
  }, [rawEquities, state.villains, activeIndices]);

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

  if (settingsOpen) {
    return (
      <SettingsPage
        settings={settings}
        onSave={(next) => updateSettings(next)}
        onRestart={(bb, sb) => {
          dispatch({ type: "RESET", bigBlind: bb, smallBlind: sb });
        }}
        onBack={() => setSettingsOpen(false)}
      />
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 relative">
      {isCalculating && (
        <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-orange-100 overflow-hidden">
          <div className="h-full w-1/3 bg-orange-400 rounded-full animate-loading-bar" />
        </div>
      )}
      <div className="max-w-lg w-full mx-auto px-4 pt-3 pb-4 space-y-4">
        <header className="px-1 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">SnapCall</h1>
          </div>
          <HeaderMenu
            onSettings={() => setSettingsOpen(true)}
            onRestart={() => {
              dispatch({
                type: "RESET",
                bigBlind: settings.bigBlind,
                smallBlind: settings.smallBlind,
              });
            }}
          />
        </header>

        <HeroSection
          slots={state.hero}
          equity={equities ? equities[0] ?? null : null}
          isCalculating={isCalculating}
          disabledCards={[...boardCards, ...villainCards]}
          onChange={(slots) =>
            dispatch({ type: "SET_HERO", value: slots })
          }
          callAmount={state.callAmount}
          onSetCallAmount={(v) =>
            dispatch({ type: "SET_CALL_AMOUNT", value: v })
          }
          bigBlind={settings.bigBlind}
          potSize={state.potSize}
          onRecalc={recalc}
        />

        <BoardSection
          slots={state.board}
          disabledCards={[...heroCards, ...villainCards]}
          onChange={(slots) => dispatch({ type: "SET_BOARD", value: slots })}
          potSize={state.potSize}
          onSetPotSize={(v) =>
            dispatch({ type: "SET_POT_SIZE", value: v })
          }
          bigBlind={settings.bigBlind}
          smallBlind={settings.smallBlind}
        />

        <VillainsSection
          villains={state.villains}
          equities={equities}
          isCalculating={isCalculating}
          disabledCards={globalDisabledCards}
          error={error}
          mode={mode}
          samples={samples}
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
          onFoldVillain={(i) =>
            dispatch({ type: "FOLD_VILLAIN", index: i })
          }
          onSetVillainCount={(count) =>
            dispatch({ type: "SET_VILLAIN_COUNT", count })
          }
        />
      </div>

      <footer className="max-w-lg mx-auto px-4 pt-4 pb-8">
        <div className="border-t border-stone-200 pt-3 text-center">
          <button
            type="button"
            className="text-xs text-stone-300"
            onClick={() => location.reload()}
          >
            {__APP_VERSION__} ({__GIT_HASH__})
          </button>
        </div>
      </footer>
    </main>
  );
}
