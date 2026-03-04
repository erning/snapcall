export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

/** Display rank for card UI: "T" → "10", others unchanged. Range displays should use raw rank. */
export function displayRank(rank: string): string {
  return rank === "T" ? "10" : rank;
}

export const ALL_CARDS: string[] = RANKS.flatMap((r) =>
  SUITS.map((s) => `${r}${s}`),
);

// Suit display info for CardPicker
export const SUIT_DISPLAY: Record<Suit, { symbol: string; color: string }> = {
  s: { symbol: "\u2660", color: "text-stone-800 dark:text-stone-200" },
  h: { symbol: "\u2665", color: "text-red-500" },
  d: { symbol: "\u2666", color: "text-blue-500" },
  c: { symbol: "\u2663", color: "text-green-600 dark:text-green-500" },
};

// Suit colors for card slots (simpler 2-color scheme)
export const SLOT_SUIT_COLOR: Record<string, string> = {
  s: "text-stone-800 dark:text-stone-200",
  c: "text-stone-800 dark:text-stone-200",
  h: "text-red-500",
  d: "text-red-500",
};

// 13x13 range matrix labels
// Diagonal = pairs, upper-triangle = suited, lower-triangle = offsuit
export function getRangeLabel(row: number, col: number): string {
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return `${r1}${r2}`;
  if (col > row) return `${r1}${r2}s`;
  return `${r2}${r1}o`;
}

export function getRangeCategory(row: number, col: number): "pair" | "suited" | "offsuit" {
  if (row === col) return "pair";
  if (col > row) return "suited";
  return "offsuit";
}

// Build the full set of 169 range combos
export function buildAllCombos(): string[] {
  const combos: string[] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      combos.push(getRangeLabel(r, c));
    }
  }
  return combos;
}

// Convert a set of selected range cells to a compact range string
export function rangeSetToString(selected: Set<string>): string {
  return Array.from(selected).join(",");
}

// Parse range string back to set of cells (simple: just split by comma)
export function rangeStringToSet(rangeStr: string): Set<string> {
  if (!rangeStr.trim()) return new Set();
  return new Set(rangeStr.split(",").map((s) => s.trim()).filter(Boolean));
}

// ── Range compression ────────────────────────────────────────────────

function findConsecutiveRuns(sorted: number[]): [number, number][] {
  if (sorted.length === 0) return [];
  const runs: [number, number][] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      runs.push([start, end]);
      start = sorted[i];
      end = sorted[i];
    }
  }
  runs.push([start, end]);
  return runs;
}

/**
 * Compress a set of range combos into standard poker notation tokens.
 * e.g. {AA, KK, QQ} → ["QQ+"], {88, 77, 66} → ["88-66"]
 */
export function compressRange(selected: Set<string>): string[] {
  if (selected.size === 0) return [];

  const pairIndices: number[] = [];
  // suited/offsuit: keyed by high-card rank index → list of kicker rank indices
  const suitedByHigh = new Map<number, number[]>();
  const offsuitByHigh = new Map<number, number[]>();

  for (const combo of selected) {
    if (combo.length === 2) {
      // Pair: e.g. "AA"
      const idx = RANKS.indexOf(combo[0] as Rank);
      if (idx >= 0) pairIndices.push(idx);
    } else if (combo.length === 3) {
      const r1 = RANKS.indexOf(combo[0] as Rank);
      const r2 = RANKS.indexOf(combo[1] as Rank);
      if (r1 < 0 || r2 < 0) continue;
      const high = Math.min(r1, r2); // lower index = higher rank
      const kicker = Math.max(r1, r2);
      const suffix = combo[2];
      if (suffix === "s") {
        if (!suitedByHigh.has(high)) suitedByHigh.set(high, []);
        suitedByHigh.get(high)!.push(kicker);
      } else if (suffix === "o") {
        if (!offsuitByHigh.has(high)) offsuitByHigh.set(high, []);
        offsuitByHigh.get(high)!.push(kicker);
      }
    }
  }

  const tokens: string[] = [];

  // Compress pairs
  pairIndices.sort((a, b) => a - b);
  for (const [start, end] of findConsecutiveRuns(pairIndices)) {
    if (start === end) {
      tokens.push(`${RANKS[start]}${RANKS[start]}`);
    } else if (start === 0) {
      tokens.push(`${RANKS[end]}${RANKS[end]}+`);
    } else {
      tokens.push(`${RANKS[start]}${RANKS[start]}-${RANKS[end]}${RANKS[end]}`);
    }
  }

  // Compress suited / offsuit groups
  const compressGroup = (byHigh: Map<number, number[]>, suffix: string) => {
    const highs = [...byHigh.keys()].sort((a, b) => a - b);
    for (const h of highs) {
      const kickers = byHigh.get(h)!;
      kickers.sort((a, b) => a - b);
      const bestKicker = h + 1; // the kicker immediately below the high card
      for (const [start, end] of findConsecutiveRuns(kickers)) {
        if (start === end) {
          tokens.push(`${RANKS[h]}${RANKS[start]}${suffix}`);
        } else if (start === bestKicker) {
          tokens.push(`${RANKS[h]}${RANKS[end]}${suffix}+`);
        } else {
          tokens.push(`${RANKS[h]}${RANKS[start]}${suffix}-${RANKS[h]}${RANKS[end]}${suffix}`);
        }
      }
    }
  };

  compressGroup(suitedByHigh, "s");
  compressGroup(offsuitByHigh, "o");

  return tokens;
}

// Classify villain value for display mode
export type VillainDisplayMode = "unknown" | "range" | "exact";

export function classifyVillainValue(value: string): VillainDisplayMode {
  if (!value.trim()) return "unknown";
  if (/^([AKQJT98765432][shdc]){1,2}$/.test(value)) return "exact";
  return "range";
}

// Parse a card string like "AhKd" into individual cards ["Ah", "Kd"]
export function parseCards(input: string): string[] {
  const cards: string[] = [];
  const clean = input.trim();
  for (let i = 0; i + 1 < clean.length; i += 2) {
    cards.push(clean.slice(i, i + 2));
  }
  return cards;
}
