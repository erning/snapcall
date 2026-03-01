import { calcPotOdds } from "../lib/potOdds";

interface PotOddsSectionProps {
  potSize: string;
  callAmount: string;
  heroEquity: number | null;
  onSetPotSize: (value: string) => void;
  onSetCallAmount: (value: string) => void;
}

export function PotOddsSection({
  potSize,
  callAmount,
  heroEquity,
  onSetPotSize,
  onSetCallAmount,
}: PotOddsSectionProps) {
  const pot = parseFloat(potSize);
  const call = parseFloat(callAmount);
  const potOdds = calcPotOdds(pot, call);

  const shouldCall =
    heroEquity !== null && potOdds !== null ? heroEquity > potOdds : null;

  return (
    <section className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-3">Pot Odds</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-stone-500 mb-1 block">Pot size</label>
          <input
            type="text"
            inputMode="decimal"
            value={potSize}
            onChange={(e) => onSetPotSize(e.target.value)}
            placeholder="0"
            className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200"
          />
        </div>
        <div>
          <label className="text-xs text-stone-500 mb-1 block">
            Call amount
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={callAmount}
            onChange={(e) => onSetCallAmount(e.target.value)}
            placeholder="0"
            className="w-full text-base py-2.5 px-3 bg-stone-50 rounded-xl border-none outline-none text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-orange-300 transition-all duration-200"
          />
        </div>
      </div>

      {potOdds !== null && (
        <div className="text-sm text-stone-600">
          <span>
            Pot odds: <span className="font-semibold">{potOdds.toFixed(1)}%</span>
          </span>
          {shouldCall !== null && (
            <span className="ml-3">
              {shouldCall ? (
                <span className="text-green-600 font-semibold">
                  +EV Call ({heroEquity!.toFixed(1)}% &gt; {potOdds.toFixed(1)}%)
                </span>
              ) : (
                <span className="text-red-500 font-semibold">
                  -EV Call ({heroEquity!.toFixed(1)}% &lt; {potOdds.toFixed(1)}%)
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
