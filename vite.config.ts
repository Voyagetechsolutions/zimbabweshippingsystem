import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // NOTE: Manual chunk splitting was intentionally removed.
    // The previous object-form `manualChunks` force-split interdependent
    // packages (e.g. clsx/tailwind-merge used by the Button component's cn())
    // into separate chunks, which created circular chunk dependencies. Rollup
    // then emitted broken re-exports that failed at runtime as
    // "Export 'Button' is not defined in module" — a white screen on Vercel
    // (but not always locally, since the bug is build-environment dependent).
    // Letting Rollup handle chunking is cycle-safe; per-route code splitting
    // from React.lazy() still produces separate page chunks.
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (optional)
    sourcemap: mode === 'production' ? 'hidden' : true,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
