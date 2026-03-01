export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export const ALL_CARDS: string[] = RANKS.flatMap((r) =>
  SUITS.map((s) => `${r}${s}`),
);

// Suit display info for CardPicker
export const SUIT_DISPLAY: Record<Suit, { symbol: string; color: string }> = {
  s: { symbol: "\u2660", color: "text-stone-800" },
  h: { symbol: "\u2665", color: "text-red-500" },
  d: { symbol: "\u2666", color: "text-blue-500" },
  c: { symbol: "\u2663", color: "text-green-600" },
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
