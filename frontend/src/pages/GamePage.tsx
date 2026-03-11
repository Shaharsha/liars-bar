import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useGameStore } from '../stores/game'
import { useSessionStore } from '../stores/session'
import { wsClient } from '../api/ws'
import type { DeckGameState, DiceGameState, Player } from '../types/models'

const AVATAR_COLORS = ['#D4A853', '#E07B6C', '#6CB4E0', '#8BD4A0']

// ============ SVG Revolver ============

function RevolverSVG({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Barrel */}
      <rect x="55" y="22" width="62" height="8" rx="2" fill="#3a3a4a" stroke="#4a4a5a" strokeWidth="1" />
      <rect x="55" y="24" width="62" height="4" rx="1" fill="#2a2a3a" />
      {/* Front sight */}
      <rect x="114" y="19" width="4" height="5" rx="1" fill="#4a4a5a" />
      {/* Frame */}
      <path d="M20 18 L55 18 L55 38 L50 38 L45 55 L30 55 L28 42 L20 38 Z" fill="#3a3a4a" stroke="#4a4a5a" strokeWidth="1" />
      {/* Grip */}
      <path d="M30 38 L45 38 L43 55 L32 55 Z" fill="#5a3a20" stroke="#6a4a30" strokeWidth="1" />
      <line x1="33" y1="42" x2="42" y2="42" stroke="#4a2a15" strokeWidth="0.5" />
      <line x1="33" y1="46" x2="41" y2="46" stroke="#4a2a15" strokeWidth="0.5" />
      <line x1="34" y1="50" x2="40" y2="50" stroke="#4a2a15" strokeWidth="0.5" />
      {/* Trigger guard */}
      <path d="M38 38 Q38 48, 46 48 L50 38" fill="none" stroke="#4a4a5a" strokeWidth="1.5" />
      {/* Trigger */}
      <line x1="42" y1="38" x2="42" y2="44" stroke="#5a5a6a" strokeWidth="1.5" />
      {/* Hammer */}
      <path d="M20 18 L15 12 L20 10 L25 16" fill="#3a3a4a" stroke="#4a4a5a" strokeWidth="1" />
    </svg>
  )
}

