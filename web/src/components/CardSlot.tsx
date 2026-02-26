import { cardLabel } from "../lib/utils";
import type { Card } from "../types";

interface CardSlotProps {
  card: Card | null;
  placeholder?: string;
  active?: boolean;
  onClick: () => void;
}

export function CardSlot({ card, placeholder = "", active = false, onClick }: CardSlotProps) {
  const label = cardLabel(card, placeholder);
  const suit = card?.suit;
  const suitColor = suit === "h" || suit === "d" ? "text-red-500" : "text-slate-800";

  return (
    <button
      type="button"
      data-card-slot="true"
      onClick={onClick}
      className={[
        "h-11 w-[3.125rem] shrink-0 rounded-xl border text-base font-semibold transition",
        "flex items-center justify-center",
        card ? "border-slate-300 bg-white" : "border-dashed border-slate-300 bg-slate-50 text-slate-400",
        active ? "ring-2 ring-accent border-accent" : "",
      ].join(" ")}
    >
      <span className={card ? suitColor : "text-slate-400"}>{label}</span>
    </button>
  );
}
