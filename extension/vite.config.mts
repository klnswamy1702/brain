import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const root = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  root: resolve(root, "src"),
  publicDir: resolve(root, "public"),
  base: "./",
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(root, "src/popup.html"),
        app: resolve(root, "src/app.html"),
        "service-worker": resolve(root, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "esnext",
    minify: false,
  },
});
