import type { WorkerRequest, WorkerResponse } from "./equity.worker";

export interface EquityResult {
  equities: number[];
  mode: string;
  samples: number;
}

const worker = new Worker(
  new URL("./equity.worker.ts", import.meta.url),
  { type: "module" },
);

let nextId = 0;
const pending = new Map<number, {
  resolve: (v: EquityResult) => void;
  reject: (e: Error) => void;
}>();

worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
  const { id, result, error } = e.data;
  const entry = pending.get(id);
  if (!entry) return;
  pending.delete(id);
  if (error) {
    entry.reject(new Error(error));
  } else {
    entry.resolve(result!);
  }
};

export function estimateEquity(
  board: string,
  hero: string,
  villains: string[],
  iterations: number = 100000,
): Promise<EquityResult> {
  const id = nextId++;
  return new Promise<EquityResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const msg: WorkerRequest = { id, board, hero, villains, iterations };
    worker.postMessage(msg);
  });
}
