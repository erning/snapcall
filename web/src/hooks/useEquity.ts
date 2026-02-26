import { useMemo } from "react";
import type { WasmBindings } from "../lib/wasm";
import { toCompactCard } from "../lib/utils";
import { useGameStore } from "../stores/gameStore";

export function useEquity(wasm: WasmBindings | null) {
  const board = useGameStore((state) => state.board);
  const players = useGameStore((state) => state.players);
  const iterations = useGameStore((state) => state.iterations);
  const isCalculating = useGameStore((state) => state.isCalculating);
  const setIsCalculating = useGameStore((state) => state.setIsCalculating);
  const setError = useGameStore((state) => state.setError);
  const setEquities = useGameStore((state) => state.setEquities);

  const usedCards = useMemo(() => {
    const cardSet = new Set<string>();
    for (const card of board) {
      if (card) {
        cardSet.add(toCompactCard(card));
      }
    }
    for (const player of players) {
      for (const card of player.cards) {
        if (card) {
          cardSet.add(toCompactCard(card));
        }
      }
    }
    return cardSet;
  }, [board, players]);

  async function calculate() {
    if (!wasm) {
      setError("WASM is still loading");
      return;
    }

    const assignedCount =
      board.filter(Boolean).length +
      players.reduce((sum, player) => sum + player.cards.filter(Boolean).length, 0);

    if (usedCards.size !== assignedCount) {
      setError("Duplicate cards detected. Remove duplicates before calculating");
      return;
    }

    for (const player of players) {
      const cardCount = player.cards.filter(Boolean).length;
      if (cardCount === 1) {
        setError("Each player must have 0 or 2 cards");
        return;
      }
    }

    const playerInputs = players.map((player) => {
      const cards = player.cards.filter((card): card is NonNullable<typeof card> => card !== null);
      if (cards.length === 0) {
        return "";
      }
      return `${toCompactCard(cards[0])}${toCompactCard(cards[1])}`;
    });

    const boardCards = board.filter((card): card is NonNullable<typeof card> => card !== null).map(toCompactCard).join("");

    setIsCalculating(true);
    setError(null);
    try {
      const result = wasm.calculateEquity(playerInputs, boardCards, iterations);
      setEquities(Array.from(result));
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to calculate equity");
    } finally {
      setIsCalculating(false);
    }
  }

  return {
    calculate,
    isCalculating,
  };
}
