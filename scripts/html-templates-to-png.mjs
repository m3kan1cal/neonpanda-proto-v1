#!/usr/bin/env node

/**
 * Convert Instagram HTML templates to PNG at post (1080×1080) and story (1080×1920) sizes.
 *
 * Templates:
 *   docs/social-content/instagram/templates/post/*.html  — post (1080×1080)
 *   docs/social-content/instagram/templates/story/*.html — story (1080×1920, native layout)
 *
 * Regenerate story HTML from post templates: node scripts/generate-story-templates.mjs
 *
 * Usage:
 *   node scripts/html-templates-to-png.mjs
 *   node scripts/html-templates-to-png.mjs --post-only
 *   node scripts/html-templates-to-png.mjs --story-only
 *
 * Output:
 *   docs/social-content/instagram/output/post/  — 1080×1080 (Instagram post)
 *   docs/social-content/instagram/output/story/ — 1080×1920 (Instagram story)
 */

import puppeteer from "puppeteer";
import { readdir, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const TEMPLATES_DIR = join(ROOT, "docs/social-content/instagram/templates");
const POST_TEMPLATES_DIR = join(TEMPLATES_DIR, "post");
const STORY_TEMPLATES_DIR = join(TEMPLATES_DIR, "story");
const OUTPUT_POST = join(ROOT, "docs/social-content/instagram/output/post");
const OUTPUT_STORY = join(ROOT, "docs/social-content/instagram/output/story");

const POST_SIZE = { width: 1080, height: 1080 };
const STORY_SIZE = { width: 1080, height: 1920 };

const args = process.argv.slice(2);
const postOnly = args.includes("--post-only");
const storyOnly = args.includes("--story-only");

async function main() {
  let postFiles = [];
  try {
    postFiles = (await readdir(POST_TEMPLATES_DIR))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {
    // post/ may not exist yet
  }

  let storyFiles = [];
  try {
    storyFiles = (await readdir(STORY_TEMPLATES_DIR))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {
    // story/ may not exist yet
  }

  if (postFiles.length === 0 && storyFiles.length === 0) {
    console.log("No HTML files in templates/post or templates/story.");
    process.exit(0);
  }

  await mkdir(OUTPUT_POST, { recursive: true });
  await mkdir(OUTPUT_STORY, { recursive: true });

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  let browser;
  try {
    browser = await puppeteer.launch({
      ...launchOptions,
      timeout: 8000,
    });
  } catch {
    const executablePath =
      process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome";
    browser = await puppeteer.launch({
      ...launchOptions,
      executablePath,
    });
  }

  try {
    if (!storyOnly) {
      for (const file of postFiles) {
        const baseName = file.replace(/\.html$/i, "");
        const fileUrl = `file://${join(POST_TEMPLATES_DIR, file)}`;
        const page = await browser.newPage();
        await page.setViewport({
          ...POST_SIZE,
          deviceScaleFactor: 1,
        });
        await page.goto(fileUrl, { waitUntil: "networkidle0" });
        const outPath = join(OUTPUT_POST, `${baseName}-1080x1080.png`);
        await page.screenshot({ path: outPath, type: "png" });
        await page.close();
        console.log("Post:", outPath);
      }
    }

    if (!postOnly && storyFiles.length > 0) {
      for (const file of storyFiles) {
        const baseName = file.replace(/\.html$/i, "");
        const fileUrl = `file://${join(STORY_TEMPLATES_DIR, file)}`;
        const page = await browser.newPage();
        await page.setViewport({
          ...STORY_SIZE,
          deviceScaleFactor: 1,
        });
        await page.goto(fileUrl, { waitUntil: "networkidle0" });
        const outPath = join(OUTPUT_STORY, `${baseName}-1080x1920.png`);
        await page.screenshot({ path: outPath, type: "png" });
        await page.close();
        console.log("Story:", outPath);
      }
    }
  } finally {
    await browser.close();
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
