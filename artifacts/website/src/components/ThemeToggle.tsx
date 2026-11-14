import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export type Theme = "dark" | "light";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("syncbeat-theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  // Default to dark as SyncBeat is music-first, but respects system if user prefers light
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
  localStorage.setItem("syncbeat-theme", theme);
}

export function useThemeState() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return { theme, toggleTheme, setTheme };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useThemeState();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to Light / White mode" : "Switch to Dark mode"}
      title={theme === "dark" ? "Switch to White / Light Mode" : "Switch to Dark Mode"}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-all duration-300 cursor-pointer select-none active:scale-95 ${
        theme === "dark"
          ? "bg-white/10 hover:bg-white/15 text-yellow-300 border border-white/15 shadow-sm shadow-yellow-500/10"
          : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm"
      } ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-300 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 animate-in spin-in-180 duration-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

/**
 * Floating Theme Switcher: Always visible on bottom-right of every screen,
 * ensuring users can switch between Dark Mode and White Mode anywhere anytime!
 */
export function FloatingThemeToggle() {
  const { theme, toggleTheme } = useThemeState();

  return (
    <div className="fixed bottom-5 right-5 z-[9999] print:hidden">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        title={theme === "dark" ? "White / Light Mode" : "Dark Mode"}
        className={`group flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl backdrop-blur-xl transition-all duration-300 cursor-pointer border active:scale-90 ${
          theme === "dark"
            ? "bg-[#0b101d]/90 text-amber-300 border-cyan-500/30 hover:border-amber-400/50 shadow-black/80 hover:shadow-cyan-500/20"
            : "bg-white/95 text-slate-900 border-slate-300 hover:border-slate-400 shadow-slate-400/30 hover:bg-slate-50"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:rotate-45 ${
            theme === "dark" ? "bg-amber-400/15 text-amber-300" : "bg-indigo-50 text-indigo-600"
          }`}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </div>
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </span>
      </button>
    </div>
  );
}
