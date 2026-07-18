import { defineConfig } from "tsup";

// Builds the package into lib/ as both CommonJS (index.js) and ESM (index.mjs),
// with type declarations. React stays external (it is a peer dependency), and
// tree-shaking is enabled so bundlers can drop unused icons from the ESM build.
export default defineConfig({
  entry: ["src/index.tsx"],
  outDir: "lib",
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  treeshake: true,
  minify: false,
  sourcemap: false,
  external: ["react"],
});
