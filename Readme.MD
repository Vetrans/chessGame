# 1v1 Online Chess

A clean, minimal, production-ready real-time 1v1 chess web application. Exactly two players can play against each other through a private game room with an authoritative Node.js backend.

## Tech Stack

- **Frontend**: React 18, Vite, JavaScript, WebSocket client, CSS, chess.js, Lucide icons.
- **Backend**: Node.js, Express, WebSocket (`ws`), chess.js (authoritative rules & state).
- **Storage**: In-memory JavaScript `Map` (no database required).

## Features

- **Private Rooms**: Generate 6-character room codes (e.g. `KT2HPT`) with one-click copy.
- **Authoritative Server**: Server validates turn order, move legality, check, checkmate, stalemate, and draw conditions.
- **Dynamic Board Orientation**: Board automatically orients based on assigned player color (White at bottom for White player, Black at bottom for Black player).
- **Visual Feedback**:
  - Selected square highlight
  - Legal move dots and capture rings
  - Last move highlight
  - Check warning glow on king
  - Pawn promotion selector modal (Queen, Rook, Bishop, Knight)
  - Real-time move history in Standard Algebraic Notation (SAN)
- **Disconnect & Leave Handling**: Gracefully notifies the opponent and cleans up memory when a player disconnects or leaves.
- **Responsive Design**: Optimized for desktop and mobile screen dimensions.

## Getting Started

### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

Or from the root directory:
```bash
npm run install:all
```

### 2. Run the Application

You can now start both the server and client concurrently with a single command from the project root:

```bash
npm run dev
```

This starts:
- **Backend (Express + WebSocket)** on `http://localhost:3001` (`ws://localhost:3001`)
- **Frontend (Vite + React)** on `http://localhost:5173`

You can still run them independently if needed:
- `npm run dev:server` (Server only)
- `npm run dev:client` (Client only)

### 3. Run Automated Tests

To run the backend integration test verifying room creation, joining, move validation, turn enforcement, illegal move rejection, Scholar's mate, and disconnect handling:

```bash
cd server
node test-gameplay.js
```

## WebSocket Protocol

### Client → Server
- `create_game`: `{ type: "create_game" }`
- `join_game`: `{ type: "join_game", roomId: "ABC123" }`
- `make_move`: `{ type: "make_move", roomId: "ABC123", from: "e2", to: "e4", promotion: "q" }`
- `leave_game`: `{ type: "leave_game", roomId: "ABC123" }`

### Server → Client
- `game_created`: `{ type: "game_created", roomId: "ABC123", color: "white" }`
- `game_started`: `{ type: "game_started", roomId: "ABC123", color: "white"|"black", state: {...} }`
- `game_state`: `{ type: "game_state", fen, turn, inCheck, isGameOver, gameOver, lastMove, history }`
- `game_over`: `{ type: "game_over", result, winner }`
- `opponent_disconnected`: `{ type: "opponent_disconnected", message }`
- `error`: `{ type: "error", message }`

## Deployment to Render

This application is pre-configured to deploy on [Render](https://render.com) as a single, unified web service (or via Render Blueprints).

### Option 1: 1-Click Blueprint (Recommended)
1. Push your repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and configure the web service with all build and start commands.
6. Click **Apply**.

### Option 2: Manual Web Service Setup
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `chess-1v1` (or your preferred name)
   - **Region**: Any (e.g. Oregon, Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Under **Advanced**:
   - **Health Check Path**: `/health`
5. Click **Create Web Service**.

Once deployed, visit your Render URL (e.g. `https://your-chess-app.onrender.com`). The frontend automatically detects the `wss://` protocol and connects to the backend without any manual configuration!

