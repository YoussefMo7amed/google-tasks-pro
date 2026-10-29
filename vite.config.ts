import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const host = process.env.TAURI_DEV_HOST;

  return {
    plugins: [react()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      host: host || false,
      port: 1420,
      strictPort: true,
      hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
  // 3. to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : ["es2020", "chrome85", "safari14"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "recoil", "recoil-nexus"],
          mui: ["@mui/material", "@emotion/react", "@emotion/styled"],
          icons: ["@mui/icons-material"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          tauri: [
            "@tauri-apps/api",
            "@tauri-apps/plugin-deep-link",
            "@tauri-apps/plugin-dialog",
            "@tauri-apps/plugin-fs",
            "@tauri-apps/plugin-global-shortcut",
            "@tauri-apps/plugin-http",
            "@tauri-apps/plugin-log",
            "@tauri-apps/plugin-notification",
            "@tauri-apps/plugin-os",
            "@tauri-apps/plugin-shell",
            "@tauri-apps/plugin-store",
            "@fabianlars/tauri-plugin-oauth",
          ],
        },
      },
    },
  },
};
});
