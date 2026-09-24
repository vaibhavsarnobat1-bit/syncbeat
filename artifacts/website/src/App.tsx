import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from "@/components/SplashScreen";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/download" component={DownloadApp} />
      <Route path="/login" component={Login} />
      <Route path="/lobby" component={Lobby} />
      <Route path="/room/:inviteCode" component={Room} />
      <Route path="/admin" component={Admin} />
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
