import { PlayerCard } from "./PlayerCard";
import { useGameStore } from "../stores/gameStore";

export function PlayerList() {
  const players = useGameStore((state) => state.players);
  const addPlayer = useGameStore((state) => state.addPlayer);

  return (
    <section className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-text">Players</h2>
      <div className="space-y-3">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} index={index} />
        ))}
      </div>
      <button
        type="button"
        onClick={addPlayer}
        className="mt-4 min-h-11 w-full rounded-xl border border-border bg-slate-50 text-sm font-semibold text-text transition hover:bg-slate-100"
      >
        + Add Player
      </button>
    </section>
  );
}
