export interface Player {
  session_id: string
  nickname: string
  avatar?: string
  is_alive?: boolean
  revolver?: { chambers: number; shots_fired: number }
}

export interface TableInfo {
  table_id: string
  name: string
  game_mode: 'deck' | 'dice'
  status: 'waiting' | 'in_game'
  host_session_id: string
  players: Player[]
  max_players: number
}

export interface TableSummary {
  table_id: string
  name: string
  game_mode: 'deck' | 'dice'
  status: 'waiting' | 'in_game'
  player_count: number
  max_players: number
  player_nicknames: string[]
  player_avatars: string[]
}

export interface DeckGameState {
  game_mode: 'deck'
  phase: string
  round_number: number
  table_card: string
  your_hand: string[]
  hand_sizes: Record<string, number>
  current_turn: string | null
  last_play: { player_id: string; count: number } | null
  players: Player[]
  eliminated: string[]
}

export interface DiceGameState {
  game_mode: 'dice'
  phase: string
  round_number: number
  your_dice: number[]
  dice_counts: Record<string, number>
  current_turn: string | null
  current_bid: { player_id: string; quantity: number; face_value: number } | null
  bid_history: { player_id: string; quantity: number; face_value: number }[]
  players: Player[]
  eliminated: string[]
}

export type GameState = DeckGameState | DiceGameState
