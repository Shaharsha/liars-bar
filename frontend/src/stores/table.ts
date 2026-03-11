import { create } from 'zustand'
import type { TableInfo, Player } from '../types/models'

interface TableState {
  table: TableInfo | null
  setTable: (table: TableInfo) => void
  addPlayer: (player: Player) => void
  removePlayer: (sessionId: string) => void
  clear: () => void
}

export const useTableStore = create<TableState>((set) => ({
  table: null,

  setTable: (table: TableInfo) => set({ table }),

  addPlayer: (player: Player) =>
    set((state) => {
      if (!state.table) return state
      if (state.table.players.some((p) => p.session_id === player.session_id)) return state
      return {
        table: { ...state.table, players: [...state.table.players, player] },
      }
    }),

  removePlayer: (sessionId: string) =>
    set((state) => {
      if (!state.table) return state
      return {
        table: {
          ...state.table,
          players: state.table.players.filter((p) => p.session_id !== sessionId),
        },
      }
    }),

  clear: () => set({ table: null }),
}))
