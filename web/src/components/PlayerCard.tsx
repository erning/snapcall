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
    <article className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-text">Player {index + 1}</h3>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <button type="button" onClick={() => clearPlayerCards(player.id)} className="text-muted hover:text-text">
            Clear
          </button>
          <button
            type="button"
            onClick={() => removePlayer(player.id)}
            disabled={players.length <= 2}
            className="text-danger disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
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
                  return;
                }
                setActiveSlot({ kind: "player", playerId: player.id, cardIndex });
              }}
            />
          );
        })}
      </div>

      <EquityBar value={player.equity} />
    </article>
  );
}
