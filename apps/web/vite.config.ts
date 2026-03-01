import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "SnapCall - Poker Equity Calculator",
        short_name: "SnapCall",
        description: "High-performance Texas Hold'em equity calculator",
        theme_color: "#f97316",
        background_color: "#fafaf9",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "icon-192x192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,png,svg,ico}"],
      },
    }),
  ],
});
