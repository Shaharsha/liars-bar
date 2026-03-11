import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useGameStore } from '../stores/game'
import { useSessionStore } from '../stores/session'
import { wsClient } from '../api/ws'
import { gameAudio } from '../audio/sounds'
import type { DeckGameState, DiceGameState, Player } from '../types/models'
import AnimalAvatar from '../components/AnimalAvatar'

// ============ Integrated Revolver SVG (Cylinder visible through frame) ============

function RevolverSVG({
  chambers,
  shotsFired,
  survived,
  spinning,
  hammerFall,
  showFlash,
}: {
  chambers: number
  shotsFired: number
  survived: boolean
  spinning: boolean
  hammerFall: boolean
  showFlash: boolean
}) {
  const cylCx = 72
  const cylCy = 48
  const chamberOrbitR = 18
  const chamberR = 5.5

  return (
    <svg
      viewBox="0 0 240 120"
      className="w-full max-w-[280px]"
      style={hammerFall && !survived ? { animation: 'gun-recoil 0.4s ease-out' } : undefined}
    >
      <defs>
        <linearGradient id="barrel-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#52525e" />
          <stop offset="30%" stopColor="#3a3a4a" />
          <stop offset="70%" stopColor="#2e2e3e" />
          <stop offset="100%" stopColor="#3a3a4a" />
        </linearGradient>
        <linearGradient id="frame-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#42424e" />
          <stop offset="100%" stopColor="#2a2a3a" />
        </linearGradient>
        <linearGradient id="wood-grain" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#6a4a30" />
          <stop offset="50%" stopColor="#5a3a20" />
          <stop offset="100%" stopColor="#4a2a15" />
        </linearGradient>
      </defs>

      {/* Barrel */}
      <rect x="95" y="36" width="138" height="14" rx="2" fill="url(#barrel-metal)" />
      <rect x="95" y="40" width="138" height="6" rx="1" fill="#2a2a35" opacity="0.5" />
      {/* Top rib */}
      <rect x="95" y="34" width="138" height="3" rx="1" fill="#4a4a5a" />
      {/* Metallic highlight */}
      <rect x="95" y="35" width="138" height="1" rx="0.5" fill="rgba(255,255,255,0.06)" />
      {/* Front sight */}
      <polygon points="230,30 234,30 232,36" fill="#5a5a6a" />
      {/* Ejector rod */}
      <rect x="95" y="50" width="100" height="3" rx="1" fill="#3a3a4a" />
      <circle cx="195" cy="51.5" r="2.5" fill="#4a4a5a" />

      {/* Frame body */}
      <path
        d="M35 28 L95 28 L95 56 L88 56 L82 100 L55 100 L52 66 L35 56 Z"
        fill="url(#frame-metal)"
        stroke="#4a4a5a"
        strokeWidth="0.5"
      />

      {/* Cylinder window (oval cutout) */}
      <ellipse cx={cylCx} cy={cylCy} rx="26" ry="20" fill="#0a0a14" stroke="#4a4a5a" strokeWidth="1" />

      {/* Cylinder (rotates inside window) */}
      <g
        style={
          spinning
            ? {
                animation: 'cylinder-spin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
                transformOrigin: `${cylCx}px ${cylCy}px`,
              }
            : undefined
        }
      >
        <circle cx={cylCx} cy={cylCy} r={chamberOrbitR + 3} fill="#1a1a2a" stroke="#3a3a4a" strokeWidth="0.5" />
        {/* Center pin */}
        <circle cx={cylCx} cy={cylCy} r="3" fill="#2a2a3a" stroke="#3a3a4a" strokeWidth="0.5" />
        {/* Chambers */}
        {Array.from({ length: chambers }).map((_, i) => {
          const angle = (i * 360) / chambers - 90
          const cx = cylCx + chamberOrbitR * Math.cos((angle * Math.PI) / 180)
          const cy = cylCy + chamberOrbitR * Math.sin((angle * Math.PI) / 180)
          const isFatal = i === shotsFired - 1 && !survived
          const isFired = i < shotsFired
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={chamberR}
                fill={isFatal ? '#E53E3E' : isFired ? 'rgba(212,168,83,0.7)' : '#0a0a14'}
                stroke={isFatal ? '#ff4444' : isFired ? '#D4A853' : '#3a3a4a'}
                strokeWidth="1"
              />
              {isFatal && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={chamberR + 2}
                  fill="none"
                  stroke="#E53E3E"
                  strokeWidth="1"
                  opacity="0.5"
                >
                  <animate attributeName="r" from={`${chamberR}`} to={`${chamberR + 5}`} dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
                </circle>
              )}
              {!isFired && <circle cx={cx} cy={cy} r="1.5" fill="#3a3a4a" />}
            </g>
          )
        })}
      </g>

      {/* Hammer (animates on result) */}
      <g
        style={
          hammerFall
            ? { animation: 'hammer-fall 0.15s ease-in forwards', transformOrigin: '38px 28px' }
            : undefined
        }
      >
        <path d="M35 28 L24 16 L30 12 L40 24" fill="#3a3a4a" stroke="#5a5a6a" strokeWidth="0.5" />
        <rect
          x="22"
          y="11"
          width="10"
          height="3"
          rx="0.5"
          fill="#4a4a5a"
          transform="rotate(-15 27 12.5)"
        />
      </g>

      {/* Grip */}
      <path d="M55 56 L82 56 L78 100 L58 100 Z" fill="url(#wood-grain)" stroke="#7a5a3a" strokeWidth="0.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={57 + i * 0.3}
          y1={62 + i * 6}
          x2={78 - i * 0.5}
          y2={62 + i * 6}
          stroke="#3a2010"
          strokeWidth="0.4"
          opacity="0.5"
        />
      ))}
      {/* Grip medallion */}
      <circle cx="68" cy="78" r="3.5" fill="#5a3a20" stroke="#D4A853" strokeWidth="0.4" opacity="0.5" />
      <circle cx="68" cy="78" r="1" fill="#D4A853" opacity="0.3" />

      {/* Trigger guard */}
      <path d="M62 56 Q62 78, 76 78 L82 56" fill="none" stroke="#4a4a5a" strokeWidth="1.5" />
      {/* Trigger */}
      <path d="M70 56 L70 70 L68 72 L66 70 L66 56" fill="#5a5a6a" />

      {/* Muzzle flash on death */}
      {showFlash && (
        <circle cx="238" cy="43" r="6" fill="#F5C563" opacity="0.9">
          <animate attributeName="r" from="4" to="22" dur="0.3s" fill="freeze" />
          <animate attributeName="opacity" from="0.9" to="0" dur="0.3s" fill="freeze" />
        </circle>
      )}
    </svg>
  )
}

