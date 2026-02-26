import { CommunityCards } from "./components/CommunityCards";
import { PlayerList } from "./components/PlayerList";
import { PotOddsPanel } from "./components/PotOddsPanel";
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
  const { calculate, isCalculating } = useEquity(wasm);

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto w-full max-w-4xl px-4 pb-[40vh] pt-4">
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
    </div>
  );
}
