const fs = require("fs");
const path = require("path");
const http = require("http");
const handler = require("serve-handler");
const { chromium } = require("playwright");

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, "tool");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const PORT = 4173;

function exists(filePath) {
  return fs.existsSync(filePath);
}

function ensureDir(dirPath) {
  if (!exists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getToolSlugs() {
  if (!exists(TOOLS_DIR)) return [];

  return fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(slug => exists(path.join(TOOLS_DIR, slug, "index.html")))
    .sort((a, b) => a.localeCompare(b));
}

async function startServer() {
  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: ROOT,
      cleanUrls: false
    });
  });

  await new Promise((resolve) => {
    server.listen(PORT, resolve);
  });

  return server;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pageHasVisibleContent(page) {
  return await page.evaluate(() => {
    const body = document.body;
    if (!body) return false;

    const text = (body.innerText || "").trim();
    if (text.length > 20) return true;

    const visibleElements = Array.from(body.querySelectorAll("*")).filter((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      const hidden =
        style.display === "none" ||
        style.visibility === "hidden" ||
        parseFloat(style.opacity || "1") === 0;

      const tiny = rect.width < 24 || rect.height < 24;

      return !hidden && !tiny;
    });

    return visibleElements.length > 2;
  });
}

async function captureAll() {
  ensureDir(THUMBS_DIR);

  const slugs = getToolSlugs();
  if (!slugs.length) {
    console.log("No tool folders found.");
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch();

  try {
    for (const slug of slugs) {
      const url = `http://127.0.0.1:${PORT}/tool/${slug}/`;
      const outPath = path.join(THUMBS_DIR, `${slug}.png`);

      const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1
      });

      try {
        console.log(`Checking ${slug} at ${url}`);

        await page.goto(url, { waitUntil: "networkidle" });
        await wait(600);

        const hasContent = await pageHasVisibleContent(page);

        if (!hasContent) {
          console.log(`Skipping ${slug}: page looks blank, will use default.png`);
          if (exists(outPath)) {
            fs.unlinkSync(outPath);
            console.log(`Removed old thumbnail for ${slug}`);
          }
          continue;
        }

        await page.screenshot({
          path: outPath,
          fullPage: false
        });

        console.log(`Saved ${outPath}`);
      } catch (error) {
        console.log(`Skipping ${slug}: screenshot failed, will use default.png`);
        if (exists(outPath)) {
          fs.unlinkSync(outPath);
          console.log(`Removed old thumbnail for ${slug}`);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

captureAll().catch((error) => {
  console.error(error);
  process.exit(1);
});