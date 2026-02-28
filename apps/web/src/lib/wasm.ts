import init, { calculate_equity } from "../wasm-pkg/snapcall_wasm";

let initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (initPromise === null) {
    initPromise = init().then(() => undefined);
  }
  return initPromise;
}

export async function runStaticEquity(): Promise<number[]> {
  await ensureInit();

  const result = calculate_equity(
    ["AcKs", "KQs", "99+", "22+"],
    "5c6c7c8hAs",
    20000,
  );

  return Array.from(result);
}
