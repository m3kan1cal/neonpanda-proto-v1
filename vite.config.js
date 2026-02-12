import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0", // Expose to network
    port: 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // AWS SDK chunk - separate heavy AWS libraries
          "aws-sdk": [
            "@aws-sdk/client-bedrock-runtime",
            "@aws-sdk/client-cognito-identity-provider",
            "@aws-sdk/client-dynamodb",
            "@aws-sdk/client-sns",
            "@aws-sdk/lib-dynamodb",
          ],
          // Amplify chunk
          amplify: ["aws-amplify", "@aws-amplify/cli"],
          // React ecosystem chunk
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Utilities chunk
          utils: ["nanoid", "react-tooltip", "@dotenvx/dotenvx"],
        },
      },
    },
  },
});
