# LIAR'S BAR

A real-time multiplayer bluffing game for mobile browsers. Play cards or dice, call out liars, and survive Russian roulette.

**[Play now at lair.shahar.sh](https://lair.shahar.sh)**

## Game Modes

### Liar's Deck
Each round, a table card is revealed. Players take turns playing 1-3 cards face-down, claiming they match the table card. You can bluff — but if someone calls **LIAR!** and you're caught, you pull the trigger. Jokers are wild.

### Liar's Dice
Each player rolls hidden dice. Players take turns bidding on the total count of a face value across *all* players' dice. Raise the bid or challenge it. 1s are wild. A wrong challenge or a busted bid means the revolver.

### Russian Roulette
The punishment mechanic. A 6-chamber revolver with one bullet. Each wrong call advances the chamber. Survive the click or get eliminated.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.12, FastAPI, WebSockets, Pydantic |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand |
| Infra | Docker, Render.com, Cloudflare DNS |

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── app/
│   │   ├── config.py            # Settings (env vars)
│   │   ├── game_logic/
│   │   │   ├── deck_engine.py   # Liar's Deck logic
│   │   │   ├── dice_engine.py   # Liar's Dice logic
│   │   │   └── roulette.py      # Revolver mechanics
│   │   ├── managers/
│   │   │   ├── connection.py    # WebSocket connections
│   │   │   ├── game.py          # Game lifecycle
│   │   │   └── table.py         # Table CRUD
│   │   ├── models/              # Pydantic models
│   │   ├── routers/
│   │   │   ├── lobby.py         # REST endpoints
│   │   │   └── ws.py            # WebSocket endpoint
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/               # NicknamePage, LobbyPage, TablePage, GamePage
│   │   ├── stores/              # Zustand stores (session, lobby, table, game)
│   │   ├── api/                 # HTTP + WebSocket clients
│   │   └── hooks/               # useWebSocket
│   └── index.html
├── Dockerfile                   # Multi-stage build
└── README.md
```

## Running Locally

### Prerequisites

- Python 3.11+ with [Poetry](https://python-poetry.org/)
- Node.js 20+
- Docker (optional)

### Development

**Backend:**

```bash
cd backend
poetry install
poetry run uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173` and proxies API calls to the backend.

### Docker

```bash
docker build -t liars-bar .
docker run -p 10000:10000 -e ENV=prod liars-bar
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENV` | `dev` | `dev` or `prod` |
| `TURN_TIMEOUT_SECONDS` | `30` | Turn timer |
| `MAX_PLAYERS_PER_TABLE` | `4` | Max players per table |
| `MIN_PLAYERS_TO_START` | `2` | Min players to start |

## Tests

```bash
cd backend
poetry run pytest tests/ -v
```

## Architecture

- **No auth** — players enter a nickname and get a session cookie
- **All game logic is server-side** — clients receive filtered state (can't see other players' cards/dice)
- **WebSocket protocol** — real-time events for game state, turns, reveals, and roulette
- **Monolith deploy** — FastAPI serves the built React SPA in production

## License

MIT
