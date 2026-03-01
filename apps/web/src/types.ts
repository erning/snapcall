export interface AppState {
  board: string;
  hero: string;
  villains: string[];
  potSize: string;
  callAmount: string;
}

export type AppAction =
  | { type: "SET_BOARD"; value: string }
  | { type: "SET_HERO"; value: string }
  | { type: "SET_VILLAIN"; index: number; value: string }
  | { type: "ADD_VILLAIN" }
  | { type: "REMOVE_VILLAIN"; index: number }
  | { type: "SET_POT_SIZE"; value: string }
  | { type: "SET_CALL_AMOUNT"; value: string };
