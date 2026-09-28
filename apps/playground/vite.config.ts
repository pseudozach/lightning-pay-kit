import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "lightning-pay-kit/styles.css",
        replacement: fileURLToPath(new URL("../../packages/react/src/styles.css", import.meta.url))
      },
      {
        find: "lightning-pay-kit",
        replacement: fileURLToPath(new URL("../../packages/react/src/index.ts", import.meta.url))
      },
      {
        find: "@lightning-pay-kit/core",
        replacement: fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url))
      }
    ]
  },
  server: { strictPort: true },
  build: { sourcemap: true }
});

