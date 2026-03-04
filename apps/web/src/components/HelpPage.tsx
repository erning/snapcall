import { ChevronLeft } from "lucide-react";

interface HelpPageProps {
  onBack: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 space-y-2 border border-stone-100 dark:border-stone-800">
      <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
        {title}
      </h2>
      <div className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function Kw({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-stone-700 dark:text-stone-300">
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-stone-600 dark:text-stone-300 text-[11px]">
      {children}
    </code>
  );
}

export function HelpPage({ onBack }: HelpPageProps) {
  return (
    <main className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950">
      <div className="shrink-0 max-w-lg w-full mx-auto px-4 pt-3 pb-2">
        <header className="px-1 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors duration-200 -ml-1 p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Help
          </h1>
        </header>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 pb-24 space-y-4">
          {/* Part 1: Basic Usage */}
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-1">
            Basic Usage
          </p>

          <Section title="Getting Started">
            <p>
              SnapCall is a Texas Hold'em equity calculator — enter your cards,
              the board, and opponents to instantly see your winning probability.
            </p>
          </Section>

          <Section title="Your Hand">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Tap the two card slots to select your <Kw>hole cards</Kw>.
              </li>
              <li>
                Enter a <Kw>bet amount</Kw> (call size) to see pot odds and
                +EV/−EV analysis.
              </li>
              <li>
                Your <Kw>equity percentage</Kw> is shown once both cards are
                set.
              </li>
              <li>
                <Kw>Double-tap</Kw> the equity badge to force a recalculation.
              </li>
              <li>
                Tap the <Kw>collapse toggle</Kw> to fold/expand the hero
                section.
              </li>
            </ul>
          </Section>

          <Section title="Board">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Tap card slots to set <Kw>community cards</Kw> (flop, turn,
                river).
              </li>
              <li>
                The board must have <Kw>0, 3, 4, or 5</Kw> cards — partial
                boards (1–2 cards) are not allowed.
              </li>
              <li>
                The <Kw>pot size</Kw> badge shows the current pot; tap to edit.
              </li>
            </ul>
          </Section>

          <Section title="Opponents">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Tap <Kw>+ Add Villain</Kw> to add opponents.
              </li>
              <li>
                Each villain can be in <Kw>cards mode</Kw> (specific cards) or{" "}
                <Kw>range mode</Kw> (hand ranges like "AKs", "TT+").
              </li>
              <li>
                In range mode, use the <Kw>13×13 grid</Kw> to select hand
                ranges — drag across cells to select multiple hands.
              </li>
              <li>
                <Kw>Swipe left</Kw> on a villain row to reveal actions: toggle
                cards/range mode, fold, or delete.
              </li>
              <li>
                <Kw>Folded</Kw> villains are excluded from equity calculations
                but remain visible for reference.
              </li>
            </ul>
          </Section>

          <Section title="Equity & Pot Odds">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Equity is <Kw>auto-calculated</Kw> whenever hands or board
                change.
              </li>
              <li>
                <Kw>+EV</Kw> (green) means calling is profitable; <Kw>−EV</Kw>{" "}
                (red) means folding is recommended.
              </li>
              <li>
                The <Kw>max bet</Kw> shows the breakeven call amount — any call
                above this is −EV.
              </li>
            </ul>
          </Section>

          <Section title="Settings">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <Kw>Theme</Kw>: System, Light, or Dark mode.
              </li>
              <li>
                <Kw>Iterations</Kw>: Monte Carlo sample budget (higher = more
                accurate but slower).
              </li>
              <li>
                <Kw>Blinds</Kw>: Big blind / small blind defaults for new
                games.
              </li>
            </ul>
          </Section>

          <Section title="Tips">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                Cards are <Kw>globally unique</Kw> — selecting a card
                automatically disables it in all other pickers.
              </li>
              <li>
                Use <Kw>New Game</Kw> from the menu to reset everything and
                start fresh.
              </li>
              <li>
                Tap the <Kw>version number</Kw> at the bottom to reload the
                app.
              </li>
            </ul>
          </Section>

          {/* Part 2: How It Works */}
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-1 pt-2">
            How It Works
          </p>

          <Section title="How Equity Is Calculated">
            <p>
              SnapCall uses two modes to calculate equity:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <Kw>Exact enumeration</Kw>: evaluates every possible card
                distribution. Used when the estimated number of combos is within
                the iteration budget.
              </li>
              <li>
                <Kw>Monte Carlo simulation</Kw>: randomly samples hands when
                exact enumeration would be too slow. Range players are dealt
                first via rejection sampling (up to 100 retries), then remaining
                cards are shuffled for unknown/partial players and board fill.
                Failed samples are discarded.
              </li>
            </ul>
            <p>
              Ties split equally among winners. The formula is:{" "}
              <Code>equity = wins[i] / total_wins × 100%</Code>
            </p>
            <p>
              For example: exact hands on the river = 1 combo (instant); preflop
              with 2 unknowns ≈ 314M combos (Monte Carlo).
            </p>
          </Section>

          <Section title="Pot Odds Formula">
            <ul className="list-disc pl-4 space-y-2">
              <li>
                <Code>
                  Pot Odds = Call / (Pot + Call) × 100%
                </Code>
              </li>
              <li>
                If your equity {">"} pot odds →{" "}
                <Kw>+EV</Kw> (profitable call).
              </li>
              <li>
                If your equity {"<"} pot odds →{" "}
                <Kw>−EV</Kw> (fold recommended).
              </li>
              <li>
                Max breakeven call:{" "}
                <Code>
                  Pot × Equity / (1 − Equity)
                </Code>
              </li>
            </ul>
          </Section>

          <Section title="Range Notation">
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <Kw>Pairs</Kw>: <Code>TT</Code> = 6 combos (C(4,2) suit
                combinations).
              </li>
              <li>
                <Kw>Plus notation</Kw>: <Code>TT+</Code> = TT, JJ, QQ, KK, AA
                (ascending to Ace).
              </li>
              <li>
                <Kw>Pair range</Kw>: <Code>TT-88</Code> = TT, 99, 88.
              </li>
              <li>
                <Kw>Suited</Kw>: <Code>AKs</Code> = 4 combos (one per suit);
                upper triangle in the 13×13 grid.
              </li>
              <li>
                <Kw>Offsuit</Kw>: <Code>AKo</Code> = 12 combos (4×3); lower
                triangle in the 13×13 grid.
              </li>
              <li>
                <Kw>Suited range</Kw>: <Code>A5s-A2s</Code> = A5s, A4s, A3s,
                A2s.
              </li>
              <li>
                <Kw>Plus on non-pairs</Kw>: <Code>ATs+</Code> = ATs, AJs, AQs,
                AKs (kicker ascending).
              </li>
              <li>
                <Kw>Comma-separated</Kw>: <Code>AKs,QQ,TT+</Code> = combine
                multiple ranges.
              </li>
            </ul>
            <p>
              The <Kw>13×13 grid</Kw>: diagonal = pairs, upper-right = suited,
              lower-left = offsuit. Drag to select multiple cells.
            </p>
            <p>
              Card format: Rank (<Code>A K Q J T 9-2</Code>) + Suit (
              <Code>s♠ h♥ d♦ c♣</Code>).
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
