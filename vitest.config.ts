import { defineConfig } from "vitest/config";

// Separate from vite.config.mts (which builds the renderer with `root: src/renderer`) --
// vitest auto-detects a vite config in the project and would otherwise inherit that root,
// which breaks discovery of this project's actual tests under /test.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
