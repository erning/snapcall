import { RANKS, type Card, type Rank, type Suit } from "../types";

const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const CHEN_RANK_VALUES: Record<Rank, number> = {
  A: 10,
  K: 8,
  Q: 7,
  J: 6,
  T: 5,
  "9": 4.5,
  "8": 4,
  "7": 3.5,
  "6": 3,
  "5": 2.5,
  "4": 2,
  "3": 1.5,
  "2": 1,
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

export function buildRangeCell(row: number, col: number): string {
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

export function getRangeCellComboCount(cell: string): number {
  if (/^([AKQJT98765432])\1$/.test(cell)) {
    return 6;
  }
  if (/^[AKQJT98765432]{2}s$/.test(cell)) {
    return 4;
  }
  if (/^[AKQJT98765432]{2}o$/.test(cell)) {
    return 12;
  }
  return 0;
}

function chenScore(cell: string): number {
  const pairMatch = cell.match(/^([AKQJT98765432])\1$/);
  if (pairMatch) {
    const rank = pairMatch[1] as Rank;
    return Math.max(5, CHEN_RANK_VALUES[rank] * 2);
  }

  const comboMatch = cell.match(/^([AKQJT98765432])([AKQJT98765432])(s|o)$/);
  if (!comboMatch) {
    return 0;
  }

  const highRank = comboMatch[1] as Rank;
  const lowRank = comboMatch[2] as Rank;
  const suited = comboMatch[3] === "s";

  const highIndex = RANK_TO_INDEX[highRank];
  const lowIndex = RANK_TO_INDEX[lowRank];

  let score = CHEN_RANK_VALUES[highRank];
  if (suited) {
    score += 2;
  }

  const gap = Math.max(0, lowIndex - highIndex - 1);
  if (gap === 1) {
    score -= 1;
  } else if (gap === 2) {
    score -= 2;
  } else if (gap === 3) {
    score -= 4;
  } else if (gap >= 4) {
    score -= 5;
  }

  if (gap <= 1 && highIndex >= 3) {
    score += 1;
  }

  return Math.max(0, Math.round(score * 2) / 2);
}

export function getTopRangeCellsByPercent(percent: number): string[] {
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped === 0) {
    return [];
  }

  const allCells: string[] = [];
  for (let row = 0; row < RANKS.length; row += 1) {
    for (let col = 0; col < RANKS.length; col += 1) {
      allCells.push(buildRangeCell(row, col));
    }
  }

  const rankedCells = allCells
    .map((cell) => ({
      cell,
      score: chenScore(cell),
      combos: getRangeCellComboCount(cell),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.combos !== right.combos) {
        return left.combos - right.combos;
      }
      return left.cell.localeCompare(right.cell);
    });

  const targetCombos = (clamped / 100) * 1326;
  const selected: string[] = [];
  let runningCombos = 0;

  for (const item of rankedCells) {
    if (runningCombos >= targetCombos && selected.length > 0) {
      break;
    }
    selected.push(item.cell);
    runningCombos += item.combos;
  }

  return selected;
}
