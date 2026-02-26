import { CardSlot } from "./CardSlot";
import { EquityBar } from "./EquityBar";
import { useGameStore } from "../stores/gameStore";
import type { Player } from "../types";

interface PlayerCardProps {
  player: Player;
  index: number;
}

export function PlayerCard({ player, index }: PlayerCardProps) {
  const players = useGameStore((state) => state.players);
  const activeSlot = useGameStore((state) => state.activeSlot);
  const setPlayerCard = useGameStore((state) => state.setPlayerCard);
  const setActiveSlot = useGameStore((state) => state.setActiveSlot);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const clearPlayerCards = useGameStore((state) => state.clearPlayerCards);

  return (
    <article className="relative rounded-2xl border border-border bg-card-bg p-3 pr-20 shadow-sm">
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => clearPlayerCards(player.id)}
          title="Clear cards"
          aria-label={`Clear player ${index + 1} cards`}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-slate-50 text-xs text-muted transition hover:text-text"
        >
          🗑
        </button>
        <button
          type="button"
          onClick={() => removePlayer(player.id)}
          disabled={players.length <= 2}
          title="Remove player"
          aria-label={`Remove player ${index + 1}`}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-red-50 text-xs text-danger transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          {player.cards.map((card, cardIndex) => {
            const isActive =
              activeSlot?.kind === "player" &&
              activeSlot.playerId === player.id &&
              activeSlot.cardIndex === cardIndex;
            return (
              <CardSlot
                key={`${player.id}-${cardIndex}`}
                card={card}
                placeholder={card ? "" : "??"}
                active={isActive}
                onClick={() => {
                  if (card) {
                    setPlayerCard(player.id, cardIndex, null);
                    setActiveSlot({ kind: "player", playerId: player.id, cardIndex });
                    return;
                  }
                  setActiveSlot({ kind: "player", playerId: player.id, cardIndex });
                }}
              />
            );
          })}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <EquityBar value={player.equity} />
        </div>
      </div>
    </article>
  );
}
