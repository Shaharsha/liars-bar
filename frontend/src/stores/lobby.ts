import { create } from 'zustand'
import { fetchTables } from '../api/http'
import type { TableSummary } from '../types/models'

interface LobbyState {
  tables: TableSummary[]
  isLoading: boolean
  loadTables: () => Promise<void>
  setTables: (tables: TableSummary[]) => void
}

export const useLobbyStore = create<LobbyState>((set) => ({
  tables: [],
  isLoading: false,

  loadTables: async () => {
    set({ isLoading: true })
    try {
      const data = await fetchTables()
      set({ tables: data.tables || [] })
    } finally {
      set({ isLoading: false })
    }
  },

  setTables: (tables: TableSummary[]) => set({ tables }),
}))
