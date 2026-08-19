import { defineConfig } from "vite";
import postcssNested from "postcss-nested";

export default defineConfig({
  css: {
    postcss: {
      plugins: [postcssNested()],
    },
  },
  build: {
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["cjs", "es"],
      fileName: (format) => (format === "cjs" ? "index.js" : "index.es.js"),
    },
    rollupOptions: {
      external: ["react", "react-dom", "prop-types"],
    },
  },
});
