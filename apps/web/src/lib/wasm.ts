import init, { estimate_equity } from "../wasm-pkg/snapcall_wasm";

let initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (initPromise === null) {
    initPromise = init().then(() => undefined);
  }
  return initPromise;
}

export interface EquityResult {
  equities: number[];
  mode: string;
  samples: number;
}

export async function estimateEquity(
  board: string,
  hero: string,
  villains: string[],
  iterations: number = 100000,
): Promise<EquityResult> {
  await ensureInit();

  const result = estimate_equity(board, hero, villains, iterations);

  return {
    equities: Array.from(result.equities),
    mode: result.mode,
    samples: result.samples,
  };
}
