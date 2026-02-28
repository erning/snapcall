import { useState } from "react";
import { runStaticEquity, type EquityResult } from "./lib/wasm";

const PLAYERS = ["AcKs", "KQs", "99", "22+"];
const BOARD = "5c6c7c8hAs";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EquityResult | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);

    try {
      setResult(await runStaticEquity());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown WASM error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>SnapCall Hello World</h1>
        <p>
          Static equity demo: players {PLAYERS.join(" vs ")} on board {BOARD}
        </p>

        <button className="button" type="button" onClick={() => void handleRun()} disabled={loading}>
          {loading ? "Running..." : "Run Static Equity"}
        </button>

        {error ? <p className="error">Error: {error}</p> : null}

        {result ? (
          <>
            <p>Mode: {result.mode} | Samples: {result.samples}</p>
            <ul>
              {result.equities.map((value, index) => (
                <li key={`${PLAYERS[index]}-${index}`}>
                  Player {index + 1} ({PLAYERS[index]}): {value.toFixed(2)}%
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </main>
  );
}
