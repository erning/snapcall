import { calculatePotOdds, parseNumericInput } from "../lib/utils";
import { useGameStore } from "../stores/gameStore";

export function PotOddsPanel() {
  const pot = useGameStore((state) => state.pot);
  const opponentBet = useGameStore((state) => state.opponentBet);
  const callAmount = useGameStore((state) => state.callAmount);
  const setPot = useGameStore((state) => state.setPot);
  const setOpponentBet = useGameStore((state) => state.setOpponentBet);
  const setCallAmount = useGameStore((state) => state.setCallAmount);

  const potOdds = calculatePotOdds(pot, opponentBet, callAmount);

  return (
    <section className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-text">Pot Odds</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-sm text-muted">
          Pot
          <input
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={pot}
            onChange={(event) => setPot(parseNumericInput(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
          />
        </label>
        <label className="text-sm text-muted">
          Opponent Bet
          <input
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
            value={opponentBet}
            onChange={(event) => setOpponentBet(parseNumericInput(event.target.value))}
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
          />
        </label>
      </div>

      <label className="mt-2 block text-sm text-muted">
        Call Amount
        <input
          inputMode="decimal"
          type="number"
          min="0"
          step="0.01"
          value={callAmount}
          onChange={(event) => setCallAmount(parseNumericInput(event.target.value))}
          className="mt-1 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-base font-semibold text-text"
        />
      </label>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-semibold text-text">Pot Odds: {(potOdds * 100).toFixed(1)}%</p>
        <p className="text-sm text-muted">Need &gt; {(potOdds * 100).toFixed(1)}% equity to call</p>
      </div>
    </section>
  );
}
