#!/usr/bin/env node

/**
 * End-to-end social content pipeline:
 * 1. Read SOCIAL_BRAND.md + BRANDING_STRATEGY.md
 * 2. Call Bedrock (Claude Sonnet 4.6) to generate week copy as JSON
 * 3. Inject copy into HTML templates ({{HEADLINE}}, {{SUBLINE}})
 * 4. Render filled HTML to PNG (post 1080×1080, story 1080×1920)
 *
 * Requires: AWS credentials with Bedrock access (same as Amplify).
 * Templates: docs/social-content/templates/post and story (with placeholders).
 *
 * Usage:
 *   node scripts/social-content-pipeline.mjs --week=3
 *   node scripts/social-content-pipeline.mjs --week=3 --skip-bedrock   # use existing copy/week3.json
 *   node scripts/social-content-pipeline.mjs --week=3 --skip-render    # no PNG step
 *
 * Note: --week is purely an output-naming knob now (copy/week<N>.json and
 * filled/images are overwritten in place each run). The actual campaign
 * theme for the run comes from docs/social-content/SOCIAL_PROMPT.md. Update
 * the "This Week's Campaign Theme" section of that prompt before each run
 * and bump --week so you don't clobber earlier copy.
 */

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SOCIAL_BRAND_PATH = join(ROOT, "docs/social-content/SOCIAL_PROMPT.md");
const BRANDING_STRATEGY_PATH = join(ROOT, "docs/strategy/BRANDING_STRATEGY.md");
const COPY_DIR = join(ROOT, "docs/social-content/copy");
const TEMPLATES_POST = join(ROOT, "docs/social-content/templates/post");
const TEMPLATES_STORY = join(ROOT, "docs/social-content/templates/story");
const FILLED_POST = join(ROOT, "docs/social-content/templates/filled/post");
const FILLED_STORY = join(ROOT, "docs/social-content/templates/filled/story");
const IMAGES_POST = join(ROOT, "docs/social-content/images/post");
const IMAGES_STORY = join(ROOT, "docs/social-content/images/story");

const BEDROCK_MODEL_ID = "us.anthropic.claude-sonnet-4-6";
const POST_SIZE = { width: 1080, height: 1080 };
const STORY_SIZE = { width: 1080, height: 1920 };

const JSON_SCHEMA_INSTRUCTION = `
Output your response as a single JSON object with this exact structure (no markdown, no code fence). All string values must be plain text.

{
  "post": {
    "headline": "Short on-brand line for the main image",
    "subline": "One sentence supporting the headline.",
    "caption": "One to three sentences for the post caption. Include https://neonpanda.ai/",
    "hashtags": "#fitness #AIcoaching #NeonPanda ..."
  },
  "story": {
    "headline": "Short line for the story image",
    "subline": "One sentence supporting the headline."
  },
  "linkedin": {
    "headline": "Short on-brand line for the post image",
    "subline": "One sentence supporting the headline.",
    "caption": "LinkedIn post copy. Include https://neonpanda.ai/",
    "hashtags": "#AI #fitness ..."
  }
}

Return only this JSON object, with no surrounding text.`;

function parseArgs() {
  const args = process.argv.slice(2);
  let week = 1;
  for (const a of args) {
    if (a.startsWith("--week=")) week = parseInt(a.slice(7), 10) || 1;
  }
  return {
    week,
    skipBedrock: args.includes("--skip-bedrock"),
    skipRender: args.includes("--skip-render"),
  };
}

function extractJsonFromText(text) {
  let raw = text.trim();
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) raw = codeBlock[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("No JSON object found in response");
  return JSON.parse(raw.slice(start, end + 1));
}

async function readOptional(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

async function generateCopyWithBedrock(week, socialBrandText, brandingText) {
  const systemPrompt = `You are an online marketing expert for web apps and mobile apps. Your role is to market the NeonPanda AI coaching and fitness app.

Use the following documents for brand voice, tone, and messaging. Then follow the week-specific instructions and output format.

--- BRANDING STRATEGY ---
${brandingText || "(not found)"}

--- SOCIAL BRAND (WEEKLY INSTRUCTIONS) ---
${socialBrandText}`;

  const userMessage = `Generate the copy for Week ${week} following the instructions in the SOCIAL BRAND section above. ${JSON_SCHEMA_INSTRUCTION}`;

  const client = new BedrockRuntimeClient({});
  const response = await client.send(
    new ConverseCommand({
      modelId: BEDROCK_MODEL_ID,
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.7,
      },
    }),
  );

  const content = response.output?.message?.content;
  if (!content?.length || !content[0].text) {
    throw new Error("Bedrock returned no text content");
  }
  const text = content[0].text;
  return extractJsonFromText(text);
}

function injectCopy(html, headline, subline) {
  return html
    .replace(/\{\{HEADLINE\}\}/g, headline || "{{HEADLINE}}")
    .replace(/\{\{SUBLINE\}\}/g, subline || "{{SUBLINE}}");
}

