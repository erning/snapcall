import { useEffect, useState, useRef } from "react";
import { estimateEquity, type EquityResult } from "../lib/wasm";

interface UseEquityResult {
  equities: number[] | null;
  mode: string | null;
  samples: number | null;
  isCalculating: boolean;
  error: string | null;
}

export function useEquity(
  board: string,
  hero: string,
  villains: string[],
): UseEquityResult {
  const [result, setResult] = useState<EquityResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  // Serialize villains for stable dependency comparison
  const villainsKey = villains.join("\0");

  useEffect(() => {
    const currentVillains = villainsKey.split("\0");

    if (!hero.trim()) {
      setResult(null);
      setError(null);
      setIsCalculating(false);
      return;
    }

    const seq = ++seqRef.current;

    const timer = setTimeout(() => {
      setIsCalculating(true);
      estimateEquity(board, hero, currentVillains)
        .then((res) => {
          if (seq !== seqRef.current) return;
          setResult(res);
          setError(null);
        })
        .catch((err: unknown) => {
          if (seq !== seqRef.current) return;
          setResult(null);
          setError(err instanceof Error ? err.message : "Unknown WASM error");
        })
        .finally(() => {
          if (seq !== seqRef.current) return;
          setIsCalculating(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [board, hero, villainsKey]);

  return {
    equities: result?.equities ?? null,
    mode: result?.mode ?? null,
    samples: result?.samples ?? null,
    isCalculating,
    error,
  };
}
