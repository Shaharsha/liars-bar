import { create } from 'zustand'
import { createSession as apiCreateSession, getSession } from '../api/http'

interface SessionState {
  sessionId: string | null
  nickname: string | null
  avatar: string | null
  loading: boolean
  createSession: (nickname: string, avatar: string) => Promise<void>
  loadSession: () => Promise<void>
  setSession: (sessionId: string, nickname: string, avatar: string) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  nickname: null,
  avatar: null,
  loading: true,

  createSession: async (nickname: string, avatar: string) => {
    const data = await apiCreateSession(nickname, avatar)
    set({ sessionId: data.session_id, nickname: data.nickname, avatar: data.avatar })
  },

  loadSession: async () => {
    try {
      const data = await getSession()
      if (data.session_id) {
        set({ sessionId: data.session_id, nickname: data.nickname, avatar: data.avatar || 'fox', loading: false })
      } else {
        set({ sessionId: null, nickname: null, avatar: null, loading: false })
      }
    } catch {
      set({ sessionId: null, nickname: null, avatar: null, loading: false })
    }
  },

  setSession: (sessionId: string, nickname: string, avatar: string) => {
    set({ sessionId, nickname, avatar })
  },

  clearSession: () => {
    set({ sessionId: null, nickname: null, avatar: null })
  },
}))
