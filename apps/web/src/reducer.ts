import type { AppState, AppAction, VillainData } from "./types";
import { defaultSettings } from "./hooks/useSettings";

const emptyVillain: VillainData = { mode: "range", range: "" };

export const initialState: AppState = {
  board: [null, null, null, null, null],
  hero: [null, null],
  villains: [{ mode: "range", range: "" }],
  potSize: defaultSettings.smallBlind + defaultSettings.bigBlind,
  callAmount: defaultSettings.bigBlind,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_BOARD":
      return { ...state, board: action.value };
    case "SET_HERO":
      return { ...state, hero: action.value };
    case "SET_VILLAIN": {
      const villains = [...state.villains];
      const { folded } = villains[action.index];
      villains[action.index] = { mode: "cards", slots: action.value, folded };
      return { ...state, villains };
    }
    case "SET_VILLAIN_RANGE": {
      const villains = [...state.villains];
      const { folded } = villains[action.index];
      villains[action.index] = { mode: "range", range: action.range, folded };
      return { ...state, villains };
    }
    case "SET_VILLAIN_MODE": {
      const villains = [...state.villains];
      const { folded } = villains[action.index];
      villains[action.index] =
        action.mode === "cards"
          ? { mode: "cards", slots: [null, null], folded }
          : { mode: "range", range: "", folded };
      return { ...state, villains };
    }
    case "ADD_VILLAIN":
      return { ...state, villains: [...state.villains, { ...emptyVillain }] };
    case "SET_VILLAIN_COUNT": {
      const count = Math.max(1, Math.min(21, action.count));
      const cur = state.villains.length;
      if (count === cur) return state;
      const villains =
        count > cur
          ? [
              ...state.villains,
              ...Array.from({ length: count - cur }, () => ({ ...emptyVillain })),
            ]
          : state.villains.slice(0, count);
      return { ...state, villains };
    }
    case "REMOVE_VILLAIN": {
      const villains = state.villains.filter((_, i) => i !== action.index);
      return {
        ...state,
        villains: villains.length === 0 ? [{ ...emptyVillain }] : villains,
      };
    }
    case "SET_POT_SIZE":
      return { ...state, potSize: action.value };
    case "SET_CALL_AMOUNT":
      return { ...state, callAmount: action.value };
    case "RESET": {
      return {
        ...initialState,
        villains: state.villains.map(() => ({ ...emptyVillain })),
        potSize: action.smallBlind + action.bigBlind,
        callAmount: action.bigBlind,
      };
    }
    case "FOLD_VILLAIN": {
      const villains = [...state.villains];
      villains[action.index] = { ...villains[action.index], folded: !villains[action.index].folded };
      return { ...state, villains };
    }
    case "RESET_VILLAIN_COUNT":
      return { ...state, villains: [{ ...emptyVillain }] };
  }
}
