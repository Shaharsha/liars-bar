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
  const [showInfo, setShowInfo] = useState<'deck' | 'dice' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTables()
    const interval = setInterval(loadTables, 3000)
    return () => clearInterval(interval)
  }, [loadTables])

  const handleCreate = async () => {
    if (!tableName.trim()) return
    setError(null)
    try {
      const data = await createTable(tableName.trim(), gameMode)
      if (data.table) {
        navigate(`/table/${data.table.table_id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create table')
    }
  }

  const handleJoin = async (tableId: string) => {
    setError(null)
    try {
      const data = await joinTable(tableId)
      if (data.table) {
        navigate(`/table/${data.table.table_id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join table')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-noise">
      <div className="ambient-light" />

      {/* Header */}
      <div className="relative z-10 px-5 py-4 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-accent text-accent-gold tracking-wider">LIAR'S BAR</h1>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-gold/30 to-accent-gold/10 flex items-center justify-center text-[11px] font-bold text-accent-gold border border-accent-gold/20">
              {nickname?.[0]?.toUpperCase()}
            </div>
            <span className="text-text-secondary text-sm">{nickname}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="relative z-10 px-5 pt-3">
          <p className="text-accent-red text-sm text-center bg-accent-red/5 border border-accent-red/20 rounded-xl py-2 px-3">{error}</p>
        </div>
      )}

      {/* Table list */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <h2 className="text-text-secondary/60 text-[10px] uppercase tracking-[0.25em] mb-3 font-accent">Open Tables</h2>

        {isLoading && tables.length === 0 && (
          <div className="text-center text-text-secondary py-16">
            <div className="flex justify-center gap-1.5 mb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent-gold/50"
                  style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
            <span className="text-sm">Loading tables...</span>
          </div>
        )}

        {!isLoading && tables.length === 0 && (
          <div className="text-center py-16 space-y-4">
            {/* Empty state — fanned cards */}
            <div className="flex justify-center items-end gap-0 mb-6">
              <div className="w-10 h-14 rounded-lg card-back -rotate-[20deg] -mr-3 opacity-20" />
              <div className="w-10 h-14 rounded-lg card-back -rotate-[8deg] -mr-3 opacity-25" />
              <div className="w-10 h-14 rounded-lg card-front flex items-center justify-center text-accent-gold/40 text-sm font-bold opacity-30">?</div>
              <div className="w-10 h-14 rounded-lg card-back rotate-[8deg] -ml-3 opacity-25" />
              <div className="w-10 h-14 rounded-lg card-back rotate-[20deg] -ml-3 opacity-20" />
            </div>
            <div>
              <p className="text-text-secondary font-accent tracking-wide">No tables yet</p>
              <p className="text-text-secondary/40 text-sm mt-1">Create one and invite your friends</p>
            </div>
          </div>
        )}

        {tables.map((table) => (
          <div
            key={table.table_id}
            className="bg-bg-surface/80 border border-border-subtle rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]"
            style={{ animation: 'fade-in 0.3s ease-out' }}
          >
            <div className="flex items-start gap-3 mb-3">
              {/* Game mode icon */}
              <div className="w-10 h-10 rounded-xl bg-accent-gold/8 border border-accent-gold/10 flex items-center justify-center text-lg shrink-0">
                {table.game_mode === 'deck' ? '\u2660' : '\u2684'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary truncate">{table.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-accent-gold/70 uppercase tracking-[0.15em] font-accent">
                    {table.game_mode === 'deck' ? "Liar's Deck" : "Liar's Dice"}
                  </span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    table.status === 'waiting'
                      ? 'text-accent-green/80 bg-accent-green/8'
                      : 'text-text-secondary/50 bg-bg-elevated/50'
                  }`}>
                    {table.status === 'waiting' ? 'Open' : 'Playing'}
                  </span>
                </div>
              </div>
              {/* Player count ring */}
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(212,168,83,0.08)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none" stroke="#D4A853" strokeWidth="2.5"
                    strokeDasharray={`${(table.player_count / table.max_players) * 88} 88`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-accent-gold">
                  {table.player_count}
                </span>
              </div>
            </div>

            {/* Player pills */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {table.player_nicknames.map((name, i) => (
                <span key={i} className="text-[11px] bg-bg-elevated/60 text-text-secondary px-2 py-0.5 rounded-full border border-border-subtle/50">
                  {name}
                </span>
              ))}
              {Array.from({ length: table.max_players - table.player_count }).map((_, i) => (
                <span key={`empty-${i}`} className="text-[11px] text-text-secondary/20 px-2 py-0.5 rounded-full border border-dashed border-border-subtle/30">
                  &bull;&bull;&bull;
                </span>
              ))}
            </div>

            {table.status === 'waiting' && table.player_count < table.max_players && (
              <button
                onClick={() => handleJoin(table.table_id)}
                className="w-full bg-accent-gold/8 border border-accent-gold/25 text-accent-gold rounded-xl py-3 text-sm font-semibold tracking-wide uppercase active:scale-[0.97] transition-all"
              >
                Join Table
              </button>
            )}
            {table.status === 'waiting' && table.player_count >= table.max_players && (
              <div className="text-center text-accent-gold/40 text-xs py-2 font-accent tracking-wider">Table full</div>
            )}
            {table.status === 'in_game' && (
              <div className="text-center text-text-secondary/40 text-xs py-2 font-accent tracking-wider">Game in progress</div>
            )}
          </div>
        ))}
      </div>

      {/* Create table button */}
      <div className="relative z-10 px-5 py-4 border-t border-border-subtle bg-bg-surface/30 backdrop-blur-sm" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold tracking-wide uppercase active:scale-[0.97] transition-all text-base"
        >
          + Create Table
        </button>
      </div>

      {/* Create table modal — bottom sheet style for mobile */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowCreate(false); setShowInfo(null) }} />
          <div
            className="relative z-10 w-full max-w-md bg-bg-surface border-t border-border-subtle rounded-t-3xl p-6 space-y-5"
            style={{ animation: 'slide-up 0.25s ease-out', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-border-subtle mx-auto -mt-1 mb-2" />

            <div className="text-center">
              <h2 className="text-lg font-accent text-accent-gold">Create Table</h2>
              <div className="ornament max-w-[100px] mx-auto mt-1">
                <span className="text-accent-gold/20 text-[6px]">&#9830;</span>
              </div>
            </div>

            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Table name"
              maxLength={24}
              className="w-full bg-bg-primary/80 border border-border-subtle rounded-2xl px-4 py-4 text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-accent-gold/50 transition-all text-base"
              autoFocus
            />

            <div className="space-y-3">
              <p className="text-text-secondary text-[10px] uppercase tracking-[0.2em] font-medium">Game Mode</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGameMode('deck')}
                  className={`flex-1 py-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center gap-1.5 ${
                    gameMode === 'deck'
                      ? 'bg-accent-gold/15 border-2 border-accent-gold text-accent-gold'
                      : 'bg-bg-primary/60 border-2 border-border-subtle text-text-secondary'
                  }`}
                >
                  <span className="text-2xl">{'\u2660'}</span>
                  <span>Liar's Deck</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setShowInfo(showInfo === 'deck' ? null : 'deck') }}
                    className="text-[10px] opacity-50 underline underline-offset-2"
                  >How to play</span>
                </button>
                <button
                  onClick={() => setGameMode('dice')}
                  className={`flex-1 py-4 rounded-2xl text-sm font-medium transition-all flex flex-col items-center gap-1.5 ${
                    gameMode === 'dice'
                      ? 'bg-accent-gold/15 border-2 border-accent-gold text-accent-gold'
                      : 'bg-bg-primary/60 border-2 border-border-subtle text-text-secondary'
                  }`}
                >
                  <span className="text-2xl">{'\u2684'}</span>
                  <span>Liar's Dice</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); setShowInfo(showInfo === 'dice' ? null : 'dice') }}
                    className="text-[10px] opacity-50 underline underline-offset-2"
                  >How to play</span>
                </button>
              </div>
              {showInfo && (
                <div className="bg-bg-primary/60 border border-border-subtle rounded-2xl px-4 py-3 text-xs text-text-secondary/80 leading-relaxed" style={{ animation: 'fade-in 0.15s' }}>
                  {showInfo === 'deck' ? (
                    <>Play cards face-down claiming they match the table card. Bluff or play honest — if someone calls <span className="text-accent-red font-medium">LIAR!</span> and catches you, you face the revolver. Jokers are wild!</>
                  ) : (
                    <>Roll hidden dice and bid on the total count across all players. Raise the bid or challenge the last bidder. <span className="text-accent-gold font-medium">1s are wild!</span> Wrong calls mean a pull of the trigger.</>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCreate}
              disabled={!tableName.trim()}
              className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold uppercase disabled:opacity-30 active:scale-[0.97] transition-all text-base"
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
