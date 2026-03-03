import type { AppState, AppAction, VillainData } from "./types";

const emptyVillain: VillainData = { mode: "range", range: "" };

export const initialState: AppState = {
  board: [null, null, null, null, null],
  hero: [null, null],
  villains: [{ mode: "range", range: "" }],
  potSize: "30",
  callAmount: "20",
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_BOARD":
      return { ...state, board: action.value };
    case "SET_HERO":
      return { ...state, hero: action.value };
    case "SET_VILLAIN": {
      const villains = [...state.villains];
      villains[action.index] = { mode: "cards", slots: action.value };
      return { ...state, villains };
    }
    case "SET_VILLAIN_RANGE": {
      const villains = [...state.villains];
      villains[action.index] = { mode: "range", range: action.range };
      return { ...state, villains };
    }
    case "SET_VILLAIN_MODE": {
      const villains = [...state.villains];
      villains[action.index] =
        action.mode === "cards"
          ? { mode: "cards", slots: [null, null] }
          : { mode: "range", range: "" };
      return { ...state, villains };
    }
    case "ADD_VILLAIN":
      return { ...state, villains: [...state.villains, { ...emptyVillain }] };
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
        potSize: String(action.smallBlind + action.bigBlind),
        callAmount: String(action.bigBlind),
      };
    }
    case "RESET_VILLAIN_COUNT":
      return { ...state, villains: [{ ...emptyVillain }] };
  }
}
