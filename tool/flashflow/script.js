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
    settingsTabs: $("settingsTabs"),
    typingToggle: $("typingToggle"),
    autoRatingLine: $("autoRatingLine"),
    autoRatingToggle: $("autoRatingToggle"),
    caseSensitiveToggle: $("caseSensitiveToggle"),
    sfxToggle: $("sfxToggle"),
    copyButtonsToggle: $("copyButtonsToggle"),
    adaptiveQuizToggle: $("adaptiveQuizToggle"),
    shuffleChoicesToggle: $("shuffleChoicesToggle"),
    timedReviewToggle: $("timedReviewToggle"),
    stepSettings: $("stepSettings"),
    stepAgainInput: $("stepAgainInput"),
    stepHardInput: $("stepHardInput"),
    stepGoodInput: $("stepGoodInput"),
    stepEasyInput: $("stepEasyInput"),
    masteryInput: $("masteryInput"),
    cardSearchInput: $("cardSearchInput"),
    cardFilterSelect: $("cardFilterSelect"),
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
    cardEditModal: $("cardEditModal"),
    closeCardEditBtn: $("closeCardEditBtn"),
    modalFrontInput: $("modalFrontInput"),
    modalBackInput: $("modalBackInput"),
    modalChoicesInput: $("modalChoicesInput"),
    modalAnswerInput: $("modalAnswerInput"),
    modalExplanationInput: $("modalExplanationInput"),
    modalTagInput: $("modalTagInput"),
    saveModalCardBtn: $("saveModalCardBtn"),
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
      sfx: true,
      copyButtons: false,
      adaptiveQuiz: false,
      shuffleChoices: false,
      timedReview: false,
      reviewSteps: { 1: 1, 2: 5, 3: 7, 4: 10 },
      masteryEasyCount: 3,
      reviewFilter: "all"
    },
    study: {
      cardId: null,
      revealed: false,
      previewingQuestion: false,
      toolsOpen: false,
      typedAnswer: "",
      proposedRating: null,
      selectedRating: null,
      quizStartedAt: null,
      quizChoice: null,
      quizCorrect: null,
      choiceOrderCardId: null,
      choiceOrder: []
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
  let activeSettingsPanel = "typing";

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
      merged.settings.reviewSteps = normalizeReviewSteps(merged.settings.reviewSteps);
      merged.settings.masteryEasyCount = Math.max(1, Number(merged.settings.masteryEasyCount) || 3);
      if (!["all", "new", "again", "hard", "good", "easy", "skipped", "learned", "repeating"].includes(merged.settings.reviewFilter)) {
        merged.settings.reviewFilter = "all";
      }
      if (!merged.settings.typing) {
        merged.settings.autoRating = false;
      }
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
    const choices = Array.isArray(card.choices) ? card.choices.map((choice) => String(choice || "").trim()).filter(Boolean) : [];
    const choiceLabels = Array.isArray(card.choiceLabels) ? card.choiceLabels.map((label) => String(label || "").trim()).filter(Boolean) : [];
    const answerIndex = Number.isFinite(Number(card.answerIndex)) ? Number(card.answerIndex) : null;
    const type = card.type === "quiz" && choices.length && answerIndex !== null && answerIndex >= 0 && answerIndex < choices.length ? "quiz" : "card";
    return {
      id: card.id || uid("card"),
      type,
      sourceId: String(card.sourceId || ""),
      difficulty: String(card.difficulty || ""),
      front: String(card.front || ""),
      back: String(card.back || ""),
      tag: String(card.tag || "category"),
      accepted: normalizeAccepted(card.accepted),
      explanation: String(card.explanation || ""),
      text,
      isCloze: Boolean(card.isCloze || clozeAnswers.length),
      clozeAnswers,
      choices,
      choiceLabels: choices.map((_, index) => choiceLabels[index] || indexToLabel(index)),
      answerIndex,
      rating: Number(card.rating) || null,
      skipped: Boolean(card.skipped),
      dueAt: card.dueAt || null,
      easyStreak: Math.max(0, Number(card.easyStreak) || 0),
      learned: Boolean(card.learned),
      lastReviewedAt: card.lastReviewedAt || null
    };
  }

  function normalizeReviewSteps(steps) {
    return {
      1: Math.max(0, Number(steps && steps[1]) || 1),
      2: Math.max(0, Number(steps && steps[2]) || 5),
      3: Math.max(0, Number(steps && steps[3]) || 7),
      4: Math.max(0, Number(steps && steps[4]) || 10)
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
    const dueIds = eligibleCardIds(bank);
    if (!dueIds.length) return null;
    for (let offset = 0; offset < bank.queue.length; offset += 1) {
      const index = (bank.currentIndex + offset) % bank.queue.length;
      const queueId = bank.queue[index];
      if (dueIds.indexOf(queueId) >= 0) {
        bank.currentIndex = index;
        return bank.cards.find((card) => card.id === queueId) || null;
      }
    }
    return null;
  }

  function isBankComplete(bank) {
    return Boolean(bank && bank.cards.length && bank.cards.every((card) => card.learned));
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

  function eligibleCardIds(bank) {
    if (!bank) return [];
    const dueIds = [];
    const fallbackIds = [];
    bank.queue.forEach((id) => {
      const card = bank.cards.find((item) => item.id === id);
      if (!card || !cardMatchesReviewFilter(card) || card.learned) return;
      fallbackIds.push(id);
      if (cardIsDue(card)) dueIds.push(id);
    });
    return dueIds.length ? dueIds : fallbackIds;
  }

  function cardMatchesReviewFilter(card) {
    const filter = state.settings.reviewFilter || "all";
    if (filter === "all") return true;
    if (filter === "new") return !card.rating && !card.skipped && !card.learned;
    if (filter === "skipped") return Boolean(card.skipped);
    if (filter === "learned") return Boolean(card.learned);
    if (filter === "repeating") return !card.learned;
    if (filter === "again") return card.rating === 1;
    if (filter === "hard") return card.rating === 2;
    if (filter === "good") return card.rating === 3;
    if (filter === "easy") return card.rating === 4;
    return true;
  }

  function cardIsDue(card) {
    if (!state.settings.timedReview) return true;
    if (card.learned) return false;
    if (!card.dueAt) return true;
    return Date.parse(card.dueAt) <= Date.now();
  }

  function nextDueAt(bank) {
    if (!bank || !state.settings.timedReview) return null;
    let next = null;
    bank.cards.forEach((card) => {
      if (card.learned || !cardMatchesReviewFilter(card) || !card.dueAt) return;
      const due = Date.parse(card.dueAt);
      if (!Number.isFinite(due) || due <= Date.now()) return;
      if (next === null || due < next) next = due;
    });
    return next;
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
        if (card.learned) {
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
    syncStudyCard(card);
    document.body.classList.toggle("app-minimal", state.settings.minimal);
    refs.managerPanel.classList.toggle("is-advanced", state.settings.advancedManager);
    refs.advancedToggleBtn.dataset.active = String(state.settings.advancedManager);
    refs.advancedToggleBtn.setAttribute("aria-pressed", String(state.settings.advancedManager));
    refs.advancedToggleBtn.querySelector("span:last-child").textContent = state.settings.advancedManager ? "compact" : "advanced";
    const typingEnabled = Boolean(state.settings.typing);
    const timedReviewEnabled = Boolean(state.settings.timedReview);
    refs.typingToggle.checked = typingEnabled;
    refs.autoRatingToggle.checked = typingEnabled && state.settings.autoRating;
    refs.autoRatingToggle.disabled = !typingEnabled;
    refs.autoRatingToggle.setAttribute("aria-disabled", String(!typingEnabled));
    refs.autoRatingLine.classList.toggle("is-disabled", !typingEnabled);
    refs.caseSensitiveToggle.checked = state.settings.caseSensitive;
    refs.sfxToggle.checked = state.settings.sfx;
    refs.copyButtonsToggle.checked = state.settings.copyButtons;
    refs.adaptiveQuizToggle.checked = state.settings.adaptiveQuiz;
    refs.shuffleChoicesToggle.checked = state.settings.shuffleChoices;
    refs.timedReviewToggle.checked = timedReviewEnabled;
    refs.stepSettings.hidden = !timedReviewEnabled;
    refs.stepSettings.classList.toggle("is-disabled", !timedReviewEnabled);
    [refs.stepAgainInput, refs.stepHardInput, refs.stepGoodInput, refs.stepEasyInput, refs.masteryInput].forEach((input) => {
      input.disabled = !timedReviewEnabled;
    });
    refs.stepAgainInput.value = state.settings.reviewSteps[1];
    refs.stepHardInput.value = state.settings.reviewSteps[2];
    refs.stepGoodInput.value = state.settings.reviewSteps[3];
    refs.stepEasyInput.value = state.settings.reviewSteps[4];
    refs.masteryInput.value = state.settings.masteryEasyCount;
    refs.cardFilterSelect.value = state.settings.reviewFilter || "all";
    pruneSelection(bank);
    renderBanks(bank);
    renderStatus(bank);
    renderCard(card, bank);
    renderCardList(bank);
    refs.typingPanel.classList.toggle("is-visible", Boolean(card && !complete && state.settings.typing && card.type !== "quiz"));
    refs.typingAnswer.value = state.study.typedAnswer || "";
    refs.ratingControls.classList.toggle("hidden", shouldHideRatingControls(card, complete));
    refs.revealBtn.disabled = !card || complete;
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
    renderSettingsPanels();
    renderRatingControls(card);
  }

  function renderSettingsPanels() {
    const panels = document.querySelectorAll("[data-settings-panel]");
    const tabs = refs.settingsTabs ? refs.settingsTabs.querySelectorAll("[data-settings-tab]") : [];
    let found = false;
    for (let index = 0; index < panels.length; index += 1) {
      if (panels[index].dataset.settingsPanel === activeSettingsPanel) {
        found = true;
        break;
      }
    }
    if (!found) activeSettingsPanel = "typing";
    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      const active = panel.dataset.settingsPanel === activeSettingsPanel;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    }
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const active = tab.dataset.settingsTab === activeSettingsPanel;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
  }

  function syncStudyCard(card) {
    const nextId = card ? card.id : null;
    if (state.study.cardId === nextId) return;
    state.study.cardId = nextId;
    state.study.revealed = false;
    state.study.previewingQuestion = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    state.study.quizChoice = null;
    state.study.quizCorrect = null;
    state.study.quizStartedAt = card && card.type === "quiz" ? Date.now() : null;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
    if (refs.typingFeedback) refs.typingFeedback.textContent = "";
  }

  function shouldHideRatingControls(card, complete) {
    if (!card || complete || !state.study.revealed || state.study.previewingQuestion) return true;
    if (card.type === "quiz" && !state.settings.adaptiveQuiz) return true;
    return false;
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
      if (card.learned) {
        counts.learned += 1;
      } else {
        counts.repeating += 1;
      }
    });
    return counts;
  }

  function renderCard(card, bank) {
    refs.flashcard.className = "flashcard";
    refs.cardCopy.className = "card-copy";
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
    const answerVisible = Boolean(card && state.study.revealed && !state.study.previewingQuestion);
    refs.flashcard.classList.toggle("is-revealed", answerVisible);
    refs.cardCategory.textContent = card ? card.tag || "category" : "category";
    refs.flashcard.setAttribute("aria-label", card && !state.study.revealed ? "reveal card" : "flashcard");
    if (!card) {
      refs.cardCopy.innerHTML = renderNoCurrentCard(bank);
      return;
    }
    if (card.type === "quiz") {
      refs.cardCopy.classList.add("is-quiz");
      renderQuizCard(card);
      return;
    }
    if (answerVisible) {
      const explanation = visibleExplanation(card);
      refs.cardCopy.innerHTML = `
        ${copyActionsHtml("answer")}
        <div class="answer-copy">${escapeHtml(answerText(card) || "no answer")}</div>
        ${explanation ? `<div class="explanation">${escapeHtml(explanation)}</div>` : ""}
      `;
    } else {
      refs.cardCopy.innerHTML = `${copyActionsHtml("question")}${renderQuestion(card)}`;
    }
  }

  function renderNoCurrentCard(bank) {
    if (!bank || !bank.cards.length) return "import a bank to begin";
    const due = nextDueAt(bank);
    if (due) {
      return `<div class="complete-copy">caught up</div><div class="explanation">next review ${escapeHtml(formatDueTime(due))}</div>`;
    }
    return `<div class="complete-copy">no cards in filter</div>`;
  }

  function renderQuizCard(card) {
    const order = quizChoiceOrder(card);
    const selected = Number.isFinite(Number(state.study.quizChoice)) ? Number(state.study.quizChoice) : null;
    const correct = Number(card.answerIndex);
    const answered = state.study.revealed && !state.study.previewingQuestion;
    const locked = state.study.revealed;
    const choices = order.map((choiceIndex, displayIndex) => {
      const stateClass = answered && choiceIndex === correct ? " is-correct" : answered && choiceIndex === selected && choiceIndex !== correct ? " is-wrong" : "";
      const selectedClass = choiceIndex === selected ? " is-selected" : "";
      const disabled = locked ? " disabled" : "";
      const label = card.choiceLabels[choiceIndex] || indexToLabel(displayIndex);
      return `<button class="quiz-choice${stateClass}${selectedClass}" type="button" data-choice="${choiceIndex}"${disabled}>
        <span class="quiz-choice-letter">${escapeHtml(label)}</span>
        <span class="quiz-choice-text">${escapeHtml(card.choices[choiceIndex])}</span>
      </button>`;
    }).join("");
    const explanation = answered ? visibleExplanation(card) : "";
    refs.cardCopy.innerHTML = `
      <div class="quiz-card">
        ${copyActionsHtml(answered ? "answer" : "question")}
        <div class="quiz-stem">${escapeHtml(card.front || "untitled question")}</div>
        <div class="quiz-choices">${choices}</div>
        ${answered ? `<div class="quiz-feedback ${state.study.quizCorrect ? "is-correct" : "is-wrong"}">${state.study.quizCorrect ? "correct" : "again"}</div>` : ""}
        ${explanation ? `<div class="explanation">${escapeHtml(explanation)}</div>` : ""}
      </div>
    `;
  }

  function copyActionsHtml(kind) {
    if (!state.settings.copyButtons) return "";
    const label = kind === "answer" ? "copy answer" : "copy question";
    return `<div class="copy-card-actions">
      <button class="copy-card-button" type="button" data-copy-card="${kind}" aria-label="${label}">
        <span class="material-symbols-outlined" aria-hidden="true">content_copy</span>
      </button>
      <button class="copy-card-button" type="button" data-card-tools aria-label="card tools" aria-expanded="${state.study.toolsOpen ? "true" : "false"}">
        <span class="material-symbols-outlined" aria-hidden="true">more_horiz</span>
      </button>
      ${state.study.toolsOpen ? `<div class="card-tools-menu">
        <button type="button" data-edit-current><span class="material-symbols-outlined" aria-hidden="true">edit</span><span>edit</span></button>
        <button type="button" data-delete-current><span class="material-symbols-outlined" aria-hidden="true">delete</span><span>delete</span></button>
      </div>` : ""}
    </div>`;
  }

  function renderQuestion(card) {
    if (card.isCloze && card.text) {
      return escapeHtml(card.text).replace(/\[\[[^\]]+\]\]/g, '<span class="blank" aria-label="blank"></span>');
    }
    return escapeHtml(card.front || card.text || "untitled card");
  }

  function answerText(card) {
    if (card.type === "quiz") {
      return card.choices[card.answerIndex] || "";
    }
    if (card.isCloze && card.clozeAnswers.length) {
      return card.clozeAnswers.join(", ");
    }
    return card.back;
  }

  function visibleExplanation(card) {
    const explanation = String(card.explanation || "").trim();
    if (!explanation) return "";
    const answer = answerText(card);
    if (normalizeComparable(explanation) === normalizeComparable(answer)) return "";
    if (card.type === "quiz") {
      const withoutPrefix = explanation.replace(/^correct:\s*/i, "").replace(/\s+/g, " ").trim();
      if (normalizeComparable(withoutPrefix) === normalizeComparable(answer)) return "";
    }
    return explanation;
  }

  function normalizeComparable(value) {
    return String(value || "").toLowerCase().replace(/^correct:\s*/i, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function quizChoiceOrder(card) {
    if (state.study.choiceOrderCardId === card.id && Array.isArray(state.study.choiceOrder) && state.study.choiceOrder.length === card.choices.length) {
      return state.study.choiceOrder.slice();
    }
    const order = card.choices.map((_, index) => index);
    if (state.settings.shuffleChoices) {
      for (let index = order.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const value = order[index];
        order[index] = order[swapIndex];
        order[swapIndex] = value;
      }
    }
    state.study.choiceOrderCardId = card.id;
    state.study.choiceOrder = order.slice();
    return order;
  }

  function formatDueTime(timestamp) {
    const diff = Math.max(0, timestamp - Date.now());
    const minutes = Math.ceil(diff / 60000);
    if (minutes <= 1) return "in 1 minute";
    if (minutes < 60) return `in ${minutes} minutes`;
    const hours = Math.ceil(minutes / 60);
    return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
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
      const text = `${card.front} ${card.back} ${card.text} ${card.tag} ${card.explanation} ${(card.choices || []).join(" ")}`.toLowerCase();
      return cardMatchesReviewFilter(card) && (!query || text.includes(query));
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
          <div class="card-row-meta">${escapeHtml(card.tag || "category")} / ${card.type === "quiz" ? "quiz / " : ""}${card.learned ? "learned" : card.rating ? RATING_LABELS[card.rating] : card.skipped ? "skipped" : "unrated"}</div>
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

  function canPreviewFlip(card) {
    return Boolean(card && (card.rating || state.study.selectedRating || state.study.proposedRating));
  }

  function revealCard() {
    if (isBankComplete(activeBank())) return;
    const card = currentCard();
    if (!card) return;
    if (state.study.revealed && canPreviewFlip(card)) {
      state.study.previewingQuestion = !state.study.previewingQuestion;
      setCardMotion("flip");
      saveState();
      render();
      return;
    }
    if (card.type === "quiz" && !state.study.revealed) {
      revealQuizAnswer(card);
      return;
    }
    state.study.revealed = true;
    state.study.previewingQuestion = false;
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
    state.study.previewingQuestion = false;
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
    const previousDueAt = card.dueAt;
    const previousEasyStreak = card.easyStreak;
    const previousLearned = card.learned;
    state.study.previewingQuestion = false;
    applyRating(card, rating);
    state.reviewHistory.push({
      type: "rating",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      previousDueAt,
      previousEasyStreak,
      previousLearned,
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
    const previousDueAt = card.dueAt;
    const previousEasyStreak = card.easyStreak;
    const previousLearned = card.learned;
    card.rating = null;
    card.skipped = true;
    card.dueAt = null;
    card.easyStreak = 0;
    card.learned = false;
    state.reviewHistory.push({
      type: "skip",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      previousDueAt,
      previousEasyStreak,
      previousLearned,
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
    const previousDueAt = card.dueAt;
    const previousEasyStreak = card.easyStreak;
    const previousLearned = card.learned;
    if (selectedRating && state.study.revealed) {
      applyRating(card, selectedRating);
    }
    state.reviewHistory.push({
      type: "forward",
      bankId: bank.id,
      cardId: card.id,
      previousRating,
      previousSkipped,
      previousDueAt,
      previousEasyStreak,
      previousLearned,
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
      card.dueAt = null;
      card.easyStreak = 0;
      card.learned = false;
      card.lastReviewedAt = null;
    });
    bank.queue = bank.cards.map((card) => card.id);
    bank.currentIndex = 0;
    state.reviewHistory = state.reviewHistory.filter((entry) => entry.bankId !== bank.id);
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    state.study.cardId = null;
    state.study.quizChoice = null;
    state.study.quizCorrect = null;
    state.study.quizStartedAt = null;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
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
    state.study.cardId = null;
    state.study.quizChoice = null;
    state.study.quizCorrect = null;
    state.study.quizStartedAt = null;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
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
    card.dueAt = entry.previousDueAt || null;
    card.easyStreak = Math.max(0, Number(entry.previousEasyStreak) || 0);
    card.learned = Boolean(entry.previousLearned);
    ensureQueue(bank);
    const index = bank.queue.indexOf(card.id);
    bank.currentIndex = index >= 0 ? index : 0;
    state.study.revealed = entry.type === "rating";
    state.study.typedAnswer = entry.typedAnswer || "";
    state.study.proposedRating = entry.proposedRating || null;
    state.study.selectedRating = entry.type === "rating" ? entry.rating || null : null;
    state.study.cardId = card.id;
    state.study.quizStartedAt = card.type === "quiz" ? Date.now() : null;
    saveState();
    render();
    toast(entry.type === "rating" ? "rating reopened" : "previous card");
  }

  function applyRating(card, rating) {
    const now = new Date();
    card.rating = rating;
    card.skipped = false;
    card.lastReviewedAt = now.toISOString();
    if (rating === 4) {
      card.easyStreak = Math.max(0, Number(card.easyStreak) || 0) + 1;
    } else {
      card.easyStreak = 0;
      card.learned = false;
    }
    if (rating === 4 && card.easyStreak >= state.settings.masteryEasyCount) {
      card.learned = true;
      card.dueAt = null;
    } else if (state.settings.timedReview) {
      card.learned = false;
      card.dueAt = new Date(now.getTime() + reviewStepMinutes(rating) * 60000).toISOString();
    } else {
      card.dueAt = null;
    }
  }

  function reviewStepMinutes(rating) {
    const steps = normalizeReviewSteps(state.settings.reviewSteps);
    return Math.max(0, Number(steps[rating]) || 0);
  }

  function answerQuizChoice(choiceIndex) {
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || card.type !== "quiz" || state.study.revealed) return;
    const correct = Number(choiceIndex) === Number(card.answerIndex);
    state.study.quizChoice = Number(choiceIndex);
    state.study.quizCorrect = correct;
    state.study.revealed = true;
    state.study.previewingQuestion = false;
    const rating = state.settings.adaptiveQuiz ? proposeQuizRating(card, correct) : correct ? 4 : 1;
    state.study.proposedRating = state.settings.adaptiveQuiz ? rating : null;
    state.study.selectedRating = state.settings.adaptiveQuiz ? rating : null;
    if (!state.settings.adaptiveQuiz) {
      applyRating(card, rating);
    }
    setCardMotion("flip");
    saveState();
    render();
    toast(correct ? "correct" : "again", correct ? "rate" : "error");
  }

  function revealQuizAnswer(card) {
    state.study.quizChoice = null;
    state.study.quizCorrect = false;
    state.study.revealed = true;
    state.study.previewingQuestion = false;
    state.study.proposedRating = state.settings.adaptiveQuiz ? 1 : null;
    state.study.selectedRating = state.settings.adaptiveQuiz ? 1 : null;
    if (!state.settings.adaptiveQuiz) {
      applyRating(card, 1);
    }
    setCardMotion("flip");
    playSfx("reveal");
    saveState();
    render();
  }

  function proposeQuizRating(card, correct) {
    if (!correct) return 1;
    const started = Number(state.study.quizStartedAt) || Date.now();
    const elapsed = Math.max(0.5, (Date.now() - started) / 1000);
    const textLength = String(card.front || "").length + (card.choices || []).join(" ").length;
    const expected = Math.max(6, Math.min(45, 4 + textLength / 22));
    const ratio = elapsed / expected;
    if (ratio <= 0.65) return 4;
    if (ratio <= 1.15) return 3;
    if (ratio <= 1.8) return 2;
    return 1;
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
    const text = await readFileAsText(file);
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
      const workbook = XLSX.read(await readFileAsArrayBuffer(file), { type: "array" });
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
    const choiceEntries = getChoiceEntries(record);
    const answerIndex = parseChoiceAnswer(pick(record, ["answer", "correct"]), choiceEntries);
    const stem = pick(record, ["stem", "question", "front", "q", "prompt"]);
    if (stem && choiceEntries.length && answerIndex !== null) {
      const choices = choiceEntries.map((entry) => entry.value);
      return normalizeCard({
        id: uid("card"),
        type: "quiz",
        sourceId: pick(record, ["id", "sourceid"]),
        difficulty: pick(record, ["difficulty", "diff"]),
        front: stem,
        back: choices[answerIndex] || "",
        tag: pick(record, ["topic", "tag", "tags", "category"]) || "category",
        explanation: pick(record, ["explanation", "explain", "note", "notes"]),
        choices,
        choiceLabels: choiceEntries.map((entry) => entry.label),
        answerIndex
      });
    }
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

  function getChoiceEntries(record) {
    const entries = [];
    for (let index = 0; index < 702; index += 1) {
      const label = indexToLabel(index);
      const key = normalizeHeader(label);
      if (!Object.prototype.hasOwnProperty.call(record, key)) break;
      const value = String(record[key] || "").trim();
      if (value) entries.push({ label, value });
    }
    return entries;
  }

  function parseChoiceAnswer(value, choiceEntries) {
    const text = String(value || "").trim();
    if (!text) return null;
    const upper = text.toUpperCase();
    for (let index = 0; index < choiceEntries.length; index += 1) {
      if (choiceEntries[index].label === upper) return index;
    }
    const numeric = parseInt(text, 10);
    if (!Number.isNaN(numeric)) {
      if (numeric === 0 && choiceEntries.length) return 0;
      if (numeric >= 1 && numeric <= choiceEntries.length) return numeric - 1;
      if (numeric >= 0 && numeric < choiceEntries.length) return numeric;
    }
    const comparable = normalizeComparable(text);
    for (let index = 0; index < choiceEntries.length; index += 1) {
      if (normalizeComparable(choiceEntries[index].value) === comparable) return index;
    }
    return null;
  }

  function indexToLabel(index) {
    let value = Number(index);
    let label = "";
    do {
      label = String.fromCharCode(65 + (value % 26)) + label;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return label;
  }

  function normalizeAccepted(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || "").split(/[|;]+/).map((item) => item.trim()).filter(Boolean);
  }

  function extractClozeAnswers(text) {
    const answers = [];
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match = pattern.exec(String(text || ""));
    while (match) {
      if (match[1] && match[1].trim()) answers.push(match[1].trim());
      match = pattern.exec(String(text || ""));
    }
    return answers;
  }

  function readFileAsText(file) {
    if (file.text) return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("file read failed"));
      reader.readAsText(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    if (file.arrayBuffer) return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("file read failed"));
      reader.readAsArrayBuffer(file);
    });
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
    const maxChoices = bank.cards.reduce((max, card) => Math.max(max, (card.choices || []).length), 0);
    const choiceHeaders = [];
    for (let index = 0; index < maxChoices; index += 1) choiceHeaders.push(indexToLabel(index));
    const rows = [["type", "id", "topic", "difficulty", "stem", ...choiceHeaders, "answer", "explanation", "front", "back", "tag", "accepted", "text", "rating", "skipped", "easyStreak", "learned", "dueAt"]];
    bank.cards.forEach((card) => {
      const choiceCells = choiceHeaders.map((_, index) => card.choices && card.choices[index] ? card.choices[index] : "");
      rows.push([
        card.type || "card",
        card.sourceId || card.id,
        card.tag,
        card.difficulty || "",
        card.type === "quiz" ? card.front : "",
        ...choiceCells,
        card.type === "quiz" ? (card.choiceLabels[card.answerIndex] || indexToLabel(card.answerIndex)) : card.back,
        card.explanation,
        card.type === "quiz" ? "" : card.front,
        card.back,
        card.tag,
        (card.accepted || []).join("|"),
        card.text,
        card.rating || "",
        card.skipped ? "true" : "false",
        card.easyStreak || "",
        card.learned ? "true" : "false",
        card.dueAt || ""
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
    const edited = editorCardData();
    bank.cards[index] = {
      ...edited,
      id: selectedCardId,
      type: existing.type,
      sourceId: existing.sourceId,
      difficulty: existing.difficulty,
      choices: existing.choices,
      choiceLabels: existing.choiceLabels,
      answerIndex: existing.answerIndex,
      rating: existing.rating,
      skipped: existing.skipped,
      dueAt: existing.dueAt,
      easyStreak: existing.easyStreak,
      learned: existing.learned,
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

  function updateReviewStepSettings() {
    state.settings.reviewSteps = normalizeReviewSteps({
      1: refs.stepAgainInput.value,
      2: refs.stepHardInput.value,
      3: refs.stepGoodInput.value,
      4: refs.stepEasyInput.value
    });
    state.settings.masteryEasyCount = Math.max(1, Number(refs.masteryInput.value) || 3);
    saveState();
    render();
  }

  function copyCurrentCard(kind) {
    const card = currentCard();
    if (!card) return;
    const text = kind === "answer" ? answerText(card) : questionText(card);
    if (!text) {
      toast("nothing to copy", "error");
      return;
    }
    copyText(text).then(() => toast(kind === "answer" ? "answer copied" : "question copied", "tap")).catch(() => toast("copy failed", "error"));
  }

  function questionText(card) {
    return card.type === "quiz" ? card.front : card.front || card.text || "";
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.append(area);
      area.select();
      try {
        if (document.execCommand("copy")) resolve();
        else reject(new Error("copy failed"));
      } catch (error) {
        reject(error);
      }
      area.remove();
    });
  }

  function openCurrentCardEditor() {
    const card = currentCard();
    if (!card) return;
    selectedCardId = card.id;
    state.study.toolsOpen = false;
    refs.modalFrontInput.value = card.front || card.text || "";
    refs.modalBackInput.value = answerText(card);
    refs.modalChoicesInput.value = card.type === "quiz" ? (card.choices || []).join("\n") : "";
    refs.modalAnswerInput.value = card.type === "quiz" ? (card.choiceLabels[card.answerIndex] || indexToLabel(card.answerIndex)) : "";
    refs.modalExplanationInput.value = card.explanation || "";
    refs.modalTagInput.value = card.tag || "category";
    refs.cardEditModal.classList.add("is-open");
    refs.cardEditModal.setAttribute("aria-hidden", "false");
    refs.modalFrontInput.focus();
  }

  function closeCardEditor() {
    refs.cardEditModal.classList.remove("is-open");
    refs.cardEditModal.setAttribute("aria-hidden", "true");
  }

  function saveModalCard() {
    const bank = activeBank();
    if (!bank || !selectedCardId) return;
    const card = bank.cards.find((item) => item.id === selectedCardId);
    if (!card) return;
    const choices = refs.modalChoicesInput.value.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean);
    card.front = refs.modalFrontInput.value.trim();
    card.tag = refs.modalTagInput.value.trim() || "category";
    card.explanation = refs.modalExplanationInput.value.trim();
    if (choices.length) {
      const entries = choices.map((choice, index) => ({ label: indexToLabel(index), value: choice }));
      const answerIndex = parseChoiceAnswer(refs.modalAnswerInput.value, entries);
      card.type = "quiz";
      card.choices = choices;
      card.choiceLabels = entries.map((entry) => entry.label);
      card.answerIndex = answerIndex === null ? 0 : answerIndex;
      card.back = choices[card.answerIndex] || "";
      card.text = "";
      card.isCloze = false;
      card.clozeAnswers = [];
    } else {
      const text = refs.modalFrontInput.value.indexOf("[[") >= 0 ? refs.modalFrontInput.value.trim() : card.text;
      const clozeAnswers = extractClozeAnswers(text);
      card.type = "card";
      card.back = refs.modalBackInput.value.trim() || (clozeAnswers.length ? clozeAnswers.join(", ") : "");
      card.text = text || "";
      card.isCloze = clozeAnswers.length > 0;
      card.clozeAnswers = clozeAnswers;
      card.choices = [];
      card.choiceLabels = [];
      card.answerIndex = null;
    }
    bank.updatedAt = new Date().toISOString();
    closeCardEditor();
    saveState();
    render();
    toast("card saved", "toggle");
  }

  function deleteCurrentCard() {
    const card = currentCard();
    if (!card) return;
    state.study.toolsOpen = false;
    deleteCard(card.id);
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
    if (!state.study.revealed || canPreviewFlip(currentCard())) revealCard();
  });

  refs.cardFace.addEventListener("click", (event) => {
    const toolsButton = event.target.closest("[data-card-tools]");
    if (toolsButton) {
      state.study.toolsOpen = !state.study.toolsOpen;
      render();
      return;
    }
    if (event.target.closest("[data-edit-current]")) {
      openCurrentCardEditor();
      return;
    }
    if (event.target.closest("[data-delete-current]")) {
      deleteCurrentCard();
      return;
    }
    const copyButton = event.target.closest("[data-copy-card]");
    if (copyButton) {
      copyCurrentCard(copyButton.dataset.copyCard);
      return;
    }
    const button = event.target.closest("[data-choice]");
    if (!button) return;
    answerQuizChoice(Number(button.dataset.choice));
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
  refs.closeCardEditBtn.addEventListener("click", closeCardEditor);
  refs.saveModalCardBtn.addEventListener("click", saveModalCard);
  refs.cardEditModal.addEventListener("click", (event) => {
    if (event.target === refs.cardEditModal) closeCardEditor();
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
    if (!state.settings.typing) {
      state.settings.autoRating = false;
    }
    state.study.revealed = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.autoRatingToggle.addEventListener("change", () => {
    if (!state.settings.typing) {
      refs.autoRatingToggle.checked = false;
      return;
    }
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
  refs.copyButtonsToggle.addEventListener("change", () => {
    state.settings.copyButtons = refs.copyButtonsToggle.checked;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.adaptiveQuizToggle.addEventListener("change", () => {
    state.settings.adaptiveQuiz = refs.adaptiveQuizToggle.checked;
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    saveState();
    render();
    playSfx("toggle");
  });
  refs.shuffleChoicesToggle.addEventListener("change", () => {
    state.settings.shuffleChoices = refs.shuffleChoicesToggle.checked;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
    saveState();
    render();
    playSfx("toggle");
  });
  refs.timedReviewToggle.addEventListener("change", () => {
    state.settings.timedReview = refs.timedReviewToggle.checked;
    saveState();
    render();
    playSfx("toggle");
  });
  [refs.stepAgainInput, refs.stepHardInput, refs.stepGoodInput, refs.stepEasyInput, refs.masteryInput].forEach((input) => {
    input.addEventListener("change", updateReviewStepSettings);
    input.addEventListener("input", updateReviewStepSettings);
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

  refs.settingsTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-settings-tab]");
    if (!tab) return;
    activeSettingsPanel = tab.dataset.settingsTab || "typing";
    render();
    playSfx("toggle");
  });

  refs.cardSearchInput.addEventListener("input", () => renderCardList(activeBank()));
  refs.cardFilterSelect.addEventListener("change", () => {
    state.settings.reviewFilter = refs.cardFilterSelect.value;
    state.study.cardId = null;
    saveState();
    render();
    playSfx("toggle");
  });
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
      const restored = JSON.parse(await readFileAsText(file));
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
      if (refs.cardEditModal.classList.contains("is-open")) closeCardEditor();
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
      const card = currentCard();
      if (card && card.type === "quiz" && !state.study.revealed) {
        const order = quizChoiceOrder(card);
        const displayIndex = Number(event.key) - 1;
        if (order[displayIndex] !== undefined) {
          answerQuizChoice(order[displayIndex]);
        }
      } else if (state.study.revealed) {
        rateCurrent(Number(event.key));
      }
    }
    if (event.key === "ArrowLeft") {
      reviewPrevious();
    }
    if (event.key === "ArrowRight") {
      skipOrForwardCurrent();
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