async function injectTemplates(copy, filledPostDir, filledStoryDir) {
  const postCopy = copy?.post || {};
  const storyCopy = copy?.story || {};

  let postFiles = [];
  let storyFiles = [];
  try {
    postFiles = (await readdir(TEMPLATES_POST))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {}
  try {
    storyFiles = (await readdir(TEMPLATES_STORY))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {}

  await mkdir(filledPostDir, { recursive: true });
  await mkdir(filledStoryDir, { recursive: true });

  for (const file of postFiles) {
    const html = await readFile(join(TEMPLATES_POST, file), "utf8");
    const filled = injectCopy(html, postCopy.headline, postCopy.subline);
    await writeFile(join(filledPostDir, file), filled);
    console.log("Filled (post):", file);
  }
  for (const file of storyFiles) {
    const html = await readFile(join(TEMPLATES_STORY, file), "utf8");
    const filled = injectCopy(html, storyCopy.headline, storyCopy.subline);
    await writeFile(join(filledStoryDir, file), filled);
    console.log("Filled (story):", file);
  }
}

/**
 * After the page loads, split each `.headline` / `.subline` span into
 * individual per-line block spans so the highlighted background shows a
 * visible gap between wrapped lines. This is more reliable than relying on
 * CSS `box-decoration-break: clone` in headless Chromium.
 */
async function splitCopyBlockLines(page) {
  await page.evaluate(() => {
    const LINE_GAP_PX = 10;

    document
      .querySelectorAll(".copy-block .headline, .copy-block .subline")
      .forEach((el) => {
        const span = el.querySelector(":scope > span");
        if (!span) return;

        const text = span.textContent.trim();
        if (!text) return;

        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= 1) return;

        // Wrap each word temporarily so we can measure which line it falls on.
        span.innerHTML = words.map((w) => `<b>${w}</b>`).join(" ");
        const wordEls = Array.from(span.querySelectorAll("b"));

        const lines = [];
        let currWords = [];
        let currTop = null;

        wordEls.forEach((w) => {
          const top = Math.round(w.getBoundingClientRect().top);
          if (currTop === null || Math.abs(top - currTop) < 10) {
            currWords.push(w.textContent);
            if (currTop === null) currTop = top;
          } else {
            if (currWords.length) lines.push(currWords.join(" "));
            currWords = [w.textContent];
            currTop = top;
          }
        });
        if (currWords.length) lines.push(currWords.join(" "));

        // Single line — no split needed; restore original text.
        if (lines.length <= 1) {
          span.textContent = text;
          return;
        }

        // Replace the container contents with one block span per visual line.
        // display:block + width:fit-content + margin:auto centres each line
        // highlight to its natural text width while stacking them vertically.
        el.innerHTML = lines
          .map(
            (line, i) =>
              `<span style="display:block;width:fit-content;margin:0 auto ${i < lines.length - 1 ? LINE_GAP_PX + "px" : "0"};">${line}</span>`,
          )
          .join("");
      });
  });
}

async function renderToPng(
  filledPostDir,
  filledStoryDir,
  imagesPostDir,
  imagesStoryDir,
) {
  await mkdir(imagesPostDir, { recursive: true });
  await mkdir(imagesStoryDir, { recursive: true });

  let postFiles = [];
  let storyFiles = [];
  try {
    postFiles = (await readdir(filledPostDir))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {}
  try {
    storyFiles = (await readdir(filledStoryDir))
      .filter((f) => f.endsWith(".html"))
      .sort();
  } catch {}

  if (postFiles.length === 0 && storyFiles.length === 0) {
    console.log("No filled HTML to render.");
    return;
  }

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  let browser;
  try {
    browser = await puppeteer.launch({ ...launchOptions, timeout: 8000 });
  } catch {
    const executablePath =
      process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome";
    browser = await puppeteer.launch({ ...launchOptions, executablePath });
  }

  try {
    for (const file of postFiles) {
      const baseName = file.replace(/\.html$/i, "");
      const fileUrl = `file://${join(filledPostDir, file)}`;
      const page = await browser.newPage();
      await page.setViewport({ ...POST_SIZE, deviceScaleFactor: 1 });
      await page.goto(fileUrl, { waitUntil: "networkidle0" });
      await splitCopyBlockLines(page);
      const outPath = join(imagesPostDir, `${baseName}-1080x1080.png`);
      await page.screenshot({ path: outPath, type: "png" });
      await page.close();
      console.log("PNG (post):", outPath);
    }
    for (const file of storyFiles) {
      const baseName = file.replace(/\.html$/i, "");
      const fileUrl = `file://${join(filledStoryDir, file)}`;
      const page = await browser.newPage();
      await page.setViewport({ ...STORY_SIZE, deviceScaleFactor: 1 });
      await page.goto(fileUrl, { waitUntil: "networkidle0" });
      await splitCopyBlockLines(page);
      const outPath = join(imagesStoryDir, `${baseName}-1080x1920.png`);
      await page.screenshot({ path: outPath, type: "png" });
      await page.close();
      console.log("PNG (story):", outPath);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const { week, skipBedrock, skipRender } = parseArgs();
  const copyPath = join(COPY_DIR, `week${week}.json`);

  let copy;

  if (skipBedrock) {
    const raw = await readFile(copyPath, "utf8");
    copy = JSON.parse(raw);
    console.log("Using existing copy:", copyPath);
  } else {
    const socialBrandText = await readFile(SOCIAL_BRAND_PATH, "utf8");
    const brandingText = await readOptional(BRANDING_STRATEGY_PATH);
    console.log("Calling Bedrock (Sonnet 4.6)...");
    copy = await generateCopyWithBedrock(week, socialBrandText, brandingText);
    await mkdir(COPY_DIR, { recursive: true });
    await writeFile(copyPath, JSON.stringify(copy, null, 2));
    console.log("Wrote copy:", copyPath);
  }

  console.log("Injecting into templates...");
  await injectTemplates(copy, FILLED_POST, FILLED_STORY);

  if (!skipRender) {
    console.log("Rendering PNGs...");
    await renderToPng(FILLED_POST, FILLED_STORY, IMAGES_POST, IMAGES_STORY);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
