import { calculatePotOdds, parseIntegerInput, parseOptionalIntegerInput } from "../lib/utils";
import { useGameStore } from "../stores/gameStore";

export function PotOddsPanel() {
  const pot = useGameStore((state) => state.pot);
  const opponentBet = useGameStore((state) => state.opponentBet);
  const callAmount = useGameStore((state) => state.callAmount);
  const setPot = useGameStore((state) => state.setPot);
  const setOpponentBet = useGameStore((state) => state.setOpponentBet);
  const setCallAmount = useGameStore((state) => state.setCallAmount);

  const effectiveCallAmount = callAmount ?? opponentBet;
  const potOdds = calculatePotOdds(pot, opponentBet, effectiveCallAmount);

  return (
    <section className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-text">Pot Odds</h2>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-sm text-muted">
          Pot
          <input
            inputMode="numeric"
            type="number"
            min="0"
            step="10"
            value={pot}
            onChange={(event) => setPot(parseIntegerInput(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
          />
        </label>
        <label className="text-sm text-muted">
          Opponent Bet
          <input
            inputMode="numeric"
            type="number"
            min="0"
            step="10"
            value={opponentBet}
            onChange={(event) => setOpponentBet(parseIntegerInput(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
          />
        </label>
        <label className="text-sm text-muted">
          Call Amount
          <input
            inputMode="numeric"
            type="number"
            min="0"
            step="10"
            value={callAmount ?? ""}
            placeholder={`${opponentBet}`}
            onChange={(event) => setCallAmount(parseOptionalIntegerInput(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
          />
        </label>
      </div>

      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
        <p className="whitespace-nowrap text-sm font-semibold text-text">
          Pot Odds {(potOdds * 100).toFixed(1)}%
          <span className="mx-2 text-slate-400">|</span>
          Call {effectiveCallAmount}
          <span className="mx-2 text-slate-400">|</span>
          Need &gt; {(potOdds * 100).toFixed(1)}%
        </p>
      </div>
    </section>
  );
}
