import { useEffect } from 'react'
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

  useWebSocket(tableId!)

  // Navigate to game when game starts
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
  }

  if (!table) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-text-secondary">Connecting...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
        <button onClick={() => navigate('/lobby')} className="text-text-secondary hover:text-text-primary">
          &larr;
        </button>
        <h1 className="font-semibold text-text-primary flex-1">{table.name}</h1>
        <span className="text-xs text-accent-gold uppercase tracking-wider">
          {table.game_mode === 'deck' ? 'Deck' : 'Dice'}
        </span>
      </div>

      {/* Player grid */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <p className="text-text-secondary text-sm mb-6">
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
                    ? 'bg-bg-surface border-accent-gold/30'
                    : 'bg-bg-primary border-border-subtle border-dashed'
                }`}
                style={player ? { animation: 'fade-in 0.3s ease-out' } : undefined}
              >
                {player ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center text-accent-gold font-bold text-lg">
                      {player.nickname[0].toUpperCase()}
                    </div>
                    <span className="text-text-primary text-sm font-medium">{player.nickname}</span>
                    {player.session_id === table.host_session_id && (
                      <span className="text-xs text-accent-gold">Host</span>
                    )}
                  </>
                ) : (
                  <span className="text-text-secondary/40 text-xs">Empty</span>
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
          className="w-full bg-bg-surface border border-border-subtle rounded-xl py-2.5 text-text-secondary text-sm hover:text-text-primary transition-all active:scale-[0.98]"
        >
          Copy invite link
        </button>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            Start Game
          </button>
        ) : (
          <div className="text-center text-text-secondary text-sm py-3">
            Waiting for host to start...
          </div>
        )}
      </div>
    </div>
  )
}
