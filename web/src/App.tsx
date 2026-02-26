import { useEffect } from "react";
import { CommunityCards } from "./components/CommunityCards";
import { PlayerList } from "./components/PlayerList";
import { PotOddsPanel } from "./components/PotOddsPanel";
import { RangeMatrixKeyboard } from "./components/RangeMatrixKeyboard";
import { TwoTapKeyboard } from "./components/TwoTapKeyboard";
import { useEquity } from "./hooks/useEquity";
import { useWasm } from "./hooks/useWasm";
import { useGameStore } from "./stores/gameStore";

const ITERATION_OPTIONS = [1000, 5000, 10000, 25000, 50000];

export default function App() {
  const { wasm, loading, error: wasmError } = useWasm();
  const players = useGameStore((state) => state.players);
  const iterations = useGameStore((state) => state.iterations);
  const setIterations = useGameStore((state) => state.setIterations);
  const error = useGameStore((state) => state.error);
  const activeSlot = useGameStore((state) => state.activeSlot);
  const activeRangePlayerId = useGameStore((state) => state.activeRangePlayerId);
  const setActiveSlot = useGameStore((state) => state.setActiveSlot);
  const setActiveRangePlayer = useGameStore((state) => state.setActiveRangePlayer);
  const setPendingRank = useGameStore((state) => state.setPendingRank);
  const { calculate, isCalculating } = useEquity(wasm);

  const hasBottomKeyboard = Boolean(activeSlot || activeRangePlayerId);
  const contentBottomPaddingClass = activeSlot ? "pb-56" : activeRangePlayerId ? "pb-48" : "pb-6";

  useEffect(() => {
    if (!activeSlot && !activeRangePlayerId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (
        target.closest("[data-card-slot]") ||
        target.closest("[data-two-tap-keyboard]") ||
        target.closest("[data-range-matrix]") ||
        target.closest("[data-range-trigger]")
      ) {
        return;
      }

      setActiveSlot(null);
      setActiveRangePlayer(null);
      setPendingRank(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeSlot, activeRangePlayerId, setActiveSlot, setActiveRangePlayer, setPendingRank]);

  useEffect(() => {
    if (!activeSlot) {
      return;
    }

    let rafId = 0;
    let nestedRafId = 0;

    const scrollActiveCardAboveKeyboard = () => {
      const activeCard = document.querySelector("[data-active-card-slot='true']");
      if (!(activeCard instanceof HTMLElement)) {
        return;
      }

      const keyboard = document.querySelector("[data-two-tap-keyboard='true']");
      if (!(keyboard instanceof HTMLElement)) {
        activeCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }

      const cardRect = activeCard.getBoundingClientRect();
      const keyboardRect = keyboard.getBoundingClientRect();
      const safeBottom = keyboardRect.top - 12;
      const overlap = cardRect.bottom - safeBottom;

      if (overlap > 0) {
        window.scrollBy({ top: overlap, behavior: "smooth" });
      }
    };

    rafId = window.requestAnimationFrame(() => {
      nestedRafId = window.requestAnimationFrame(scrollActiveCardAboveKeyboard);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(nestedRafId);
    };
  }, [activeSlot]);

  useEffect(() => {
    if (!activeRangePlayerId) {
      return;
    }

    let rafId = 0;
    let nestedRafId = 0;

    const scrollRangeCardAboveKeyboard = () => {
      const activeRangeCard = document.querySelector("[data-active-range-player-card='true']");
      if (!(activeRangeCard instanceof HTMLElement)) {
        return;
      }

      const rangeKeyboard = document.querySelector("[data-range-matrix='true']");
      if (!(rangeKeyboard instanceof HTMLElement)) {
        activeRangeCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }

      const cardRect = activeRangeCard.getBoundingClientRect();
      const keyboardRect = rangeKeyboard.getBoundingClientRect();
      const safeBottom = keyboardRect.top - 12;
      const overlap = cardRect.bottom - safeBottom;

      if (overlap > 0) {
        window.scrollBy({ top: overlap, behavior: "smooth" });
      }
    };

    rafId = window.requestAnimationFrame(() => {
      nestedRafId = window.requestAnimationFrame(scrollRangeCardAboveKeyboard);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.cancelAnimationFrame(nestedRafId);
    };
  }, [activeRangePlayerId]);

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className={`mx-auto w-full max-w-4xl px-4 pt-4 ${hasBottomKeyboard ? contentBottomPaddingClass : "pb-6"}`}>
        <header className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card-bg px-4 py-3 shadow-sm">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">SnapCall</h1>
            <p className="text-sm text-muted">Texas Hold'em Equity Calculator</p>
          </div>
          <button type="button" className="h-11 w-11 rounded-xl border border-border bg-slate-50 text-xl">
            ≡
          </button>
        </header>

        <div className="space-y-3">
          <PotOddsPanel />
          <CommunityCards />
          <PlayerList />

          <section className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
            <label className="text-sm text-muted">
              Simulations
              <select
                value={iterations}
                onChange={(event) => setIterations(Number.parseInt(event.target.value, 10))}
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
              >
                {ITERATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.toLocaleString()}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void calculate()}
              disabled={loading || isCalculating || players.length < 2}
              className="mt-3 min-h-11 w-full rounded-xl bg-accent px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCalculating ? "Calculating..." : "Calculate Equity"}
            </button>

            <div className="mt-2 min-h-5 text-sm text-muted">
              {loading && "Loading WASM..."}
              {!loading && wasmError && <span className="text-danger">WASM Error: {wasmError}</span>}
              {!loading && !wasmError && error && <span className="text-danger">{error}</span>}
            </div>
          </section>
        </div>
      </div>

      <TwoTapKeyboard />
      <RangeMatrixKeyboard />
    </div>
  );
}
