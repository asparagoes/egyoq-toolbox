const SCRIPT_URL = new URL(document.currentScript?.src || window.location.href, window.location.href);
const TOOLS_JSON_PATH = new URL("../../data/tools.json", SCRIPT_URL).href;
const FLUENT_MAPPING_PATH = new URL("../../data/fluent_emoji_map.json", SCRIPT_URL).href;
const DEFAULT_THUMB = new URL("../../assets/thumbs/default.png", SCRIPT_URL).href;
const FLUENT_CDN_BASE = "https://cdn.jsdelivr.net/npm/fluentui-emoji@1.3.0/icons/modern";

const toolsGrid = document.getElementById("tools-grid");
const toolsStatus = document.getElementById("tools-status");
const searchInput = document.getElementById("tool-search");
const cardTemplate = document.getElementById("tool-card-template");
const siteNav = document.getElementById("site-nav");
const siteNavToggle = document.getElementById("site-nav-toggle");

let allTools = [];
let emojiLookup = new Map();
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

function resolveCardAssetUrl(value) {
  if (!normalizeText(value)) return "";

  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
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

function createEmojiLookup(mappingArray) {
  const map = new Map();

  for (const item of mappingArray) {
    const emoji = String(item.source_emoji || "").trim();
    const slug = String(item.suggested_fluent_slug || "").trim();

    if (!emoji || !slug) continue;
    if (!map.has(emoji)) {
      map.set(emoji, slug);
    }
  }

  return map;
}

function buildFluentIconUrl(slug) {
  return `${FLUENT_CDN_BASE}/${slug}.svg`;
}

function resolveFluentCdnIcon(tool) {
  const emoji = String(tool.emoji || "").trim();
  if (!emoji || !emojiLookup.has(emoji)) return null;

  const slug = emojiLookup.get(emoji);
  return buildFluentIconUrl(slug);
}

async function resolveToolFavicon(tool) {
  const fluentIcon = resolveFluentCdnIcon(tool);
  if (fluentIcon) {
    return { type: "image", value: fluentIcon };
  }

  if (normalizeText(tool.favicon)) {
    return { type: "image", value: resolveCardAssetUrl(tool.favicon) };
  }

  if (tool.url && tool.url !== "#") {
    const pageUrl = new URL(tool.url, window.location.href).href;

    if (faviconCache.has(pageUrl)) {
      const cached = faviconCache.get(pageUrl);
      if (cached) return cached;
    } else {
      try {
        const response = await fetch(pageUrl, { cache: "force-cache" });

        if (response.ok) {
          const html = await response.text();
          const iconHref = extractIconHrefFromHtml(html, pageUrl);
          const result = iconHref ? { type: "image", value: iconHref } : null;
          faviconCache.set(pageUrl, result);

          if (result) return result;
        } else {
          faviconCache.set(pageUrl, null);
        }
      } catch {
        faviconCache.set(pageUrl, null);
      }
    }
  }

  if (normalizeText(tool.emoji)) {
    return { type: "emoji", value: tool.emoji.trim() };
  }

  return null;
}

function mountToolFavicon(node, iconSpec) {
  const icon = node.querySelector(".tool-favicon");
  if (!icon) return;

  icon.innerHTML = "";
  icon.setAttribute("data-no-emoji-replace", "");

  if (!iconSpec) {
    icon.style.display = "none";
    return;
  }

  icon.style.display = "";

  if (iconSpec.type === "emoji") {
    const emoji = document.createElement("span");
    emoji.className = "tool-favicon-emoji";
    emoji.textContent = iconSpec.value;
    icon.appendChild(emoji);
    return;
  }

  const img = document.createElement("img");
  img.className = "tool-favicon-image";
  img.alt = "";
  img.decoding = "async";
  img.loading = "lazy";
  img.src = iconSpec.value;
  icon.appendChild(img);
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

async function loadToolsAndMapping() {
  try {
    toolsStatus.textContent = "Loading tools...";

    const toolsResponse = await fetch(TOOLS_JSON_PATH, { cache: "no-store" });

    if (!toolsResponse.ok) {
      throw new Error(`Failed to load tools.json (${toolsResponse.status})`);
    }

    const toolsData = await toolsResponse.json();

    try {
      const mappingResponse = await fetch(FLUENT_MAPPING_PATH, { cache: "no-store" });

      if (!mappingResponse.ok) {
        throw new Error(`Failed to load fluent mapping (${mappingResponse.status})`);
      }

      const mappingData = await mappingResponse.json();
      emojiLookup = createEmojiLookup(Array.isArray(mappingData) ? mappingData : []);
    } catch (error) {
      console.warn("Fluent emoji mapping unavailable; falling back to tool favicon/emoji.", error);
      emojiLookup = new Map();
    }

    allTools = Array.isArray(toolsData)
      ? toolsData.map((tool) => ({
          title: tool.title || "Untitled Tool",
          description: tool.description || "",
          url: tool.url || "#",
          thumbnail: resolveCardAssetUrl(tool.thumbnail || DEFAULT_THUMB),
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

loadToolsAndMapping();
