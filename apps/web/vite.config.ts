import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forwards to @algoviz/tutor-server (apps/server) so the AI Tutor panel
    // can just call fetch("/api/tutor") — no CORS setup needed in dev, and
    // the Gemini key never has to be known by this app. Run `pnpm dev:tutor`
    // alongside `pnpm dev` for this to have anything to reach.
    proxy: {
      "/api": {
        target: "http://localhost:5175",
        changeOrigin: true,
      },
    },
  },
});
