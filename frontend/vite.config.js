import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // localhost is a "secure context", which the browser needs for crypto.subtle (SHA-256).
  server: { port: 5173 },
});
