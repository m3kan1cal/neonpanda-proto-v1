import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const amplifyOutputsPath = path.resolve(__dirname, "amplify_outputs.json");
const amplifyOutputsStubPath = path.resolve(
  __dirname,
  "config/amplify-outputs.local-stub.json",
);

/** Resolve imports of repo-root amplify_outputs.json to a committed stub when the real file is absent (local/CI before ampx outputs). */
function amplifyOutputsStubPlugin() {
  return {
    name: "amplify-outputs-stub",
    enforce: "pre",
    resolveId(id, importer) {
      if (!id.endsWith("amplify_outputs.json")) {
        return null;
      }
      const candidate = path.isAbsolute(id)
        ? id
        : importer
          ? path.resolve(path.dirname(importer), id)
          : path.resolve(__dirname, id);
      if (path.normalize(candidate) !== amplifyOutputsPath) {
        return null;
      }
      if (!fs.existsSync(amplifyOutputsPath)) {
        return amplifyOutputsStubPath;
      }
      return null;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [amplifyOutputsStubPlugin(), react(), tailwindcss()],
  server: {
    host: "0.0.0.0", // Expose to network
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            id.includes("@aws-sdk/client-bedrock-runtime") ||
            id.includes("@aws-sdk/client-cognito-identity-provider") ||
            id.includes("@aws-sdk/client-dynamodb") ||
            id.includes("@aws-sdk/client-sns") ||
            id.includes("@aws-sdk/lib-dynamodb")
          ) {
            return "aws-sdk";
          }
          if (id.includes("node_modules/aws-amplify")) {
            return "amplify";
          }
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react/")
          ) {
            return "react-vendor";
          }
          if (
            id.includes("node_modules/nanoid") ||
            id.includes("node_modules/react-tooltip")
          ) {
            return "utils";
          }
          return undefined;
        },
      },
    },
  },
});
