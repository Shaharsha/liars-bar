import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/session'

export default function NicknamePage() {
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const createSession = useSessionStore((s) => s.createSession)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || nickname.trim().length < 2) return
    setIsLoading(true)
    try {
      await createSession(nickname.trim())
      navigate('/lobby')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-bg-primary via-bg-surface to-bg-primary opacity-50" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-5xl font-accent text-accent-gold tracking-wider" style={{ animation: 'pulse-gold 3s infinite' }}>
            LIAR'S BAR
          </h1>
          <p className="text-text-secondary mt-2 text-sm tracking-widest uppercase">
            Where trust goes to die
          </p>
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
              className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3.5 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-gold focus:glow-gold transition-all duration-200 text-center text-lg"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!nickname.trim() || nickname.trim().length < 2 || isLoading}
            className="w-full bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3.5 text-bg-primary font-bold text-lg tracking-wide uppercase transition-all duration-200 hover:glow-gold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? 'Entering...' : 'Enter the Bar'}
          </button>
        </form>
      </div>
    </div>
  )
}
