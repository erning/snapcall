export type VillainData =
  | { mode: "cards"; slots: (string | null)[]; folded?: boolean }
  | { mode: "range"; range: string; folded?: boolean };

export interface AppState {
  board: (string | null)[];
  hero: (string | null)[];
  villains: VillainData[];
  potSize: number;
  callAmount: number;
}

export type AppAction =
  | { type: "SET_BOARD"; value: (string | null)[] }
  | { type: "SET_HERO"; value: (string | null)[] }
  | { type: "SET_VILLAIN"; index: number; value: (string | null)[] }
  | { type: "SET_VILLAIN_RANGE"; index: number; range: string }
  | { type: "SET_VILLAIN_MODE"; index: number; mode: "cards" | "range" }
  | { type: "ADD_VILLAIN" }
  | { type: "REMOVE_VILLAIN"; index: number }
  | { type: "SET_POT_SIZE"; value: number }
  | { type: "SET_CALL_AMOUNT"; value: number }
  | { type: "SET_VILLAIN_COUNT"; count: number }
  | { type: "RESET"; bigBlind: number; smallBlind: number }
  | { type: "FOLD_VILLAIN"; index: number }
  | { type: "RESET_VILLAIN_COUNT" }
  | { type: "RANDOM_DEMO"; bigBlind: number; smallBlind: number };
