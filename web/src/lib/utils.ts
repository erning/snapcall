import type { Card, Suit } from "../types";

const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

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
