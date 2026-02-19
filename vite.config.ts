import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(async ({ mode }) => {
  // Only load lovable-tagger in development mode using dynamic import
  const plugins = [
    react({
      // Allow JSX in .js files
      include: /\.(js|jsx|ts|tsx)$/,
    }),
  ];

  if (mode === 'development') {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch (e) {
      // Silently ignore if tagger is not available
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom"],
    },
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
        loader: {
          ".js": "jsx",
        },
      },
    },
    esbuild: {
      target: "esnext",
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
    },
  };
});
