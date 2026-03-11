import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/session'

export default function NicknamePage() {
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createSession = useSessionStore((s) => s.createSession)
  const sessionId = useSessionStore((s) => s.sessionId)
  const loading = useSessionStore((s) => s.loading)
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && sessionId) navigate('/lobby', { replace: true })
  }, [loading, sessionId, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || nickname.trim().length < 2) return
    setIsLoading(true)
    setError(null)
    try {
      await createSession(nickname.trim())
      navigate('/lobby')
    } catch (err: any) {
      setError(err.message || 'Failed to create session')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-speakeasy bg-noise">
      {/* Ambient light orbs */}
      <div className="ambient-light" />

      {/* Decorative cards */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="deco-card text-accent-gold/40 -rotate-[25deg]" style={{ top: '12%', left: '6%' }}>
          <span>A</span>
        </div>
        <div className="deco-card text-accent-red/30 rotate-[15deg]" style={{ top: '8%', right: '8%' }}>
          <span>K</span>
        </div>
        <div className="deco-card text-accent-gold/30 rotate-[35deg]" style={{ bottom: '15%', left: '10%' }}>
          <span>Q</span>
        </div>
        <div className="deco-card text-accent-gold/25 -rotate-[10deg]" style={{ bottom: '20%', right: '5%' }}>
          <span>{'\u2605'}</span>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="ornament text-accent-gold/30 mb-4">
            <span className="text-xs tracking-[0.3em] uppercase text-accent-gold/50">Est. 2026</span>
          </div>
          <h1
            className="text-5xl sm:text-6xl font-accent text-accent-gold tracking-wider text-glow-gold"
            style={{ animation: 'pulse-gold 3s ease-in-out infinite' }}
          >
            LIAR'S BAR
          </h1>
          <p className="text-text-secondary text-sm tracking-[0.25em] uppercase">
            Where trust goes to die
          </p>
          <div className="ornament text-accent-gold/30 mt-2">
            <span className="text-accent-gold/20 text-xs">&#9830;</span>
          </div>
        </div>

        {/* Revolver illustration */}
        <div className="flex items-center gap-2 opacity-40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="chamber"
              style={{ animation: `waiting-pulse 2s ease-in-out ${i * 0.3}s infinite` }}
            />
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your name"
              maxLength={16}
              className="w-full bg-bg-surface/80 border border-border-subtle rounded-2xl px-5 py-4 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent-gold/60 transition-all duration-300 text-center text-lg tracking-wide"
              autoFocus
              autoComplete="off"
            />
          </div>
          {error && (
            <p className="text-accent-red text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={!nickname.trim() || nickname.trim().length < 2 || isLoading}
            className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold text-lg tracking-wide uppercase transition-all duration-300 hover:glow-gold-lg disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {isLoading ? 'Entering...' : 'Enter the Bar'}
          </button>
        </form>

        {/* Bottom hint */}
        <p className="text-text-secondary/30 text-xs tracking-wider">
          2-4 players &middot; Bluff or die
        </p>
      </div>
    </div>
  )
}
