const FLUENT_MAPPING_PATH = new URL("../../data/fluent_emoji_map.json", import.meta.url).href;
const FLUENT_CDN_BASE = "https://cdn.jsdelivr.net/npm/fluentui-emoji@1.3.0/icons/modern";
const EMOJI_STYLE_ID = "inline-fluent-emoji-style";

let emojiLookup = new Map();
let emojiPattern = null;
let emojiObserver = null;

function buildFluentIconUrl(slug) {
  return `${FLUENT_CDN_BASE}/${slug}.svg`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function createEmojiPattern(map) {
  const keys = Array.from(map.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (!keys.length) return null;
  return new RegExp(keys.join("|"), "gu");
}

async function loadEmojiMapping() {
  const response = await fetch(FLUENT_MAPPING_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load fluent mapping (${response.status})`);
  }

  const mappingData = await response.json();
  emojiLookup = createEmojiLookup(Array.isArray(mappingData) ? mappingData : []);
  emojiPattern = createEmojiPattern(emojiLookup);
}

function ensureEmojiStyles() {
  if (document.getElementById(EMOJI_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = EMOJI_STYLE_ID;
  style.textContent = `
    .inline-fluent-emoji {
      display: inline-block;
      width: 1.15em;
      height: 1.15em;
      object-fit: contain;
      vertical-align: -0.18em;
    }
  `;

  document.head.appendChild(style);
}

function isIgnoredTextNode(node) {
  if (!node || !node.parentElement) return true;

  const parent = node.parentElement;

  if (parent.closest("[data-no-emoji-replace]")) return true;

  const tag = parent.tagName;
  return [
    "SCRIPT",
    "STYLE",
    "TEXTAREA",
    "INPUT",
    "OPTION",
    "CODE",
    "PRE",
    "KBD",
    "SAMP"
  ].includes(tag);
}

function createEmojiImage(emoji, slug) {
  const img = document.createElement("img");
  img.className = "inline-fluent-emoji";
  img.src = buildFluentIconUrl(slug);
  img.alt = emoji;
  img.decoding = "async";
  img.loading = "lazy";
  return img;
}

function replaceEmojiInTextNode(textNode) {
  if (!emojiPattern) return;
  if (isIgnoredTextNode(textNode)) return;
  if (!textNode.parentNode) return;

  const text = textNode.nodeValue;
  if (!text || !emojiPattern.test(text)) {
    emojiPattern.lastIndex = 0;
    return;
  }

  emojiPattern.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = emojiPattern.exec(text)) !== null) {
    const matchedEmoji = match[0];
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex, matchIndex))
      );
    }

    const slug = emojiLookup.get(matchedEmoji);
    if (slug) {
      fragment.appendChild(createEmojiImage(matchedEmoji, slug));
    } else {
      fragment.appendChild(document.createTextNode(matchedEmoji));
    }

    lastIndex = matchIndex + matchedEmoji.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode.replaceChild(fragment, textNode);
}

function replaceEmojiInElement(root) {
  if (!root) return;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (isIgnoredTextNode(node)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let current;

  while ((current = walker.nextNode())) {
    textNodes.push(current);
  }

  textNodes.forEach(replaceEmojiInTextNode);
}

async function initEmojiReplacement() {
  await loadEmojiMapping();
  ensureEmojiStyles();

  replaceEmojiInElement(document.body);
  observeEmojiTargets();
}

function observeEmojiTargets() {
  if (emojiObserver || !document.body) return;

  emojiObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        replaceEmojiInTextNode(mutation.target);
        continue;
      }

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          replaceEmojiInTextNode(node);
          return;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node;
          if (element.matches?.("[data-no-emoji-replace], .inline-fluent-emoji")) return;
          replaceEmojiInElement(element);
        }
      });
    }
  });

  emojiObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initEmojiReplacement().catch(console.error);
  });
} else {
  initEmojiReplacement().catch(console.error);
}
