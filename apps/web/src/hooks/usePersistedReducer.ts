import { useReducer, useEffect, useCallback } from "react";
import { appReducer, initialState } from "../reducer";
import type { AppState, AppAction } from "../types";

const STORAGE_KEY = "snapcall-state";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initialState };
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed.board) &&
      parsed.board.length === 5 &&
      Array.isArray(parsed.hero) &&
      parsed.hero.length === 2 &&
      Array.isArray(parsed.villains) &&
      parsed.villains.length >= 1
    ) {
      return parsed as AppState;
    }
  } catch {
    // ignore
  }
  return { ...initialState };
}

export function usePersistedReducer() {
  const [state, rawDispatch] = useReducer(appReducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const dispatch = useCallback(
    (action: AppAction) => {
      if (action.type === "RESET") {
        localStorage.removeItem(STORAGE_KEY);
      }
      rawDispatch(action);
    },
    [],
  );

  return [state, dispatch] as const;
}
