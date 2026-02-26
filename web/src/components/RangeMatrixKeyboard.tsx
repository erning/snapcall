import { RANKS } from "../types";
import { useGameStore } from "../stores/gameStore";

function getRangeCell(row: number, col: number): string {
  const rowRank = RANKS[row];
  const colRank = RANKS[col];

  if (row === col) {
    return `${rowRank}${colRank}`;
  }

  if (row < col) {
    return `${rowRank}${colRank}s`;
  }

  return `${colRank}${rowRank}o`;
}

export function RangeMatrixKeyboard() {
  const activeRangePlayerId = useGameStore((state) => state.activeRangePlayerId);
  const players = useGameStore((state) => state.players);
  const togglePlayerRangeCell = useGameStore((state) => state.togglePlayerRangeCell);
  const clearPlayerRange = useGameStore((state) => state.clearPlayerRange);
  const setActiveRangePlayer = useGameStore((state) => state.setActiveRangePlayer);

  if (!activeRangePlayerId) {
    return null;
  }

  const playerIndex = players.findIndex((player) => player.id === activeRangePlayerId);
  const activePlayer = playerIndex >= 0 ? players[playerIndex] : null;
  if (!activePlayer) {
    return null;
  }

  const selectedCells = new Set(activePlayer.rangeCells);

  return (
    <section
      data-range-matrix="true"
      className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-slate-300 bg-gradient-to-b from-slate-100/95 via-slate-100/95 to-slate-200/95 px-3 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-300 bg-white/85 p-2.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-muted">Player {playerIndex + 1} Range ({activePlayer.rangeCells.length})</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => clearPlayerRange(activeRangePlayerId)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-slate-50 text-xs text-muted"
              title="Clear range"
              aria-label="Clear range"
            >
              🗑
            </button>
            <button
              type="button"
              onClick={() => setActiveRangePlayer(null)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-slate-50 text-xs text-muted"
              title="Done"
              aria-label="Done"
            >
              ✓
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: "repeat(13, 28px)",
              width: "max-content",
            }}
          >
            {RANKS.map((_, row) =>
              RANKS.map((_, col) => {
                const cell = getRangeCell(row, col);
                const selected = selectedCells.has(cell);
                return (
                  <button
                    key={cell}
                    type="button"
                    onClick={() => togglePlayerRangeCell(activeRangePlayerId, cell)}
                    className={[
                      "h-7 w-7 rounded-[5px] border text-[9px] font-semibold leading-none",
                      row === col ? "border-blue-200 bg-blue-50 text-blue-700" : "",
                      row < col ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "",
                      row > col ? "border-amber-200 bg-amber-50 text-amber-700" : "",
                      selected ? "ring-2 ring-accent ring-offset-1" : "",
                    ].join(" ")}
                  >
                    {cell}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
