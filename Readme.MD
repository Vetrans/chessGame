# 1v1 Online Chess

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-brightgreen?style=for-the-badge&logo=render)](https://chess-1v1-uuwz.onrender.com)

A clean, minimal, production-ready real-time 1v1 chess web application. Play instantly with friends via private room codes or match into games via Quick Play.

🔗 **Live Production URL**: [https://chess-1v1-uuwz.onrender.com](https://chess-1v1-uuwz.onrender.com)

---

## Features

- **Live Multiplayer**: Real-time bidirectional gameplay powered by WebSockets (`wss://`).
- **Quick Play (Join Random Game)**: One-click matching into any waiting game room, or automatic room creation if none are waiting.
- **Live Player Counts**: Real-time counter on the home page showing players waiting in the lobby and players currently active in matches.
- **Private Rooms**: Generate 6-letter room codes (e.g. `6NTSWS`) to invite friends with one-click copy.
- **Premove Support**:
  - Queue moves while your opponent is thinking.
  - Distinct visual highlighting for queued premoves.
  - **0.01-Second Time Rule**: Authoritative clock deduction of exactly 0.01s (10ms) when a premove executes.
  - Right-click or click elsewhere to cancel.
- **Authoritative 10-Minute Game Clocks**:
  - Synchronized 10+0 rapid clocks for both players.
  - Digital timer displays with color-coded warning states (`< 30s` amber, `< 10s` red pulse with tenths-of-a-second precision).
  - Server-enforced timeout flagging.
- **Minimalist In-Game Header**:
  - Room code is hidden during play for a distraction-free experience.
  - **Flip**: Swaps board perspective between White and Black.
  - **Sound**: Toggles synthesized Web Audio sound effects (moves, captures, checks, premoves, victory/defeat).
  - **Draw**: Offer or accept draw agreements.
  - **Resign**: Forfeit match with safety confirmation modal.
- **Authoritative Chess Rules**: Server is the single source of truth for move legality, turn enforcement, check, checkmate, stalemate, threefold repetition, and insufficient material using `chess.js`.
- **Clean Aesthetic & Responsive**: Tournament slate/wood palette with crisp vector SVG pieces, legal move dots, capture rings, and full mobile/touch responsiveness.

---

## Tech Stack

- **Frontend**: React 18, Vite, JavaScript, WebSocket client, Web Audio API, Lucide icons, chess.js.
- **Backend**: Node.js, Express, WebSocket (`ws`), chess.js (authoritative engine).
- **Storage**: In-memory JavaScript `Map` (zero database, fast and stateless).
- **Hosting**: Render ([https://chess-1v1-uuwz.onrender.com](https://chess-1v1-uuwz.onrender.com)).

---

## Getting Started (Local Development)

### 1. Install Dependencies

From the project root:
```bash
npm run install:all
```

### 2. Run Locally

Start both the backend server and frontend client concurrently with a single command:

```bash
npm run dev
```

- **Backend (Express + WebSocket)**: `http://localhost:3001` (`ws://localhost:3001`)
- **Frontend (Vite + React)**: `http://localhost:5173`

You can also run them independently if desired:
- `npm run dev:server` (Server only)
- `npm run dev:client` (Client only)

### 3. Run Automated Tests

Run the full integration test suite:

```bash
cd server
node test-gameplay.js
```

---

## Deployment (Render)

The application is deployed on Render as a single unified web service serving both the static React build and the WebSocket server.

- **Live URL**: [https://chess-1v1-uuwz.onrender.com](https://chess-1v1-uuwz.onrender.com)
- **Health Check**: `https://chess-1v1-uuwz.onrender.com/health`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

---

## WebSocket Protocol

### Client → Server
- `create_game`: `{ type: "create_game" }`
- `join_game`: `{ type: "join_game", roomId: "ABC123" }`
- `join_random_game`: `{ type: "join_random_game" }`
- `make_move`: `{ type: "make_move", roomId: "ABC123", from: "e2", to: "e4", promotion: "q", isPremove: false }`
- `offer_draw`: `{ type: "offer_draw", roomId: "ABC123" }`
- `resign`: `{ type: "resign", roomId: "ABC123" }`
- `leave_game`: `{ type: "leave_game", roomId: "ABC123" }`

### Server → Client
- `server_stats`: `{ type: "server_stats", waiting: 1, playing: 2 }`
- `game_created`: `{ type: "game_created", roomId: "ABC123", color: "white" }`
- `game_started`: `{ type: "game_started", roomId: "ABC123", color: "white"|"black", state: {...} }`
- `game_state`: `{ type: "game_state", fen, turn, inCheck, isGameOver, gameOver, lastMove, clocks, history }`
- `draw_offered`: `{ type: "draw_offered", from: "white" }`
- `game_over`: `{ type: "game_over", result, winner }`
- `opponent_disconnected`: `{ type: "opponent_disconnected", message }`
- `error`: `{ type: "error", message }`
