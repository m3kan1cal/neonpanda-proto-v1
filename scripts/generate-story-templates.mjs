#!/usr/bin/env node

/**
 * Generate story-sized (1080x1920) HTML from post templates.
 * Reads each post template, replaces dimensions and adjusts layout for vertical story format,
 * writes to templates/story/<name>.html
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POST_DIR = join(ROOT, "docs/social-content/instagram/templates/post");
const STORY_DIR = join(ROOT, "docs/social-content/instagram/templates/story");

const postFiles = [
  "01-neon-grid-horizon.html",
  "02-electric-pulse.html",
  "03-geometric-shards.html",
  "04-circuit-flow.html",
  "05-gradient-wave.html",
  "06-neon-frame.html",
  "07-particle-field.html",
  "08-dual-gradient-split.html",
];

mkdirSync(STORY_DIR, { recursive: true });

for (const file of postFiles) {
  const html = readFileSync(join(POST_DIR, file), "utf8");

  let story = html.replace(/height:\s*1080px/g, "height: 1920px");

  // Adjust layout for taller canvas where it helps (grid/stars in 01)
  story = story.replace(/\.grid\s*\{[^}]*height:\s*55%/s, (m) =>
    m.replace("height: 55%", "height: 50%"),
  );
  story = story.replace(/\.stars\s*\{[^}]*height:\s*45%/s, (m) =>
    m.replace("height: 45%", "height: 35%"),
  );

  writeFileSync(join(STORY_DIR, file), story);
  console.log("Wrote story:", file);
}

console.log("Done.");
