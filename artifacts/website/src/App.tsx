import { useState, useEffect, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";
import { useAuthStore } from "@/lib/store";
import { refreshSession } from "@/lib/authApi";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Lobby from "@/pages/Lobby";
import Room from "@/pages/Room";
import Admin from "@/pages/Admin";
import DownloadApp from "@/pages/DownloadApp";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function RequireAuth({ children }: { children: ReactNode }) {
  const [path, setLocation] = useLocation();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.token) return;
    const code = /\/room\/([^/?]+)/.exec(path)?.[1];
    const target = code
      ? `/login?invite=${encodeURIComponent(code)}`
      : `/login?next=${encodeURIComponent(path)}`;
    setLocation(target, { replace: true });
  }, [user, path, setLocation]);

  if (!user?.token) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/download" component={DownloadApp} />
      <Route path="/login" component={Login} />
      <Route path="/lobby">
        <RequireAuth><Lobby /></RequireAuth>
      </Route>
      <Route path="/room/:inviteCode">
        <RequireAuth><Room /></RequireAuth>
      </Route>
      <Route path="/admin">
        <RequireAuth><Admin /></RequireAuth>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Register service worker for PWA/offline support
function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

// Request notification permission for offline track alerts
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    // Delay so user isn't immediately bombarded
    setTimeout(() => Notification.requestPermission(), 4000);
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    registerSW();
    requestNotificationPermission();
    void refreshSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Splash screen — shows on first load */}
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
