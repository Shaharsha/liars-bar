import { create } from 'zustand'
import { createSession as apiCreateSession } from '../api/http'

interface SessionState {
  sessionId: string | null
  nickname: string | null
  createSession: (nickname: string) => Promise<void>
  setSession: (sessionId: string, nickname: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  nickname: null,

  createSession: async (nickname: string) => {
    const data = await apiCreateSession(nickname)
    set({ sessionId: data.session_id, nickname: data.nickname })
  },

  setSession: (sessionId: string, nickname: string) => {
    set({ sessionId, nickname })
  },

  clearSession: () => {
    set({ sessionId: null, nickname: null })
  },
}))
