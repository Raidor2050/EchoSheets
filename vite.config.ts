import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const pagesBase = process.env.ECHOSHEETS_PAGES === "1" ? "/EchoSheets/" : "/";

export default defineConfig({
  base: pagesBase,
  plugins: [react(), tailwindcss()],
  worker: { format: "es" },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
