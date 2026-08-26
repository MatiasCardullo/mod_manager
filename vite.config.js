import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function routeFallbacks() {
  return {
    name: "route-fallbacks",
    closeBundle() {
      const dist = resolve("dist");
      const rootIndex = join(dist, "index.html");
      const index = readFileSync(rootIndex, "utf8");
      for (const route of ["minecraft", "factorio"]) {
        const routeDir = join(dist, route);
        mkdirSync(routeDir, { recursive: true });
        writeFileSync(
          join(routeDir, "index.html"),
          index.replaceAll("./assets/", "../assets/"),
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), routeFallbacks()],
  // Relative assets keep dist deployable from static hosting or file servers.
  base: "./",
  appType: "spa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
