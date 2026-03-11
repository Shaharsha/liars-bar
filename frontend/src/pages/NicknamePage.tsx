import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/session'
import AnimalAvatar, { AVATAR_LIST, type AvatarId } from '../components/AnimalAvatar'

export default function NicknamePage() {
  const [nickname, setNickname] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>('fox')
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
      await createSession(nickname.trim(), selectedAvatar)
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

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
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

          {/* Avatar picker */}
          <div className="space-y-2.5">
            <p className="text-text-secondary/50 text-[10px] uppercase tracking-[0.2em] text-center font-medium">
              Choose your animal
            </p>
            <div className="flex justify-center gap-2.5 flex-wrap">
              {AVATAR_LIST.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedAvatar(id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 ${
                    selectedAvatar === id
                      ? 'bg-bg-surface/80 border-accent-gold/40 scale-110 opacity-100'
                      : 'bg-transparent border-transparent opacity-50'
                  }`}
                >
                  <AnimalAvatar avatar={id} size={38} />
                  <span className={`text-[9px] uppercase tracking-wider ${
                    selectedAvatar === id ? 'text-accent-gold' : 'text-text-secondary/60'
                  }`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
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
