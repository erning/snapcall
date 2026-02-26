import { create } from "zustand";
import type { Card, Player, Rank, Slot } from "../types";

interface GameState {
  pot: number;
  opponentBet: number;
  callAmount: number;
  board: (Card | null)[];
  players: Player[];
  activeSlot: Slot | null;
  pendingRank: Rank | null;
  iterations: number;
  isCalculating: boolean;
  error: string | null;
  setPot: (value: number) => void;
  setOpponentBet: (value: number) => void;
  setCallAmount: (value: number) => void;
  setBoardCard: (index: number, card: Card | null) => void;
  clearBoard: () => void;
  addPlayer: () => void;
  removePlayer: (playerId: string) => void;
  setPlayerCard: (playerId: string, cardIndex: number, card: Card | null) => void;
  clearPlayerCards: (playerId: string) => void;
  setActiveSlot: (slot: Slot | null) => void;
  setPendingRank: (rank: Rank | null) => void;
  setIterations: (iterations: number) => void;
  setIsCalculating: (value: boolean) => void;
  setEquities: (equities: number[]) => void;
  clearEquities: () => void;
  setError: (message: string | null) => void;
}

function createPlayer(): Player {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    id,
    cards: [null, null],
  };
}

function clearEquityOnPlayers(players: Player[]): Player[] {
  return players.map((player) => ({ ...player, equity: undefined }));
}

export const useGameStore = create<GameState>((set) => ({
  pot: 0,
  opponentBet: 0,
  callAmount: 0,
  board: [null, null, null, null, null],
  players: [createPlayer(), createPlayer()],
  activeSlot: null,
  pendingRank: null,
  iterations: 10000,
  isCalculating: false,
  error: null,

  setPot: (value) => set({ pot: Math.max(0, value) }),
  setOpponentBet: (value) => set({ opponentBet: Math.max(0, value) }),
  setCallAmount: (value) => set({ callAmount: Math.max(0, value) }),

  setBoardCard: (index, card) =>
    set((state) => {
      if (index < 0 || index >= state.board.length) {
        return state;
      }
      const board = [...state.board];
      board[index] = card;
      return {
        board,
        players: clearEquityOnPlayers(state.players),
        error: null,
      };
    }),

  clearBoard: () =>
    set((state) => ({
      board: [null, null, null, null, null],
      players: clearEquityOnPlayers(state.players),
      activeSlot: null,
      pendingRank: null,
      error: null,
    })),

  addPlayer: () =>
    set((state) => ({
      players: [...clearEquityOnPlayers(state.players), createPlayer()],
      error: null,
    })),

  removePlayer: (playerId) =>
    set((state) => {
      if (state.players.length <= 2) {
        return state;
      }

      return {
        players: clearEquityOnPlayers(state.players.filter((player) => player.id !== playerId)),
        activeSlot:
          state.activeSlot?.kind === "player" && state.activeSlot.playerId === playerId ? null : state.activeSlot,
        pendingRank: null,
        error: null,
      };
    }),

  setPlayerCard: (playerId, cardIndex, card) =>
    set((state) => ({
      players: clearEquityOnPlayers(
        state.players.map((player) => {
          if (player.id !== playerId) {
            return player;
          }
          const nextCards: [Card | null, Card | null] = [...player.cards] as [Card | null, Card | null];
          nextCards[cardIndex] = card;
          return {
            ...player,
            cards: nextCards,
          };
        }),
      ),
      error: null,
    })),

  clearPlayerCards: (playerId) =>
    set((state) => ({
      players: clearEquityOnPlayers(
        state.players.map((player) => {
          if (player.id !== playerId) {
            return player;
          }
          return {
            ...player,
            cards: [null, null],
          };
        }),
      ),
      activeSlot:
        state.activeSlot?.kind === "player" && state.activeSlot.playerId === playerId ? null : state.activeSlot,
      pendingRank: null,
      error: null,
    })),

  setActiveSlot: (slot) => set({ activeSlot: slot }),
  setPendingRank: (rank) => set({ pendingRank: rank }),

  setIterations: (iterations) =>
    set({
      iterations: Number.isFinite(iterations) && iterations > 0 ? Math.floor(iterations) : 10000,
    }),

  setIsCalculating: (value) => set({ isCalculating: value }),

  setEquities: (equities) =>
    set((state) => ({
      players: state.players.map((player, index) => ({
        ...player,
        equity: equities[index],
      })),
      error: null,
    })),

  clearEquities: () =>
    set((state) => ({
      players: clearEquityOnPlayers(state.players),
    })),

  setError: (message) => set({ error: message }),
}));
