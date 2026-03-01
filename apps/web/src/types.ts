export interface AppState {
  board: (string | null)[];
  hero: (string | null)[];
  villains: (string | null)[][];
  potSize: string;
  callAmount: string;
}

export type AppAction =
  | { type: "SET_BOARD"; value: (string | null)[] }
  | { type: "SET_HERO"; value: (string | null)[] }
  | { type: "SET_VILLAIN"; index: number; value: (string | null)[] }
  | { type: "ADD_VILLAIN" }
  | { type: "REMOVE_VILLAIN"; index: number }
  | { type: "SET_POT_SIZE"; value: string }
  | { type: "SET_CALL_AMOUNT"; value: string };
