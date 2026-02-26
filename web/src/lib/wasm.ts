import init, {
  calculate_equity,
  evaluate_hand,
  format_card,
  parse_range,
} from "../../pkg/snapcall_web.js";

export interface WasmBindings {
  calculateEquity: (players: string[], board: string, iterations: number) => Float64Array;
  evaluateHand: (cards: string) => string;
  formatCard: (card: string) => string;
  parseRange: (range: string) => string[];
}

let initPromise: Promise<void> | null = null;

export function initWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = init().then(() => undefined);
  }
  return initPromise;
}

export const wasmBindings: WasmBindings = {
  calculateEquity: calculate_equity,
  evaluateHand: evaluate_hand,
  formatCard: format_card,
  parseRange: parse_range,
};
