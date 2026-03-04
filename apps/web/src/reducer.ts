import type { AppState, AppAction, VillainData } from "./types";
import { defaultSettings } from "./hooks/useSettings";
import { ALL_CARDS, buildAllCombos } from "./lib/poker";

const emptyVillain: VillainData = { mode: "range", range: "" };

const ALL_COMBOS = buildAllCombos();

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRandomDemo(
  bigBlind: number,
  smallBlind: number,
  villainCount: number,
): AppState {
  const shuffled = shuffleArray(ALL_CARDS);
  let idx = 0;

  // Deal hero
  const hero = [shuffled[idx++], shuffled[idx++]];

  // Random board size: 3, 4, or 5
  const boardSize = 3 + Math.floor(Math.random() * 3);
  const board: (string | null)[] = [];
  for (let i = 0; i < boardSize; i++) board.push(shuffled[idx++]);
  while (board.length < 5) board.push(null);

  // Random pot size: n*BB, 50% chance to add SB
  // 50% of the time cap at 200, otherwise cap at 1000
  const cap = Math.random() < 0.5 ? 200 : 1000;
  const maxN = Math.floor(cap / bigBlind);
  const n = 1 + Math.floor(Math.random() * maxN);
  const addSB = Math.random() < 0.5;
  const potSize = n * bigBlind + (addSB ? smallBlind : 0);

  const callAmount = bigBlind;

  // Villains: 50% unknown, 50% random range combos (1–5)
  const villains: VillainData[] = [];
  const shuffledCombos = shuffleArray(ALL_COMBOS);
  let comboIdx = 0;
  for (let i = 0; i < villainCount; i++) {
    if (Math.random() < 0.5) {
      villains.push({ mode: "range", range: "" });
    } else {
      const comboCount = 1 + Math.floor(Math.random() * 5); // 1–5
      const picked = shuffledCombos.slice(comboIdx, comboIdx + comboCount);
      comboIdx += comboCount;
      villains.push({ mode: "range", range: picked.join(",") });
    }
  }

  return {
    board,
    hero,
    villains,
    potSize,
    callAmount,
  };
}

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
    case "RANDOM_DEMO":
      return generateRandomDemo(action.bigBlind, action.smallBlind, state.villains.length);
  }
}
