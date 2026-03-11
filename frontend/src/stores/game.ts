import { create } from 'zustand'
import type { GameState } from '../types/models'

interface GameStore {
  gameState: GameState | null
  rouletteResult: { player_id: string; survived: boolean; shots_fired: number; chambers: number } | null
  revealedCards: { cards: string[]; was_lying: boolean } | null
  revealedDice: { all_dice: Record<string, number[]>; actual_count: number; bid_was_correct: boolean } | null
  gameOver: { winner_id: string; winner_nickname: string; winner_avatar?: string } | null
  liarCalled: { caller_id: string } | null
  setGameState: (state: GameState) => void
  setRouletteResult: (result: any) => void
  setRevealedCards: (data: any) => void
  setRevealedDice: (data: any) => void
  setGameOver: (data: any) => void
  setLiarCalled: (data: any) => void
  clearOverlays: () => void
  clear: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  rouletteResult: null,
  revealedCards: null,
  revealedDice: null,
  gameOver: null,
  liarCalled: null,

  setGameState: (gameState: GameState) => set({ gameState }),
  setRouletteResult: (rouletteResult) => set({ rouletteResult }),
  setRevealedCards: (revealedCards) => set({ revealedCards }),
  setRevealedDice: (revealedDice) => set({ revealedDice }),
  setGameOver: (gameOver) => set({ gameOver }),
  setLiarCalled: (liarCalled) => set({ liarCalled }),
  clearOverlays: () => set({ rouletteResult: null, revealedCards: null, revealedDice: null, liarCalled: null }),
  clear: () => set({ gameState: null, rouletteResult: null, revealedCards: null, revealedDice: null, gameOver: null, liarCalled: null }),
}))
