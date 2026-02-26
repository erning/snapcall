import { RANKS, type Card, type Rank, type Suit } from "../types";

const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const RANK_TO_INDEX: Record<Rank, number> = RANKS.reduce((acc, rank, index) => {
  acc[rank] = index;
  return acc;
}, {} as Record<Rank, number>);

export function calculatePotOdds(pot: number, opponentBet: number, callAmount: number): number {
  const denominator = pot + opponentBet + callAmount;
  if (denominator <= 0 || callAmount < 0) {
    return 0;
  }
  return callAmount / denominator;
}

export function toCompactCard(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function cardLabel(card: Card | null, empty = ""): string {
  if (!card) {
    return empty;
  }
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function parseIntegerInput(value: string): number {
  if (!value.trim()) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function parseOptionalIntegerInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function pairToken(rankIndex: number): string {
  const rank = RANKS[rankIndex];
  return `${rank}${rank}`;
}

function comboToken(highRankIndex: number, lowRankIndex: number, suited: "s" | "o"): string {
  return `${RANKS[highRankIndex]}${RANKS[lowRankIndex]}${suited}`;
}

function compressPairIndices(indices: number[]): string[] {
  if (indices.length === 0) {
    return [];
  }

  const uniqueSorted = [...new Set(indices)].sort((a, b) => a - b);
  const tokens: string[] = [];

  let start = uniqueSorted[0];
  let prev = uniqueSorted[0];

  for (let index = 1; index <= uniqueSorted.length; index += 1) {
    const current = uniqueSorted[index];
    const contiguous = typeof current === "number" && current === prev + 1;

    if (contiguous) {
      prev = current;
      continue;
    }

    if (start === 0 && prev > start) {
      tokens.push(`${pairToken(prev)}+`);
    } else {
      for (let rankIndex = start; rankIndex <= prev; rankIndex += 1) {
        tokens.push(pairToken(rankIndex));
      }
    }

    if (typeof current === "number") {
      start = current;
      prev = current;
    }
  }

  return tokens;
}

function compressComboGroups(groups: Map<number, Set<number>>, suited: "s" | "o"): string[] {
  const highRankIndices = [...groups.keys()].sort((a, b) => a - b);
  const tokens: string[] = [];

  for (const highRankIndex of highRankIndices) {
    const lowRankIndices = [...(groups.get(highRankIndex) ?? [])].sort((a, b) => a - b);
    if (lowRankIndices.length === 0) {
      continue;
    }

    let start = lowRankIndices[0];
    let prev = lowRankIndices[0];

    for (let index = 1; index <= lowRankIndices.length; index += 1) {
      const current = lowRankIndices[index];
      const contiguous = typeof current === "number" && current === prev + 1;

      if (contiguous) {
        prev = current;
        continue;
      }

      const topLowRankIndex = highRankIndex + 1;
      if (start === topLowRankIndex && prev > start) {
        tokens.push(`${comboToken(highRankIndex, prev, suited)}+`);
      } else {
        for (let lowRankIndex = start; lowRankIndex <= prev; lowRankIndex += 1) {
          tokens.push(comboToken(highRankIndex, lowRankIndex, suited));
        }
      }

      if (typeof current === "number") {
        start = current;
        prev = current;
      }
    }
  }

  return tokens;
}

export function compressRangeCells(rangeCells: string[]): string[] {
  const pairIndices: number[] = [];
  const suitedByHigh = new Map<number, Set<number>>();
  const offsuitByHigh = new Map<number, Set<number>>();
  const passthrough: string[] = [];

  const uniqueCells = [...new Set(rangeCells)];

  for (const cell of uniqueCells) {
    const pairMatch = cell.match(/^([AKQJT98765432])\1$/);
    if (pairMatch) {
      const rank = pairMatch[1] as Rank;
      pairIndices.push(RANK_TO_INDEX[rank]);
      continue;
    }

    const comboMatch = cell.match(/^([AKQJT98765432])([AKQJT98765432])(s|o)$/);
    if (!comboMatch) {
      passthrough.push(cell);
      continue;
    }

    const first = comboMatch[1] as Rank;
    const second = comboMatch[2] as Rank;
    const suited = comboMatch[3] as "s" | "o";

    const firstIndex = RANK_TO_INDEX[first];
    const secondIndex = RANK_TO_INDEX[second];

    if (firstIndex === secondIndex) {
      pairIndices.push(firstIndex);
      continue;
    }

    const highRankIndex = Math.min(firstIndex, secondIndex);
    const lowRankIndex = Math.max(firstIndex, secondIndex);
    const targetMap = suited === "s" ? suitedByHigh : offsuitByHigh;
    const current = targetMap.get(highRankIndex) ?? new Set<number>();
    current.add(lowRankIndex);
    targetMap.set(highRankIndex, current);
  }

  return [
    ...compressPairIndices(pairIndices),
    ...compressComboGroups(suitedByHigh, "s"),
    ...compressComboGroups(offsuitByHigh, "o"),
    ...passthrough,
  ];
}

export function formatRangePreview(rangeCells: string[], maxItems = 3): string {
  const compressed = compressRangeCells(rangeCells);
  if (compressed.length === 0) {
    return "Select range";
  }

  const visible = compressed.slice(0, maxItems);
  const hiddenCount = compressed.length - visible.length;
  if (hiddenCount > 0) {
    return `${visible.join(", ")} +${hiddenCount}`;
  }

  return visible.join(", ");
}