function CylinderSVG({ chambers, shotsFired, survived, spinning }: { chambers: number; shotsFired: number; survived: boolean; spinning: boolean }) {
  const radius = 28
  const chamberR = 7
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      {/* Outer cylinder ring */}
      <circle cx="40" cy="40" r="32" fill="none" stroke="#4a4a5a" strokeWidth="2" />
      <circle cx="40" cy="40" r="30" fill="#1a1a2a" />
      {/* Inner ring detail */}
      <circle cx="40" cy="40" r="12" fill="none" stroke="#3a3a4a" strokeWidth="1" />
      <circle cx="40" cy="40" r="5" fill="#2a2a3a" stroke="#3a3a4a" strokeWidth="1" />
      {/* Chambers */}
      <g style={spinning ? { animation: 'cylinder-spin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards', transformOrigin: '40px 40px' } : undefined}>
        {Array.from({ length: chambers }).map((_, i) => {
          const angle = (i * 360) / chambers - 90
          const cx = 40 + radius * Math.cos((angle * Math.PI) / 180)
          const cy = 40 + radius * Math.sin((angle * Math.PI) / 180)
          const isFatal = i === shotsFired - 1 && !survived
          const isFired = i < shotsFired
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={chamberR}
                fill={isFatal ? '#E53E3E' : isFired ? 'rgba(212,168,83,0.7)' : '#0a0a14'}
                stroke={isFatal ? '#ff4444' : isFired ? '#D4A853' : '#3a3a4a'}
                strokeWidth="1.5"
              />
              {isFatal && (
                <circle cx={cx} cy={cy} r={chamberR + 2} fill="none" stroke="#E53E3E" strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" from={`${chamberR}`} to={`${chamberR + 6}`} dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Bullet dot in unfired chambers */}
              {!isFired && (
                <circle cx={cx} cy={cy} r="2" fill="#3a3a4a" />
              )}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

// ============ Inline Revolver for Player Avatars ============

function PlayerRevolver({ chambers, shotsFired }: { chambers: number; shotsFired: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      {/* Mini gun icon */}
      <svg width="14" height="10" viewBox="0 0 14 10" className="mr-0.5 opacity-40">
        <rect x="6" y="3" width="8" height="2.5" rx="0.5" fill="#8B8B9E" />
        <rect x="0" y="1" width="7" height="6" rx="1" fill="#8B8B9E" />
        <rect x="2" y="6" width="3" height="3" rx="0.5" fill="#6a5a40" />
      </svg>
      {Array.from({ length: chambers }).map((_, i) => (
        <div
          key={i}
          className={`w-[6px] h-[6px] rounded-full border transition-all ${
            i < shotsFired
              ? 'bg-accent-gold/80 border-accent-gold'
              : 'bg-transparent border-text-secondary/20'
          }`}
        />
      ))}
    </div>
  )
}

// ============ Main Game Page ============

export default function GamePage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const gameState = useGameStore((s) => s.gameState)
  const rouletteResult = useGameStore((s) => s.rouletteResult)
  const revealedCards = useGameStore((s) => s.revealedCards)
  const revealedDice = useGameStore((s) => s.revealedDice)
  const gameOver = useGameStore((s) => s.gameOver)
  const liarCalled = useGameStore((s) => s.liarCalled)
  const clearOverlays = useGameStore((s) => s.clearOverlays)

  useWebSocket(tableId!)

  // Auto-clear liar called flash after 1.2s
  useEffect(() => {
    if (liarCalled) {
      const t = setTimeout(() => useGameStore.getState().setLiarCalled(null), 1200)
      return () => clearTimeout(t)
    }
  }, [liarCalled])

  useEffect(() => {
    if (rouletteResult) {
      const t = setTimeout(clearOverlays, 4500)
      return () => clearTimeout(t)
    }
  }, [rouletteResult, clearOverlays])

  useEffect(() => {
    if (revealedCards) {
      const t = setTimeout(clearOverlays, 3500)
      return () => clearTimeout(t)
    }
  }, [revealedCards, clearOverlays])

  useEffect(() => {
    if (revealedDice) {
      const t = setTimeout(clearOverlays, 3500)
      return () => clearTimeout(t)
    }
  }, [revealedDice, clearOverlays])

  if (!gameState) {
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
          <span className="text-text-secondary font-accent tracking-widest text-sm">Loading game...</span>
        </div>
      </div>
    )
  }

  const isMyTurn = gameState.current_turn === sessionId
  const opponents = gameState.players.filter((p) => p.session_id !== sessionId)
  const me = gameState.players.find((p) => p.session_id === sessionId)

  return (
    <div className="min-h-dvh flex flex-col bg-noise">
      <div className="ambient-light" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-accent-gold font-accent text-xs tracking-wider">R{gameState.round_number}</span>
          <div className="w-px h-3 bg-border-subtle" />
          <span className="text-text-secondary/60 text-xs">
            {gameState.game_mode === 'deck' ? '\u2660 Deck' : '\u2684 Dice'}
          </span>
        </div>
        <div className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
          isMyTurn
            ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
            : 'text-text-secondary bg-bg-elevated/50'
        }`}>
          {isMyTurn ? 'Your turn' : `${gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname || '...'}'s turn`}
        </div>
        {/* My revolver status */}
        {me?.revolver && me.is_alive && (
          <PlayerRevolver chambers={me.revolver.chambers} shotsFired={me.revolver.shots_fired} />
        )}
      </div>

      {/* Opponents */}
      <div className="relative z-10 flex gap-2 px-4 py-3 overflow-x-auto">
        {opponents.map((p) => {
          const pIdx = gameState.players.findIndex(pl => pl.session_id === p.session_id)
          const color = AVATAR_COLORS[pIdx % AVATAR_COLORS.length]
          const isActive = p.session_id === gameState.current_turn
          return (
            <div
              key={p.session_id}
              className={`flex flex-col items-center gap-1 min-w-[70px] p-3 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-bg-surface/80 border border-accent-gold/20' : 'bg-bg-surface/30'
              } ${!p.is_alive ? 'opacity-25 grayscale' : ''}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                style={p.is_alive ? {
                  background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                  borderColor: `${color}35`,
                  color: color,
                } : {
                  background: 'rgba(28,28,43,0.5)',
                  borderColor: 'rgba(42,42,58,0.5)',
                  color: '#8B8B9E',
                }}
              >
                {p.is_alive ? p.nickname[0].toUpperCase() : '\u2620'}
              </div>
              <span className="text-[10px] text-text-secondary truncate max-w-[60px]">{p.nickname}</span>
              {/* Inline revolver with gun icon */}
              {p.revolver && p.is_alive && (
                <PlayerRevolver chambers={p.revolver.chambers} shotsFired={p.revolver.shots_fired} />
              )}
            </div>
          )
        })}
      </div>

      {gameState.game_mode === 'deck' && (
        <DeckBoard gameState={gameState as DeckGameState} isMyTurn={isMyTurn} />
      )}

      {gameState.game_mode === 'dice' && (
        <DiceBoard gameState={gameState as DiceGameState} isMyTurn={isMyTurn} />
      )}

      {/* Overlays — layered with proper z-ordering */}
      {liarCalled && <LiarCallOverlay />}
      {revealedCards && <RevealOverlay cards={revealedCards.cards} wasLying={revealedCards.was_lying} />}
      {revealedDice && <DiceRevealOverlay data={revealedDice} />}
      {rouletteResult && <RouletteOverlay result={rouletteResult} players={gameState.players} gameMode={gameState.game_mode} />}
      {gameOver && <GameOverOverlay data={gameOver} onBack={() => navigate('/lobby')} />}
    </div>
  )
}

// ============ Deck Board ============

function DeckBoard({ gameState, isMyTurn }: { gameState: DeckGameState; isMyTurn: boolean }) {
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [pending, setPending] = useState(false)
  const canCallLiar = isMyTurn && gameState.last_play !== null

  useEffect(() => { setPending(false) }, [gameState])

  const toggleCard = (index: number) => {
    setSelectedCards((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      if (prev.length >= 3) return prev
      return [...prev, index]
    })
  }

  const handlePlay = () => {
    if (selectedCards.length === 0 || pending) return
    setPending(true)
    wsClient.send('play_cards', { cards: selectedCards })
    setSelectedCards([])
  }

  const handleCallLiar = () => {
    if (pending) return
    setPending(true)
    wsClient.send('call_liar')
  }

  const cardLabel = (card: string) => {
    switch (card) {
      case 'ace': return 'A'
      case 'king': return 'K'
      case 'queen': return 'Q'
      case 'joker': return '\u2605'
      default: return card[0].toUpperCase()
    }
  }

  const cardSuit = (card: string) => {
    switch (card) {
      case 'ace': return '\u2660'
      case 'king': return '\u2666'
      case 'queen': return '\u2665'
      case 'joker': return 'WILD'
      default: return ''
    }
  }

  const isMatch = (card: string) => card === gameState.table_card || card === 'joker'

  const handSize = gameState.your_hand.length
  const maxAngle = handSize <= 3 ? 8 : 12
  const getCardRotation = (i: number) => {
    if (handSize === 1) return 0
    return -maxAngle + (i / (handSize - 1)) * (maxAngle * 2)
  }
  const getCardTranslateY = (i: number) => {
    const center = (handSize - 1) / 2
    const dist = Math.abs(i - center)
    return dist * 3
  }

  return (
    <>
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-4 table-felt">
        <div className="text-center space-y-2">
          <span className="text-text-secondary/50 text-[10px] uppercase tracking-[0.3em]">Table Card</span>
          <div className="mx-auto w-16 h-24 rounded-xl card-front flex flex-col items-center justify-center gap-1" style={{ borderColor: 'rgba(212,168,83,0.25)' }}>
            <span className="text-2xl font-bold text-accent-gold">{gameState.table_card === 'joker' ? '\u2605' : gameState.table_card[0].toUpperCase()}</span>
            <span className="text-[9px] text-accent-gold/50 uppercase tracking-wider font-accent">{gameState.table_card}</span>
          </div>
        </div>

        {gameState.last_play && (
          <div className="bg-bg-surface/60 border border-border-subtle rounded-xl px-4 py-2.5 text-text-secondary text-sm" style={{ animation: 'fade-in 0.3s' }}>
            <span className="text-text-primary font-medium">
              {gameState.players.find(p => p.session_id === gameState.last_play?.player_id)?.nickname}
            </span>
            {' '}played {gameState.last_play.count} card{gameState.last_play.count > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="relative z-10 px-4 pb-2 pt-4">
        <div className="flex justify-center" style={{ perspective: '800px' }}>
          {gameState.your_hand.map((card, i) => {
            const selected = selectedCards.includes(i)
            const rotation = getCardRotation(i)
            const yOffset = getCardTranslateY(i)
            return (
              <button
                key={i}
                onClick={() => isMyTurn && toggleCard(i)}
                className={`relative rounded-xl flex flex-col items-center justify-center transition-all duration-200 ${
                  selected ? 'card-selected' : 'card-front'
                } ${!isMyTurn ? 'opacity-50' : ''}`}
                style={{
                  width: 68,
                  height: 96,
                  marginLeft: i > 0 ? -8 : 0,
                  transform: `rotate(${rotation}deg) translateY(${selected ? yOffset - 16 : yOffset}px)`,
                  zIndex: selected ? 10 : i,
                  touchAction: 'manipulation',
                }}
              >
                <span className={`absolute top-1.5 left-2 text-[10px] font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardLabel(card)}
                </span>
                <span className={`text-2xl font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardSuit(card) === 'WILD' ? '\u2605' : cardSuit(card)}
                </span>
                <span className={`text-xs font-bold mt-0.5 ${isMatch(card) ? 'text-accent-gold/80' : 'text-accent-red/50'}`}>
                  {cardLabel(card)}
                </span>
                <span className={`absolute bottom-1.5 right-2 text-[10px] font-bold rotate-180 ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardLabel(card)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative z-10 flex gap-3 px-5 py-4 border-t border-border-subtle bg-bg-surface/40 backdrop-blur-sm" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={handlePlay}
          disabled={!isMyTurn || selectedCards.length === 0 || pending}
          className="flex-1 bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold uppercase disabled:opacity-20 active:scale-[0.97] transition-all text-base"
        >
          Play {selectedCards.length || ''} Card{selectedCards.length !== 1 ? 's' : ''}
        </button>
        {canCallLiar && (
          <button
            onClick={handleCallLiar}
            disabled={pending}
            className="flex-1 bg-accent-red/10 border-2 border-accent-red/60 text-accent-red rounded-2xl py-4 font-accent font-bold text-xl uppercase active:scale-[0.97] transition-all disabled:opacity-20"
            style={{ animation: 'pulse-glow-red 2s infinite' }}
          >
            LIAR!
          </button>
        )}
      </div>
    </>
  )
}

// ============ CSS Dice Component ============

function DiceFace({ value, className = '' }: { value: number; className?: string }) {
  const pips = Array.from({ length: value }, (_, i) => (
    <div key={i} className="die-pip" />
  ))
  return <div className={`die die-${value} ${className}`}>{pips}</div>
}

function DiceFaceSm({ value, className = '' }: { value: number; className?: string }) {
  const pips = Array.from({ length: value }, (_, i) => (
    <div key={i} className="die-pip" />
  ))
  return <div className={`die-sm die-${value} ${className}`}>{pips}</div>
}

// ============ Dice Board ============

function DiceBoard({ gameState, isMyTurn }: { gameState: DiceGameState; isMyTurn: boolean }) {
  const [bidQuantity, setBidQuantity] = useState(gameState.current_bid ? gameState.current_bid.quantity : 1)
  const [bidFace, setBidFace] = useState(gameState.current_bid ? gameState.current_bid.face_value : 2)
  const [pending, setPending] = useState(false)
  const canChallenge = isMyTurn && gameState.current_bid !== null

  useEffect(() => { setPending(false) }, [gameState])

  const isValidBid = () => {
    if (!gameState.current_bid) return bidQuantity >= 1 && bidFace >= 2 && bidFace <= 6
    return (
      bidQuantity > gameState.current_bid.quantity ||
      (bidQuantity === gameState.current_bid.quantity && bidFace > gameState.current_bid.face_value)
    )
  }

  const handleBid = () => {
    if (!isValidBid() || pending) return
    setPending(true)
    wsClient.send('place_bid', { quantity: bidQuantity, face_value: bidFace })
  }

  const handleChallenge = () => {
    if (pending) return
    setPending(true)
    wsClient.send('challenge_bid')
  }

  return (
    <>
      <div className="relative z-10 flex-1 px-4 py-3 overflow-y-auto">
        <div className="space-y-2">
          {gameState.bid_history.map((bid, i) => {
            const isLatest = i === gameState.bid_history.length - 1
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isLatest ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-bg-surface/40'
                }`}
                style={isLatest ? { animation: 'slide-up 0.2s ease-out' } : undefined}
              >
                <span className="text-text-secondary text-sm flex-1 truncate">
                  {gameState.players.find(p => p.session_id === bid.player_id)?.nickname}
                </span>
                <span className="text-text-primary font-bold text-lg tabular-nums">{bid.quantity}&times;</span>
                <DiceFaceSm value={bid.face_value} />
              </div>
            )
          })}
          {gameState.bid_history.length === 0 && (
            <div className="text-center text-text-secondary/30 py-8 text-sm font-accent tracking-wider">
              No bids yet {isMyTurn ? '— place the first bid!' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex justify-center gap-3 px-4 py-4">
        {gameState.your_dice.map((die, i) => (
          <div key={i} style={{ animation: `fade-in 0.3s ease-out ${i * 0.08}s both` }}>
            <DiceFace value={die} />
          </div>
        ))}
      </div>

      {isMyTurn && (
        <div className="relative z-10 px-5 py-5 border-t border-border-subtle bg-bg-surface/40 backdrop-blur-sm space-y-4" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBidQuantity(Math.max(1, bidQuantity - 1))}
              className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-subtle text-text-primary flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
            >
              &minus;
            </button>
            <span className="text-3xl font-bold text-accent-gold w-10 text-center tabular-nums">{bidQuantity}</span>
            <button
              onClick={() => setBidQuantity(bidQuantity + 1)}
              className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-subtle text-text-primary flex items-center justify-center text-xl font-bold active:scale-90 transition-all"
            >
              +
            </button>
            <span className="text-text-secondary/50 text-xl">&times;</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((face) => (
                <button
                  key={face}
                  onClick={() => setBidFace(face)}
                  className={`rounded-xl p-1 transition-all ${
                    bidFace === face
                      ? 'ring-2 ring-accent-gold ring-offset-2 ring-offset-bg-primary scale-110'
                      : 'opacity-60 active:opacity-100'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  <DiceFaceSm value={face} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBid}
              disabled={!isValidBid() || pending}
              className="flex-1 bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold uppercase disabled:opacity-20 active:scale-[0.97] transition-all text-base"
            >
              Bid {bidQuantity}&times;{bidFace}
            </button>
            {canChallenge && (
              <button
                onClick={handleChallenge}
                disabled={pending}
                className="flex-1 bg-accent-red/10 border-2 border-accent-red/60 text-accent-red rounded-2xl py-4 font-bold text-lg uppercase active:scale-[0.97] transition-all disabled:opacity-20"
                style={{ animation: 'pulse-glow-red 2s infinite' }}
              >
                Challenge!
              </button>
            )}
          </div>
        </div>
      )}
      {!isMyTurn && (
        <div className="relative z-10 px-5 py-5 border-t border-border-subtle text-center text-text-secondary text-sm" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          Waiting for <span className="text-text-primary font-medium">{gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname || '...'}</span>...
        </div>
      )}
    </>
  )
}

// ============ LIAR! Call Overlay ============

function LiarCallOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: 'liar-bg-flash 1.2s ease-out forwards' }}
    >
      <h1
        className="text-7xl font-accent font-bold text-accent-red text-glow-red select-none"
        style={{ animation: 'liar-slam 0.6s ease-out forwards' }}
      >
        LIAR!
      </h1>
    </div>
  )
}

// ============ Card Reveal Overlay ============

function RevealOverlay({ cards, wasLying }: { cards: string[]; wasLying: boolean }) {
  const cardLabel = (c: string) => {
    switch (c) {
      case 'ace': return 'A'
      case 'king': return 'K'
      case 'queen': return 'Q'
      case 'joker': return '\u2605'
      default: return c[0].toUpperCase()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fade-in 0.3s' }}
    >
      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-xs mx-4" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2
          className={`text-4xl font-accent font-bold ${wasLying ? 'text-accent-red text-glow-red' : 'text-accent-green'}`}
          style={{ animation: 'slam-in 0.4s ease-out' }}
        >
          {wasLying ? 'CAUGHT!' : 'TRUTH!'}
        </h2>
        {/* Cards flip in one by one */}
        <div className="flex gap-3 justify-center" style={{ perspective: '600px' }}>
          {cards.map((card, i) => (
            <div
              key={i}
              className="card-front w-16 h-24 rounded-xl flex flex-col items-center justify-center gap-1"
              style={{ animation: `card-flip-in 0.5s ease-out ${0.3 + i * 0.2}s both` }}
            >
              <span className="text-2xl font-bold text-text-primary">{cardLabel(card)}</span>
              <span className="text-[9px] text-text-secondary uppercase">{card}</span>
            </div>
          ))}
        </div>
        <p className="text-text-secondary/50 text-xs">
          {wasLying ? 'The cards were fake!' : 'All cards were legitimate.'}
        </p>
      </div>
    </div>
  )
}

// ============ Dice Reveal Overlay ============

function DiceRevealOverlay({ data }: { data: any }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ animation: 'fade-in 0.2s' }}>
      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-sm w-full mx-4" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2 className={`text-3xl font-accent font-bold ${data.bid_was_correct ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}>
          {data.bid_was_correct ? 'Bid Was Right!' : 'Bid Was Wrong!'}
        </h2>
        <p className="text-text-secondary text-sm">
          Actual count: <span className="text-accent-gold font-bold text-2xl">{data.actual_count}</span>
        </p>
        <div className="space-y-3">
          {Object.entries(data.all_dice).map(([pid, dice]: [string, any]) => (
            <div key={pid} className="flex gap-2 justify-center">
              {dice.map((d: number, i: number) => (
                <DiceFace key={i} value={d} className="!w-10 !h-10 !p-1.5 !rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ Roulette Overlay (Revolver) ============

function RouletteOverlay({ result, players, gameMode }: { result: any; players: Player[]; gameMode: string }) {
  const player = players.find(p => p.session_id === result.player_id)
  const survived = result.survived
  const [phase, setPhase] = useState<'spin' | 'result'>('spin')

  useEffect(() => {
    const t = setTimeout(() => setPhase('result'), 2200)
    return () => clearTimeout(t)
  }, [])

  const isDice = gameMode === 'dice'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md ${
        phase === 'result' && !survived ? 'bg-black/90' : 'bg-black/85'
      }`}
      style={phase === 'result' && !survived ? { animation: 'heavy-shake 0.6s' } : { animation: 'fade-in 0.3s' }}
    >
      {/* Blood splatter on death */}
      {phase === 'result' && !survived && <div className="lens-crack" />}

      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-4 max-w-xs mx-4 relative" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2 className="text-sm text-text-secondary/60 font-accent tracking-[0.3em] uppercase">
          {isDice ? 'Drink the Poison' : 'Russian Roulette'}
        </h2>

        <p className="text-text-primary font-bold text-lg">{player?.nickname || '...'}</p>

        {/* Revolver / Poison visual */}
        {isDice ? (
          /* Poison vial for dice mode */
          <div className="flex justify-center py-2">
            <div className="relative">
              <svg width="50" height="80" viewBox="0 0 50 80">
                <rect x="18" y="5" width="14" height="8" rx="2" fill="#4a4a5a" stroke="#5a5a6a" strokeWidth="1" />
                <path d="M15 13 L35 13 L38 25 Q40 40, 38 60 Q36 75, 25 75 Q14 75, 12 60 Q10 40, 12 25 Z" fill="none" stroke="#4a4a5a" strokeWidth="1.5" />
                <path d="M15 13 L35 13 L38 25 Q40 40, 38 60 Q36 75, 25 75 Q14 75, 12 60 Q10 40, 12 25 Z"
                  fill={survived ? 'rgba(56, 161, 105, 0.3)' : 'rgba(229, 62, 62, 0.4)'}
                />
                {/* Liquid level */}
                <path d={`M14 ${survived ? 45 : 30} Q25 ${survived ? 48 : 33}, 36 ${survived ? 45 : 30} Q38 60, 36 70 Q34 75, 25 75 Q16 75, 14 70 Q12 60, 14 ${survived ? 45 : 30} Z`}
                  fill={survived ? 'rgba(56, 161, 105, 0.5)' : 'rgba(180, 30, 30, 0.6)'}
                />
                {/* Skull on vial */}
                <text x="25" y="55" textAnchor="middle" fontSize="14" fill="rgba(255,255,255,0.3)">&#9760;</text>
              </svg>
              {phase === 'result' && !survived && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent-red/50"
                  style={{ animation: 'muzzle-flash 0.5s ease-out forwards' }}
                />
              )}
            </div>
          </div>
        ) : (
          /* Revolver cylinder for deck mode */
          <div className="flex flex-col items-center gap-3">
            <CylinderSVG
              chambers={result.chambers}
              shotsFired={result.shots_fired}
              survived={survived}
              spinning={phase === 'spin'}
            />
            <RevolverSVG className="w-32 h-16 opacity-60" />
          </div>
        )}

        {/* Result text */}
        {phase === 'result' && (
          <>
            <p
              className={`text-5xl font-accent font-bold ${survived ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}
              style={{ animation: 'slam-in 0.4s ease-out' }}
            >
              {isDice
                ? (survived ? 'SAFE' : 'DEAD')
                : (survived ? '*CLICK*' : 'BANG!')
              }
            </p>

            {/* Smoke wisps on survive */}
            {survived && !isDice && (
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-text-secondary/20"
                    style={{ animation: `smoke-drift 1.5s ease-out ${i * 0.2}s forwards` }}
                  />
                ))}
              </div>
            )}

            {survived && (
              <p className="text-text-secondary/40 text-xs">
                {isDice
                  ? `Vial ${result.shots_fired} of ${result.chambers}`
                  : `Chamber ${result.shots_fired} of ${result.chambers}`
                }
              </p>
            )}

            {/* Muzzle flash on death (deck mode) */}
            {!survived && !isDice && (
              <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-accent-amber/60"
                style={{ animation: 'muzzle-flash 0.4s ease-out forwards' }}
              />
            )}
          </>
        )}

        {phase === 'spin' && (
          <p className="text-text-secondary/40 text-sm font-accent tracking-wider" style={{ animation: 'fade-in 0.5s' }}>
            {isDice ? 'Drinking...' : 'Spinning cylinder...'}
          </p>
        )}
      </div>
    </div>
  )
}

// ============ Game Over ============

function GameOverOverlay({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md" style={{ animation: 'fade-in 0.5s' }}>
      <div className="bg-bg-surface border border-border-gold rounded-3xl p-10 text-center space-y-6 max-w-xs mx-4" style={{ animation: 'slide-up-bounce 0.5s ease-out' }}>
        <div className="text-5xl" style={{ animation: 'float 3s ease-in-out infinite' }}>
          {'\uD83D\uDC51'}
        </div>
        <div className="space-y-1">
          <h2 className="text-3xl font-accent text-accent-gold text-glow-gold">WINNER</h2>
          <p className="text-text-primary text-xl font-bold">{data.winner_nickname}</p>
        </div>
        <div className="ornament max-w-[120px] mx-auto">
          <span className="text-accent-gold/30 text-[8px]">&#9830;</span>
        </div>
        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-accent-gold to-accent-amber rounded-2xl py-4 text-bg-primary font-bold uppercase active:scale-[0.97] transition-all text-base"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
