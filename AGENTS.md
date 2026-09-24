# SyncBeat - AI Quick Start & Project Guide

> **IMPORTANT FOR ALL AI ASSISTANTS**: Read this file first! Do NOT spend time exploring directories or reading arbitrary files. Everything needed to start and understand this repository is documented below.

---

## 🚀 Quick Start Commands (Instant Launch)

The project source code is located inside `home/runner/workspace`.

### 1. Start Both Frontend & Backend (Recommended)
Run this single command from `home/runner/workspace`:
```powershell
pnpm --parallel --filter "./artifacts/**" run dev
```
Or run:
```powershell
pnpm run dev
```

### 2. Start Services Individually
- **Website (Frontend)**:
  - Directory: `home/runner/workspace/artifacts/website`
  - Command: `pnpm run dev`
  - URL: `http://localhost:5173`
- **API Server & WebSocket (Backend)**:
  - Directory: `home/runner/workspace/artifacts/api-server`
  - Command: `pnpm run dev`
  - Port: `3001` (WebSocket at `ws://localhost:3001/api/ws`)

---

## 📁 Repository Structure & Key Files

```text
syncbeat-full-source/
├── AGENTS.md                          <-- THIS FILE (AI Guidelines & Cheat Sheet)
├── start-dev.bat                      <-- 1-Click launcher for Windows
├── home/runner/workspace/             <-- Monorepo Root
│   ├── .env                           <-- Database & Port config
│   ├── artifacts/
│   │   ├── website/                   <-- React + Vite Frontend App
│   │   │   └── src/
│   │   │       ├── pages/Room.tsx     <-- Main listening room & music sync
│   │   │       ├── pages/Lobby.tsx    <-- Room creation & browsing
│   │   │       ├── pages/Login.tsx    <-- User login
│   │   │       ├── components/player/YouTubePlayer.tsx <-- YouTube sync player
│   │   │       └── hooks/use-websocket.ts <-- Client WebSocket handling
│   │   ├── api-server/                <-- Express 5 + WebSocket Backend
│   │   │   └── src/
│   │   │       ├── lib/websocket.ts   <-- Real-time room broadcast & events
│   │   │       ├── lib/rooms.ts       <-- Room state & playback time math
│   │   │       └── routes/            <-- Search, Auth & Admin REST routes
│   │   └── mockup-sandbox/            <-- Design previews & sandbox
│   ├── lib/                           <-- Shared packages (api-spec, zod, db)
│   ├── package.json                   <-- Root monorepo scripts
│   └── pnpm-workspace.yaml
```

---

## ⚙️ Key Technical Context

1. **Monorepo Manager**: `pnpm` workspaces (Node v24+).
2. **Ports**:
   - Frontend: `5173` (proxies `/api` to `http://localhost:3001`)
   - Backend: `3001`
3. **Environment**:
   - `.env` in `home/runner/workspace/.env` contains `PORT=3001`, `DATABASE_URL`, `ADMIN_SECRET`.
4. **WebSocket Protocol**:
   - Path: `/api/ws?roomId=<id>&userId=<id>&displayName=<name>&avatarColor=<color>`
   - Events: `play`, `pause`, `seek`, `track_change`, `queue_add`, `queue_skip`, `reaction`, `chat`, `voice_state`.
5. **Playback Syncing Rules**:
   - When remote `play`/`pause` is received, `YouTubePlayer.tsx` suppresses local `onStateChange` echo loops for 1.2 seconds using `remoteLockUntilRef`.
   - Play/pause state changes are transmitted instantly with timestamp to prevent out-of-order latency drift.
