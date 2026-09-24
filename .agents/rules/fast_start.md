# AI Agent Fast-Start Rule for SyncBeat

Whenever the user asks to start, run, or debug the website or app:
1. **Never spend time re-exploring the directory hierarchy.**
2. **Project Working Directory**: `c:\vaibhav project\syncbeat-full-source\home\runner\workspace`.
3. **Start Command**:
   ```powershell
   pnpm run dev
   ```
   (Runs both `@workspace/website` on port 5173 and `@workspace/api-server` on port 3001 in parallel).
4. **Key files**:
   - `artifacts/website/src/pages/Room.tsx` (Room UI & state)
   - `artifacts/website/src/components/player/YouTubePlayer.tsx` (Playback sync logic)
   - `artifacts/website/src/hooks/use-websocket.ts` (WebSocket hook)
   - `artifacts/api-server/src/lib/websocket.ts` (WebSocket server)
   - `artifacts/api-server/src/lib/rooms.ts` (Room state & DB sync)
