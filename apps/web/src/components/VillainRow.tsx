import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { MiniCardPicker } from "./MiniCardPicker";
import { RangePicker } from "./RangePicker";
import {
  SUIT_DISPLAY,
  type Suit,
  rangeStringToSet,
  rangeSetToString,
} from "../lib/poker";
import type { VillainData } from "../types";

const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800",
  c: "text-stone-800",
  h: "text-red-500",
  d: "text-red-500",
};

const BUTTON_WIDTH = 56;

interface VillainRowProps {
  index: number;
  villain: VillainData;
  equity: number | null;
  isCalculating: boolean;
  disabledCards: string[];
  onChangeSlots: (slots: (string | null)[]) => void;
  onChangeRange: (range: string) => void;
  onChangeMode: (mode: "cards" | "range") => void;
  onRemove: () => void;
  canRemove: boolean;
  isSwipeOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
}

export function VillainRow({
  index,
  villain,
  equity,
  isCalculating,
  disabledCards,
  onChangeSlots,
  onChangeRange,
  onChangeMode,
  onRemove,
  canRemove,
  isSwipeOpen,
  onSwipeOpen,
  onSwipeClose,
}: VillainRowProps) {
  const revealWidth = canRemove ? BUTTON_WIDTH * 2 : BUTTON_WIDTH;
  const foregroundRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const directionLocked = useRef<"h" | "v" | null>(null);
  const currentOffset = useRef(0);
  const pointerTarget = useRef<HTMLElement | null>(null);

  // Bug 3B: refs for background swipe-to-close
  const bgStartX = useRef(0);
  const bgTracking = useRef(false);

  // Sync with external isSwipeOpen state
  useEffect(() => {
    const target = isSwipeOpen ? -revealWidth : 0;
    if (currentOffset.current !== target) {
      currentOffset.current = target;
      const el = foregroundRef.current;
      if (el) {
        el.style.transition = "transform 250ms ease-out";
        el.style.transform = `translateX(${target}px)`;
        // Bug 4: clear compositing layer when closing
        if (target === 0) {
          const onEnd = () => {
            el.style.willChange = "";
            el.style.transform = "";
            el.removeEventListener("transitionend", onEnd);
          };
          el.addEventListener("transitionend", onEnd);
        }
      }
    }
  }, [isSwipeOpen, revealWidth]);

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    isDragging.current = true;
    directionLocked.current = null;
    pointerTarget.current = e.target as HTMLElement;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const el = foregroundRef.current;
    if (el) {
      el.style.transition = "none";
      // Bug 4: enable compositing only during drag
      el.style.willChange = "transform";
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (directionLocked.current === null) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 10 && absDy < 10) return; // slop
      directionLocked.current = absDx > absDy ? "h" : "v";
    }

    if (directionLocked.current === "v") return;

    e.preventDefault();
    const base = isSwipeOpen ? -revealWidth : 0;
    const raw = base + dx;
    const clamped = Math.max(-revealWidth, Math.min(0, raw));
    currentOffset.current = clamped;
    const el = foregroundRef.current;
    if (el) el.style.transform = `translateX(${clamped}px)`;
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Bug 3A: Tap to close when swiped open (no significant movement)
    if (isSwipeOpen && directionLocked.current === null) {
      currentOffset.current = 0;
      const el = foregroundRef.current;
      if (el) {
        el.style.transition = "transform 250ms ease-out";
        el.style.transform = "translateX(0px)";
        const onEnd = () => {
          el.style.willChange = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", onEnd);
        };
        el.addEventListener("transitionend", onEnd);
      }
      directionLocked.current = null;
      pointerTarget.current = null;
      onSwipeClose();
      return;
    }

    // Pure tap — forward click to original button target
    if (directionLocked.current === null) {
      const btn = pointerTarget.current?.closest("button") as HTMLButtonElement | null;
      pointerTarget.current = null;
      if (btn) {
        btn.click();
        const el = foregroundRef.current;
        if (el) el.style.willChange = "";
        return;
      }
    }

    pointerTarget.current = null;
    directionLocked.current = null;

    const threshold = -revealWidth / 2;
    const shouldOpen = currentOffset.current < threshold;
    const target = shouldOpen ? -revealWidth : 0;
    currentOffset.current = target;

    const el = foregroundRef.current;
    if (el) {
      el.style.transition = "transform 250ms ease-out";
      el.style.transform = `translateX(${target}px)`;
      // Bug 4: clear compositing layer when closing
      if (target === 0) {
        const onEnd = () => {
          el.style.willChange = "";
          el.style.transform = "";
          el.removeEventListener("transitionend", onEnd);
        };
        el.addEventListener("transitionend", onEnd);
      }
    }

    if (shouldOpen) {
      onSwipeOpen();
    } else {
      onSwipeClose();
    }
  };

  // Bug 3B: background swipe-right handlers
  const handleBgPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    bgStartX.current = e.clientX;
    bgTracking.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleBgPointerMove = (e: React.PointerEvent) => {
    if (!bgTracking.current) return;
    const dx = e.clientX - bgStartX.current;
    if (dx > 30) {
      bgTracking.current = false;
      onSwipeClose();
    }
  };

  const handleBgPointerUp = () => {
    bgTracking.current = false;
  };

  const targetMode = villain.mode === "cards" ? "range" : "cards";

  return (
    <div className={`overflow-hidden rounded-2xl relative shadow-sm ${isSwipeOpen ? "z-10" : ""}`}>
      {/* Background action buttons */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        onPointerDown={handleBgPointerDown}
        onPointerMove={handleBgPointerMove}
        onPointerUp={handleBgPointerUp}
        onPointerCancel={handleBgPointerUp}
      >
        {/* Bug 2: always bg-blue-500 */}
        <button
          type="button"
          className="flex items-center justify-center text-xs font-semibold text-white bg-blue-500"
          style={{ width: BUTTON_WIDTH }}
          onClick={() => {
            onChangeMode(targetMode);
            onSwipeClose();
          }}
        >
          {targetMode === "range" ? "Range" : "Cards"}
        </button>
        {canRemove && (
          <button
            type="button"
            className="flex items-center justify-center text-xs font-semibold text-white bg-red-500"
            style={{ width: BUTTON_WIDTH }}
            onClick={() => {
              onRemove();
              onSwipeClose();
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Foreground content — Bug 1: p-3, Bug 4: no will-change-transform, Bug 6: dynamic touchAction */}
      <div
        ref={foregroundRef}
        className="relative bg-white px-5 py-3"
        style={{ touchAction: isSwipeOpen ? "none" : "pan-y" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Bug 3A: overlay blocks interaction when swiped open */}
        {isSwipeOpen && <div className="absolute inset-0 z-[1]" />}

        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-sm font-semibold text-stone-900">
            Villain {index + 1}
          </h3>
          <div className="flex items-center gap-3">
            {isCalculating && (
              <span className="text-xs text-stone-400">...</span>
            )}
            {equity !== null && !isCalculating && (
              <span className="text-sm font-bold text-stone-600">
                {equity.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {villain.mode === "cards" ? (
          <CardPickBody
            slots={villain.slots}
            disabledCards={disabledCards}
            onChange={onChangeSlots}
          />
        ) : (
          <RangePickBody range={villain.range} onChange={onChangeRange} />
        )}
      </div>
    </div>
  );
}

// ── Card Pick Body ───────────────────────────────────────────────────

function CardPickBody({
  slots,
  disabledCards,
  onChange,
}: {
  slots: (string | null)[];
  disabledCards: string[];
  onChange: (slots: (string | null)[]) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (activeSlot !== null && containerRef.current) {
      setAnchorRect(containerRef.current.getBoundingClientRect());
    } else {
      setAnchorRect(null);
    }
  }, [activeSlot]);

  // Bug 5C: update anchorRect on scroll
  useEffect(() => {
    if (activeSlot === null) return;
    const scrollEl = containerRef.current?.closest(".overflow-y-auto");
    if (!scrollEl) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (containerRef.current) {
          setAnchorRect(containerRef.current.getBoundingClientRect());
        }
      });
    };
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      scrollEl.removeEventListener("scroll", onScroll);
    };
  }, [activeSlot]);

  // Bug 5B: dismiss picker on outside pointerdown
  useEffect(() => {
    if (activeSlot === null) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current?.contains(target)) return;
      if (target.closest("[data-card-picker]")) return;
      setActiveSlot(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [activeSlot]);

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
    setActiveSlot(activeSlot === index ? null : index);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1.5 justify-start">
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

      {activeSlot !== null &&
        anchorRect &&
        createPortal(
          <>
            {/* Bug 5A: pointer-events-none so scroll passes through */}
            <div className="fixed inset-0 bg-black/20 z-10 pointer-events-none" />
            <PopoverPicker
              currentCard={slots[activeSlot]}
              disabledCards={pickerDisabled(activeSlot)}
              onSelect={(card) => handleSelect(activeSlot, card)}
              onDelete={() => handleDelete(activeSlot)}
              anchorRect={anchorRect}
            />
          </>,
          document.body,
        )}
    </div>
  );
}

// ── Range Pick Body ──────────────────────────────────────────────────

function RangePickBody({
  range,
  onChange,
}: {
  range: string;
  onChange: (range: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = useMemo(() => rangeStringToSet(range), [range]);

  const handleSelect = useCallback(
    (next: Set<string>) => {
      onChange(rangeSetToString(next));
    },
    [onChange],
  );

  const handleClear = () => {
    onChange("");
  };

  useEffect(() => {
    if (pickerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pickerOpen]);

  return (
    <div className="relative">
      <RangeCardStack
        combos={[...selected]}
        active={pickerOpen}
        onClick={() => setPickerOpen(!pickerOpen)}
      />

      {pickerOpen &&
        createPortal(
          <RangeModal
            selected={selected}
            onSelect={handleSelect}
            onClear={handleClear}
            onDone={() => setPickerOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}

// ── Range Card Stack ─────────────────────────────────────────────────

function RangeCardStack({
  combos,
  active,
  onClick,
}: {
  combos: string[];
  active: boolean;
  onClick: () => void;
}) {
  if (combos.length === 0) {
    return (
      <button
        type="button"
        className={`w-10 h-14 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 select-none border-2 border-dashed border-stone-300${active ? " ring-2 ring-orange-400" : ""}`}
        onClick={onClick}
      >
        <span className="text-stone-300 text-base font-bold leading-none">
          R
        </span>
      </button>
    );
  }

  const MAX_INDIVIDUAL = 6;
  const individual = combos.slice(0, MAX_INDIVIDUAL);
  const overflow = combos.length - MAX_INDIVIDUAL;

  return (
    <button
      type="button"
      className={`flex gap-1.5 cursor-pointer select-none transition-all duration-150${active ? " ring-2 ring-orange-400 rounded-xl" : ""}`}
      onClick={onClick}
    >
      {individual.map((combo) => (
        <div
          key={combo}
          className="w-10 h-14 rounded-lg bg-white border border-stone-200 flex items-center justify-center shrink-0"
        >
          <span className="text-[10px] font-semibold text-stone-700">
            {combo}
          </span>
        </div>
      ))}
      {overflow > 0 && (
        <div className="relative w-10 h-14 shrink-0">
          {["-4deg", "4deg"].map((rot, i) => (
            <div
              key={i}
              className="w-8 h-11 rounded bg-stone-100 border border-stone-200 absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) rotate(${rot})`,
                zIndex: i,
              }}
            />
          ))}
          <span className="absolute inset-0 flex items-center justify-center z-10 text-[10px] font-semibold text-stone-500">
            +{overflow}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Range Modal ──────────────────────────────────────────────────────

function RangeModal({
  selected,
  onSelect,
  onClear,
  onDone,
}: {
  selected: Set<string>;
  onSelect: (selected: Set<string>) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onDone}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 pointer-events-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-stone-600">
              {selected.size} combo{selected.size !== 1 ? "s" : ""}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-xs font-medium text-stone-400 hover:text-stone-600 transition-colors"
                onClick={onClear}
              >
                Clear
              </button>
              <button
                type="button"
                className="text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
                onClick={onDone}
              >
                Done
              </button>
            </div>
          </div>
          <RangePicker selected={selected} onSelect={onSelect} />
        </div>
      </div>
    </>
  );
}

// ── Card Slot ────────────────────────────────────────────────────────

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
    "w-10 h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-150 select-none";

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
          <span className={`text-base font-bold leading-none ${color}`}>
            {rank}
          </span>
          <span className={`text-base font-bold leading-none ${color}`}>
            {suitInfo.symbol}
          </span>
        </>
      ) : (
        <span className="text-stone-300 text-base leading-none">+</span>
      )}
    </button>
  );
}

// ── Popover Picker ───────────────────────────────────────────────────

function PopoverPicker({
  currentCard,
  disabledCards,
  onSelect,
  onDelete,
  anchorRect,
}: {
  currentCard: string | null;
  disabledCards: string[];
  onSelect: (card: string) => void;
  onDelete: () => void;
  anchorRect: DOMRect;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Bug 5D: manual scroll-into-view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scrollContainer = document.querySelector(".overflow-y-auto");
    if (!scrollContainer) return;
    const scrollRect = scrollContainer.getBoundingClientRect();
    const pickerBottom = anchorRect.bottom + 8 + el.offsetHeight;
    const overflow = pickerBottom - scrollRect.bottom;
    if (overflow > 0) {
      scrollContainer.scrollBy({ top: overflow + 16, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      data-card-picker
      className="fixed z-20"
      style={{
        top: anchorRect.bottom + 8,
        left: anchorRect.left,
        width: anchorRect.width,
      }}
    >
      <MiniCardPicker
        currentCard={currentCard}
        disabledCards={disabledCards}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );
}
