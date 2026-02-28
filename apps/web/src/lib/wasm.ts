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

export async function runStaticEquity(): Promise<EquityResult> {
  await ensureInit();

  const result = estimate_equity(
    "5c6c7c8h",
    "AcKs",
    ["KQs", "99", "22+"],
    100000,
  );

  return {
    equities: Array.from(result.equities),
    mode: result.mode,
    samples: result.samples,
  };
}
