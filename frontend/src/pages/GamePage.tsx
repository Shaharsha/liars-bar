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

  // Auto-clear overlays after delay
  useEffect(() => {
    if (rouletteResult) {
      const t = setTimeout(clearOverlays, 3000)
      return () => clearTimeout(t)
    }
  }, [rouletteResult, clearOverlays])

  useEffect(() => {
    if (revealedCards) {
      const t = setTimeout(clearOverlays, 2500)
      return () => clearTimeout(t)
    }
  }, [revealedCards, clearOverlays])

  useEffect(() => {
    if (revealedDice) {
      const t = setTimeout(clearOverlays, 3000)
      return () => clearTimeout(t)
    }
  }, [revealedDice, clearOverlays])

  if (!gameState) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-text-secondary">Loading game...</div>
      </div>
    )
  }

  const isMyTurn = gameState.current_turn === sessionId
  const opponents = gameState.players.filter((p) => p.session_id !== sessionId)

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
        <span className="text-text-secondary text-xs">Round {gameState.round_number}</span>
        <span className={`text-xs font-medium ${isMyTurn ? 'text-accent-gold' : 'text-text-secondary'}`}>
          {isMyTurn ? 'Your turn' : `${gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname || '...'}'s turn`}
        </span>
      </div>

      {/* Opponents */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {opponents.map((p) => (
          <div
            key={p.session_id}
            className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-all ${
              p.session_id === gameState.current_turn ? 'bg-accent-gold/10 border border-accent-gold/30' : ''
            } ${!p.is_alive ? 'opacity-40' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-xs font-bold text-text-primary">
              {p.is_alive ? p.nickname[0].toUpperCase() : '\u2620'}
            </div>
            <span className="text-[10px] text-text-secondary truncate max-w-[56px]">{p.nickname}</span>
            {p.revolver && p.is_alive && (
              <div className="flex gap-0.5">
                {Array.from({ length: p.revolver.chambers }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < p.revolver!.shots_fired ? 'bg-accent-gold' : 'bg-border-subtle'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Game board - Deck mode */}
      {gameState.game_mode === 'deck' && (
        <DeckBoard gameState={gameState as DeckGameState} isMyTurn={isMyTurn} />
      )}

      {/* Game board - Dice mode */}
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
  const canCallLiar = isMyTurn && gameState.last_play !== null

  const toggleCard = (index: number) => {
    setSelectedCards((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index)
      if (prev.length >= 3) return prev
      return [...prev, index]
    })
  }

  const handlePlay = () => {
    if (selectedCards.length === 0) return
    wsClient.send('play_cards', { cards: selectedCards })
    setSelectedCards([])
  }

  const handleCallLiar = () => {
    wsClient.send('call_liar')
  }

  const cardLabel = (card: string) => {
    switch (card) {
      case 'ace': return 'A'
      case 'king': return 'K'
      case 'queen': return 'Q'
      case 'joker': return '\uD83C\uDCCF'
      default: return card[0].toUpperCase()
    }
  }

  const cardColor = (card: string) => {
    if (card === gameState.table_card || card === 'joker') return 'text-accent-green'
    return 'text-accent-red'
  }

  return (
    <>
      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {/* Table card */}
        <div className="text-center">
          <span className="text-text-secondary text-xs uppercase tracking-widest">Table Card</span>
          <div className="text-3xl font-accent text-accent-gold mt-1" style={{ animation: 'pulse-gold 3s infinite' }}>
            {gameState.table_card.toUpperCase()}
          </div>
        </div>

        {/* Last play info */}
        {gameState.last_play && (
          <div className="text-text-secondary text-sm">
            {gameState.players.find(p => p.session_id === gameState.last_play?.player_id)?.nickname} played {gameState.last_play.count} card{gameState.last_play.count > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Your hand */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 justify-center">
          {gameState.your_hand.map((card, i) => (
            <button
              key={i}
              onClick={() => isMyTurn && toggleCard(i)}
              className={`w-14 h-20 rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-150 ${
                selectedCards.includes(i)
                  ? 'border-accent-gold bg-accent-gold/10 -translate-y-3 glow-gold'
                  : 'border-border-subtle bg-bg-surface hover:border-accent-gold/30'
              } ${!isMyTurn ? 'opacity-60' : 'active:scale-95'}`}
            >
              <span className={`text-lg font-bold ${cardColor(card)}`}>{cardLabel(card)}</span>
              <span className="text-[8px] text-text-secondary mt-0.5">{card}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-4 py-4 border-t border-border-subtle">
        <button
          onClick={handlePlay}
          disabled={!isMyTurn || selectedCards.length === 0}
          className="flex-1 bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-30 active:scale-[0.98] transition-all"
        >
          Play {selectedCards.length || ''} Card{selectedCards.length !== 1 ? 's' : ''}
        </button>
        {canCallLiar && (
          <button
            onClick={handleCallLiar}
            className="flex-1 bg-accent-red/10 border border-accent-red/50 text-accent-red rounded-xl py-3 font-accent font-bold text-lg uppercase glow-red active:scale-[0.98] transition-all"
            style={{ animation: 'pulse-gold 2s infinite' }}
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
  const canChallenge = isMyTurn && gameState.current_bid !== null

  const diceEmoji = (val: number) => ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][val] || '?'

  const isValidBid = () => {
    if (!gameState.current_bid) return bidQuantity >= 1 && bidFace >= 2 && bidFace <= 6
    return (
      bidQuantity > gameState.current_bid.quantity ||
      (bidQuantity === gameState.current_bid.quantity && bidFace > gameState.current_bid.face_value)
    )
  }

  const handleBid = () => {
    if (!isValidBid()) return
    wsClient.send('place_bid', { quantity: bidQuantity, face_value: bidFace })
  }

  const handleChallenge = () => {
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                i === gameState.bid_history.length - 1 ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-bg-surface'
              }`}
            >
              <span className="text-text-secondary text-sm flex-1">
                {gameState.players.find(p => p.session_id === bid.player_id)?.nickname}
              </span>
              <span className="text-text-primary font-mono font-bold">
                {bid.quantity}\u00D7 {diceEmoji(bid.face_value)}
              </span>
            </div>
          ))}
          {gameState.bid_history.length === 0 && (
            <div className="text-center text-text-secondary/50 py-4 text-sm">No bids yet</div>
          )}
        </div>
      </div>

      {/* Your dice */}
      <div className="flex justify-center gap-3 px-4 py-3">
        {gameState.your_dice.map((die, i) => (
          <div
            key={i}
            className="w-12 h-12 bg-bg-surface border border-border-subtle rounded-lg flex items-center justify-center text-2xl"
            style={{ animation: 'fade-in 0.3s ease-out' }}
          >
            {diceEmoji(die)}
          </div>
        ))}
      </div>

      {/* Bid panel */}
      {isMyTurn && (
        <div className="px-4 py-3 border-t border-border-subtle space-y-3">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBidQuantity(Math.max(1, bidQuantity - 1))}
              className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle text-text-primary flex items-center justify-center text-lg active:scale-90"
            >
              {'\u2212'}
            </button>
            <span className="text-2xl font-bold text-text-primary w-8 text-center">{bidQuantity}</span>
            <button
              onClick={() => setBidQuantity(bidQuantity + 1)}
              className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle text-text-primary flex items-center justify-center text-lg active:scale-90"
            >
              +
            </button>
            <span className="text-text-secondary mx-2">{'\u00D7'}</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6].map((face) => (
                <button
                  key={face}
                  onClick={() => setBidFace(face)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    bidFace === face
                      ? 'bg-accent-gold/20 border border-accent-gold text-accent-gold'
                      : 'bg-bg-surface border border-border-subtle'
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
              disabled={!isValidBid()}
              className="flex-1 bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl py-3 text-bg-primary font-bold uppercase disabled:opacity-30 active:scale-[0.98] transition-all"
            >
              Bid {bidQuantity}{'\u00D7'} {diceEmoji(bidFace)}
            </button>
            {canChallenge && (
              <button
                onClick={handleChallenge}
                className="flex-1 bg-accent-red/10 border border-accent-red/50 text-accent-red rounded-xl py-3 font-bold uppercase glow-red active:scale-[0.98] transition-all"
              >
                Challenge!
              </button>
            )}
          </div>
        </div>
      )}
      {!isMyTurn && (
        <div className="px-4 py-4 border-t border-border-subtle text-center text-text-secondary text-sm">
          Waiting for {gameState.players.find(p => p.session_id === gameState.current_turn)?.nickname}...
        </div>
      )}
    </>
  )
}

// ============ Overlays ============

function RevealOverlay({ cards, wasLying }: { cards: string[]; wasLying: boolean }) {
  const cardLabel = (c: string) => c === 'joker' ? '\uD83C\uDCCF' : c[0].toUpperCase()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ animation: 'fade-in 0.2s' }}>
      <div className="bg-bg-surface rounded-2xl p-6 text-center space-y-4 max-w-xs" style={{ animation: 'slide-up 0.3s ease-out' }}>
        <h2 className={`text-2xl font-accent ${wasLying ? 'text-accent-red' : 'text-accent-green'}`}>
          {wasLying ? 'LIAR!' : 'TRUTH!'}
        </h2>
        <div className="flex gap-2 justify-center">
          {cards.map((card, i) => (
            <div key={i} className="w-14 h-20 rounded-lg border border-border-subtle bg-bg-elevated flex items-center justify-center text-xl font-bold">
              {cardLabel(card)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DiceRevealOverlay({ data }: { data: any }) {
  const diceEmoji = (val: number) => ['', '\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][val] || '?'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ animation: 'fade-in 0.2s' }}>
      <div className="bg-bg-surface rounded-2xl p-6 text-center space-y-4 max-w-sm w-full mx-4" style={{ animation: 'slide-up 0.3s ease-out' }}>
        <h2 className={`text-xl font-accent ${data.bid_was_correct ? 'text-accent-green' : 'text-accent-red'}`}>
          {data.bid_was_correct ? 'Bid was correct!' : 'Bid was wrong!'}
        </h2>
        <p className="text-text-secondary text-sm">
          Actual count: <span className="text-text-primary font-bold">{data.actual_count}</span>
        </p>
        {Object.entries(data.all_dice).map(([pid, dice]: [string, any]) => (
          <div key={pid} className="flex gap-1 justify-center">
            {dice.map((d: number, i: number) => (
              <span key={i} className="text-xl">{diceEmoji(d)}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function RouletteOverlay({ result, players }: { result: any; players: Player[] }) {
  const player = players.find(p => p.session_id === result.player_id)
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${
        result.survived ? 'bg-black/70' : 'bg-accent-red/20'
      }`}
      style={!result.survived ? { animation: 'shake 0.5s' } : { animation: 'fade-in 0.2s' }}
    >
      <div className="bg-bg-surface rounded-2xl p-8 text-center space-y-4" style={{ animation: 'slide-up 0.3s ease-out' }}>
        <h2 className="text-lg text-text-secondary font-accent">RUSSIAN ROULETTE</h2>
        <div className="text-4xl">{result.survived ? '\uD83D\uDE2E\u200D\uD83D\uDCA8' : '\uD83D\uDC80'}</div>
        <p className="text-text-primary font-bold">{player?.nickname}</p>
        <p className={`text-2xl font-accent ${result.survived ? 'text-accent-green' : 'text-accent-red'}`}>
          {result.survived ? '*CLICK*' : 'BANG!'}
        </p>
        <div className="flex gap-1 justify-center">
          {Array.from({ length: result.chambers }).map((_: any, i: number) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < result.shots_fired ? 'bg-accent-gold' : 'bg-border-subtle'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function GameOverOverlay({ data, onBack }: { data: any; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" style={{ animation: 'fade-in 0.3s' }}>
      <div className="bg-bg-surface rounded-2xl p-8 text-center space-y-4 max-w-xs" style={{ animation: 'slide-up 0.3s ease-out' }}>
        <div className="text-4xl">{'\uD83D\uDC51'}</div>
        <h2 className="text-2xl font-accent text-accent-gold">WINNER</h2>
        <p className="text-text-primary text-xl font-bold">{data.winner_nickname}</p>
        <button
          onClick={onBack}
          className="mt-4 bg-gradient-to-r from-accent-gold/90 to-accent-gold rounded-xl px-8 py-3 text-bg-primary font-bold uppercase active:scale-[0.98] transition-all"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
