import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLobbyStore } from '../stores/lobby'
import { useSessionStore } from '../stores/session'
import { createTable, joinTable } from '../api/http'

export default function LobbyPage() {
  const { tables, isLoading, loadTables } = useLobbyStore()
  const { nickname } = useSessionStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [tableName, setTableName] = useState('')
  const [gameMode, setGameMode] = useState<'deck' | 'dice'>('deck')

  useEffect(() => {
    loadTables()
    const interval = setInterval(loadTables, 3000)
    return () => clearInterval(interval)
  }, [loadTables])

  const handleCreate = async () => {
    if (!tableName.trim()) return
    const data = await createTable(tableName.trim(), gameMode)
    if (data.table) {
      navigate(`/table/${data.table.table_id}`)
    }
  }

  const handleJoin = async (tableId: string) => {
    const data = await joinTable(tableId)
    if (data.table) {
      navigate(`/table/${data.table.table_id}`)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <h1 className="text-xl font-accent text-accent-gold">LIAR'S BAR</h1>
        <span className="text-text-secondary text-sm bg-bg-surface px-3 py-1 rounded-full">{nickname}</span>
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <h2 className="text-text-secondary text-xs uppercase tracking-widest mb-2">Open Tables</h2>

        {isLoading && tables.length === 0 && (
          <div className="text-center text-text-secondary py-12">Loading...</div>
        )}

        {!isLoading && tables.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">No tables yet</p>
            <p className="text-text-secondary/60 text-sm">Be the first to host!</p>
          </div>
        )}

        {tables.map((table) => (
          <div
            key={table.table_id}
            className="bg-bg-surface border border-border-subtle rounded-xl p-4 transition-all duration-200 hover:border-accent-gold/30"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-text-primary">{table.name}</h3>
                <span className="text-xs text-accent-gold uppercase tracking-wider">
                  {table.game_mode === 'deck' ? 'Liar\'s Deck' : 'Liar\'s Dice'}
                </span>
              </div>
              <span className="text-xs text-text-secondary bg-bg-elevated px-2 py-1 rounded-full">
                {table.player_count}/{table.max_players}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-3">
              {table.player_nicknames.map((name, i) => (
                <span key={i} className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">
                  {name}
                </span>
              ))}
            </div>
            {table.status === 'waiting' && table.player_count < table.max_players && (
              <button
                onClick={() => handleJoin(table.table_id)}
                className="w-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold rounded-lg py-2 text-sm font-medium hover:bg-accent-gold/20 transition-all active:scale-[0.98]"
              >
                Join Table
              </button>
            )}
            {table.status === 'in_game' && (
              <div className="text-center text-text-secondary/60 text-xs py-2">Game in progress</div>
            )}
          </div>
        ))}
      </div>

      {/* Create table button */}
      <div className="px-4 py-4 border-t border-border-subtle">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3 text-bg-primary font-bold tracking-wide uppercase active:scale-[0.98] transition-all"
        >
          + Create Table
        </button>
      </div>

      {/* Create table modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-sm bg-bg-surface border border-border-subtle rounded-t-2xl sm:rounded-2xl p-6 space-y-4" style={{ animation: 'slide-up 0.2s ease-out' }}>
            <h2 className="text-lg font-accent text-accent-gold text-center">Create Table</h2>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Table name"
              maxLength={24}
              className="w-full bg-bg-primary border border-border-subtle rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-gold transition-all"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setGameMode('deck')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  gameMode === 'deck'
                    ? 'bg-accent-gold/20 border border-accent-gold text-accent-gold'
                    : 'bg-bg-primary border border-border-subtle text-text-secondary'
                }`}
              >
                Liar's Deck
              </button>
              <button
                onClick={() => setGameMode('dice')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  gameMode === 'dice'
                    ? 'bg-accent-gold/20 border border-accent-gold text-accent-gold'
                    : 'bg-bg-primary border border-border-subtle text-text-secondary'
                }`}
              >
                Liar's Dice
              </button>
            </div>
            <button
              onClick={handleCreate}
              disabled={!tableName.trim()}
              className="w-full bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
