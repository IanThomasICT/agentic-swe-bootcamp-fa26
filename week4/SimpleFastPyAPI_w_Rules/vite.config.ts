import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { honoDevPlugin } from "./src/lib/vite-hono";

export default defineConfig({
  plugins: [solid({ ssr: true, hot: false }), honoDevPlugin()],
  server: {
    host: "127.0.0.1",
    port: 8000,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "index.js",
      },
    },
  },
});
