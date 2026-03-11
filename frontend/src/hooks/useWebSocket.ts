import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { wsClient } from '../api/ws'
import { useSessionStore } from '../stores/session'
import { useTableStore } from '../stores/table'
import { useGameStore } from '../stores/game'

export function useWebSocket(tableId: string) {
  const sessionId = useSessionStore((s) => s.sessionId)
  const navigate = useNavigate()

  useEffect(() => {
    if (!sessionId || !tableId) return

    wsClient.connect(tableId, sessionId)

    const unsubs = [
      wsClient.on('table_state', (data) => {
        useTableStore.getState().setTable(data)
      }),
      wsClient.on('player_joined', (data) => {
        useTableStore.getState().addPlayer(data)
      }),
      wsClient.on('player_left', (data) => {
        useTableStore.getState().removePlayer(data.session_id)
      }),
      wsClient.on('table_closed', () => {
        useTableStore.getState().clear()
        navigate('/lobby', { replace: true })
      }),
      wsClient.on('game_state', (data) => {
        useGameStore.getState().setGameState(data)
      }),
      wsClient.on('turn_start', (data) => {
        const gs = useGameStore.getState().gameState
        if (gs) {
          useGameStore.getState().setGameState({ ...gs, current_turn: data.player_id })
        }
      }),
      wsClient.on('cards_played', () => {
        // Will be followed by game_state update
      }),
      wsClient.on('liar_called', () => {}),
      wsClient.on('cards_revealed', (data) => {
        useGameStore.getState().setRevealedCards(data)
      }),
      wsClient.on('bid_placed', () => {}),
      wsClient.on('bid_challenged', () => {}),
      wsClient.on('dice_revealed', (data) => {
        useGameStore.getState().setRevealedDice(data)
      }),
      wsClient.on('roulette_result', (data) => {
        useGameStore.getState().setRouletteResult(data)
      }),
      wsClient.on('player_eliminated', () => {}),
      wsClient.on('round_starting', () => {}),
      wsClient.on('game_over', (data) => {
        useGameStore.getState().setGameOver(data)
      }),
      wsClient.on('error', (data) => {
        console.error('Server error:', data.message)
      }),
    ]

    return () => {
      unsubs.forEach((fn) => fn())
      wsClient.disconnect()
      useTableStore.getState().clear()
      useGameStore.getState().clear()
    }
  }, [tableId, sessionId, navigate])
}
