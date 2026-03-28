import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Bundle workspace packages but not node_modules externals
  noExternal: [/@mt\/.*/],
  // pg-boss uses require() for Node built-ins — add createRequire shim for ESM
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
})
