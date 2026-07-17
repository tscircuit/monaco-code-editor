import { defineConfig } from "tsup"

export default defineConfig({
  banner: {
    js: 'import "./index.css";',
  },
  clean: true,
  dts: true,
  entry: ["./src/index.ts"],
  external: ["react", "react-dom"],
  format: ["esm"],
  outDir: "dist",
  platform: "browser",
  splitting: false,
  sourcemap: true,
  target: "esnext",
  tsconfig: "./tsconfig.lib.json",
})
