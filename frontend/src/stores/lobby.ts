import { create } from 'zustand'
import { fetchTables } from '../api/http'
import type { TableSummary } from '../types/models'

interface LobbyState {
  tables: TableSummary[]
  isLoading: boolean
  hasLoaded: boolean
  loadTables: () => Promise<void>
  setTables: (tables: TableSummary[]) => void
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  tables: [],
  isLoading: false,
  hasLoaded: false,

  loadTables: async () => {
    if (!get().hasLoaded) set({ isLoading: true })
    try {
      const data = await fetchTables()
      set({ tables: data.tables || [], isLoading: false, hasLoaded: true })
    } catch {
      set({ isLoading: false })
    }
  },

  setTables: (tables: TableSummary[]) => set({ tables }),
}))
