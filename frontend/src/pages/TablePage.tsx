import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTableStore } from '../stores/table'
import { useSessionStore } from '../stores/session'
import { useGameStore } from '../stores/game'
import { wsClient } from '../api/ws'
import AnimalAvatar, { getAvatarColor } from '../components/AnimalAvatar'

export default function TablePage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const table = useTableStore((s) => s.table)
  const gameState = useGameStore((s) => s.gameState)
  const [copied, setCopied] = useState(false)

  useWebSocket(tableId!)

  useEffect(() => {
    if (gameState) {
      navigate(`/game/${tableId}`, { replace: true })
    }
  }, [gameState, navigate, tableId])

  const isHost = table?.host_session_id === sessionId
  const playerCount = table?.players.length || 0
  const canStart = isHost && playerCount >= 2

  const handleStart = () => {
    wsClient.send('start_game')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!table) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-noise">
        <div className="ambient-light" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-accent-gold/50"
                style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
          <span className="text-text-secondary font-accent tracking-widest text-sm">Connecting...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-noise">
      <div className="ambient-light" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm">
        <button onClick={() => navigate('/lobby')} className="text-text-secondary hover:text-accent-gold transition-colors w-10 h-10 flex items-center justify-center -ml-2 rounded-xl active:bg-bg-elevated/50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-accent text-accent-gold tracking-wide truncate">{table.name}</h1>
          <span className="text-[10px] text-text-secondary/60 uppercase tracking-[0.15em] font-accent">
            {table.game_mode === 'deck' ? '\u2660 Liar\'s Deck' : '\u2684 Liar\'s Dice'}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="relative z-10 text-center py-5">
        {playerCount < 2 ? (
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent-gold/60"
                  style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <span className="text-text-secondary text-sm font-accent tracking-wide">Waiting for players</span>
          </div>
        ) : (
          <span className="text-accent-gold/80 text-sm font-accent tracking-wide">
            {playerCount} player{playerCount > 1 ? 's' : ''} ready
          </span>
        )}
      </div>

      {/* Player grid */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {Array.from({ length: table.max_players }).map((_, i) => {
            const player = table.players[i]
            const color = player ? getAvatarColor(player.avatar || 'fox') : undefined
            return (
              <div
                key={i}
                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2.5 transition-all duration-500 ${
                  player
                    ? 'bg-bg-surface/80 border-border-subtle'
                    : 'bg-bg-primary/30 border-border-subtle/30 border-dashed'
                }`}
                style={
                  player
                    ? { animation: 'fade-in 0.4s ease-out', borderColor: `${color}20` }
                    : { animation: 'waiting-pulse 3s ease-in-out infinite' }
                }
              >
                {player ? (
                  <>
                    <AnimalAvatar avatar={player.avatar || 'fox'} size={56} />
                    <span className="text-text-primary text-sm font-medium">{player.nickname}</span>
                    {player.session_id === table.host_session_id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-accent tracking-wider uppercase bg-accent-gold/10 text-accent-gold border border-accent-gold/15">
                        Host
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-border-subtle/30 flex items-center justify-center">
                      <span className="text-text-secondary/20 text-2xl">+</span>
                    </div>
                    <span className="text-text-secondary/25 text-xs tracking-wider">Waiting</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 px-5 py-5 space-y-3 border-t border-border-subtle bg-bg-surface/30 backdrop-blur-sm" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handleCopyLink}
          className="w-full bg-bg-surface border border-border-subtle rounded-2xl py-3.5 text-text-secondary text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold text-base uppercase disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.97] transition-all"
          >
            {canStart ? 'Start Game' : `Need ${2 - playerCount} more player${2 - playerCount > 1 ? 's' : ''}`}
          </button>
        ) : (
          <div className="text-center text-text-secondary/60 text-sm py-3 font-accent tracking-wide">
            Waiting for host to start...
          </div>
        )}
      </div>
    </div>
  )
}
