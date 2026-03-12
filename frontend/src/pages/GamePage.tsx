import { useEffect, useState, useMemo, useRef } from 'react'
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
  const chamberOrbitR = 17
  const chamberR = 5

  return (
    <svg
      viewBox="0 0 240 120"
      className="w-full max-w-[280px]"
      style={hammerFall && !survived ? { animation: 'gun-recoil 0.4s ease-out' } : undefined}
    >
      <defs>
        {/* Blued steel — 7-stop dark with subtle blue tint */}
        <linearGradient id="blued-steel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="15%" stopColor="#2a2a40" />
          <stop offset="35%" stopColor="#3d3d58" />
          <stop offset="50%" stopColor="#4a4a6a" />
          <stop offset="65%" stopColor="#3d3d58" />
          <stop offset="85%" stopColor="#2a2a40" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </linearGradient>
        {/* Gunmetal frame — neutral dark chrome */}
        <linearGradient id="gunmetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C3539" />
          <stop offset="20%" stopColor="#3a4248" />
          <stop offset="40%" stopColor="#4a5560" />
          <stop offset="50%" stopColor="#556068" />
          <stop offset="60%" stopColor="#4a5560" />
          <stop offset="80%" stopColor="#3a4248" />
          <stop offset="100%" stopColor="#2C3539" />
        </linearGradient>
        {/* Barrel top specular */}
        <linearGradient id="barrel-spec" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Dark walnut grip — 5-stop rich wood */}
        <linearGradient id="walnut" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#6c3919" />
          <stop offset="25%" stopColor="#854c23" />
          <stop offset="50%" stopColor="#7a4420" />
          <stop offset="75%" stopColor="#5d3218" />
          <stop offset="100%" stopColor="#4a2a12" />
        </linearGradient>
        {/* Cylinder face — radial for curved-metal depth */}
        <radialGradient id="cyl-face" cx="0.4" cy="0.35" r="0.65">
          <stop offset="0%" stopColor="#3a3a50" />
          <stop offset="60%" stopColor="#2a2a3e" />
          <stop offset="100%" stopColor="#1a1a2a" />
        </radialGradient>
        {/* Chamber radials */}
        <radialGradient id="ch-empty">
          <stop offset="0%" stopColor="#08080f" />
          <stop offset="80%" stopColor="#0a0a14" />
          <stop offset="100%" stopColor="#1a1a28" />
        </radialGradient>
        <radialGradient id="ch-fired">
          <stop offset="0%" stopColor="rgba(212,168,83,0.85)" />
          <stop offset="60%" stopColor="rgba(212,168,83,0.5)" />
          <stop offset="100%" stopColor="rgba(180,140,60,0.25)" />
        </radialGradient>
        <radialGradient id="ch-fatal">
          <stop offset="0%" stopColor="#ff4444" />
          <stop offset="50%" stopColor="#E53E3E" />
          <stop offset="100%" stopColor="#aa2222" />
        </radialGradient>
        {/* Muzzle flash radial */}
        <radialGradient id="mz-flash">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#FFE4A0" />
          <stop offset="50%" stopColor="#F5C563" />
          <stop offset="80%" stopColor="#E8872A" />
          <stop offset="100%" stopColor="rgba(229,62,62,0)" />
        </radialGradient>
        {/* Soft drop shadow */}
        <filter id="gun-shadow" x="-3%" y="-3%" width="110%" height="115%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#gun-shadow)">
        {/* ═══ BARREL ═══ */}
        <path d="M94 35 L232 35 Q235 35 235 38 L235 51 Q235 54 232 54 L94 54 Z" fill="url(#blued-steel)" />
        {/* Barrel undercut shadow */}
        <rect x="94" y="49" width="141" height="5" rx="1" fill="#1a1a28" opacity="0.35" />
        {/* Ventilated rib */}
        <rect x="94" y="32" width="141" height="4" rx="1.5" fill="url(#gunmetal)" />
        {/* Rib serrations */}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`r${i}`} x1={100 + i * 7.5} y1="32" x2={100 + i * 7.5} y2="36" stroke="#1a1a2e" strokeWidth="0.6" opacity="0.5" />
        ))}
        {/* Barrel specular highlight */}
        <rect x="94" y="36" width="141" height="1.5" rx="0.5" fill="url(#barrel-spec)" />
        {/* Front sight — ramped blade */}
        <path d="M230 28 L234 28 L233 35 L231 35 Z" fill="#4a4a5a" />
        <path d="M231 29 L233 29 L232.5 34 L231.5 34 Z" fill="rgba(255,255,255,0.07)" />
        {/* Ejector rod housing */}
        <rect x="94" y="54" width="95" height="2.5" rx="1" fill="#2a2a3e" />
        <circle cx="189" cy="55.25" r="2" fill="#3a3a4e" stroke="#4a4a5a" strokeWidth="0.3" />

        {/* ═══ FRAME ═══ */}
        <path
          d="M30 26 Q32 24 95 26 L95 56 L88 56 Q86 56 85 58 L80 100 Q79 103 76 103 L58 103 Q55 103 54.5 100 L51 65 Q50 60 48 58 L33 56 Q30 54 30 50 Z"
          fill="url(#gunmetal)" stroke="#4a4a5a" strokeWidth="0.4"
        />
        {/* Frame top-edge highlight */}
        <path d="M34 27 Q36 25.5 95 27" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
        {/* Frame panel line */}
        <line x1="92" y1="30" x2="92" y2="55" stroke="#3a3a4a" strokeWidth="0.5" opacity="0.5" />

        {/* ═══ CYLINDER WINDOW ═══ */}
        <ellipse cx={cylCx} cy={cylCy} rx="26" ry="21" fill="#06060c" />

        {/* ═══ CYLINDER (rotates) ═══ */}
        <g
          style={
            spinning
              ? { animation: 'cylinder-spin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards', transformOrigin: `${cylCx}px ${cylCy}px` }
              : undefined
          }
        >
          {/* Cylinder body */}
          <circle cx={cylCx} cy={cylCy} r={chamberOrbitR + 4} fill="url(#cyl-face)" />
          <circle cx={cylCx} cy={cylCy} r={chamberOrbitR + 4} fill="none" stroke="#4a4a5e" strokeWidth="0.6" />
          <circle cx={cylCx} cy={cylCy} r={chamberOrbitR + 3} fill="none" stroke="#1a1a2a" strokeWidth="0.3" />
          {/* Fluting lines between chambers */}
          {Array.from({ length: chambers }).map((_, i) => {
            const a = ((i * 360) / chambers - 90 + 180 / chambers) * (Math.PI / 180)
            return (
              <line key={`f${i}`}
                x1={cylCx + (chamberOrbitR - 4) * Math.cos(a)} y1={cylCy + (chamberOrbitR - 4) * Math.sin(a)}
                x2={cylCx + (chamberOrbitR + 3) * Math.cos(a)} y2={cylCy + (chamberOrbitR + 3) * Math.sin(a)}
                stroke="#1a1a2a" strokeWidth="0.5" opacity="0.4"
              />
            )
          })}
          {/* Center pin */}
          <circle cx={cylCx} cy={cylCy} r="3.5" fill="#1a1a2a" />
          <circle cx={cylCx} cy={cylCy} r="2.5" fill="#2a2a3e" stroke="#3a3a4e" strokeWidth="0.4" />
          <circle cx={cylCx} cy={cylCy} r="1" fill="#3a3a4e" />
          {/* Chambers */}
          {Array.from({ length: chambers }).map((_, i) => {
            const angle = (i * 360) / chambers - 90
            const cx = cylCx + chamberOrbitR * Math.cos((angle * Math.PI) / 180)
            const cy = cylCy + chamberOrbitR * Math.sin((angle * Math.PI) / 180)
            const isFatal = i === shotsFired - 1 && !survived
            const isFired = i < shotsFired
            return (
              <g key={i}>
                {/* Bevel ring */}
                <circle cx={cx} cy={cy} r={chamberR + 1} fill="none"
                  stroke={isFatal ? '#ff4444' : isFired ? '#D4A853' : '#2a2a3e'} strokeWidth="0.6" />
                {/* Chamber hole */}
                <circle cx={cx} cy={cy} r={chamberR}
                  fill={isFatal ? 'url(#ch-fatal)' : isFired ? 'url(#ch-fired)' : 'url(#ch-empty)'}
                  stroke={isFatal ? '#ff6666' : isFired ? '#D4A853' : '#2a2a3e'} strokeWidth="0.8" />
                {/* Unfired primer detail */}
                {!isFired && (
                  <>
                    <circle cx={cx} cy={cy} r="2" fill="#1a1a28" />
                    <circle cx={cx} cy={cy} r="1" fill="#2a2a3e" stroke="#3a3a4a" strokeWidth="0.3" />
                  </>
                )}
                {/* Fatal glow pulse */}
                {isFatal && (
                  <circle cx={cx} cy={cy} r={chamberR + 2} fill="none" stroke="#E53E3E" strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" from={`${chamberR}`} to={`${chamberR + 6}`} dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Fired residue */}
                {isFired && !isFatal && <circle cx={cx} cy={cy} r="1.5" fill="#D4A853" opacity="0.15" />}
              </g>
            )
          })}
        </g>
        {/* Cylinder window inner shadow ring */}
        <ellipse cx={cylCx} cy={cylCy} rx="26" ry="21" fill="none" stroke="#000" strokeWidth="2" opacity="0.3" />

        {/* ═══ HAMMER ═══ */}
        <g
          style={
            hammerFall
              ? { animation: 'hammer-fall 0.15s ease-in forwards', transformOrigin: '38px 28px' }
              : undefined
          }
        >
          <path d="M34 28 Q33 26 28 18 L26 14 Q25 12 27 11 L32 11 Q34 11 34 13 L38 24 Z"
            fill="url(#gunmetal)" stroke="#5a5a6a" strokeWidth="0.4" />
          {/* Spur */}
          <rect x="24" y="10" width="10" height="2.5" rx="0.5" fill="#4a5560" transform="rotate(-12 29 11.25)" />
          {/* Spur serrations */}
          {[0, 1, 2, 3].map((i) => (
            <line key={`s${i}`} x1={25.5 + i * 2} y1="9.5" x2={25.5 + i * 2} y2="12"
              stroke="#2C3539" strokeWidth="0.5" opacity="0.6" transform="rotate(-12 29 11.25)" />
          ))}
        </g>

        {/* ═══ GRIP ═══ */}
        <path
          d="M54 56 L84 56 Q85 56 85 57 L80 100 Q79 104 76 104 L58 104 Q55 104 54 100 L49 65 Q48 60 50 57 Z"
          fill="url(#walnut)" stroke="#3a2210" strokeWidth="0.5"
        />
        {/* Curved wood grain */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <path key={`g${i}`}
            d={`M${55 + i * 0.2} ${61 + i * 5} Q${67} ${60 + i * 5 + (i % 2 ? 1.2 : -1)} ${80 - i * 0.4} ${61 + i * 5}`}
            fill="none" stroke="#3a1a08" strokeWidth="0.4" opacity={0.25 + (i % 3) * 0.1} />
        ))}
        {/* Grip medallion */}
        <circle cx="67" cy="80" r="4" fill="#4a2a12" stroke="#D4A853" strokeWidth="0.5" opacity="0.6" />
        <circle cx="67" cy="80" r="2.5" fill="none" stroke="#D4A853" strokeWidth="0.3" opacity="0.4" />
        <circle cx="67" cy="80" r="1" fill="#D4A853" opacity="0.35" />
        {/* Grip top highlight */}
        <path d="M55 57 L83 57" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />

        {/* ═══ TRIGGER GUARD ═══ */}
        <path d="M63 56 Q61 68 63 76 Q65 82 72 82 Q79 82 81 76 L84 56"
          fill="none" stroke="url(#gunmetal)" strokeWidth="2" strokeLinecap="round" />
        <path d="M64 58 Q62 68 64 75" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        {/* Trigger */}
        <path d="M71 56 L71.5 68 Q71.5 72 70 73 Q68.5 74 67 72 L67 56" fill="#4a5560" stroke="#5a6570" strokeWidth="0.3" />
        {/* Trigger serrations */}
        <line x1="68" y1="62" x2="71" y2="62" stroke="#2C3539" strokeWidth="0.4" opacity="0.5" />
        <line x1="68" y1="64.5" x2="71" y2="64.5" stroke="#2C3539" strokeWidth="0.4" opacity="0.5" />
        <line x1="68" y1="67" x2="71" y2="67" stroke="#2C3539" strokeWidth="0.4" opacity="0.5" />
      </g>

      {/* ═══ MUZZLE FLASH ═══ */}
      {showFlash && (
        <g>
          {/* White-hot core */}
          <circle cx="237" cy="44" r="4" fill="white" opacity="0.95">
            <animate attributeName="r" from="3" to="12" dur="0.25s" fill="freeze" />
            <animate attributeName="opacity" from="0.95" to="0" dur="0.25s" fill="freeze" />
          </circle>
          {/* Fiery glow */}
          <circle cx="237" cy="44" r="6" fill="url(#mz-flash)" opacity="0.85">
            <animate attributeName="r" from="4" to="28" dur="0.35s" fill="freeze" />
            <animate attributeName="opacity" from="0.85" to="0" dur="0.35s" fill="freeze" />
          </circle>
          {/* Spark rays */}
          {[0, 40, 80, 140, 180, 220, 280, 320].map((deg) => {
            const rad = (deg * Math.PI) / 180
            return (
              <line key={deg} x1="237" y1="44"
                x2={237 + 8 * Math.cos(rad)} y2={44 + 8 * Math.sin(rad)}
                stroke="#F5C563" strokeWidth="1" opacity="0.7" strokeLinecap="round">
                <animate attributeName="x2" from={`${237 + 4 * Math.cos(rad)}`} to={`${237 + 22 * Math.cos(rad)}`} dur="0.3s" fill="freeze" />
                <animate attributeName="y2" from={`${44 + 4 * Math.sin(rad)}`} to={`${44 + 22 * Math.sin(rad)}`} dur="0.3s" fill="freeze" />
                <animate attributeName="opacity" from="0.7" to="0" dur="0.3s" fill="freeze" />
              </line>
            )
          })}
        </g>
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
  const clearRevealedCards = useGameStore((s) => s.clearRevealedCards)
  const clearRevealedDice = useGameStore((s) => s.clearRevealedDice)
  const clearRouletteResult = useGameStore((s) => s.clearRouletteResult)

  useWebSocket(tableId!)

  // Auto-clear liar called flash after 2s
  useEffect(() => {
    if (liarCalled) {
      const t = setTimeout(() => useGameStore.getState().setLiarCalled(null), 2000)
      return () => clearTimeout(t)
    }
  }, [liarCalled])

  // Roulette: 3.5s phases + 5s result viewing = 8.5s total
  useEffect(() => {
    if (rouletteResult) {
      const t = setTimeout(clearRouletteResult, 8500)
      return () => clearTimeout(t)
    }
  }, [rouletteResult, clearRouletteResult])

  // Card reveal: 5.5s to read the result
  useEffect(() => {
    if (revealedCards) {
      const t = setTimeout(clearRevealedCards, 5500)
      return () => clearTimeout(t)
    }
  }, [revealedCards, clearRevealedCards])

  // Dice reveal: 5.5s to read the result
  useEffect(() => {
    if (revealedDice) {
      const t = setTimeout(clearRevealedDice, 5500)
      return () => clearTimeout(t)
    }
  }, [revealedDice, clearRevealedDice])

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

  // Reset pending state and clear stale selections on new round
  const roundRef = useRef(gameState.round_number)
  useEffect(() => {
    setPending(false)
    if (gameState.round_number !== roundRef.current) {
      setSelectedCards([])
      roundRef.current = gameState.round_number
    }
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
            <svg viewBox="0 0 20 14" className="inline-block w-5 h-3.5 mr-1.5 -mt-0.5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="4" width="14" height="3.5" rx="0.5" fill="currentColor" opacity="0.85" />
              <circle cx="5.5" cy="5.75" r="3.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.7" />
              <path d="M7 8.5 L6 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              <path d="M5.5 8.5 Q7 9.5 8.5 8.5" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.5" />
              <rect x="17" y="3" width="1.5" height="2" rx="0.3" fill="currentColor" opacity="0.6" />
            </svg>
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
      style={{ animation: 'liar-bg-flash 2s ease-out forwards' }}
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
