export const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
export const SUITS = ["s", "h", "d", "c"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type PlayerInputMode = "cards" | "range";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export interface Player {
  id: string;
  cards: [Card | null, Card | null];
  inputMode: PlayerInputMode;
  rangeCells: string[];
  folded: boolean;
  equity?: number;
}

export type Slot =
  | {
      kind: "board";
      cardIndex: number;
    }
  | {
      kind: "player";
      playerId: string;
      cardIndex: number;
    };
