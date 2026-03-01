import type { AppState, AppAction } from "./types";

export const initialState: AppState = {
  board: [null, null, null, null, null],
  hero: [null, null],
  villains: [""],
  potSize: "",
  callAmount: "",
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_BOARD":
      return { ...state, board: action.value };
    case "SET_HERO":
      return { ...state, hero: action.value };
    case "SET_VILLAIN": {
      const villains = [...state.villains];
      villains[action.index] = action.value;
      return { ...state, villains };
    }
    case "ADD_VILLAIN":
      return { ...state, villains: [...state.villains, ""] };
    case "REMOVE_VILLAIN": {
      const villains = state.villains.filter((_, i) => i !== action.index);
      return { ...state, villains: villains.length === 0 ? [""] : villains };
    }
    case "SET_POT_SIZE":
      return { ...state, potSize: action.value };
    case "SET_CALL_AMOUNT":
      return { ...state, callAmount: action.value };
  }
}
