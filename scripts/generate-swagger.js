#!/usr/bin/env node

/**
 * Swagger Documentation Generator
 *
 * Reads the OpenAPI YAML spec from amplify/swagger/openapi.yaml and generates
 * a self-contained Swagger UI HTML page at public/api-docs/index.html.
 *
 * Usage:
 *   node scripts/generate-swagger.js
 *   npx generate-swagger  (via package.json bin)
 *   npm run swagger:generate
 *
 * Options:
 *   --validate-only  Only validate the spec, don't generate HTML
 *   --check-routes   Cross-reference spec paths against amplify/api/resource.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "..");

const SPEC_PATH = resolve(ROOT_DIR, "amplify/swagger/openapi.yaml");
const OUTPUT_DIR = resolve(ROOT_DIR, "public/api-docs");
const OUTPUT_PATH = resolve(OUTPUT_DIR, "index.html");
const RESOURCE_PATH = resolve(ROOT_DIR, "amplify/api/resource.ts");

const SWAGGER_UI_VERSION = "5.18.2";

function readSpec() {
  if (!existsSync(SPEC_PATH)) {
    console.error(`Error: OpenAPI spec not found at ${SPEC_PATH}`);
    process.exit(1);
  }
  return readFileSync(SPEC_PATH, "utf-8");
}

function validateSpec(yamlContent) {
  const errors = [];

  // Check required top-level fields
  if (!yamlContent.includes("openapi:")) {
    errors.push("Missing 'openapi' version field");
  }
  if (!yamlContent.includes("info:")) {
    errors.push("Missing 'info' section");
  }
  if (!yamlContent.includes("paths:")) {
    errors.push("Missing 'paths' section");
  }

  // Extract paths from the YAML
  const pathMatches = yamlContent.match(/^ {2}\/[^\s:]+:/gm);
  const specPaths = pathMatches
    ? pathMatches.map((p) => p.trim().replace(":", ""))
    : [];

  if (specPaths.length === 0) {
    errors.push("No API paths found in the spec");
  }

  // Check for common YAML issues
  const lines = yamlContent.split("\n");
  lines.forEach((line, i) => {
    if (line.includes("\t")) {
      errors.push(`Tab character found on line ${i + 1} (use spaces instead)`);
    }
  });

  return { errors, specPaths };
}

function checkRoutes(specPaths) {
  if (!existsSync(RESOURCE_PATH)) {
    console.warn(
      `Warning: Cannot check routes - ${RESOURCE_PATH} not found`,
    );
    return { missing: [], extra: [] };
  }

  const resourceContent = readFileSync(RESOURCE_PATH, "utf-8");

  // Extract paths from resource.ts - look for path: "/..." patterns
  const routeMatches = resourceContent.match(/path:\s*"([^"]+)"/g);
  const resourcePaths = routeMatches
    ? [...new Set(routeMatches.map((m) => m.match(/path:\s*"([^"]+)"/)[1]))]
    : [];

  // Normalize paths for comparison (replace {param} patterns)
  const normalize = (p) => p.replace(/\{[^}]+\}/g, "{param}");

  const normalizedSpec = new Set(specPaths.map(normalize));
  const normalizedResource = new Set(resourcePaths.map(normalize));

  const missing = resourcePaths.filter(
    (p) => !normalizedSpec.has(normalize(p)),
  );
  const extra = specPaths.filter(
    (p) => !normalizedResource.has(normalize(p)),
  );

  return { missing, extra, resourcePaths };
}

function generateHtml(yamlContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeonPanda API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { max-width: 1400px; margin: 0 auto; }

    /* Custom header */
    .api-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 2rem;
      text-align: center;
      border-bottom: 2px solid #e94560;
    }
    .api-header h1 {
      color: #e94560;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    .api-header p {
      color: #a0a0b8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.95rem;
    }
    .api-header .build-info {
      color: #666;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }

    /* Dark theme overrides */
    .swagger-ui .scheme-container { background: #16213e; box-shadow: none; }
    .swagger-ui .opblock-tag { color: #e0e0e0; border-bottom-color: #333; }
    .swagger-ui .opblock-tag:hover { background: rgba(233, 69, 96, 0.05); }
    .swagger-ui .opblock .opblock-summary-description { color: #a0a0b8; }
    .swagger-ui section.models { border-color: #333; }
    .swagger-ui .model-title { color: #e0e0e0; }
    .swagger-ui .info .title { color: #e94560; }
    .swagger-ui .info p, .swagger-ui .info li { color: #c0c0d0; }
    .swagger-ui .info a { color: #e94560; }
  </style>
</head>
<body>
  <div class="api-header">
    <h1>NeonPanda API Documentation</h1>
    <p>AI Fitness Coaching Platform &mdash; REST API Reference</p>
    <div class="build-info">Generated: ${new Date().toISOString()}</div>
  </div>

  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-standalone-preset.js"></script>
  <script src="https://unpkg.com/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
  <script>
    // Embedded OpenAPI spec (YAML)
    const yamlSpec = ${JSON.stringify(yamlContent)};

    window.onload = function() {
      const spec = jsyaml.load(yamlSpec);
      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha"
      });
    };
  </script>
</body>
</html>`;
}

// ===================================================================
// MAIN
// ===================================================================

const args = process.argv.slice(2);
const validateOnly = args.includes("--validate-only");
const checkRoutesFlag = args.includes("--check-routes");

console.log("========================================");
console.log(" NeonPanda Swagger Documentation Generator");
console.log("========================================\n");

// Step 1: Read the spec
console.log("Reading OpenAPI spec...");
const yamlContent = readSpec();
console.log(`  Spec loaded (${yamlContent.length} bytes)\n`);

// Step 2: Validate
console.log("Validating spec...");
const { errors, specPaths } = validateSpec(yamlContent);

if (errors.length > 0) {
  console.error("\nValidation FAILED:");
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`  Valid! Found ${specPaths.length} API paths\n`);

// Step 3: Check routes against resource.ts (optional)
if (checkRoutesFlag) {
  console.log("Cross-referencing with amplify/api/resource.ts...");
  const { missing, extra, resourcePaths } = checkRoutes(specPaths);

  if (resourcePaths) {
    console.log(`  Routes in resource.ts: ${resourcePaths.length}`);
    console.log(`  Paths in OpenAPI spec: ${specPaths.length}`);
  }

  if (missing.length > 0) {
    console.warn(`\n  Missing from spec (${missing.length}):`);
    missing.forEach((p) => console.warn(`    - ${p}`));
  }

  if (extra.length > 0) {
    console.warn(`\n  In spec but not in resource.ts (${extra.length}):`);
    extra.forEach((p) => console.warn(`    - ${p}`));
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log("  All routes match!\n");
  } else {
    console.log("");
  }
}

// Step 4: Generate HTML
if (validateOnly) {
  console.log("Validation-only mode. Skipping HTML generation.");
  process.exit(0);
}

console.log("Generating Swagger UI HTML...");

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

const html = generateHtml(yamlContent);
writeFileSync(OUTPUT_PATH, html, "utf-8");

console.log(`  Output: ${OUTPUT_PATH}`);
console.log(`  Size: ${(html.length / 1024).toFixed(1)} KB\n`);

console.log("Done! Swagger docs will be available at /api-docs/ when deployed.");
console.log("========================================\n");
