import { create } from 'zustand'
import { createSession as apiCreateSession, getSession } from '../api/http'

interface SessionState {
  sessionId: string | null
  nickname: string | null
  loading: boolean
  createSession: (nickname: string) => Promise<void>
  loadSession: () => Promise<void>
  setSession: (sessionId: string, nickname: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  nickname: null,
  loading: true,

  createSession: async (nickname: string) => {
    const data = await apiCreateSession(nickname)
    set({ sessionId: data.session_id, nickname: data.nickname })
  },

  loadSession: async () => {
    try {
      const data = await getSession()
      if (data.session_id) {
        set({ sessionId: data.session_id, nickname: data.nickname, loading: false })
      } else {
        set({ sessionId: null, nickname: null, loading: false })
      }
    } catch {
      set({ sessionId: null, nickname: null, loading: false })
    }
  },

  setSession: (sessionId: string, nickname: string) => {
    set({ sessionId, nickname })
  },

  clearSession: () => {
    set({ sessionId: null, nickname: null })
  },
}))
