import { CardSlot } from "./CardSlot";
import { useGameStore } from "../stores/gameStore";

const BOARD_SLOTS = [
  { id: "board-1", cardIndex: 0 },
  { id: "board-2", cardIndex: 1 },
  { id: "board-3", cardIndex: 2 },
  { id: "board-4", cardIndex: 3 },
  { id: "board-5", cardIndex: 4 },
] as const;

export function CommunityCards() {
  const board = useGameStore((state) => state.board);
  const activeSlot = useGameStore((state) => state.activeSlot);
  const setBoardCard = useGameStore((state) => state.setBoardCard);
  const setActiveSlot = useGameStore((state) => state.setActiveSlot);
  const clearBoard = useGameStore((state) => state.clearBoard);

  return (
    <section className="rounded-2xl border border-border bg-card-bg p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-text">Community Cards</h2>
        <button type="button" onClick={clearBoard} className="text-sm font-semibold text-muted hover:text-text">
          Clear
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {BOARD_SLOTS.map(({ id, cardIndex }) => {
          const card = board[cardIndex];
          const isActive = activeSlot?.kind === "board" && activeSlot.cardIndex === cardIndex;
          return (
            <CardSlot
              key={id}
              card={card}
              active={isActive}
              onClick={() => {
                if (card) {
                  setBoardCard(cardIndex, null);
                  return;
                }
                setActiveSlot({ kind: "board", cardIndex });
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
