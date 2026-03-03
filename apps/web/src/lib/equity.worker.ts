import init, { estimate_equity } from "../wasm-pkg/snapcall_wasm";

let ready: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (ready === null) {
    ready = init().then(() => undefined);
  }
  return ready;
}

export interface WorkerRequest {
  id: number;
  board: string;
  hero: string;
  villains: string[];
  iterations: number;
}

export interface WorkerResponse {
  id: number;
  result?: { equities: number[]; mode: string; samples: number };
  error?: string;
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, board, hero, villains, iterations } = e.data;
  try {
    await ensureInit();
    const res = estimate_equity(board, hero, villains, iterations);
    const response: WorkerResponse = {
      id,
      result: {
        equities: Array.from(res.equities),
        mode: res.mode,
        samples: res.samples,
      },
    };
    self.postMessage(response);
  } catch (err: unknown) {
    const response: WorkerResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
