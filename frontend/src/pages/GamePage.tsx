import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useGameStore } from '../stores/game'
import { useSessionStore } from '../stores/session'
import { wsClient } from '../api/ws'
import type { DeckGameState, DiceGameState, Player } from '../types/models'

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
        <div className="text-text-secondary font-accent tracking-widest text-sm" style={{ animation: 'pulse-gold 2s infinite' }}>
          Loading game...
        </div>
      </div>
    )
  }

  const isMyTurn = gameState.current_turn === sessionId
  const opponents = gameState.players.filter((p) => p.session_id !== sessionId)
  const me = gameState.players.find((p) => p.session_id === sessionId)

  return (
    <div className="min-h-dvh flex flex-col bg-noise">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-bg-surface/50">
        <div className="flex items-center gap-2">
          <span className="text-accent-gold font-accent text-xs tracking-wider">ROUND {gameState.round_number}</span>
        </div>
        <div className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${
          isMyTurn ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30' : 'text-text-secondary'
        }`}>
          {isMyTurn ? 'Your turn' : `${gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname || '...'}'s turn`}
        </div>
        {me?.revolver && me.is_alive && (
          <div className="flex gap-1">
            {Array.from({ length: me.revolver.chambers }).map((_, i) => (
              <div key={i} className={`chamber ${i < me.revolver!.shots_fired ? 'chamber-fired' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* Opponents */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {opponents.map((p) => (
          <div
            key={p.session_id}
            className={`flex flex-col items-center gap-1.5 min-w-[64px] p-2.5 rounded-xl transition-all duration-300 ${
              p.session_id === gameState.current_turn
                ? 'bg-accent-gold/10 border border-accent-gold/30 glow-gold'
                : 'bg-bg-surface/50'
            } ${!p.is_alive ? 'opacity-30 grayscale' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
              p.is_alive
                ? 'bg-gradient-to-br from-accent-gold/30 to-accent-gold/10 text-accent-gold border border-accent-gold/20'
                : 'bg-bg-elevated text-text-secondary'
            }`}>
              {p.is_alive ? p.nickname[0].toUpperCase() : '\u2620'}
            </div>
            <span className="text-[10px] text-text-secondary truncate max-w-[56px]">{p.nickname}</span>
            {p.revolver && p.is_alive && (
              <div className="flex gap-0.5">
                {Array.from({ length: p.revolver.chambers }).map((_, i) => (
                  <div key={i} className={`chamber ${i < p.revolver!.shots_fired ? 'chamber-fired' : ''}`} />
                ))}
              </div>
            )}
          </div>
        ))}
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
      case 'joker': return '\u2663'
      default: return ''
    }
  }

  const isMatch = (card: string) => card === gameState.table_card || card === 'joker'

  return (
    <>
      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5">
        {/* Table card */}
        <div className="text-center space-y-2">
          <span className="text-text-secondary text-[10px] uppercase tracking-[0.3em]">Table Card</span>
          <div
            className="text-4xl font-accent text-accent-gold text-glow-gold"
            style={{ animation: 'pulse-gold 3s ease-in-out infinite' }}
          >
            {gameState.table_card.toUpperCase()}
          </div>
          <div className="ornament text-accent-gold/20 max-w-[140px] mx-auto">
            <span className="text-accent-gold/30 text-[8px]">&#9830;</span>
          </div>
        </div>

        {/* Last play info */}
        {gameState.last_play && (
          <div className="bg-bg-surface/60 border border-border-subtle rounded-lg px-4 py-2 text-text-secondary text-sm">
            <span className="text-text-primary font-medium">
              {gameState.players.find(p => p.session_id === gameState.last_play?.player_id)?.nickname}
            </span>
            {' '}played {gameState.last_play.count} card{gameState.last_play.count > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Your hand */}
      <div className="px-4 pb-3">
        <div className="flex gap-2.5 justify-center">
          {gameState.your_hand.map((card, i) => (
            <button
              key={i}
              onClick={() => isMyTurn && toggleCard(i)}
              className={`w-[58px] h-[84px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                selectedCards.includes(i)
                  ? 'card-selected -translate-y-4'
                  : 'card-front hover:border-accent-gold/30'
              } ${!isMyTurn ? 'opacity-50' : 'active:scale-95 cursor-pointer'}`}
            >
              <span className={`text-xl font-bold ${isMatch(card) ? 'text-accent-gold' : 'text-accent-red/80'}`}>
                {cardLabel(card)}
              </span>
              <span className={`text-xs ${isMatch(card) ? 'text-accent-gold/50' : 'text-accent-red/30'}`}>
                {cardSuit(card)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-4 py-4 border-t border-border-subtle bg-bg-surface/30">
        <button
          onClick={handlePlay}
          disabled={!isMyTurn || selectedCards.length === 0 || pending}
          className="flex-1 bg-gradient-to-r from-accent-gold to-accent-amber rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-20 active:scale-[0.97] transition-all"
        >
          Play {selectedCards.length || ''} Card{selectedCards.length !== 1 ? 's' : ''}
        </button>
        {canCallLiar && (
          <button
            onClick={handleCallLiar}
            disabled={pending}
            className="flex-1 bg-accent-red/10 border-2 border-accent-red/60 text-accent-red rounded-xl py-3 font-accent font-bold text-lg uppercase active:scale-[0.97] transition-all disabled:opacity-20"
            style={{ animation: 'pulse-glow-red 2s infinite' }}
          >
            LIAR!
          </button>
        )}
      </div>
    </>
  )
}

// ============ Dice Board ============

function DiceBoard({ gameState, isMyTurn }: { gameState: DiceGameState; isMyTurn: boolean }) {
  const [bidQuantity, setBidQuantity] = useState(gameState.current_bid ? gameState.current_bid.quantity : 1)
  const [bidFace, setBidFace] = useState(gameState.current_bid ? gameState.current_bid.face_value : 2)
  const [pending, setPending] = useState(false)
  const canChallenge = isMyTurn && gameState.current_bid !== null

  useEffect(() => { setPending(false) }, [gameState])

  const diceEmoji = (val: number) => ['\u2680', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][val] || '?'

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
      <div className="flex-1 px-4 py-2 overflow-y-auto">
        <div className="space-y-1.5">
          {gameState.bid_history.map((bid, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                i === gameState.bid_history.length - 1
                  ? 'bg-accent-gold/10 border border-accent-gold/20'
                  : 'bg-bg-surface/50'
              }`}
              style={i === gameState.bid_history.length - 1 ? { animation: 'slide-up 0.2s ease-out' } : undefined}
            >
              <span className="text-text-secondary text-sm flex-1">
                {gameState.players.find(p => p.session_id === bid.player_id)?.nickname}
              </span>
              <span className="text-text-primary font-mono font-bold text-lg">
                {bid.quantity}&times; {diceEmoji(bid.face_value)}
              </span>
            </div>
          ))}
          {gameState.bid_history.length === 0 && (
            <div className="text-center text-text-secondary/40 py-6 text-sm font-accent tracking-wider">No bids yet</div>
          )}
        </div>
      </div>

      {/* Your dice */}
      <div className="flex justify-center gap-3 px-4 py-4">
        {gameState.your_dice.map((die, i) => (
          <div
            key={i}
            className="die w-12 h-12 flex items-center justify-center text-2xl font-bold"
            style={{ animation: `fade-in 0.3s ease-out ${i * 0.08}s both` }}
          >
            {diceEmoji(die)}
          </div>
        ))}
      </div>

      {/* Bid panel */}
      {isMyTurn && (
        <div className="px-4 py-4 border-t border-border-subtle bg-bg-surface/30 space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBidQuantity(Math.max(1, bidQuantity - 1))}
              className="w-10 h-10 rounded-full bg-bg-elevated border border-border-subtle text-text-primary flex items-center justify-center text-lg font-bold active:scale-90 transition-all"
            >
              &minus;
            </button>
            <span className="text-2xl font-bold text-accent-gold w-8 text-center">{bidQuantity}</span>
            <button
              onClick={() => setBidQuantity(bidQuantity + 1)}
              className="w-10 h-10 rounded-full bg-bg-elevated border border-border-subtle text-text-primary flex items-center justify-center text-lg font-bold active:scale-90 transition-all"
            >
              +
            </button>
            <span className="text-text-secondary mx-1">&times;</span>
            <div className="flex gap-1.5">
              {[2, 3, 4, 5, 6].map((face) => (
                <button
                  key={face}
                  onClick={() => setBidFace(face)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    bidFace === face
                      ? 'bg-accent-gold/20 border-2 border-accent-gold text-accent-gold'
                      : 'bg-bg-elevated border border-border-subtle hover:border-accent-gold/30'
                  }`}
                >
                  {diceEmoji(face)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBid}
              disabled={!isValidBid() || pending}
              className="flex-1 bg-gradient-to-r from-accent-gold to-accent-amber rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-20 active:scale-[0.97] transition-all"
            >
              Bid {bidQuantity}&times; {diceEmoji(bidFace)}
            </button>
            {canChallenge && (
              <button
                onClick={handleChallenge}
                disabled={pending}
                className="flex-1 bg-accent-red/10 border-2 border-accent-red/60 text-accent-red rounded-xl py-3 font-bold uppercase active:scale-[0.97] transition-all disabled:opacity-20"
                style={{ animation: 'pulse-glow-red 2s infinite' }}
              >
                Challenge!
              </button>
            )}
          </div>
        </div>
      )}
      {!isMyTurn && (
        <div className="px-4 py-5 border-t border-border-subtle text-center text-text-secondary text-sm">
          Waiting for <span className="text-text-primary">{gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname || '...'}</span>...
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
      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 text-center space-y-5 max-w-xs" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2
          className={`text-3xl font-accent font-bold ${wasLying ? 'text-accent-red text-glow-red' : 'text-accent-green'}`}
          style={{ animation: 'slam-in 0.4s ease-out' }}
        >
          {wasLying ? 'LIAR!' : 'TRUTH!'}
        </h2>
        <div className="flex gap-2.5 justify-center">
          {cards.map((card, i) => (
            <div
              key={i}
              className="card-front w-14 h-20 rounded-lg flex items-center justify-center text-xl font-bold"
              style={{ animation: `slide-up 0.3s ease-out ${i * 0.1}s both` }}
            >
              {cardLabel(card)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DiceRevealOverlay({ data }: { data: any }) {
  const diceEmoji = (val: number) => ['\u2680', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][val] || '?'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" style={{ animation: 'fade-in 0.2s' }}>
      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 text-center space-y-5 max-w-sm w-full mx-4" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2 className={`text-2xl font-accent font-bold ${data.bid_was_correct ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}>
          {data.bid_was_correct ? 'Bid Was Right!' : 'Bid Was Wrong!'}
        </h2>
        <p className="text-text-secondary text-sm">
          Actual count: <span className="text-accent-gold font-bold text-lg">{data.actual_count}</span>
        </p>
        <div className="space-y-2">
          {Object.entries(data.all_dice).map(([pid, dice]: [string, any]) => (
            <div key={pid} className="flex gap-1.5 justify-center">
              {dice.map((d: number, i: number) => (
                <span key={i} className="die w-8 h-8 flex items-center justify-center text-base">{diceEmoji(d)}</span>
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

      <div className="bg-bg-surface border border-border-subtle rounded-2xl p-8 text-center space-y-5 max-w-xs" style={{ animation: 'slide-up-bounce 0.4s ease-out' }}>
        <h2 className="text-sm text-text-secondary/60 font-accent tracking-[0.3em] uppercase">Russian Roulette</h2>

        <div className="flex gap-2 justify-center my-3">
          {Array.from({ length: result.chambers }).map((_: any, i: number) => (
            <div
              key={i}
              className={`chamber ${
                i === result.shots_fired - 1 && !survived ? 'chamber-bullet' :
                i < result.shots_fired ? 'chamber-fired' : ''
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        <div className="text-4xl" style={{ animation: survived ? 'float 2s infinite' : 'shake 0.3s' }}>
          {survived ? '\uD83D\uDE2E\u200D\uD83D\uDCA8' : '\uD83D\uDC80'}
        </div>

        <p className="text-text-primary font-bold text-lg">{player?.nickname || '...'}</p>

        <p
          className={`text-3xl font-accent font-bold ${survived ? 'text-accent-green' : 'text-accent-red text-glow-red'}`}
          style={{ animation: 'slam-in 0.5s ease-out 0.2s both' }}
        >
          {survived ? '*CLICK*' : 'BANG!'}
        </p>

        {survived && (
          <p className="text-text-secondary/50 text-xs">Chamber {result.shots_fired} of {result.chambers}</p>
        )}
      </div>
    </div>
  )
}

function GameOverOverlay({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md" style={{ animation: 'fade-in 0.5s' }}>
      <div className="bg-bg-surface border border-border-gold rounded-2xl p-10 text-center space-y-6 max-w-xs" style={{ animation: 'slide-up-bounce 0.5s ease-out' }}>
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
          className="bg-gradient-to-r from-accent-gold to-accent-amber rounded-xl px-10 py-3.5 text-bg-primary font-bold uppercase active:scale-[0.97] transition-all hover:glow-gold-lg"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
