import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NicknamePage from './pages/NicknamePage'
import LobbyPage from './pages/LobbyPage'
import TablePage from './pages/TablePage'
import GamePage from './pages/GamePage'
import { useSessionStore } from './stores/session'

function RequireSession({ children }: { children: React.ReactNode }) {
  const sessionId = useSessionStore((s) => s.sessionId)
  const loading = useSessionStore((s) => s.loading)
  if (loading) return <div className="min-h-dvh flex items-center justify-center text-text-secondary">Loading...</div>
  if (!sessionId) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const loadSession = useSessionStore((s) => s.loadSession)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  return (
    <BrowserRouter>
      <div className="min-h-dvh max-w-md mx-auto relative">
        <Routes>
          <Route path="/" element={<NicknamePage />} />
          <Route path="/lobby" element={<RequireSession><LobbyPage /></RequireSession>} />
          <Route path="/table/:tableId" element={<RequireSession><TablePage /></RequireSession>} />
          <Route path="/game/:tableId" element={<RequireSession><GamePage /></RequireSession>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
