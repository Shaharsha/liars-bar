import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useGameStore } from '../stores/game'
import { useSessionStore } from '../stores/session'
import { wsClient } from '../api/ws'
import type { DeckGameState, DiceGameState, Player } from '../types/models'

const AVATAR_COLORS = ['#D4A853', '#E07B6C', '#6CB4E0', '#8BD4A0']

export default function GamePage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { sessionId } = useSessionStore()
  const gameState = useGameStore((s) => s.gameState)
  const rouletteResult = useGameStore((s) => s.rouletteResult)
  const revealedCards = useGameStore((s) => s.revealedCards)
  const revealedDice = useGameStore((s) => s.revealedDice)
  const gameOver = useGameStore((s) => s.gameOver)
  const clearOverlays = useGameStore((s) => s.clearOverlays)

  useWebSocket(tableId!)

  useEffect(() => {
    if (rouletteResult) {
      const t = setTimeout(clearOverlays, 3500)
      return () => clearTimeout(t)
    }
  }, [rouletteResult, clearOverlays])

  useEffect(() => {
    if (revealedCards) {
      const t = setTimeout(clearOverlays, 3000)
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
        {me?.revolver && me.is_alive && (
          <div className="flex gap-1.5">
            {Array.from({ length: me.revolver.chambers }).map((_, i) => (
              <div key={i} className={`chamber ${i < me.revolver!.shots_fired ? 'chamber-fired' : ''}`} />
            ))}
          </div>
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
              className={`flex flex-col items-center gap-1.5 min-w-[70px] p-3 rounded-2xl transition-all duration-300 ${
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
              {p.revolver && p.is_alive && (
                <div className="flex gap-1">
                  {Array.from({ length: p.revolver.chambers }).map((_, i) => (
                    <div key={i} className={`w-[8px] h-[8px] rounded-full border border-accent-gold/30 ${i < p.revolver!.shots_fired ? 'bg-accent-gold/80 border-accent-gold' : 'bg-transparent'}`} />
                  ))}
                </div>
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

      {/* Overlays */}
      {revealedCards && <RevealOverlay cards={revealedCards.cards} wasLying={revealedCards.was_lying} />}
      {revealedDice && <DiceRevealOverlay data={revealedDice} />}
      {rouletteResult && <RouletteOverlay result={rouletteResult} players={gameState.players} />}
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

  // Fan angle calculation
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
      {/* Board */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-4 table-felt">
        {/* Table card */}
        <div className="text-center space-y-2">
          <span className="text-text-secondary/50 text-[10px] uppercase tracking-[0.3em]">Table Card</span>
          <div className="mx-auto w-16 h-24 rounded-xl card-front flex flex-col items-center justify-center gap-1" style={{ borderColor: 'rgba(212,168,83,0.25)' }}>
            <span className="text-2xl font-bold text-accent-gold">{gameState.table_card === 'joker' ? '\u2605' : gameState.table_card[0].toUpperCase()}</span>
            <span className="text-[9px] text-accent-gold/50 uppercase tracking-wider font-accent">{gameState.table_card}</span>
          </div>
        </div>

        {/* Last play info */}
        {gameState.last_play && (
          <div className="bg-bg-surface/60 border border-border-subtle rounded-xl px-4 py-2.5 text-text-secondary text-sm" style={{ animation: 'fade-in 0.3s' }}>
            <span className="text-text-primary font-medium">
              {gameState.players.find(p => p.session_id === gameState.last_play?.player_id)?.nickname}
            </span>
            {' '}played {gameState.last_play.count} card{gameState.last_play.count > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Your hand — fan layout */}
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
                {/* Top-left rank */}
                <span className={`absolute top-1.5 left-2 text-[10px] font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardLabel(card)}
                </span>
                {/* Center suit */}
                <span className={`text-2xl font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardSuit(card) === 'WILD' ? '\u2605' : cardSuit(card)}
                </span>
                <span className={`text-xs font-bold mt-0.5 ${isMatch(card) ? 'text-accent-gold/80' : 'text-accent-red/50'}`}>
                  {cardLabel(card)}
                </span>
                {/* Bottom-right rank */}
                <span className={`absolute bottom-1.5 right-2 text-[10px] font-bold rotate-180 ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/70'}`}>
                  {cardLabel(card)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
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
  return (
    <div className={`die die-${value} ${className}`}>
      {pips}
    </div>
  )
}

function DiceFaceSm({ value, className = '' }: { value: number; className?: string }) {
  const pips = Array.from({ length: value }, (_, i) => (
    <div key={i} className="die-pip" />
  ))
  return (
    <div className={`die-sm die-${value} ${className}`}>
      {pips}
    </div>
  )
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
      {/* Bid history */}
      <div className="relative z-10 flex-1 px-4 py-3 overflow-y-auto">
        <div className="space-y-2">
          {gameState.bid_history.map((bid, i) => {
            const isLatest = i === gameState.bid_history.length - 1
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  isLatest
                    ? 'bg-accent-gold/10 border border-accent-gold/20'
                    : 'bg-bg-surface/40'
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

      {/* Your dice */}
      <div className="relative z-10 flex justify-center gap-3 px-4 py-4">
        {gameState.your_dice.map((die, i) => (
          <div key={i} style={{ animation: `fade-in 0.3s ease-out ${i * 0.08}s both` }}>
            <DiceFace value={die} />
          </div>
        ))}
      </div>

      {/* Bid panel */}
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

// ============ Overlays ============

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
      style={{ animation: wasLying ? 'flash-red 0.5s' : 'flash-green 0.5s' }}
    >
      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-xs mx-4" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2
          className={`text-4xl font-accent font-bold ${wasLying ? 'text-accent-red text-glow-red' : 'text-accent-green'}`}
          style={{ animation: 'slam-in 0.4s ease-out' }}
        >
          {wasLying ? 'LIAR!' : 'TRUTH!'}
        </h2>
        <div className="flex gap-3 justify-center">
          {cards.map((card, i) => (
            <div
              key={i}
              className="card-front w-16 h-24 rounded-xl flex flex-col items-center justify-center gap-1"
              style={{ animation: `slide-up 0.3s ease-out ${i * 0.1}s both` }}
            >
              <span className="text-2xl font-bold text-text-primary">{cardLabel(card)}</span>
              <span className="text-[9px] text-text-secondary uppercase">{card}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DiceRevealOverlay({ data }: { data: any }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" style={{ animation: 'fade-in 0.2s' }}>
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

function RouletteOverlay({ result, players }: { result: any; players: Player[] }) {
  const player = players.find(p => p.session_id === result.player_id)
  const survived = result.survived

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md ${
        survived ? 'bg-black/80' : 'bg-accent-red/20'
      }`}
      style={!survived ? { animation: 'heavy-shake 0.6s' } : { animation: 'fade-in 0.3s' }}
    >
      {!survived && (
        <div className="absolute inset-0 pointer-events-none" style={{ animation: 'flash-red 0.8s' }} />
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 text-center space-y-5 max-w-xs mx-4" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2 className="text-sm text-text-secondary/60 font-accent tracking-[0.3em] uppercase">Russian Roulette</h2>

        <div className="flex gap-2.5 justify-center my-3">
          {Array.from({ length: result.chambers }).map((_: any, i: number) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i === result.shots_fired - 1 && !survived
                  ? 'chamber-bullet'
                  : i < result.shots_fired
                  ? 'chamber-fired'
                  : 'border-border-subtle bg-bg-elevated'
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        <div className="text-5xl" style={{ animation: survived ? 'float 2s infinite' : 'shake 0.3s' }}>
          {survived ? '\uD83D\uDE2E\u200D\uD83D\uDCA8' : '\uD83D\uDC80'}
        </div>

        <p className="text-text-primary font-bold text-lg">{player?.nickname || '...'}</p>

        <p
          className={`text-4xl font-accent font-bold ${survived ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}
          style={{ animation: 'slam-in 0.5s ease-out 0.2s both' }}
        >
          {survived ? '*CLICK*' : 'BANG!'}
        </p>

        {survived && (
          <p className="text-text-secondary/40 text-xs">Chamber {result.shots_fired} of {result.chambers}</p>
        )}
      </div>
    </div>
  )
}

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
