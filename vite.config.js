import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  assetsInclude: ["**/*.task"], // Tell Vite to treat .task as an asset
});
