import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Custom plugin: serve .apk files with correct MIME type so Android installs directly
function apkMimePlugin(): import('vite').Plugin {
  return {
    name: 'apk-mime-fix',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.toLowerCase().endsWith('.apk')) {
          const apkPath = path.join(import.meta.dirname, 'public', path.basename(req.url));
          if (fs.existsSync(apkPath)) {
            const stat = fs.statSync(apkPath);
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.url)}"`);
            res.setHeader('Content-Length', stat.size.toString());
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(apkPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.toLowerCase().endsWith('.apk')) {
          const apkPath = path.join(import.meta.dirname, 'public', path.basename(req.url));
          if (fs.existsSync(apkPath)) {
            const stat = fs.statSync(apkPath);
            res.setHeader('Content-Type', 'application/vnd.android.package-archive');
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.url)}"`);
            res.setHeader('Content-Length', stat.size.toString());
            res.setHeader('Cache-Control', 'no-cache');
            fs.createReadStream(apkPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
  };
}

const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    apkMimePlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      "@designcodeio/threeui/style.css": path.resolve(import.meta.dirname, "src/shaders/threeui.css"),
      "@designcodeio/threeui": path.resolve(import.meta.dirname, "src/shaders/elements/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core':   ['react', 'react-dom'],
          'framer':       ['framer-motion'],
          'ui-libs':      ['@tanstack/react-query', 'wouter', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
