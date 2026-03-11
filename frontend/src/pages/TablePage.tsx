import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useTableStore } from '../stores/table'
import { useSessionStore } from '../stores/session'
import { useGameStore } from '../stores/game'
import { wsClient } from '../api/ws'

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
        <div className="text-text-secondary font-accent tracking-widest text-sm" style={{ animation: 'pulse-gold 2s infinite' }}>
          Connecting...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-noise">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-surface/50">
        <button onClick={() => navigate('/lobby')} className="text-text-secondary hover:text-accent-gold transition-colors cursor-pointer">
          &larr;
        </button>
        <h1 className="font-accent text-accent-gold flex-1 tracking-wide">{table.name}</h1>
        <span className="text-xs text-accent-gold/60 uppercase tracking-wider bg-accent-gold/5 px-2 py-1 rounded-full border border-accent-gold/10">
          {table.game_mode === 'deck' ? 'Deck' : 'Dice'}
        </span>
      </div>

      {/* Player grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <p className="text-text-secondary text-sm mb-6 font-accent tracking-wide">
          {playerCount < 2 ? 'Waiting for players...' : `${playerCount} players ready`}
        </p>
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {Array.from({ length: table.max_players }).map((_, i) => {
            const player = table.players[i]
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                  player
                    ? 'bg-bg-surface border-accent-gold/20 glow-gold'
                    : 'bg-bg-primary/50 border-border-subtle border-dashed'
                }`}
                style={player ? { animation: 'fade-in 0.3s ease-out' } : undefined}
              >
                {player ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-gold/30 to-accent-gold/10 flex items-center justify-center text-accent-gold font-bold text-xl border border-accent-gold/20">
                      {player.nickname[0].toUpperCase()}
                    </div>
                    <span className="text-text-primary text-sm font-medium">{player.nickname}</span>
                    {player.session_id === table.host_session_id && (
                      <span className="text-[10px] text-accent-gold font-accent tracking-wider uppercase">Host</span>
                    )}
                  </>
                ) : (
                  <span className="text-text-secondary/30 text-xs tracking-wider">Empty</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-4 py-4 space-y-3 border-t border-border-subtle">
        <button
          onClick={handleCopyLink}
          className="w-full bg-bg-surface border border-border-subtle rounded-xl py-2.5 text-text-secondary text-sm hover:text-accent-gold hover:border-accent-gold/20 transition-all active:scale-[0.98] cursor-pointer"
        >
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] transition-all cursor-pointer hover:glow-gold-lg"
          >
            Start Game
          </button>
        ) : (
          <div className="text-center text-text-secondary text-sm py-3 font-accent tracking-wide">
            Waiting for host to start...
          </div>
        )}
      </div>
    </div>
  )
}
