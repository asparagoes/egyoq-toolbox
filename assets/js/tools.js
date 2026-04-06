const TOOLS_JSON_PATH = "./data/tools.json";
const DEFAULT_THUMB = "./assets/thumbs/default.png";

const toolsGrid = document.getElementById("tools-grid");
const toolsStatus = document.getElementById("tools-status");
const searchInput = document.getElementById("tool-search");
const cardTemplate = document.getElementById("tool-card-template");
const siteNav = document.getElementById("site-nav");
const siteNavToggle = document.getElementById("site-nav-toggle");

let allTools = [];
const faviconCache = new Map();

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSearchBlob(tool) {
  return [
    tool.title,
    tool.description,
    ...(Array.isArray(tool.tags) ? tool.tags : [])
  ]
    .join(" ")
    .toLowerCase();
}

function extractIconHrefFromHtml(html, pageUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const iconLink =
    doc.querySelector('link[rel~="icon"]') ||
    doc.querySelector('link[rel="shortcut icon"]') ||
    doc.querySelector('link[rel="apple-touch-icon"]');

  if (!iconLink) return null;

  const href = iconLink.getAttribute("href");
  if (!href) return null;

  return new URL(href, pageUrl).href;
}

async function resolveToolFavicon(tool) {
  const explicit =
    normalizeText(tool.favicon)
      ? { type: "image", value: tool.favicon }
      : normalizeText(tool.emoji)
        ? { type: "emoji", value: tool.emoji.trim() }
        : null;

  if (explicit) return explicit;

  if (!tool.url || tool.url === "#") return null;

  const pageUrl = new URL(tool.url, window.location.href).href;

  if (faviconCache.has(pageUrl)) {
    return faviconCache.get(pageUrl);
  }

  try {
    const response = await fetch(pageUrl, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Failed to fetch tool page (${response.status})`);
    }

    const html = await response.text();
    const iconHref = extractIconHrefFromHtml(html, pageUrl);
    const result = iconHref ? { type: "image", value: iconHref } : null;

    faviconCache.set(pageUrl, result);
    return result;
  } catch {
    faviconCache.set(pageUrl, null);
    return null;
  }
}

function mountToolFavicon(node, iconSpec) {
  const badge = node.querySelector(".tool-favicon-badge");
  if (!badge) return;

  badge.innerHTML = "";

  if (!iconSpec) {
    badge.style.display = "none";
    return;
  }

  badge.style.display = "";

  if (iconSpec.type === "emoji") {
    const emoji = document.createElement("span");
    emoji.className = "tool-favicon-emoji";
    emoji.textContent = iconSpec.value;
    badge.appendChild(emoji);
    return;
  }

  const img = document.createElement("img");
  img.className = "tool-favicon-image";
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";
  img.src = iconSpec.value;
  badge.appendChild(img);
}

function createToolCard(tool) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);

  const link = node.querySelector(".tool-card-link");
  const img = node.querySelector(".tool-thumb");
  const title = node.querySelector(".tool-title");
  const description = node.querySelector(".tool-description");
  const popover = node.querySelector(".tool-description-popover");

  const href = tool.url;
  const thumb = tool.thumbnail || DEFAULT_THUMB;
  const descText = tool.description || "No description provided.";

  link.href = href;

  img.src = thumb;
  img.alt = `${tool.title} thumbnail`;
  img.onerror = () => {
    img.onerror = null;
    img.src = DEFAULT_THUMB;
  };

  title.textContent = tool.title || "Untitled Tool";
  description.textContent = descText;

  if (popover) {
    popover.textContent = descText;
  }

  resolveToolFavicon(tool).then((iconSpec) => {
    mountToolFavicon(node, iconSpec);
  });

  const showPopover = () => {
    if (description.classList.contains("is-truncated")) {
      node.classList.add("show-desc");
    }
  };

  const hidePopover = () => {
    node.classList.remove("show-desc");
  };

  description.addEventListener("mouseenter", showPopover);
  description.addEventListener("mouseleave", hidePopover);
  description.addEventListener("focus", showPopover);
  description.addEventListener("blur", hidePopover);

  return node;
}

function updateDescriptionPopovers() {
  const cards = toolsGrid.querySelectorAll(".tool-card");

  cards.forEach((card) => {
    const description = card.querySelector(".tool-description");
    const popover = card.querySelector(".tool-description-popover");

    if (!description || !popover) return;

    const isTruncated = description.scrollHeight > description.clientHeight + 1;

    if (isTruncated) {
      description.classList.add("is-truncated");
      popover.hidden = false;
    } else {
      description.classList.remove("is-truncated");
      card.classList.remove("show-desc");
      popover.hidden = true;
    }
  });
}

function renderTools(tools) {
  toolsGrid.innerHTML = "";

  if (!tools.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No tools found.";
    toolsGrid.appendChild(empty);
    toolsStatus.textContent = "0 tools shown";
    return;
  }

  const fragment = document.createDocumentFragment();

  tools.forEach((tool) => {
    fragment.appendChild(createToolCard(tool));
  });

  toolsGrid.appendChild(fragment);
  toolsStatus.textContent = `${tools.length} tool${tools.length === 1 ? "" : "s"} shown`;

  updateDescriptionPopovers();
}

function filterTools(query) {
  const q = normalizeText(query);

  if (!q) {
    renderTools(allTools);
    return;
  }

  const filtered = allTools.filter((tool) => buildSearchBlob(tool).includes(q));
  renderTools(filtered);
}

async function loadTools() {
  try {
    toolsStatus.textContent = "Loading tools...";
    const response = await fetch(TOOLS_JSON_PATH, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load tools.json (${response.status})`);
    }

    const data = await response.json();

    allTools = Array.isArray(data)
      ? data.map((tool) => ({
          title: tool.title || "Untitled Tool",
          description: tool.description || "",
          url: tool.url || "#",
          thumbnail: tool.thumbnail || DEFAULT_THUMB,
          favicon: tool.favicon || "",
          emoji: tool.emoji || "",
          tags: Array.isArray(tool.tags) ? tool.tags : []
        }))
      : [];

    allTools.sort((a, b) => a.title.localeCompare(b.title));
    renderTools(allTools);
  } catch (error) {
    console.error(error);
    toolsGrid.innerHTML = `<div class="empty-state">Could not load tools right now.</div>`;
    toolsStatus.textContent = "Error loading tools";
  }
}

searchInput.addEventListener("input", (event) => {
  filterTools(event.target.value);
});

window.addEventListener("resize", () => {
  updateDescriptionPopovers();

  if (window.innerWidth > 700 && siteNav) {
    siteNav.classList.remove("is-open");
    siteNavToggle?.setAttribute("aria-expanded", "false");
  }
});

if (siteNav && siteNavToggle) {
  siteNavToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    siteNavToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    if (!siteNav.classList.contains("is-open")) return;
    if (siteNav.contains(event.target) || siteNavToggle.contains(event.target)) return;

    siteNav.classList.remove("is-open");
    siteNavToggle.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    siteNav.classList.remove("is-open");
    siteNavToggle.setAttribute("aria-expanded", "false");
  });
}

loadTools();