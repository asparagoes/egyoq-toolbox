const fs = require("fs");
const path = require("path");

console.log("Script started");

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, "tool");
const THUMBS_DIR = path.join(ROOT, "assets", "thumbs");
const OUTPUT_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "tools.json");

console.log("ROOT:", ROOT);
console.log("TOOLS_DIR exists:", fs.existsSync(TOOLS_DIR));
console.log("THUMBS_DIR exists:", fs.existsSync(THUMBS_DIR));
console.log("OUTPUT_DIR exists:", fs.existsSync(OUTPUT_DIR));
console.log("OUTPUT_FILE path:", OUTPUT_FILE);

function exists(filePath) {
  return fs.existsSync(filePath);
}

function ensureDir(dirPath) {
  if (!exists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : "";
}

function extractMeta(html, metaName) {
  const regex = new RegExp(
    `<meta\\s+name=["']${metaName}["']\\s+content=["']([\\s\\S]*?)["']\\s*\\/?>`,
    "i"
  );
  const match = html.match(regex);
  return match ? match[1].trim() : "";
}

function getThumbnail(slug) {
  const candidates = [
    `${slug}.png`,
    `${slug}.jpg`,
    `${slug}.jpeg`,
    `${slug}.webp`
  ];

  for (const filename of candidates) {
    const fullPath = path.join(THUMBS_DIR, filename);
    if (exists(fullPath)) {
      return `./assets/thumbs/${filename}`;
    }
  }

  return "./assets/thumbs/default.png";
}

function buildToolEntry(slug) {
  const toolIndex = path.join(TOOLS_DIR, slug, "index.html");
  if (!exists(toolIndex)) return null;

  const html = readText(toolIndex);

  const title = extractTitle(html) || titleFromSlug(slug);
  const description = extractMeta(html, "tool:description") || "No description provided.";
  const tagsRaw = extractMeta(html, "tool:tags");
  const tags = tagsRaw
    ? tagsRaw.split(",").map(tag => tag.trim()).filter(Boolean)
    : [];

  return {
    title,
    description,
    url: `./tool/${slug}/`,
    thumbnail: getThumbnail(slug),
    tags
  };
}

function main() {
  ensureDir(OUTPUT_DIR);

  if (!exists(TOOLS_DIR)) {
    fs.writeFileSync(OUTPUT_FILE, "[]\n");
    console.log("No tool directory found. Wrote empty tools.json");
    return;
  }

  const toolFolders = fs.readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(slug => exists(path.join(TOOLS_DIR, slug, "index.html")))
    .sort((a, b) => a.localeCompare(b));

  console.log("Found tool folders:", toolFolders);

  const tools = toolFolders
    .map(buildToolEntry)
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tools, null, 2) + "\n");
  console.log(`Generated data/tools.json with ${tools.length} tool(s).`);
}

main();