// ============ Inline Revolver for Player Avatars ============

function PlayerRevolver({ chambers, shotsFired }: { chambers: number; shotsFired: number }) {
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      <svg width="14" height="10" viewBox="0 0 14 10" className="mr-0.5 opacity-40">
        <rect x="6" y="3" width="8" height="2.5" rx="0.5" fill="#8B8B9E" />
        <rect x="0" y="1" width="7" height="6" rx="1" fill="#8B8B9E" />
        <rect x="2" y="6" width="3" height="3" rx="0.5" fill="#6a5a40" />
      </svg>
      {Array.from({ length: chambers }).map((_, i) => (
        <div
          key={i}
          className={`w-[6px] h-[6px] rounded-full border transition-all ${
            i < shotsFired ? 'bg-accent-gold/80 border-accent-gold' : 'bg-transparent border-text-secondary/20'
          }`}
        />
      ))}
    </div>
  )
}

// ============ Spark Particles (BANG effect) ============

function SparkParticles() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = i * 30 + Math.random() * 20 - 10
        const distance = 30 + Math.random() * 60
        return {
          x: Math.cos((angle * Math.PI) / 180) * distance,
          y: Math.sin((angle * Math.PI) / 180) * distance,
          delay: Math.random() * 0.1,
          size: 2 + Math.random() * 2,
          color: ['#F5C563', '#D4A853', '#ff6644'][i % 3],
        }
      }),
    [],
  )

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute left-1/2 top-1/2">
        {sparks.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: `0 0 6px ${s.color}`,
              left: 0,
              top: 0,
              animation: `spark-${i} 0.5s ease-out ${s.delay}s both`,
            }}
          />
        ))}
      </div>
      <style>
        {sparks
          .map(
            (s, i) => `
          @keyframes spark-${i} {
            0% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
            100% { transform: translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) scale(0); opacity: 0; }
          }`,
          )
          .join('\n')}
      </style>
    </div>
  )
}

