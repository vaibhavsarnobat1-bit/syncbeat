import { createRoot } from "react-dom/client";
import App from "./App";
import BootBlocked from "./components/BootBlocked";
import "./index.css";

const HEALTH_URL = "/api/healthz";
const PROBE_TIMEOUT_MS = 6000;
const PROBE_GAP_MS = 1500;
const GIVE_UP_MS = 60000;
const KEEP_TRYING_GAP_MS = 4000;

const container = document.getElementById("root")!;
const root = createRoot(container);
const statusEl = document.getElementById("boot-status");

let mounted = false;
let keepTrying: ReturnType<typeof setInterval> | null = null;

function isAwake(): Promise<boolean> {
  return fetch(HEALTH_URL, { cache: "no-store", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    .then((res) => res.ok)
    .catch(() => false);
}

function mountApp() {
  if (mounted) return;
  mounted = true;
  if (keepTrying) clearInterval(keepTrying);
  root.render(<App />);
}

async function waitForServer(): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < GIVE_UP_MS) {
    if (await isAwake()) return true;
    if (statusEl) statusEl.textContent = `Waking the server · ${Math.round((Date.now() - started) / 1000)}s`;
    await new Promise((r) => setTimeout(r, PROBE_GAP_MS));
  }
  return false;
}

async function boot() {
  if (statusEl) statusEl.textContent = "";
  if (await waitForServer()) return mountApp();

  root.render(<BootBlocked onRetry={boot} onOpenAnyway={mountApp} />);

  // The visitor should never have to press anything: keep probing until it wakes.
  if (!keepTrying) {
    keepTrying = setInterval(() => {
      isAwake().then((awake) => { if (awake) mountApp(); });
    }, KEEP_TRYING_GAP_MS);
  }
}

boot();
