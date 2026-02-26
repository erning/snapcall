import { CardSlot } from "./CardSlot";
import { EquityBar } from "./EquityBar";
import { compressRangeCells, formatRangePreview } from "../lib/utils";
import { useGameStore } from "../stores/gameStore";
import type { Player } from "../types";

interface PlayerCardProps {
  player: Player;
  index: number;
}

export function PlayerCard({ player, index }: PlayerCardProps) {
  const players = useGameStore((state) => state.players);
  const activeSlot = useGameStore((state) => state.activeSlot);
  const activeRangePlayerId = useGameStore((state) => state.activeRangePlayerId);
  const setActiveSlot = useGameStore((state) => state.setActiveSlot);
  const setActiveRangePlayer = useGameStore((state) => state.setActiveRangePlayer);
  const setPendingRank = useGameStore((state) => state.setPendingRank);
  const setPlayerInputMode = useGameStore((state) => state.setPlayerInputMode);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const clearPlayerCards = useGameStore((state) => state.clearPlayerCards);
  const clearPlayerRange = useGameStore((state) => state.clearPlayerRange);

  const isRangeMode = player.inputMode === "range";
  const isRangeActive = activeRangePlayerId === player.id;
  const compressedRangeCells = compressRangeCells(player.rangeCells);
  const rangePreview = formatRangePreview(player.rangeCells, 3);

  return (
    <article
      data-active-range-player-card={isRangeActive ? "true" : undefined}
      className="relative rounded-2xl border border-border bg-card-bg p-3 pr-20 shadow-sm"
    >
      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (isRangeMode) {
              clearPlayerRange(player.id);
            } else {
              clearPlayerCards(player.id);
            }
          }}
          title="Clear cards"
          aria-label={`Clear player ${index + 1} input`}
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

      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setPlayerInputMode(player.id, "cards");
            setActiveRangePlayer(null);
          }}
          className={[
            "h-6 rounded-md border px-2 text-[11px] font-semibold",
            !isRangeMode ? "border-accent bg-blue-50 text-blue-700" : "border-border bg-white text-muted",
          ].join(" ")}
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => {
            setPlayerInputMode(player.id, "range");
            setActiveRangePlayer(null);
          }}
          className={[
            "h-6 rounded-md border px-2 text-[11px] font-semibold",
            isRangeMode ? "border-accent bg-blue-50 text-blue-700" : "border-border bg-white text-muted",
          ].join(" ")}
        >
          Range
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          {isRangeMode ? (
            <button
              type="button"
              data-range-trigger="true"
              onClick={() => setActiveRangePlayer(isRangeActive ? null : player.id)}
              title={compressedRangeCells.join(", ")}
              aria-label={`Player ${index + 1} range: ${rangePreview}`}
              className={[
                "flex h-11 w-[108px] shrink-0 items-center justify-start rounded-xl border px-2 text-xs font-semibold",
                isRangeActive
                  ? "border-accent bg-blue-50 text-blue-700"
                  : "border-dashed border-slate-300 bg-slate-50 text-muted",
              ].join(" ")}
            >
              <span className="max-w-full truncate">{rangePreview}</span>
            </button>
          ) : (
            player.cards.map((card, cardIndex) => {
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
                    if (isActive) {
                      setActiveSlot(null);
                      setPendingRank(null);
                      return;
                    }
                    setActiveSlot({ kind: "player", playerId: player.id, cardIndex });
                  }}
                />
              );
            })
          )}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <EquityBar value={player.equity} />
        </div>
      </div>
    </article>
  );
}
