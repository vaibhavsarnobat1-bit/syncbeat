import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const HEALTH_URL = "/api/healthz";

const container = document.getElementById("root")!;
if (!container) throw new Error("Root element missing");

// Mount the app immediately — never block the UI waiting for the backend.
// The home page, PWA shell and offline-local-song features all work before the
// API is up, so forcing the visitor to stare at a "Waking the server" screen is
// unnecessary and feels like a failure to start.
createRoot(container).render(<App />);

// Warm the backend in the background so later requests are fast, without ever
// gating the first paint on it.
let warmed = false;
async function warmServer() {
  if (warmed) return;
  try {
    const res = await fetch(HEALTH_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) warmed = true;
  } catch {
    /* backend not up yet — the app surfaces its own connection states */
  }
}
warmServer();
