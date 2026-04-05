const TOOLS_JSON_PATH = "./data/tools.json";
const DEFAULT_THUMB = "./assets/thumbs/default.png";

const toolsGrid = document.getElementById("tools-grid");
const toolsStatus = document.getElementById("tools-status");
const searchInput = document.getElementById("tool-search");
const cardTemplate = document.getElementById("tool-card-template");

let allTools = [];

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

function createToolCard(tool) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);

  const link = node.querySelector(".tool-card-link");
  const img = node.querySelector(".tool-thumb");
  const title = node.querySelector(".tool-title");
  const description = node.querySelector(".tool-description");
  const thumbWrap = node.querySelector(".tool-thumb-wrap");

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

  const popover = document.createElement("div");
  popover.className = "tool-description-popover";
  popover.setAttribute("aria-hidden", "true");
  popover.textContent = descText;
  thumbWrap.appendChild(popover);

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
    } else {
      description.classList.remove("is-truncated");
      popover.remove();
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
});

loadTools();