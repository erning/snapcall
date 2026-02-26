import { RANKS, SUITS, type Card, type Player, type Slot, type Suit } from "../types";
import { toCompactCard } from "../lib/utils";
import { useGameStore } from "../stores/gameStore";

const SUIT_LABELS: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

function formatActiveLabel(activeSlot: Slot, players: Player[]): string {
  if (activeSlot.kind === "board") {
    return `Board card ${activeSlot.cardIndex + 1}`;
  }
  const index = players.findIndex((player) => player.id === activeSlot.playerId);
  return index >= 0 ? `Player ${index + 1} card ${activeSlot.cardIndex + 1}` : "Player card";
}

export function TwoTapKeyboard() {
  const board = useGameStore((state) => state.board);
  const players = useGameStore((state) => state.players);
  const activeSlot = useGameStore((state) => state.activeSlot);
  const pendingRank = useGameStore((state) => state.pendingRank);
  const setPendingRank = useGameStore((state) => state.setPendingRank);
  const setBoardCard = useGameStore((state) => state.setBoardCard);
  const setPlayerCard = useGameStore((state) => state.setPlayerCard);
  const setActiveSlot = useGameStore((state) => state.setActiveSlot);

  if (!activeSlot) {
    return null;
  }

  const usedCards = new Set<string>();
  board.forEach((card) => {
    if (card) {
      usedCards.add(toCompactCard(card));
    }
  });
  players.forEach((player) => {
    player.cards.forEach((card) => {
      if (card) {
        usedCards.add(toCompactCard(card));
      }
    });
  });

  if (activeSlot.kind === "board") {
    const current = board[activeSlot.cardIndex];
    if (current) {
      usedCards.delete(toCompactCard(current));
    }
  } else {
    const player = players.find((item) => item.id === activeSlot.playerId);
    const current = player?.cards[activeSlot.cardIndex];
    if (current) {
      usedCards.delete(toCompactCard(current));
    }
  }

  function assignCard(card: Card) {
    if (!activeSlot) {
      return;
    }

    if (activeSlot.kind === "board") {
      setBoardCard(activeSlot.cardIndex, card);
      let nextIndex: number | null = null;
      for (let index = 0; index < board.length; index += 1) {
        if (index === activeSlot.cardIndex) {
          continue;
        }
        if (!board[index]) {
          nextIndex = index;
          break;
        }
      }
      setActiveSlot(nextIndex === null ? null : { kind: "board", cardIndex: nextIndex });
    } else {
      setPlayerCard(activeSlot.playerId, activeSlot.cardIndex, card);
      if (activeSlot.cardIndex === 0) {
        setActiveSlot({ kind: "player", playerId: activeSlot.playerId, cardIndex: 1 });
      } else {
        setActiveSlot(null);
      }
    }
    setPendingRank(null);
  }

  const topRanks = RANKS.slice(0, 8);
  const bottomRanks = RANKS.slice(8);

  return (
    <section
      data-two-tap-keyboard="true"
      className="keyboard-safe fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-slate-300 bg-gradient-to-b from-slate-100/95 via-slate-100/95 to-slate-200/95 px-3 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-300 bg-white/85 p-2.5 shadow-sm">
        <div className="mb-1.5 text-xs font-semibold text-muted">{formatActiveLabel(activeSlot, players)}</div>

        <div className="flex items-center justify-center gap-1">
          {topRanks.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => setPendingRank(pendingRank === rank ? null : rank)}
              className={[
                "h-[34px] w-[34px] shrink-0 rounded-md border text-sm font-bold",
                pendingRank === rank ? "border-accent bg-blue-50 text-blue-700" : "border-border bg-white text-text",
              ].join(" ")}
            >
              {rank}
            </button>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-center gap-1">
          {bottomRanks.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => setPendingRank(pendingRank === rank ? null : rank)}
              className={[
                "h-[34px] w-[34px] shrink-0 rounded-md border text-sm font-bold",
                pendingRank === rank ? "border-accent bg-blue-50 text-blue-700" : "border-border bg-white text-text",
              ].join(" ")}
            >
              {rank}
            </button>
          ))}
          {SUITS.map((suit) => {
            const isDisabled = !pendingRank || usedCards.has(`${pendingRank}${suit}`);
            return (
              <button
                key={suit}
                type="button"
                disabled={isDisabled}
                onClick={() => pendingRank && assignCard({ rank: pendingRank, suit })}
                className={[
                  "h-[34px] w-[34px] shrink-0 rounded-md border text-base font-bold",
                  suit === "h" || suit === "d" ? "text-red-500" : "text-slate-800",
                  isDisabled ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-40" : "border-border bg-white",
                ].join(" ")}
              >
                {SUIT_LABELS[suit]}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
