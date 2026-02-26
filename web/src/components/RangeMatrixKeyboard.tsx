import { useEffect, useRef, useState } from "react";
import { buildRangeCell, getTopRangeCellsByPercent } from "../lib/utils";
import { RANKS } from "../types";
import { useGameStore } from "../stores/gameStore";

const TOP_RANGE_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50] as const;

export function RangeMatrixKeyboard() {
  const activeRangePlayerId = useGameStore((state) => state.activeRangePlayerId);
  const players = useGameStore((state) => state.players);
  const setPlayerRangeCell = useGameStore((state) => state.setPlayerRangeCell);
  const replacePlayerRangeCells = useGameStore((state) => state.replacePlayerRangeCells);
  const clearPlayerRange = useGameStore((state) => state.clearPlayerRange);
  const setActiveRangePlayer = useGameStore((state) => state.setActiveRangePlayer);
  const [paintMode, setPaintMode] = useState<"add" | "remove" | null>(null);
  const paintModeRef = useRef<"add" | "remove" | null>(null);
  const lastPaintedCellRef = useRef<string | null>(null);
  const suppressClickUntilRef = useRef<number>(0);
  const trailTimeoutsRef = useRef<Map<string, number>>(new Map());
  const [paintTrailCells, setPaintTrailCells] = useState<string[]>([]);
  const [topRangePercent, setTopRangePercent] = useState<number>(20);

  useEffect(() => {
    if (!paintMode) {
      return;
    }

    const stopPaint = () => {
      paintModeRef.current = null;
      lastPaintedCellRef.current = null;
      setPaintMode(null);
    };

    window.addEventListener("pointerup", stopPaint);
    window.addEventListener("pointercancel", stopPaint);
    window.addEventListener("touchend", stopPaint);
    window.addEventListener("touchcancel", stopPaint);

    return () => {
      window.removeEventListener("pointerup", stopPaint);
      window.removeEventListener("pointercancel", stopPaint);
      window.removeEventListener("touchend", stopPaint);
      window.removeEventListener("touchcancel", stopPaint);
    };
  }, [paintMode]);

  useEffect(() => {
    return () => {
      for (const timeoutId of trailTimeoutsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      trailTimeoutsRef.current.clear();
    };
  }, []);

  if (!activeRangePlayerId) {
    return null;
  }

  const playerIndex = players.findIndex((player) => player.id === activeRangePlayerId);
  const activePlayer = playerIndex >= 0 ? players[playerIndex] : null;
  if (!activePlayer) {
    return null;
  }

  const rangePlayerId = activeRangePlayerId;

  const selectedCells = new Set(activePlayer.rangeCells);
  const trailSet = new Set(paintTrailCells);

  function markPaintTrail(cell: string) {
    setPaintTrailCells((prev) => {
      if (prev.includes(cell)) {
        return prev;
      }
      return [...prev, cell];
    });

    const previousTimeout = trailTimeoutsRef.current.get(cell);
    if (previousTimeout) {
      window.clearTimeout(previousTimeout);
    }

    const timeoutId = window.setTimeout(() => {
      setPaintTrailCells((prev) => prev.filter((item) => item !== cell));
      trailTimeoutsRef.current.delete(cell);
    }, 260);

    trailTimeoutsRef.current.set(cell, timeoutId);
  }

  function getRangeCellFromPoint(clientX: number, clientY: number): string | null {
    const target = document.elementFromPoint(clientX, clientY);
    if (!(target instanceof Element)) {
      return null;
    }

    const cellElement = target.closest("[data-range-cell]");
    if (!(cellElement instanceof HTMLElement)) {
      return null;
    }

    return cellElement.dataset.rangeCell ?? null;
  }

  function stopPaint() {
    paintModeRef.current = null;
    lastPaintedCellRef.current = null;
    setPaintMode(null);
  }

  function applyPaintToCell(cell: string, selected: boolean) {
    if (lastPaintedCellRef.current === cell) {
      return;
    }

    setPlayerRangeCell(rangePlayerId, cell, selected);
    markPaintTrail(cell);
    lastPaintedCellRef.current = cell;
  }

  function startPaintFromPoint(clientX: number, clientY: number): boolean {
    const cell = getRangeCellFromPoint(clientX, clientY);
    if (!cell) {
      return false;
    }

    const latestPlayer = useGameStore.getState().players.find((player) => player.id === rangePlayerId);
    const alreadySelected = latestPlayer?.rangeCells.includes(cell) ?? false;
    const nextMode: "add" | "remove" = alreadySelected ? "remove" : "add";

    suppressClickUntilRef.current = Date.now() + 280;
    paintModeRef.current = nextMode;
    setPaintMode(nextMode);
    applyPaintToCell(cell, nextMode === "add");
    return true;
  }

  function continuePaintFromPoint(clientX: number, clientY: number) {
    const mode = paintModeRef.current;
    if (!mode) {
      return;
    }

    const cell = getRangeCellFromPoint(clientX, clientY);
    if (!cell) {
      return;
    }

    applyPaintToCell(cell, mode === "add");
  }

  function toggleCell(cell: string) {
    const latestPlayer = useGameStore.getState().players.find((player) => player.id === rangePlayerId);
    const alreadySelected = latestPlayer?.rangeCells.includes(cell) ?? false;
    setPlayerRangeCell(rangePlayerId, cell, !alreadySelected);
    markPaintTrail(cell);
  }

  function applyTopRangePreset() {
    const topCells = getTopRangeCellsByPercent(topRangePercent);
    replacePlayerRangeCells(rangePlayerId, topCells);
  }

  return (
    <section
      data-range-matrix="true"
      className="fixed bottom-0 left-0 right-0 z-40 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-slate-300 bg-gradient-to-b from-slate-100/95 via-slate-100/95 to-slate-200/95 px-2 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.16)] backdrop-blur-md"
    >
      <div className="mx-auto w-full max-w-[720px] rounded-xl border border-slate-300 bg-white/85 p-2 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-muted">Player {playerIndex + 1} Range ({activePlayer.rangeCells.length})</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => clearPlayerRange(rangePlayerId)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-slate-50 text-sm text-muted"
              title="Clear range"
              aria-label="Clear range"
            >
              🗑
            </button>
            <button
              type="button"
              onClick={() => setActiveRangePlayer(null)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-slate-50 text-sm text-muted"
              title="Done"
              aria-label="Done"
            >
              ✓
            </button>
          </div>
        </div>

        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted">Top</span>
          <select
            value={topRangePercent}
            onChange={(event) => setTopRangePercent(Number.parseInt(event.target.value, 10))}
            className="h-7 rounded-md border border-border bg-white px-1.5 text-xs font-semibold text-text"
          >
            {TOP_RANGE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}%
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyTopRangePreset}
            className="h-7 rounded-md border border-border bg-slate-50 px-2 text-xs font-semibold text-muted"
          >
            Apply
          </button>
        </div>

        <div className="mb-1 text-[11px] font-semibold text-muted">
          {paintMode ? (paintMode === "add" ? "Paint mode: Add" : "Paint mode: Remove") : "Tip: tap to toggle, drag to paint"}
        </div>

        <div className="pb-1">
          <div
            className="grid touch-none select-none gap-0.5"
            style={{
              gridTemplateColumns: "repeat(13, minmax(0, 1fr))",
              touchAction: "none",
            }}
            onPointerDown={(event) => {
              if (event.pointerType === "touch") {
                return;
              }
              event.preventDefault();
              startPaintFromPoint(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => {
              if (event.pointerType === "touch") {
                return;
              }
              if (!paintModeRef.current) {
                return;
              }
              event.preventDefault();
              continuePaintFromPoint(event.clientX, event.clientY);
            }}
            onPointerUp={stopPaint}
            onPointerCancel={stopPaint}
            onPointerLeave={stopPaint}
            onTouchStart={(event) => {
              const touch = event.touches.item(0);
              if (!touch) {
                return;
              }
              event.preventDefault();
              startPaintFromPoint(touch.clientX, touch.clientY);
            }}
            onTouchMove={(event) => {
              if (!paintModeRef.current) {
                return;
              }
              event.preventDefault();
              const touch = event.touches.item(0);
              if (!touch) {
                return;
              }
              continuePaintFromPoint(touch.clientX, touch.clientY);
            }}
            onTouchEnd={stopPaint}
            onTouchCancel={stopPaint}
          >
            {RANKS.map((_, row) =>
              RANKS.map((_, col) => {
                const cell = buildRangeCell(row, col);
                const selected = selectedCells.has(cell);
                const trailed = trailSet.has(cell);
                return (
                  <button
                    key={cell}
                    type="button"
                    data-range-cell={cell}
                    onClick={(event) => {
                      if (Date.now() < suppressClickUntilRef.current) {
                        event.preventDefault();
                        return;
                      }
                      toggleCell(cell);
                    }}
                    className={[
                      "aspect-square w-full touch-none rounded-[4px] border text-[9px] font-semibold leading-none",
                      row === col ? "border-blue-200 bg-blue-50 text-blue-700" : "",
                      row < col ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "",
                      row > col ? "border-amber-200 bg-amber-50 text-amber-700" : "",
                      selected ? "ring-1 ring-accent ring-offset-1" : "",
                      trailed ? "shadow-[0_0_0_2px_rgba(56,189,248,0.55)]" : "",
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
