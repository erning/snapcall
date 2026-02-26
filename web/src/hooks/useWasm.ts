import { useEffect, useState } from "react";
import { initWasm, wasmBindings, type WasmBindings } from "../lib/wasm";

interface UseWasmResult {
  wasm: WasmBindings | null;
  loading: boolean;
  error: string | null;
}

export function useWasm(): UseWasmResult {
  const [wasm, setWasm] = useState<WasmBindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    initWasm()
      .then(() => {
        if (!mounted) {
          return;
        }
        setWasm(wasmBindings);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to initialize WASM");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { wasm, loading, error };
}
