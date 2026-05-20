(() => {
  "use strict";

  const STORE_KEY = "flashflow.revamped.v1";
  const SHEETJS_SRC = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const RATING_LABELS = {
    1: "again",
    2: "hard",
    3: "good",
    4: "easy"
  };

  const $ = (id) => document.getElementById(id);
  const refs = {
    appShell: $("appShell"),
    infoBtn: $("infoBtn"),
    minimalBtn: $("minimalBtn"),
    restoreBtn: $("restoreBtn"),
    fullscreenBtn: $("fullscreenBtn"),
    managerPanel: $("managerPanel"),
    advancedToggleBtn: $("advancedToggleBtn"),
    flashcard: $("flashcard"),
    cardCategory: $("cardCategory"),
    cardCopy: $("cardCopy"),
    cardFace: $("cardFace"),
    typingPanel: $("typingPanel"),
    typingAnswer: $("typingAnswer"),
    submitTypingBtn: $("submitTypingBtn"),
    typingFeedback: $("typingFeedback"),
    shuffleBankBtn: $("shuffleBankBtn"),
    previousBtn: $("previousBtn"),
    revealBtn: $("revealBtn"),
    skipBtn: $("skipBtn"),
    resetBankBtn: $("resetBankBtn"),
    ratingControls: $("ratingControls"),
    statusStrip: $("statusStrip"),
    minimalProgress: $("minimalProgress"),
    bankSelect: $("bankSelect"),
    bankNameInput: $("bankNameInput"),
    renameBankBtn: $("renameBankBtn"),
    deleteBankBtn: $("deleteBankBtn"),
    csvFileInput: $("csvFileInput"),
    loadSampleBtn: $("loadSampleBtn"),
    pasteNameInput: $("pasteNameInput"),
    pasteArea: $("pasteArea"),
    pasteImportBtn: $("pasteImportBtn"),
    typingToggle: $("typingToggle"),
    autoRatingToggle: $("autoRatingToggle"),
    caseSensitiveToggle: $("caseSensitiveToggle"),
    sfxToggle: $("sfxToggle"),
    cardSearchInput: $("cardSearchInput"),
    cardList: $("cardList"),
    selectCardsBtn: $("selectCardsBtn"),
    bulkControls: $("bulkControls"),
    bulkDeleteBtn: $("bulkDeleteBtn"),
    clearSelectionBtn: $("clearSelectionBtn"),
    selectionCount: $("selectionCount"),
    cardFrontInput: $("cardFrontInput"),
    cardBackInput: $("cardBackInput"),
    cardTextInput: $("cardTextInput"),
    cardAcceptedInput: $("cardAcceptedInput"),
    cardExplanationInput: $("cardExplanationInput"),
    cardTagInput: $("cardTagInput"),
    addCardBtn: $("addCardBtn"),
    saveCardBtn: $("saveCardBtn"),
    clearEditorBtn: $("clearEditorBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    exportProgressBtn: $("exportProgressBtn"),
    restoreInput: $("restoreInput"),
    resetStateBtn: $("resetStateBtn"),
    infoModal: $("infoModal"),
    closeInfoBtn: $("closeInfoBtn"),
    toast: $("toast")
  };

  const createState = () => ({
    version: 1,
    banks: [],
    activeBankId: null,
    settings: {
      typing: false,
      autoRating: false,
      caseSensitive: false,
      minimal: false,
      advancedManager: false,
      sfx: true
    },
    study: {
      revealed: false,
      typedAnswer: "",
      proposedRating: null,
      selectedRating: null
    },
    reviewHistory: [],
    statusCounts: {},
    updatedAt: new Date().toISOString()
  });

  let state = loadState();
  let selectedCardId = null;
  let selectionMode = false;
  let selectedCardIds = new Set();
  let toastTimer = 0;
  let pointerStart = null;
  let audioContext = null;
  let audioUnlockPromise = null;
  let cardMotion = null;
  let cardMotionTimer = 0;
  let xlsxLoadPromise = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (!saved || typeof saved !== "object") {
        return createState();
      }
      const merged = {
        ...createState(),
        ...saved,
        settings: { ...createState().settings, ...(saved.settings || {}) },
        study: { ...createState().study, ...(saved.study || {}) }
      };
      merged.banks = Array.isArray(merged.banks) ? merged.banks.map(normalizeBank) : [];
      if (!merged.activeBankId && merged.banks[0]) {
        merged.activeBankId = merged.banks[0].id;
      }
      return merged;
    } catch {
      return createState();
    }
  }

  function normalizeBank(bank) {
    const clean = {
      id: bank.id || uid("bank"),
      name: bank.name || "untitled bank",
      cards: Array.isArray(bank.cards) ? bank.cards.map(normalizeCard) : [],
      queue: Array.isArray(bank.queue) ? bank.queue : [],
      currentIndex: Number.isFinite(bank.currentIndex) ? bank.currentIndex : 0,
      createdAt: bank.createdAt || new Date().toISOString(),
      updatedAt: bank.updatedAt || new Date().toISOString()
    };
    ensureQueue(clean);
    return clean;
  }

  function normalizeCard(card) {
    const text = String(card.text || "");
    const clozeAnswers = extractClozeAnswers(text);
    return {
      id: card.id || uid("card"),
      front: String(card.front || ""),
      back: String(card.back || ""),
      tag: String(card.tag || "category"),
      accepted: normalizeAccepted(card.accepted),
      explanation: String(card.explanation || ""),
      text,
      isCloze: Boolean(card.isCloze || clozeAnswers.length),
      clozeAnswers,
      rating: Number(card.rating) || null,
      skipped: Boolean(card.skipped),
      lastReviewedAt: card.lastReviewedAt || null
    };
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function saveState() {
    updateStatusCounts();
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  }

  function activeBank() {
    return state.banks.find((bank) => bank.id === state.activeBankId) || null;
  }

  function currentCard() {
    const bank = activeBank();
    if (!bank || !bank.cards.length) {
      return null;
    }
    ensureQueue(bank);
    const queueId = bank.queue[bank.currentIndex % bank.queue.length];
    return bank.cards.find((card) => card.id === queueId) || bank.cards[0] || null;
  }

  function isBankComplete(bank) {
    return Boolean(bank && bank.cards.length && bank.cards.every((card) => card.rating === 4));
  }

  function ensureQueue(bank) {
    const cardIds = new Set(bank.cards.map((card) => card.id));
    bank.queue = (bank.queue || []).filter((id) => cardIds.has(id));
    bank.cards.forEach((card) => {
      if (!bank.queue.includes(card.id)) {
        bank.queue.push(card.id);
      }
    });
    if (!bank.queue.length) {
      bank.currentIndex = 0;
    } else if (bank.currentIndex >= bank.queue.length || bank.currentIndex < 0) {
      bank.currentIndex = 0;
    }
  }

  function updateStatusCounts() {
    state.statusCounts = {};
    state.banks.forEach((bank) => {
      const counts = {
        total: bank.cards.length,
        learned: 0,
        repeating: 0,
        skipped: 0,
        ratings: { 1: 0, 2: 0, 3: 0, 4: 0 }
      };
      bank.cards.forEach((card) => {
        if (card.skipped) {
          counts.skipped += 1;
        }
        if (card.rating) {
          counts.ratings[card.rating] += 1;
        }
        if (card.rating === 4) {
          counts.learned += 1;
        } else {
          counts.repeating += 1;
        }
      });
      state.statusCounts[bank.id] = counts;
    });
  }

  function render() {
    const bank = activeBank();
    const card = currentCard();
    const complete = isBankComplete(bank);
    document.body.classList.toggle("app-minimal", state.settings.minimal);
    refs.managerPanel.classList.toggle("is-advanced", state.settings.advancedManager);
    refs.advancedToggleBtn.dataset.active = String(state.settings.advancedManager);
    refs.advancedToggleBtn.setAttribute("aria-pressed", String(state.settings.advancedManager));
    refs.advancedToggleBtn.querySelector("span:last-child").textContent = state.settings.advancedManager ? "compact" : "advanced";
    refs.typingToggle.checked = state.settings.typing;
    refs.autoRatingToggle.checked = state.settings.autoRating;
    refs.caseSensitiveToggle.checked = state.settings.caseSensitive;
    refs.sfxToggle.checked = state.settings.sfx;
    pruneSelection(bank);
    renderBanks(bank);
    renderStatus(bank);
    renderCard(card, bank);
    renderCardList(bank);
    refs.typingPanel.classList.toggle("is-visible", Boolean(card && !complete && state.settings.typing));
    refs.typingAnswer.value = state.study.typedAnswer || "";
    refs.ratingControls.classList.toggle("hidden", !card || complete || !state.study.revealed);
    refs.revealBtn.disabled = !card || complete || state.study.revealed;
    refs.skipBtn.disabled = !card || complete;
    renderSkipAction(card, complete);
    refs.previousBtn.disabled = !state.reviewHistory.length;
    refs.shuffleBankBtn.disabled = !bank || bank.cards.length < 2;
    refs.resetBankBtn.disabled = !bank || !bank.cards.length;
    refs.saveCardBtn.disabled = !selectedCardId;
    refs.exportCsvBtn.disabled = !bank || !bank.cards.length;
    refs.deleteBankBtn.disabled = !bank;
    refs.renameBankBtn.disabled = !bank;
    refs.selectCardsBtn.disabled = !bank || !bank.cards.length;
    refs.selectCardsBtn.dataset.active = String(selectionMode);
    refs.selectCardsBtn.setAttribute("aria-pressed", String(selectionMode));
    refs.selectCardsBtn.querySelector("span:last-child").textContent = selectionMode ? "done" : "select";
    refs.bulkControls.classList.toggle("hidden", !selectionMode);
    refs.bulkDeleteBtn.disabled = !selectedCardIds.size;
    refs.clearSelectionBtn.disabled = !selectedCardIds.size;
    refs.selectionCount.textContent = `${selectedCardIds.size} selected`;
    refs.bankNameInput.value = bank ? bank.name : "";
    renderRatingControls(card);
  }

  function renderBanks(bank) {
    refs.bankSelect.innerHTML = "";
    if (!state.banks.length) {
      const option = document.createElement("option");
      option.textContent = "no bank";
      option.value = "";
      refs.bankSelect.append(option);
      refs.bankSelect.disabled = true;
      return;
    }
    refs.bankSelect.disabled = false;
    state.banks.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      refs.bankSelect.append(option);
    });
    refs.bankSelect.value = bank ? bank.id : "";
  }

  function pruneSelection(bank) {
    if (!bank || !bank.cards.length) {
      selectedCardIds.clear();
      selectionMode = false;
      return;
    }
    const ids = new Set(bank.cards.map((card) => card.id));
    selectedCardIds = new Set(Array.from(selectedCardIds).filter((id) => ids.has(id)));
  }

  function renderStatus(bank) {
    const counts = bank ? state.statusCounts[bank.id] || getCounts(bank) : null;
    if (!counts) {
      refs.statusStrip.innerHTML = '<span class="status-pill">no bank loaded</span>';
      refs.minimalProgress.textContent = "";
      return;
    }
    const position = bank.cards.length ? `${bank.currentIndex + 1}/${bank.cards.length}` : "0/0";
    refs.statusStrip.innerHTML = `
      <span class="status-pill">card ${position}</span>
      <span class="status-pill">learned ${counts.learned}</span>
      <span class="status-pill">repeating ${counts.repeating}</span>
      <span class="status-pill">skipped ${counts.skipped}</span>
      ${isBankComplete(bank) ? '<span class="status-pill">bank complete</span>' : ""}
    `;
    refs.minimalProgress.textContent = isBankComplete(bank)
      ? `bank complete / learned ${counts.learned}`
      : `card ${position} / learned ${counts.learned} / repeating ${counts.repeating}`;
  }

  function getCounts(bank) {
    const counts = { total: bank.cards.length, learned: 0, repeating: 0, skipped: 0, ratings: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    bank.cards.forEach((card) => {
      if (card.skipped) counts.skipped += 1;
      if (card.rating) {
        counts.ratings[card.rating] += 1;
      }
      if (card.rating === 4) {
        counts.learned += 1;
      } else {
        counts.repeating += 1;
      }
    });
    return counts;
  }

  function renderCard(card, bank) {
    refs.flashcard.className = "flashcard";
    if (cardMotion) {
      refs.flashcard.classList.add(`motion-${cardMotion}`);
    }
    if (isBankComplete(bank)) {
      refs.flashcard.classList.add("tone-complete", "is-revealed", "is-complete");
      refs.cardCategory.textContent = "learned";
      refs.flashcard.setAttribute("aria-label", "bank complete");
      refs.cardCopy.innerHTML = '<div class="complete-copy">bank complete</div>';
      return;
    }
    refs.flashcard.classList.add(card ? `tone-${card.rating || "new"}` : "tone-new");
    refs.flashcard.classList.toggle("is-revealed", Boolean(card && state.study.revealed));
    refs.cardCategory.textContent = card ? card.tag || "category" : "category";
    refs.flashcard.setAttribute("aria-label", card && !state.study.revealed ? "reveal card" : "flashcard");
    if (!card) {
      refs.cardCopy.innerHTML = "import a bank to begin";
      return;
    }
    if (state.study.revealed) {
      refs.cardCopy.innerHTML = `
        <div class="answer-copy">${escapeHtml(answerText(card) || "no answer")}</div>
        ${card.explanation ? `<div class="explanation">${escapeHtml(card.explanation)}</div>` : ""}
      `;
    } else {
      refs.cardCopy.innerHTML = renderQuestion(card);
    }
  }

  function renderQuestion(card) {
    if (card.isCloze && card.text) {
      return escapeHtml(card.text).replace(/\[\[[^\]]+\]\]/g, '<span class="blank" aria-label="blank"></span>');
    }
    return escapeHtml(card.front || card.text || "untitled card");
  }

  function answerText(card) {
    if (card.isCloze && card.clozeAnswers.length) {
      return card.clozeAnswers.join(", ");
    }
    return card.back;
  }

  function renderSkipAction(card, complete) {
    const icon = refs.skipBtn.querySelector(".material-symbols-outlined");
    const label = refs.skipBtn.querySelector("span:last-child");
    const forwards = Boolean(card && !complete && (card.rating || state.study.selectedRating));
    if (icon) icon.textContent = forwards ? "arrow_forward" : "skip_next";
    if (label) label.textContent = forwards ? "forward" : "skip";
    refs.skipBtn.setAttribute("aria-label", forwards ? "forward to next card" : "skip card");
  }

  function renderRatingControls(card) {
    const proposed = state.study.proposedRating;
    const selected = state.study.selectedRating || null;
    refs.ratingControls.querySelectorAll(".rating-button").forEach((button) => {
      const value = Number(button.dataset.rating);
      button.dataset.proposed = String(proposed === value);
      button.dataset.selected = String(selected === value);
      button.setAttribute("aria-pressed", String(selected === value));
      button.setAttribute("aria-label", `${value} ${RATING_LABELS[value]}${selected === value ? " selected" : ""}`);
      button.textContent = `${value} ${RATING_LABELS[value]}`;
      if (proposed === value) {
        button.textContent += " proposed";
      }
    });
  }

  function renderCardList(bank) {
    refs.cardList.innerHTML = "";
    if (!bank || !bank.cards.length) {
      refs.cardList.innerHTML = '<p class="empty-text">no cards yet</p>';
      return;
    }
    const query = refs.cardSearchInput.value.trim().toLowerCase();
    const cards = bank.cards.filter((card) => {
      const text = `${card.front} ${card.back} ${card.text} ${card.tag} ${card.explanation}`.toLowerCase();
      return !query || text.includes(query);
    });
    if (!cards.length) {
      refs.cardList.innerHTML = '<p class="empty-text">no matching cards</p>';
      return;
    }
    cards.forEach((card) => {
      const row = document.createElement("div");
      const selected = selectedCardIds.has(card.id);
      row.className = `card-row${selectionMode ? " is-selectable" : ""}${selected ? " is-selected" : ""}`;
      row.innerHTML = `
        ${selectionMode ? `
          <label class="card-select" aria-label="select card">
            <input type="checkbox" data-select-card="${card.id}" ${selected ? "checked" : ""}>
          </label>
        ` : ""}
        <div>
          <p class="card-row-title">${escapeHtml(card.front || card.text || answerText(card) || "untitled card")}</p>
          <div class="card-row-meta">${escapeHtml(card.tag || "category")} / ${card.rating ? RATING_LABELS[card.rating] : card.skipped ? "skipped" : "unrated"}</div>
        </div>
        <div class="row-actions manager-advanced">
          <button class="mini-button" type="button" data-edit="${card.id}" aria-label="edit card"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
          <button class="mini-button" type="button" data-delete="${card.id}" aria-label="delete card"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
        </div>
      `;
      refs.cardList.append(row);
    });
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function setCardMotion(kind) {
    clearTimeout(cardMotionTimer);
    cardMotion = prefersReducedMotion() ? null : kind;
    if (!cardMotion) return;
    cardMotionTimer = setTimeout(() => {
      cardMotion = null;
      render();
    }, 420);
  }

  function revealCard() {
    if (isBankComplete(activeBank())) return;
    const card = currentCard();
    if (!card) return;
    state.study.revealed = true;
    state.study.selectedRating = null;
    setCardMotion("flip");
    playSfx("reveal");
    saveState();
    render();
  }

  function submitTyping() {
    const card = currentCard();
    if (!card) return;
    const typed = refs.typingAnswer.value.trim();
    state.study.typedAnswer = typed;
    state.study.revealed = true;
    state.study.selectedRating = null;
    setCardMotion("flip");
    playSfx("reveal");
    if (state.settings.autoRating) {
      const proposed = proposeRating(card, typed);
      state.study.proposedRating = proposed;
      refs.typingFeedback.textContent = `proposed ${proposed} ${RATING_LABELS[proposed]}`;
    } else {
      state.study.proposedRating = null;
      refs.typingFeedback.textContent = typed ? "answer revealed. choose a rating." : "answer revealed.";
    }
    saveState();
    render();
  }

  function rateCurrent(rating) {
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || isBankComplete(bank)) return;
    const previousRating = card.rating;
    const previousSkipped = card.skipped;
    card.rating = rating;
    card.skipped = false;
    card.lastReviewedAt = new Date().toISOString();
    state.reviewHistory.push({
      type: "rating",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      rating,
      typedAnswer: state.study.typedAnswer || "",
      proposedRating: state.study.proposedRating,
      index: bank.currentIndex,
      at: new Date().toISOString()
    });
    const complete = isBankComplete(bank);
    state.study.selectedRating = null;
    advanceCard(bank, "forward");
    toast(complete ? "bank complete" : `${rating} ${RATING_LABELS[rating]}`, complete ? "complete" : "rate");
  }

  function skipCurrent() {
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || isBankComplete(bank)) return;
    const previousRating = card.rating;
    const previousSkipped = card.skipped;
    card.rating = null;
    card.skipped = true;
    state.reviewHistory.push({
      type: "skip",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      index: bank.currentIndex,
      at: new Date().toISOString()
    });
    advanceCard(bank, "skip");
    toast("skipped", "skip");
  }

  function forwardCurrent() {
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || isBankComplete(bank)) return;
    const selectedRating = Number(state.study.selectedRating) || null;
    const previousRating = card.rating;
    const previousSkipped = card.skipped;
    if (!card.rating && selectedRating) {
      card.rating = selectedRating;
      card.skipped = false;
      card.lastReviewedAt = new Date().toISOString();
    }
    state.reviewHistory.push({
      type: "forward",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      index: bank.currentIndex,
      at: new Date().toISOString()
    });
    advanceCard(bank, "forward");
    toast("forward", "forward");
  }

  function skipOrForwardCurrent() {
    const card = currentCard();
    if (card && (card.rating || state.study.selectedRating)) {
      forwardCurrent();
      return;
    }
    skipCurrent();
  }

  function shuffleBank() {
    const bank = activeBank();
    if (!bank || bank.cards.length < 2) return;
    ensureQueue(bank);
    for (let index = bank.queue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [bank.queue[index], bank.queue[swapIndex]] = [bank.queue[swapIndex], bank.queue[index]];
    }
    bank.currentIndex = 0;
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    selectedCardIds.clear();
    selectionMode = false;
    saveState();
    setCardMotion("shuffle");
    render();
    toast("bank shuffled", "toggle");
  }

  function resetBankProgress() {
    const bank = activeBank();
    if (!bank || !bank.cards.length) return;
    bank.cards.forEach((card) => {
      card.rating = null;
      card.skipped = false;
      card.lastReviewedAt = null;
    });
    bank.queue = bank.cards.map((card) => card.id);
    bank.currentIndex = 0;
    state.reviewHistory = state.reviewHistory.filter((entry) => entry.bankId !== bank.id);
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    saveState();
    render();
    toast("bank reset", "reset");
  }

  function advanceCard(bank, motion = "forward") {
    ensureQueue(bank);
    if (bank.queue.length) {
      bank.currentIndex = (bank.currentIndex + 1) % bank.queue.length;
    }
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    refs.typingFeedback.textContent = "";
    setCardMotion(motion);
    saveState();
    render();
  }

  function reviewPrevious() {
    const entry = state.reviewHistory.pop();
    if (!entry) return;
    const bank = state.banks.find((item) => item.id === entry.bankId);
    if (!bank) return;
    const card = bank.cards.find((item) => item.id === entry.cardId);
    if (!card) return;
    state.activeBankId = bank.id;
    card.rating = entry.previousRating || null;
    card.skipped = Boolean(entry.previousSkipped);
    ensureQueue(bank);
    const index = bank.queue.indexOf(card.id);
    bank.currentIndex = index >= 0 ? index : 0;
    state.study.revealed = entry.type === "rating";
    state.study.typedAnswer = entry.typedAnswer || "";
    state.study.proposedRating = entry.proposedRating || null;
    state.study.selectedRating = entry.type === "rating" ? entry.rating || null : null;
    saveState();
    render();
    toast(entry.type === "rating" ? "rating reopened" : "previous card");
  }

  function proposeRating(card, typed) {
    if (!typed) return 1;
    const targets = answerCandidates(card).map((value) => normalizeAnswer(value));
    const guess = normalizeAnswer(typed);
    if (targets.some((target) => guess === target)) return 4;
    if (targets.some((target) => target.includes(guess) || guess.includes(target))) return 3;
    if (targets.some((target) => levenshtein(target, guess) <= 2)) return 2;
    return 1;
  }

  function answerCandidates(card) {
    return [answerText(card), ...(card.accepted || []), ...(card.clozeAnswers || [])].filter(Boolean);
  }

  function normalizeAnswer(value) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    return state.settings.caseSensitive ? text : text.toLowerCase();
  }

  function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[a.length][b.length];
  }

  function importCsvText(text, name) {
    const cards = parseCardsFromCsv(text);
    if (!cards.length) {
      toast("no cards found", "error");
      return null;
    }
    const bank = normalizeBank({
      id: uid("bank"),
      name: name || `bank ${state.banks.length + 1}`,
      cards,
      queue: cards.map((card) => card.id),
      currentIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    state.banks.push(bank);
    state.activeBankId = bank.id;
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    saveState();
    render();
    toast(`imported ${cards.length} cards`, "import");
    return bank;
  }

  function importCardsAsBank(cards, name) {
    if (!cards.length) return null;
    const bank = normalizeBank({
      id: uid("bank"),
      name: name || `bank ${state.banks.length + 1}`,
      cards,
      queue: cards.map((card) => card.id),
      currentIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    state.banks.push(bank);
    return bank;
  }

  async function importFile(file) {
    const baseName = file.name.replace(/\.(csv|xlsx)$/i, "");
    if (/\.xlsx$/i.test(file.name)) {
      await importXlsxFile(file, baseName);
      return;
    }
    if (!/\.csv$/i.test(file.name)) {
      toast("use csv or xlsx", "error");
      return;
    }
    const text = await file.text();
    importCsvText(text, baseName);
  }

  function ensureSheetJs() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoadPromise) return xlsxLoadPromise;
    xlsxLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SHEETJS_SRC;
      script.async = true;
      script.onload = () => {
        if (window.XLSX) {
          resolve(window.XLSX);
          return;
        }
        xlsxLoadPromise = null;
        reject(new Error("xlsx parser unavailable"));
      };
      script.onerror = () => {
        xlsxLoadPromise = null;
        reject(new Error("xlsx parser failed"));
      };
      document.head.append(script);
    });
    return xlsxLoadPromise;
  }

  async function importXlsxFile(file, baseName) {
    try {
      const XLSX = await ensureSheetJs();
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const imported = [];
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const cards = parseCardsFromCsv(csv);
        if (!cards.length) return;
        const bank = importCardsAsBank(cards, `${baseName} - ${sheetName}`);
        if (bank) imported.push(bank);
      });
      if (!imported.length) {
        toast("no valid sheets found", "error");
        return;
      }
      state.activeBankId = imported[0].id;
      state.study.revealed = false;
      state.study.typedAnswer = "";
      state.study.proposedRating = null;
      state.study.selectedRating = null;
      selectedCardId = null;
      selectedCardIds.clear();
      selectionMode = false;
      saveState();
      render();
      toast(`imported ${imported.length} bank${imported.length === 1 ? "" : "s"}`, "import");
    } catch {
      toast("xlsx import failed", "error");
    }
  }

  function parseCardsFromCsv(text) {
    const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim()));
    if (rows.length < 2) return [];
    const headers = rows[0].map(normalizeHeader);
    return rows.slice(1).map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });
      return cardFromRecord(record);
    }).filter(Boolean);
  }

  function cardFromRecord(record) {
    const text = pick(record, ["text", "cloze"]);
    const clozeAnswers = extractClozeAnswers(text);
    const isCloze = clozeAnswers.length > 0;
    const front = pick(record, ["front", "q", "question", "stem", "prompt"]) || (isCloze ? text : "");
    const back = pick(record, ["back", "a", "answer", "response"]) || (isCloze ? clozeAnswers.join(", ") : "");
    if (!front && !back && !text) return null;
    return normalizeCard({
      id: uid("card"),
      front,
      back,
      tag: pick(record, ["tag", "tags", "category"]) || "category",
      accepted: normalizeAccepted(pick(record, ["accepted", "answers", "acceptedanswers", "acceptedanswer"])),
      explanation: pick(record, ["explanation", "explain", "note", "notes"]),
      text,
      isCloze,
      clozeAnswers
    });
  }

  function pick(record, names) {
    for (const name of names) {
      const key = normalizeHeader(name);
      if (record[key] && String(record[key]).trim()) {
        return String(record[key]).trim();
      }
    }
    return "";
  }

  function normalizeHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function normalizeAccepted(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || "").split(/[|;]+/).map((item) => item.trim()).filter(Boolean);
  }

  function extractClozeAnswers(text) {
    return Array.from(String(text || "").matchAll(/\[\[([^\]]+)\]\]/g)).map((match) => match[1].trim()).filter(Boolean);
  }

  function parseCsv(input) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    const text = String(input || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows;
  }

  function exportCsv() {
    const bank = activeBank();
    if (!bank) return;
    const rows = [["front", "back", "tag", "accepted", "explanation", "text", "rating", "skipped"]];
    bank.cards.forEach((card) => {
      rows.push([
        card.front,
        card.back,
        card.tag,
        (card.accepted || []).join("|"),
        card.explanation,
        card.text,
        card.rating || "",
        card.skipped ? "true" : "false"
      ]);
    });
    download(`${slug(bank.name)}-cards.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
    toast("cards exported", "export");
  }

  function exportProgress() {
    saveState();
    download(`flashflow-progress-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json");
    toast("progress exported", "export");
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function csvCell(value) {
    const text = String(value || "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function slug(value) {
    return String(value || "bank").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bank";
  }

  function fillEditor(card) {
    selectedCardId = card ? card.id : null;
    refs.cardFrontInput.value = card ? card.front : "";
    refs.cardBackInput.value = card ? card.back : "";
    refs.cardTextInput.value = card ? card.text : "";
    refs.cardAcceptedInput.value = card ? (card.accepted || []).join(" | ") : "";
    refs.cardExplanationInput.value = card ? card.explanation : "";
    refs.cardTagInput.value = card ? card.tag : "";
    render();
  }

  function editorCardData() {
    const text = refs.cardTextInput.value.trim();
    const clozeAnswers = extractClozeAnswers(text);
    return normalizeCard({
      id: selectedCardId || uid("card"),
      front: refs.cardFrontInput.value.trim(),
      back: refs.cardBackInput.value.trim() || (clozeAnswers.length ? clozeAnswers.join(", ") : ""),
      text,
      tag: refs.cardTagInput.value.trim() || "category",
      accepted: normalizeAccepted(refs.cardAcceptedInput.value),
      explanation: refs.cardExplanationInput.value.trim(),
      isCloze: clozeAnswers.length > 0,
      clozeAnswers
    });
  }

  function addEditorCard() {
    const bank = activeBank();
    if (!bank) {
      const newBank = normalizeBank({ id: uid("bank"), name: "manual bank", cards: [] });
      state.banks.push(newBank);
      state.activeBankId = newBank.id;
    }
    const target = activeBank();
    const card = editorCardData();
    if (!card.front && !card.back && !card.text) {
      toast("write a card first", "error");
      return;
    }
    target.cards.push(card);
    target.queue.push(card.id);
    target.updatedAt = new Date().toISOString();
    selectedCardId = card.id;
    saveState();
    render();
    toast("card added", "import");
  }

  function saveEditorCard() {
    const bank = activeBank();
    if (!bank || !selectedCardId) return;
    const index = bank.cards.findIndex((card) => card.id === selectedCardId);
    if (index < 0) return;
    const existing = bank.cards[index];
    bank.cards[index] = {
      ...editorCardData(),
      id: selectedCardId,
      rating: existing.rating,
      skipped: existing.skipped,
      lastReviewedAt: existing.lastReviewedAt
    };
    bank.updatedAt = new Date().toISOString();
    saveState();
    render();
    toast("card saved", "toggle");
  }

  function deleteCard(id) {
    const bank = activeBank();
    if (!bank) return;
    const card = bank.cards.find((item) => item.id === id);
    if (!card) return;
    if (!confirm("delete this card?")) return;
    bank.cards = bank.cards.filter((item) => item.id !== id);
    bank.queue = bank.queue.filter((item) => item !== id);
    selectedCardIds.delete(id);
    if (selectedCardId === id) fillEditor(null);
    ensureQueue(bank);
    saveState();
    render();
    toast("card deleted", "delete");
  }

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (!selectionMode) selectedCardIds.clear();
    render();
    toast(selectionMode ? "selection on" : "selection off", "toggle");
  }

  function toggleCardSelection(id, checked) {
    if (checked) {
      selectedCardIds.add(id);
    } else {
      selectedCardIds.delete(id);
    }
    render();
    playSfx("tap");
  }

  function clearCardSelection() {
    selectedCardIds.clear();
    render();
    toast("selection cleared", "toggle");
  }

  function deleteSelectedCards() {
    const bank = activeBank();
    if (!bank || !selectedCardIds.size) return;
    const count = selectedCardIds.size;
    if (!confirm(`delete ${count} selected card${count === 1 ? "" : "s"}?`)) return;
    bank.cards = bank.cards.filter((card) => !selectedCardIds.has(card.id));
    bank.queue = bank.queue.filter((id) => !selectedCardIds.has(id));
    if (selectedCardId && selectedCardIds.has(selectedCardId)) fillEditor(null);
    selectedCardIds.clear();
    selectionMode = false;
    ensureQueue(bank);
    bank.updatedAt = new Date().toISOString();
    saveState();
    render();
    toast(`${count} card${count === 1 ? "" : "s"} deleted`, "delete");
  }

  function setMinimal(value) {
    state.settings.minimal = value;
    if (value) closeInfo();
    saveState();
    render();
    playSfx("toggle");
  }

  function setAdvancedManager(value) {
    state.settings.advancedManager = value;
    saveState();
    render();
    toast(value ? "advanced on" : "advanced off", "toggle");
  }

  function openInfo() {
    if (state.settings.minimal) return;
    refs.infoModal.classList.add("is-open");
    refs.infoModal.setAttribute("aria-hidden", "false");
    refs.closeInfoBtn.focus();
    playSfx("tap");
  }

  function closeInfo() {
    refs.infoModal.classList.remove("is-open");
    refs.infoModal.setAttribute("aria-hidden", "true");
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      playSfx("toggle");
    } catch {
      toast("fullscreen unavailable", "error");
    }
  }

  function updateFullscreenIcon() {
    refs.fullscreenBtn.querySelector(".material-symbols-outlined").textContent = document.fullscreenElement ? "fullscreen_exit" : "fullscreen";
  }

  async function unlockAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) {
      audioContext = new AudioCtor();
    }
    if (audioUnlockPromise && audioContext.state === "running") {
      return audioUnlockPromise;
    }
    audioUnlockPromise = (async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const gain = audioContext.createGain();
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.connect(audioContext.destination);
      const oscillator = audioContext.createOscillator();
      oscillator.frequency.setValueAtTime(1, audioContext.currentTime);
      oscillator.connect(gain);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.01);
      return audioContext;
    })().catch(() => {
      audioContext = null;
      audioUnlockPromise = null;
      return null;
    });
    return audioUnlockPromise;
  }

  async function playSfx(kind = "tap") {
    if (!state.settings.sfx) return;
    try {
      const context = await unlockAudio();
      if (!context || context.state !== "running") return;
      const now = context.currentTime;
      const notes = {
        reveal: [392, 523],
        rate: [440, 660],
        skip: [247, 196],
        forward: [330, 440],
        complete: [392, 523, 784],
        import: [330, 494],
        export: [494, 392],
        restore: [392, 494],
        delete: [220, 165],
        reset: [262, 196],
        toggle: [294, 392],
        error: [196, 146],
        tap: [330]
      }[kind] || [330];
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.055);
        gain.gain.setValueAtTime(0.0001, now + index * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.035, now + index * 0.055 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.055 + 0.13);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.055);
        oscillator.stop(now + index * 0.055 + 0.14);
      });
    } catch {
      audioContext = null;
    }
  }

  function toast(message, sound = "tap") {
    playSfx(sound);
    refs.toast.textContent = message;
    refs.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove("is-visible"), 1800);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  ["pointerdown", "touchstart", "click", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (state.settings.sfx) unlockAudio();
    }, { capture: true, passive: true });
  });

  refs.flashcard.addEventListener("click", (event) => {
    if (event.target.closest("button,input,textarea,select")) return;
    if (!state.study.revealed) revealCard();
  });

  refs.flashcard.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    refs.flashcard.classList.add("is-dragging");
  });

  refs.flashcard.addEventListener("pointermove", (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const rotate = Math.max(-6, Math.min(6, dx / 24));
    refs.flashcard.style.transform = `translateX(${dx * 0.08}px) rotate(${rotate}deg)`;
  });

  refs.flashcard.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    refs.flashcard.classList.remove("is-dragging");
    refs.flashcard.style.transform = "";
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) skipOrForwardCurrent();
      else reviewPrevious();
    }
  });

  refs.flashcard.addEventListener("pointercancel", () => {
    pointerStart = null;
    refs.flashcard.classList.remove("is-dragging");
    refs.flashcard.style.transform = "";
  });

  refs.shuffleBankBtn.addEventListener("click", shuffleBank);
  refs.resetBankBtn.addEventListener("click", resetBankProgress);
  refs.revealBtn.addEventListener("click", revealCard);
  refs.skipBtn.addEventListener("click", skipOrForwardCurrent);
  refs.previousBtn.addEventListener("click", reviewPrevious);
  refs.restoreBtn.addEventListener("click", () => setMinimal(false));
  refs.minimalBtn.addEventListener("click", () => setMinimal(!state.settings.minimal));
  refs.advancedToggleBtn.addEventListener("click", () => setAdvancedManager(!state.settings.advancedManager));
  refs.fullscreenBtn.addEventListener("click", toggleFullscreen);
  refs.infoBtn.addEventListener("click", openInfo);
  refs.closeInfoBtn.addEventListener("click", closeInfo);
  refs.infoModal.addEventListener("click", (event) => {
    if (event.target === refs.infoModal) closeInfo();
  });

  refs.ratingControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-rating]");
    if (!button) return;
    rateCurrent(Number(button.dataset.rating));
  });

  refs.submitTypingBtn.addEventListener("click", submitTyping);
  refs.typingAnswer.addEventListener("input", () => {
    state.study.typedAnswer = refs.typingAnswer.value;
    saveState();
  });
  refs.typingAnswer.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitTyping();
    }
  });

  refs.typingToggle.addEventListener("change", () => {
    state.settings.typing = refs.typingToggle.checked;
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.autoRatingToggle.addEventListener("change", () => {
    state.settings.autoRating = refs.autoRatingToggle.checked;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.caseSensitiveToggle.addEventListener("change", () => {
    state.settings.caseSensitive = refs.caseSensitiveToggle.checked;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.sfxToggle.addEventListener("change", () => {
    state.settings.sfx = refs.sfxToggle.checked;
    saveState();
    render();
    playSfx("toggle");
  });

  refs.bankSelect.addEventListener("change", () => {
    state.activeBankId = refs.bankSelect.value;
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    saveState();
    render();
  });

  refs.renameBankBtn.addEventListener("click", () => {
    const bank = activeBank();
    if (!bank) return;
    const name = refs.bankNameInput.value.trim();
    if (!name) {
      toast("name required", "error");
      return;
    }
    bank.name = name;
    bank.updatedAt = new Date().toISOString();
    saveState();
    render();
    toast("bank renamed", "toggle");
  });

  refs.deleteBankBtn.addEventListener("click", () => {
    const bank = activeBank();
    if (!bank) return;
    if (!confirm(`delete ${bank.name}?`)) return;
    state.banks = state.banks.filter((item) => item.id !== bank.id);
    state.activeBankId = state.banks[0] ? state.banks[0].id : null;
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    saveState();
    render();
    toast("bank deleted", "delete");
  });

  refs.csvFileInput.addEventListener("change", async () => {
    const file = refs.csvFileInput.files[0];
    if (!file) return;
    await importFile(file);
    refs.csvFileInput.value = "";
  });

  refs.loadSampleBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("sample-bank.csv", { cache: "no-store" });
      if (!response.ok) throw new Error("sample not found");
      const text = await response.text();
      importCsvText(text, "sample bank");
    } catch {
      toast("open through a local server or import sample-bank.csv", "error");
    }
  });

  refs.pasteImportBtn.addEventListener("click", () => {
    importCsvText(refs.pasteArea.value, refs.pasteNameInput.value.trim() || "pasted bank");
  });

  refs.cardSearchInput.addEventListener("input", () => renderCardList(activeBank()));
  refs.selectCardsBtn.addEventListener("click", toggleSelectionMode);
  refs.bulkDeleteBtn.addEventListener("click", deleteSelectedCards);
  refs.clearSelectionBtn.addEventListener("click", clearCardSelection);
  refs.cardList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-select-card]");
    if (!checkbox) return;
    toggleCardSelection(checkbox.dataset.selectCard, checkbox.checked);
  });
  refs.cardList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    const bank = activeBank();
    if (editButton && bank) {
      fillEditor(bank.cards.find((card) => card.id === editButton.dataset.edit));
    }
    if (deleteButton) {
      deleteCard(deleteButton.dataset.delete);
    }
  });

  refs.addCardBtn.addEventListener("click", addEditorCard);
  refs.saveCardBtn.addEventListener("click", saveEditorCard);
  refs.clearEditorBtn.addEventListener("click", () => {
    fillEditor(null);
    toast("editor cleared", "toggle");
  });
  refs.exportCsvBtn.addEventListener("click", exportCsv);
  refs.exportProgressBtn.addEventListener("click", exportProgress);
  refs.restoreInput.addEventListener("change", async () => {
    const file = refs.restoreInput.files[0];
    if (!file) return;
    try {
      const restored = JSON.parse(await file.text());
      localStorage.setItem(STORE_KEY, JSON.stringify(restored));
      state = loadState();
      selectedCardId = null;
      selectedCardIds.clear();
      selectionMode = false;
      saveState();
      render();
      toast("progress restored", "restore");
    } catch {
      toast("restore failed", "error");
    }
    refs.restoreInput.value = "";
  });

  refs.resetStateBtn.addEventListener("click", () => {
    if (!confirm("clear all local flashflow state?")) return;
    localStorage.removeItem(STORE_KEY);
    state = createState();
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    fillEditor(null);
    saveState();
    render();
    toast("state cleared", "reset");
  });

  document.addEventListener("fullscreenchange", updateFullscreenIcon);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typingInField = target && /input|textarea|select/i.test(target.tagName);
    const ratingKey = ["1", "2", "3", "4"].includes(event.key);
    if (event.key === "Escape") {
      if (refs.infoModal.classList.contains("is-open")) closeInfo();
      return;
    }
    if (typingInField) {
      if (target === refs.typingAnswer && ratingKey && state.study.revealed) {
        event.preventDefault();
        rateCurrent(Number(event.key));
      }
      return;
    }
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      if (!state.study.revealed) revealCard();
    }
    if (ratingKey) {
      if (state.study.revealed) rateCurrent(Number(event.key));
    }
    if (event.key === "ArrowLeft") {
      skipOrForwardCurrent();
    }
    if (event.key === "ArrowRight") {
      reviewPrevious();
    }
  });

  window.flashflowApp = {
    importCsvText,
    importFile,
    importXlsxFile,
    parseCardsFromCsv,
    getState: () => JSON.parse(JSON.stringify(state)),
    reset: () => {
      localStorage.removeItem(STORE_KEY);
      state = createState();
      selectedCardId = null;
      saveState();
      render();
    }
  };

  saveState();
  render();
})();
