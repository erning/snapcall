import { useState, useRef, useCallback, useEffect } from "react";
import { FoldVertical, UnfoldVertical } from "lucide-react";
import { MiniCardPicker } from "./MiniCardPicker";
import { NumberEditor, Badge } from "./NumberEditor";
import { calcPotOdds } from "../lib/potOdds";
import { SUIT_DISPLAY, type Suit } from "../lib/poker";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800", // ♠ black
  c: "text-stone-800", // ♣ black
  h: "text-red-500",   // ♥ red
  d: "text-red-500",   // ♦ red
};

interface HeroSectionProps {
  slots: (string | null)[];
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChange: (slots: (string | null)[]) => void;
  callAmount: number;
  onSetCallAmount: (v: number) => void;
  bigBlind: number;
  potSize: number;
  onRecalc?: () => void;
}

export function HeroSection({
  slots,
  equity,
  isCalculating,
  disabledCards,
  onChange,
  callAmount,
  onSetCallAmount,
  bigBlind,
  potSize,
  onRecalc,
}: HeroSectionProps) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [betEditorOpen, setBetEditorOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pickerDisabled = useCallback(
    (slotIndex: number) => {
      const otherSlotCard = slots[slotIndex === 0 ? 1 : 0];
      const otherCards = otherSlotCard ? [otherSlotCard] : [];
      return [...new Set([...disabledCards, ...otherCards])];
    },
    [disabledCards, slots],
  );

  const handleSelect = (slotIndex: number, card: string) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = card;
    onChange(newSlots);
    setActiveSlot(null);
  };

  const handleDelete = (slotIndex: number) => {
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    onChange(newSlots);
    setActiveSlot(null);
  };

  const handleSlotClick = (index: number) => {
    setBetEditorOpen(false);
    setActiveSlot(activeSlot === index ? null : index);
  };

  const handleBetBadgeClick = () => {
    setActiveSlot(null);
    setBetEditorOpen(!betEditorOpen);
  };

  if (collapsed) {
    return (
      <section className="bg-white rounded-2xl shadow-sm px-5 py-3">
        <div className="relative flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 cursor-pointer select-none flex-1 min-w-0"
            onClick={() => setCollapsed(false)}
          >
            <h2 className="text-sm font-semibold text-stone-900">Hero</h2>
            <UnfoldVertical size={14} className="text-stone-400" />
          </div>
          <div className="flex items-center gap-2">
            <Badge
              label="Bet"
              value={callAmount}
              active={betEditorOpen}
              onClick={handleBetBadgeClick}
            />
          </div>

          {betEditorOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-10"
                onClick={() => setBetEditorOpen(false)}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <div className="absolute right-0 top-full mt-1 z-20">
                <NumberEditor
                  value={callAmount}
                  onChange={onSetCallAmount}
                  step={bigBlind}
                  min={bigBlind}
                />
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm px-5 pt-3 pb-5">
      <div className="relative flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-1.5 cursor-pointer select-none flex-1 min-w-0"
          onClick={() => {
            setCollapsed(true);
            setActiveSlot(null);
            setBetEditorOpen(false);
          }}
        >
          <h2 className="text-sm font-semibold text-stone-900">Hero</h2>
          <FoldVertical size={14} className="text-stone-400" />
        </div>
        <div className="flex items-center gap-2">
          <Badge
            label="Bet"
            value={callAmount}
            active={betEditorOpen}
            onClick={handleBetBadgeClick}
          />
        </div>

        {/* Bet editor popover */}
        {betEditorOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-10"
              onClick={() => setBetEditorOpen(false)}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="absolute right-0 top-full mt-1 z-20">
              <NumberEditor
                value={callAmount}
                onChange={onSetCallAmount}
                step={bigBlind}
                min={bigBlind}
              />
            </div>
          </>
        )}
      </div>

      <div ref={containerRef} className="relative">
        <div className="flex items-start justify-between">
          {/* Card slots (left) */}
          <div className="flex gap-1.5">
            <CardSlot
              card={slots[0]}
              active={activeSlot === 0}
              onClick={() => handleSlotClick(0)}
            />
            <CardSlot
              card={slots[1]}
              active={activeSlot === 1}
              onClick={() => handleSlotClick(1)}
            />
          </div>

          {/* Equity info (right) */}
          {equity !== null && !isCalculating && (
            <EquityDetails
              equity={equity}
              potSize={potSize}
              callAmount={callAmount}
              onRecalc={onRecalc}
            />
          )}
        </div>

        {/* Overlay + Popover picker */}
        {activeSlot !== null && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-10"
              onClick={() => setActiveSlot(null)}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <PopoverPicker
              currentCard={slots[activeSlot]}
              disabledCards={pickerDisabled(activeSlot)}
              onSelect={(card) => handleSelect(activeSlot, card)}
              onDelete={() => handleDelete(activeSlot)}
            />
          </>
        )}
      </div>
    </section>
  );
}

function EquityDetails({
  equity,
  potSize,
  callAmount,
  onRecalc,
}: {
  equity: number;
  potSize: number;
  callAmount: number;
  onRecalc?: () => void;
}) {
  const potOdds = calcPotOdds(potSize, callAmount);

  const maxBet =
    equity >= 100
      ? null
      : potSize > 0
        ? Math.floor((equity * potSize) / (100 - equity))
        : null;

  return (
    <div className="text-right cursor-pointer" onDoubleClick={onRecalc}>
      <div className="text-lg font-bold text-orange-500">
        {equity.toFixed(1)}%
      </div>
      {potOdds !== null && (
        <>
          {equity > potOdds ? (
            <div className="text-xs font-semibold text-green-600">+EV Call</div>
          ) : (
            <div className="text-xs font-semibold text-red-500">-EV Fold</div>
          )}
          <div className="text-xs text-stone-500 mt-4">
            Odds <span className="font-semibold">{potOdds.toFixed(1)}%</span>
            {maxBet !== null && (
              <>
                {" · "}Max bet <span className="font-semibold">{maxBet}</span>
              </>
            )}
          </div>
          {equity >= 100 && (
            <div className="text-xs text-stone-500">All-in</div>
          )}
        </>
      )}
    </div>
  );
}

function CardSlot({
  card,
  active,
  onClick,
}: {
  card: string | null;
  active: boolean;
  onClick: () => void;
}) {
  const rank = card ? card[0] : null;
  const suit = card ? (card[1] as Suit) : null;
  const suitInfo = suit ? SUIT_DISPLAY[suit] : null;
  const color = suit ? SLOT_SUIT_COLOR[suit] : "";

  let cls =
    "w-14 h-20 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-150 select-none";

  if (card && suitInfo) {
    cls += " bg-white border border-stone-200";
  } else {
    cls += " border-2 border-dashed border-stone-300";
  }

  if (active) {
    cls += " ring-2 ring-orange-400";
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {card && suitInfo ? (
        <>
          <span className={`text-2xl font-bold leading-none ${color}`}>
            {rank}
          </span>
          <span className={`text-2xl font-bold leading-none ${color}`}>
            {suitInfo.symbol}
          </span>
        </>
      ) : (
        <span className="text-stone-300 text-2xl leading-none">+</span>
      )}
    </button>
  );
}

function PopoverPicker({
  currentCard,
  disabledCards,
  onSelect,
  onDelete,
}: {
  currentCard: string | null;
  disabledCards: string[];
  onSelect: (card: string) => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <div ref={ref} className="absolute left-0 right-0 mt-2 z-20">
      <MiniCardPicker
        currentCard={currentCard}
        disabledCards={disabledCards}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );
}