// ============ Floating Dust Motes (atmosphere) ============

function DustMotes() {
  const motes = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        left: 10 + i * 15 + Math.random() * 10,
        size: 1.5 + Math.random() * 1.5,
        duration: 12 + Math.random() * 8,
        delay: -(Math.random() * 15),
      })),
    [],
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      {motes.map((m, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-accent-gold"
          style={{
            width: m.size,
            height: m.size,
            left: `${m.left}%`,
            bottom: '-2%',
            opacity: 0,
            animation: `dust-float ${m.duration}s linear ${m.delay}s infinite`,
          }}
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

  // Roulette: 3.5s phases + 3s result viewing = 6.5s total
  useEffect(() => {
    if (rouletteResult) {
      const t = setTimeout(clearOverlays, 6500)
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
      <DustMotes />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-accent-gold font-accent text-xs tracking-wider">R{gameState.round_number}</span>
          <div className="w-px h-3 bg-border-subtle" />
          <span className="text-text-secondary/60 text-xs">
            {gameState.game_mode === 'deck' ? '\u2660 Deck' : '\u2684 Dice'}
          </span>
        </div>
        <div
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
            isMyTurn
              ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
              : 'text-text-secondary bg-bg-elevated/50'
          }`}
        >
          {isMyTurn
            ? 'Your turn'
            : `${gameState.players.find((p) => p.session_id === gameState.current_turn)?.nickname || '...'}'s turn`}
        </div>
        {me?.revolver && me.is_alive && (
          <PlayerRevolver chambers={me.revolver.chambers} shotsFired={me.revolver.shots_fired} />
        )}
      </div>

      {/* Opponents */}
      <div className="relative z-10 flex gap-2 px-4 py-3 overflow-x-auto">
        {opponents.map((p) => {
          const isActive = p.session_id === gameState.current_turn
          return (
            <div
              key={p.session_id}
              className={`flex flex-col items-center gap-1 min-w-[70px] p-3 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-bg-surface/80 border border-accent-gold/20' : 'bg-bg-surface/30'
              } ${!p.is_alive ? 'opacity-25 grayscale' : ''}`}
            >
              <AnimalAvatar avatar={p.avatar || 'fox'} size={40} dead={!p.is_alive} />
              <span className="text-[10px] text-text-secondary truncate max-w-[60px]">{p.nickname}</span>
              {p.revolver && p.is_alive && (
                <PlayerRevolver chambers={p.revolver.chambers} shotsFired={p.revolver.shots_fired} />
              )}
            </div>
          )
        })}
      </div>

      {gameState.game_mode === 'deck' && <DeckBoard gameState={gameState as DeckGameState} isMyTurn={isMyTurn} />}

      {gameState.game_mode === 'dice' && <DiceBoard gameState={gameState as DiceGameState} isMyTurn={isMyTurn} />}

      {/* Overlays — layered with proper z-ordering */}
      {liarCalled && <LiarCallOverlay />}
      {revealedCards && <RevealOverlay cards={revealedCards.cards} wasLying={revealedCards.was_lying} />}
      {revealedDice && <DiceRevealOverlay data={revealedDice} />}
      {rouletteResult && (
        <RouletteOverlay result={rouletteResult} players={gameState.players} gameMode={gameState.game_mode} />
      )}
      {gameOver && <GameOverOverlay data={gameOver} onBack={() => navigate('/lobby')} />}
    </div>
  )
}

// ============ Deck Board ============

function DeckBoard({ gameState, isMyTurn }: { gameState: DeckGameState; isMyTurn: boolean }) {
  const [selectedCards, setSelectedCards] = useState<number[]>([])
  const [pending, setPending] = useState(false)
  const canCallLiar = isMyTurn && gameState.last_play !== null

  useEffect(() => {
    setPending(false)
  }, [gameState])

  const toggleCard = (index: number) => {
    gameAudio.init()
    gameAudio.haptic(10)
    setSelectedCards((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      if (prev.length >= 3) return prev
      return [...prev, index]
    })
  }

  const handlePlay = () => {
    if (selectedCards.length === 0 || pending) return
    gameAudio.init()
    setPending(true)
    wsClient.send('play_cards', { cards: selectedCards })
    setSelectedCards([])
  }

  const handleCallLiar = () => {
    if (pending) return
    gameAudio.init()
    setPending(true)
    wsClient.send('call_liar')
  }

  const cardLabel = (card: string) => {
    switch (card) {
      case 'ace':
        return 'A'
      case 'king':
        return 'K'
      case 'queen':
        return 'Q'
      case 'joker':
        return '\u2605'
      default:
        return card[0].toUpperCase()
    }
  }

  const cardSuit = (card: string) => {
    switch (card) {
      case 'ace':
        return '\u2660'
      case 'king':
        return '\u2666'
      case 'queen':
        return '\u2665'
      case 'joker':
        return 'WILD'
      default:
        return ''
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
          <div
            className="mx-auto w-16 h-24 rounded-xl card-front flex flex-col items-center justify-center gap-1"
            style={{ borderColor: 'rgba(212,168,83,0.25)' }}
          >
            <span className="text-2xl font-bold text-accent-gold">
              {gameState.table_card === 'joker' ? '\u2605' : gameState.table_card[0].toUpperCase()}
            </span>
            <span className="text-[9px] text-accent-gold/50 uppercase tracking-wider font-accent">
              {gameState.table_card}
            </span>
          </div>
        </div>

        {gameState.last_play && (
          <div
            className="bg-bg-surface/60 border border-border-subtle rounded-xl px-4 py-2.5 text-text-secondary text-sm"
            style={{ animation: 'fade-in 0.3s' }}
          >
            <span className="text-text-primary font-medium">
              {gameState.players.find((p) => p.session_id === gameState.last_play?.player_id)?.nickname}
            </span>{' '}
            played {gameState.last_play.count} card{gameState.last_play.count > 1 ? 's' : ''}
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
                <span
                  className={`absolute top-1.5 left-2 text-[10px] font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}
                >
                  {cardLabel(card)}
                </span>
                <span className={`text-2xl font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardSuit(card) === 'WILD' ? '\u2605' : cardSuit(card)}
                </span>
                <span
                  className={`text-xs font-bold mt-0.5 ${isMatch(card) ? 'text-accent-gold/80' : 'text-accent-red/50'}`}
                >
                  {cardLabel(card)}
                </span>
                <span
                  className={`absolute bottom-1.5 right-2 text-[10px] font-bold rotate-180 ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}
                >
                  {cardLabel(card)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="relative z-10 flex gap-3 px-5 py-4 border-t border-border-subtle bg-bg-surface/40 backdrop-blur-sm"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
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
  const pips = Array.from({ length: value }, (_, i) => <div key={i} className="die-pip" />)
  return <div className={`die die-${value} ${className}`}>{pips}</div>
}

function DiceFaceSm({ value, className = '' }: { value: number; className?: string }) {
  const pips = Array.from({ length: value }, (_, i) => <div key={i} className="die-pip" />)
  return <div className={`die-sm die-${value} ${className}`}>{pips}</div>
}

// ============ Dice Board ============

function DiceBoard({ gameState, isMyTurn }: { gameState: DiceGameState; isMyTurn: boolean }) {
  const [bidQuantity, setBidQuantity] = useState(gameState.current_bid ? gameState.current_bid.quantity : 1)
  const [bidFace, setBidFace] = useState(gameState.current_bid ? gameState.current_bid.face_value : 2)
  const [pending, setPending] = useState(false)
  const canChallenge = isMyTurn && gameState.current_bid !== null

  useEffect(() => {
    setPending(false)
  }, [gameState])

  const isValidBid = () => {
    if (!gameState.current_bid) return bidQuantity >= 1 && bidFace >= 2 && bidFace <= 6
    return (
      bidQuantity > gameState.current_bid.quantity ||
      (bidQuantity === gameState.current_bid.quantity && bidFace > gameState.current_bid.face_value)
    )
  }

  const handleBid = () => {
    if (!isValidBid() || pending) return
    gameAudio.init()
    setPending(true)
    wsClient.send('place_bid', { quantity: bidQuantity, face_value: bidFace })
  }

  const handleChallenge = () => {
    if (pending) return
    gameAudio.init()
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
                  {gameState.players.find((p) => p.session_id === bid.player_id)?.nickname}
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
        <div
          className="relative z-10 px-5 py-5 border-t border-border-subtle bg-bg-surface/40 backdrop-blur-sm space-y-4"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
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
        <div
          className="relative z-10 px-5 py-5 border-t border-border-subtle text-center text-text-secondary text-sm"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          Waiting for{' '}
          <span className="text-text-primary font-medium">
            {gameState.players.find((p) => p.session_id === gameState.current_turn)?.nickname || '...'}
          </span>
          ...
        </div>
      )}
    </>
  )
}

// ============ LIAR! Call Overlay ============

function LiarCallOverlay() {
  useEffect(() => {
    gameAudio.liarSting()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ animation: 'liar-bg-flash 1.2s ease-out forwards' }}
    >
      {/* Red edge vignette */}
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 80px rgba(229, 62, 62, 0.4)' }} />
      <h1
        className="text-7xl font-accent font-bold text-accent-red text-glow-red select-none"
        style={{ animation: 'liar-slam 0.6s ease-out forwards' }}
      >
        LIAR!
      </h1>
    </div>
  )
}

// ============ Card Reveal Overlay (True 3D Flip) ============

function RevealOverlay({ cards, wasLying }: { cards: string[]; wasLying: boolean }) {
  const cardLabel = (c: string) => {
    switch (c) {
      case 'ace':
        return 'A'
      case 'king':
        return 'K'
      case 'queen':
        return 'Q'
      case 'joker':
        return '\u2605'
      default:
        return c[0].toUpperCase()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fade-in 0.3s' }}
    >
      <div
        className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-xs mx-4"
        style={{ animation: 'slide-up-bounce 0.4s ease-out' }}
      >
        <h2
          className={`text-4xl font-accent font-bold ${wasLying ? 'text-accent-red text-glow-red' : 'text-accent-green'}`}
          style={{ animation: 'slam-in 0.4s ease-out' }}
        >
          {wasLying ? 'CAUGHT!' : 'TRUTH!'}
        </h2>
        {/* Cards flip from face-down to face-up with true 3D rotation */}
        <div className="flex gap-3 justify-center">
          {cards.map((card, i) => (
            <div key={i} style={{ perspective: '800px', width: 64, height: 96 }}>
              <div
                className="relative w-full h-full"
                style={{
                  transformStyle: 'preserve-3d',
                  animation: `card-reveal-flip 0.6s ease-out ${0.5 + i * 0.3}s both`,
                }}
              >
                {/* Front face (card value) — hidden initially, visible after flip */}
                <div
                  className="absolute inset-0 card-front rounded-xl flex flex-col items-center justify-center gap-1"
                  style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
                >
                  <span className="text-2xl font-bold text-text-primary">{cardLabel(card)}</span>
                  <span className="text-[9px] text-text-secondary uppercase">{card}</span>
                </div>
                {/* Back face (pattern) — visible initially, hidden after flip */}
                <div
                  className="absolute inset-0 card-back rounded-xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                />
              </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fade-in 0.2s' }}
    >
      <div
        className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-sm w-full mx-4"
        style={{ animation: 'slide-up-bounce 0.4s ease-out' }}
      >
        <h2
          className={`text-3xl font-accent font-bold ${data.bid_was_correct ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}
        >
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

// ============ Roulette Overlay (3-Phase Dramatic Sequence) ============

function RouletteOverlay({
  result,
  players,
  gameMode,
}: {
  result: any
  players: Player[]
  gameMode: string
}) {
  const player = players.find((p) => p.session_id === result.player_id)
  const survived = result.survived
  const isDice = gameMode === 'dice'
  const [phase, setPhase] = useState<'spin' | 'tension' | 'result'>('spin')

  useEffect(() => {
    if (isDice) {
      // Dice mode: shorter timing, no cylinder spin
      const t1 = setTimeout(() => {
        setPhase('tension')
        gameAudio.heartbeat()
      }, 1500)
      const t2 = setTimeout(() => gameAudio.heartbeat(), 2200)
      const t3 = setTimeout(() => {
        setPhase('result')
        if (!survived) gameAudio.bang()
        else gameAudio.click()
      }, 3000)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    // Deck mode: full dramatic sequence
    gameAudio.cylinderSpin()

    const t1 = setTimeout(() => {
      setPhase('tension')
      gameAudio.heartbeat()
    }, 2000)
    const t2 = setTimeout(() => gameAudio.heartbeat(), 2700)
    const t3 = setTimeout(() => {
      setPhase('result')
      if (survived) gameAudio.click()
      else gameAudio.bang()
    }, 3500)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [survived, isDice])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={
        phase === 'result' && !survived
          ? { animation: 'heavy-shake 0.6s' }
          : undefined
      }
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        style={{ animation: 'fade-in 0.3s' }}
      />

      {/* Danger vignette — pulses during tension */}
      {(phase === 'spin' || phase === 'tension') && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 100px rgba(229, 62, 62, 0.2)',
            animation: phase === 'tension' ? 'vignette-pulse 0.8s ease-in-out infinite' : undefined,
          }}
        />
      )}

      {/* Spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle 200px at 50% 45%, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Blood splatter on death */}
      {phase === 'result' && !survived && <div className="lens-crack" />}

      {/* Red flash on death */}
      {phase === 'result' && !survived && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ animation: 'flash-red 0.4s forwards' }}
        />
      )}

      {/* Spark particles on death */}
      {phase === 'result' && !survived && <SparkParticles />}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8">
        {/* Player avatar + name */}
        <div className="flex flex-col items-center gap-2">
          <AnimalAvatar avatar={player?.avatar || 'fox'} size={48} />
          <p className="text-text-secondary/60 font-accent tracking-[0.3em] text-xs uppercase">
            {player?.nickname || '...'}
          </p>
        </div>

        {isDice ? (
          /* Poison vial for dice mode */
          <div className="flex justify-center py-2">
            <div className="relative">
              <svg width="60" height="100" viewBox="0 0 60 100">
                {/* Cork */}
                <rect x="21" y="5" width="18" height="10" rx="3" fill="#6a5a40" stroke="#5a4a30" strokeWidth="1" />
                {/* Bottle */}
                <path
                  d="M18 15 L42 15 L46 30 Q48 50, 46 72 Q44 90, 30 92 Q16 90, 14 72 Q12 50, 14 30 Z"
                  fill="none"
                  stroke="#4a4a5a"
                  strokeWidth="1.5"
                />
                <path
                  d="M18 15 L42 15 L46 30 Q48 50, 46 72 Q44 90, 30 92 Q16 90, 14 72 Q12 50, 14 30 Z"
                  fill={phase === 'result' ? (survived ? 'rgba(56, 161, 105, 0.25)' : 'rgba(229, 62, 62, 0.3)') : 'rgba(56, 161, 105, 0.15)'}
                />
                {/* Liquid */}
                <path
                  d={`M16 ${survived ? 50 : 35} Q30 ${survived ? 53 : 38}, 44 ${survived ? 50 : 35} Q46 65, 44 80 Q42 90, 30 92 Q18 90, 16 80 Q14 65, 16 ${survived ? 50 : 35} Z`}
                  fill={phase === 'result' && !survived ? 'rgba(180, 30, 30, 0.6)' : 'rgba(56, 161, 105, 0.45)'}
                />
                {/* Skull */}
                <text x="30" y="70" textAnchor="middle" fontSize="16" fill="rgba(255,255,255,0.25)">
                  &#9760;
                </text>
                {/* Animated bubbles during spin */}
                {phase === 'spin' && (
                  <>
                    <circle cx="24" cy="75" r="2" fill="rgba(255,255,255,0.15)">
                      <animate attributeName="cy" from="78" to="45" dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="34" cy="70" r="1.5" fill="rgba(255,255,255,0.1)">
                      <animate attributeName="cy" from="75" to="40" dur="1.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.25" to="0" dur="1.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="28" cy="65" r="1" fill="rgba(255,255,255,0.12)">
                      <animate attributeName="cy" from="72" to="42" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.2" to="0" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
              </svg>
            </div>
          </div>
        ) : (
          /* Integrated revolver for deck mode */
          <RevolverSVG
            chambers={result.chambers}
            shotsFired={result.shots_fired}
            survived={survived}
            spinning={phase === 'spin'}
            hammerFall={phase === 'result'}
            showFlash={phase === 'result' && !survived}
          />
        )}

        {/* Chamber indicators */}
        <div className="flex gap-2">
          {Array.from({ length: result.chambers }).map((_, i) => {
            const isFatal = i === result.shots_fired - 1 && !survived && phase === 'result'
            const isFired = i < result.shots_fired
            return (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                  isFatal
                    ? 'bg-accent-red border-accent-red shadow-[0_0_8px_rgba(229,62,62,0.6)]'
                    : isFired
                      ? 'bg-accent-gold/80 border-accent-gold'
                      : 'bg-transparent border-text-secondary/25'
                }`}
              />
            )
          })}
        </div>

        {/* Phase-specific text */}
        {phase === 'spin' && (
          <p
            className="text-text-secondary/40 text-sm font-accent tracking-wider"
            style={{ animation: 'fade-in 0.5s' }}
          >
            {isDice ? 'Pouring the vial...' : 'Spinning cylinder...'}
          </p>
        )}

        {phase === 'tension' && (
          <p
            className="text-text-secondary/25 text-2xl font-accent tracking-widest"
            style={{ animation: 'heartbeat 0.8s ease-in-out infinite' }}
          >
            ...
          </p>
        )}

        {phase === 'result' && (
          <>
            <p
              className={`text-5xl font-accent font-bold ${survived ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}
              style={{ animation: 'slam-in 0.4s ease-out' }}
            >
              {isDice ? (survived ? 'SAFE' : 'DEAD') : survived ? '*CLICK*' : 'BANG!'}
            </p>

            {/* Smoke wisps on survive (deck mode) */}
            {survived && !isDice && (
              <div className="flex justify-center gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-text-secondary/20"
                    style={{ animation: `smoke-drift 1.5s ease-out ${i * 0.2}s forwards` }}
                  />
                ))}
              </div>
            )}

            <p className="text-text-secondary/30 text-xs">
              {isDice
                ? `Vial ${result.shots_fired} of ${result.chambers}`
                : `Chamber ${result.shots_fired} of ${result.chambers}`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ============ Game Over ============

function GameOverOverlay({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
      style={{ animation: 'fade-in 0.5s' }}
    >
      <div
        className="bg-bg-surface border border-border-gold rounded-3xl p-10 text-center space-y-6 max-w-xs mx-4"
        style={{ animation: 'slide-up-bounce 0.5s ease-out' }}
      >
        <div className="flex flex-col items-center gap-2" style={{ animation: 'float 3s ease-in-out infinite' }}>
          <div className="text-3xl">{'\uD83D\uDC51'}</div>
          <AnimalAvatar avatar={data.winner_avatar || 'fox'} size={72} />
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
