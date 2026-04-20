import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const amplifyOutputsPath = path.resolve(__dirname, "amplify_outputs.json");
const amplifyOutputsStubPath = path.resolve(
  __dirname,
  "config/amplify-outputs.local-stub.json",
);
const packageJsonPath = path.resolve(__dirname, "package.json");

function resolveBuildId() {
  const fromEnv =
    process.env.AWS_COMMIT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (fromEnv) {
    return String(fromEnv).slice(0, 12);
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return Date.now().toString(36);
  }
}

function resolveAppVersion() {
  // Prefer the most recent git tag so the deployed bundle always mirrors an
  // actual GitHub release. We deliberately avoid `git describe` here because
  // it needs the tagged commit to be reachable from HEAD, which does not hold
  // on shallow clones (Amplify) or on feature branches whose tags predate the
  // divergence. `git tag --list --sort=-v:refname` only needs the tag ref to
  // exist locally, so `git fetch --tags` in amplify.yml is sufficient.
  try {
    const fromTag = execSync("git tag --list 'v*' --sort=-v:refname", {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
      .split("\n")[0];
    if (fromTag) return fromTag.replace(/^v/, "");
  } catch {
    // fall through to package.json
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const BUILD_ID = resolveBuildId();
const APP_VERSION = resolveAppVersion();

/** Emits a `build-meta.json` into the build output root so the client can poll for new deploys. */
function buildMetaPlugin() {
  return {
    name: "neonpanda-build-meta",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "build-meta.json",
        source: `${JSON.stringify(
          {
            buildId: BUILD_ID,
            version: APP_VERSION,
            builtAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      });
    },
  };
}

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
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  plugins: [
    amplifyOutputsStubPlugin(),
    buildMetaPlugin(),
    react(),
    tailwindcss(),
  ],
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
