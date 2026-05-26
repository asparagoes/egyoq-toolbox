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
    cardToolsLayer: $("cardToolsLayer"),
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
    selectBanksBtn: $("selectBanksBtn"),
    createBankBtn: $("createBankBtn"),
    bankSelectionCount: $("bankSelectionCount"),
    bankBulkMenuWrap: $("bankBulkMenuWrap"),
    bankBulkMenuBtn: $("bankBulkMenuBtn"),
    bankBulkControls: $("bankBulkControls"),
    selectAllBanksBtn: $("selectAllBanksBtn"),
    bulkDeleteBanksBtn: $("bulkDeleteBanksBtn"),
    clearBankSelectionBtn: $("clearBankSelectionBtn"),
    bankList: $("bankList"),
    bankNameInput: $("bankNameInput"),
    renameBankBtn: $("renameBankBtn"),
    deleteBankBtn: $("deleteBankBtn"),
    csvFileInput: $("csvFileInput"),
    loadSampleBtn: $("loadSampleBtn"),
    sampleMenu: $("sampleMenu"),
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
    cardBulkMenuWrap: $("cardBulkMenuWrap"),
    cardBulkMenuBtn: $("cardBulkMenuBtn"),
    bulkControls: $("bulkControls"),
    selectAllCardsBtn: $("selectAllCardsBtn"),
    bulkDeleteBtn: $("bulkDeleteBtn"),
    clearSelectionBtn: $("clearSelectionBtn"),
    selectionCount: $("selectionCount"),
    addCardBtn: $("addCardBtn"),
    exportCsvBtn: $("exportCsvBtn"),
    exportProgressBtn: $("exportProgressBtn"),
    restoreInput: $("restoreInput"),
    resetStateBtn: $("resetStateBtn"),
    infoModal: $("infoModal"),
    infoTabs: $("infoTabs"),
    closeInfoBtn: $("closeInfoBtn"),
    cardEditModal: $("cardEditModal"),
    cardEditTitle: $("cardEditTitle"),
    closeCardEditBtn: $("closeCardEditBtn"),
    modalFrontInput: $("modalFrontInput"),
    modalBackInput: $("modalBackInput"),
    modalAcceptedInput: $("modalAcceptedInput"),
    modalChoicesInput: $("modalChoicesInput"),
    modalAnswerInput: $("modalAnswerInput"),
    modalExplanationInput: $("modalExplanationInput"),
    modalTagInput: $("modalTagInput"),
    modalImageInput: $("modalImageInput"),
    modalImageBackInput: $("modalImageBackInput"),
    saveModalCardBtn: $("saveModalCardBtn"),
    bankBuilderModal: $("bankBuilderModal"),
    closeBankBuilderBtn: $("closeBankBuilderBtn"),
    builderBankNameInput: $("builderBankNameInput"),
    builderRows: $("builderRows"),
    addRegularRowBtn: $("addRegularRowBtn"),
    addClozeRowBtn: $("addClozeRowBtn"),
    addQuizRowBtn: $("addQuizRowBtn"),
    addImageRowBtn: $("addImageRowBtn"),
    addMixedRowsBtn: $("addMixedRowsBtn"),
    selectBuilderRowsBtn: $("selectBuilderRowsBtn"),
    builderSelectionCount: $("builderSelectionCount"),
    builderBulkMenuWrap: $("builderBulkMenuWrap"),
    builderBulkMenuBtn: $("builderBulkMenuBtn"),
    builderBulkControls: $("builderBulkControls"),
    selectAllBuilderRowsBtn: $("selectAllBuilderRowsBtn"),
    deleteSelectedBuilderRowsBtn: $("deleteSelectedBuilderRowsBtn"),
    clearBuilderSelectionBtn: $("clearBuilderSelectionBtn"),
    saveBankBuilderBtn: $("saveBankBuilderBtn"),
    copyPromptBtn: $("copyPromptBtn"),
    aiPromptText: $("aiPromptText"),
    imagePreviewModal: $("imagePreviewModal"),
    imagePreviewImg: $("imagePreviewImg"),
    imagePreviewCaption: $("imagePreviewCaption"),
    closeImagePreviewBtn: $("closeImagePreviewBtn"),
    imageActionMenu: $("imageActionMenu"),
    toast: $("toast")
  };

  const createState = () => ({
    version: 1,
    banks: [],
    activeBankId: null,
    settings: {
      typing: false,
      autoRating: true,
      autoRatingUserSet: false,
      caseSensitive: false,
      minimal: false,
      advancedManager: false,
      sfx: true,
      copyButtons: false,
      adaptiveQuiz: false,
      shuffleChoices: false,
      timedReview: true,
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
      quizChoices: [],
      quizActiveIndex: 0,
      quizKeyboardActive: false,
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
  let bankSelectionMode = false;
  let selectedBankIds = new Set();
  let builderRows = [];
  let builderSelectionMode = false;
  let selectedBuilderRowIds = new Set();
  let toastTimer = 0;
  let audioContext = null;
  let audioUnlockPromise = null;
  let audioUnlocked = false;
  let cardMotion = null;
  let cardMotionTimer = 0;
  let xlsxLoadPromise = null;
  let activeSettingsPanel = "typing";
  let activeInfoPanel = "basics";
  let imageMenuData = null;
  let imageLongPressTimer = 0;
  let imageLongPressFired = false;

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
      const savedSettings = saved.settings || {};
      if (!Object.prototype.hasOwnProperty.call(savedSettings, "autoRatingUserSet")) {
        merged.settings.autoRatingUserSet = false;
      }
      if (merged.settings.typing && !merged.settings.autoRatingUserSet) {
        merged.settings.autoRating = true;
      }
      if (!merged.study.revealed) {
        merged.study.quizChoice = null;
        merged.study.quizChoices = [];
        merged.study.quizKeyboardActive = false;
        merged.study.quizCorrect = null;
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
    const hasAnswerIndex = card.answerIndex !== null && card.answerIndex !== undefined && card.answerIndex !== "";
    const rawAnswerIndexes = Array.isArray(card.answerIndexes) ? card.answerIndexes : hasAnswerIndex && Number.isFinite(Number(card.answerIndex)) ? [Number(card.answerIndex)] : [];
    const answerIndexes = uniqueNumbers(rawAnswerIndexes).filter((index) => index >= 0 && index < choices.length);
    const answerIndex = answerIndexes.length ? answerIndexes[0] : null;
    const type = card.type === "quiz" && choices.length && answerIndexes.length ? "quiz" : "card";
    return {
      id: card.id || uid("card"),
      type,
      sourceId: String(card.sourceId || ""),
      difficulty: String(card.difficulty || ""),
      front: String(card.front || ""),
      back: String(card.back || ""),
      tag: String(card.tag || card.tags || "tags"),
      image: String(card.image || card.imageFront || card.frontImage || ""),
      imageBack: String(card.imageBack || card.answerImage || card.backImage || ""),
      imageExplanation: String(card.imageExplanation || card.explanationImage || ""),
      accepted: normalizeAccepted(card.accepted),
      explanation: String(card.explanation || ""),
      text,
      isCloze: Boolean(card.isCloze || clozeAnswers.length),
      clozeAnswers,
      choices,
      choiceLabels: choices.map((_, index) => choiceLabels[index] || indexToLabel(index)),
      answerIndex,
      answerIndexes,
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

  function uniqueNumbers(values) {
    const seen = [];
    (values || []).forEach((value) => {
      if (value === null || value === undefined || value === "") return;
      const number = Number(value);
      if (Number.isFinite(number) && seen.indexOf(number) < 0) seen.push(number);
    });
    return seen;
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
    pruneBankSelection();
    pruneSelection(bank);
    renderBanks(bank);
    renderBankList();
    renderStatus(bank);
    renderCard(card, bank);
    renderCardList(bank);
    refs.typingPanel.classList.toggle("is-visible", Boolean(card && !complete && state.settings.typing && card.type === "card"));
    refs.typingAnswer.value = state.study.typedAnswer || "";
    refs.ratingControls.classList.toggle("hidden", shouldHideRatingControls(card, complete));
    refs.revealBtn.disabled = !card || complete;
    refs.skipBtn.disabled = !card || complete;
    renderSkipAction(card, complete);
    refs.previousBtn.disabled = !hasCurrentBankHistory(bank);
    refs.shuffleBankBtn.disabled = !bank || bank.cards.length < 2;
    refs.resetBankBtn.disabled = !bank || !bank.cards.length;
    refs.addCardBtn.disabled = false;
    refs.exportCsvBtn.disabled = !bank || !bank.cards.length;
    refs.deleteBankBtn.disabled = !bank;
    refs.renameBankBtn.disabled = !bank;
    refs.selectBanksBtn.disabled = !state.banks.length;
    refs.selectBanksBtn.dataset.active = String(bankSelectionMode);
    refs.selectBanksBtn.setAttribute("aria-pressed", String(bankSelectionMode));
    refs.selectBanksBtn.querySelector("span:last-child").textContent = bankSelectionMode ? "done" : "select banks";
    refs.bankBulkMenuWrap.classList.toggle("hidden", !bankSelectionMode);
    if (!bankSelectionMode) setMenuOpen(refs.bankBulkControls, refs.bankBulkMenuBtn, false);
    refs.bankList.classList.toggle("hidden", !bankSelectionMode);
    refs.selectAllBanksBtn.disabled = !bankSelectionMode || !state.banks.length;
    refs.bulkDeleteBanksBtn.disabled = !selectedBankIds.size;
    refs.clearBankSelectionBtn.disabled = !selectedBankIds.size;
    refs.bankSelectionCount.textContent = `${selectedBankIds.size} selected`;
    refs.selectCardsBtn.disabled = !bank || !bank.cards.length;
    refs.selectCardsBtn.dataset.active = String(selectionMode);
    refs.selectCardsBtn.setAttribute("aria-pressed", String(selectionMode));
    refs.selectCardsBtn.querySelector("span:last-child").textContent = selectionMode ? "done" : "select";
    refs.cardBulkMenuWrap.classList.toggle("hidden", !selectionMode);
    if (!selectionMode) setMenuOpen(refs.bulkControls, refs.cardBulkMenuBtn, false);
    refs.selectAllCardsBtn.disabled = !selectionMode || !filteredCards(bank).length;
    refs.bulkDeleteBtn.disabled = !selectedCardIds.size;
    refs.clearSelectionBtn.disabled = !selectedCardIds.size;
    refs.selectionCount.textContent = `${selectedCardIds.size} selected`;
    refs.bankNameInput.value = bank ? bank.name : "";
    renderSettingsPanels();
    renderInfoPanels();
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

  function renderInfoPanels() {
    if (!refs.infoTabs) return;
    const tabs = refs.infoTabs.querySelectorAll("[data-info-tab]");
    const panels = document.querySelectorAll("[data-info-panel]");
    let found = false;
    for (let index = 0; index < panels.length; index += 1) {
      if (panels[index].dataset.infoPanel === activeInfoPanel) {
        found = true;
        break;
      }
    }
    if (!found) activeInfoPanel = "basics";
    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      const active = panel.dataset.infoPanel === activeInfoPanel;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    }
    for (let index = 0; index < tabs.length; index += 1) {
      const tab = tabs[index];
      const active = tab.dataset.infoTab === activeInfoPanel;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    }
  }

  function syncStudyCard(card) {
    const nextId = card ? card.id : null;
    if (state.study.cardId === nextId) return;
    state.study.cardId = nextId;
    resetStudyTransient(card);
  }

  function resetStudyTransient(card = null) {
    state.study.revealed = false;
    state.study.previewingQuestion = false;
    state.study.typedAnswer = "";
    state.study.proposedRating = null;
    state.study.selectedRating = null;
    state.study.quizChoice = null;
    state.study.quizChoices = [];
    state.study.quizActiveIndex = 0;
    state.study.quizKeyboardActive = false;
    state.study.quizCorrect = null;
    state.study.toolsOpen = false;
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

  function pruneBankSelection() {
    if (!state.banks.length) {
      selectedBankIds.clear();
      bankSelectionMode = false;
      return;
    }
    const ids = new Set(state.banks.map((bank) => bank.id));
    selectedBankIds = new Set(Array.from(selectedBankIds).filter((id) => ids.has(id)));
  }

  function renderBankList() {
    refs.bankList.innerHTML = "";
    if (!bankSelectionMode) return;
    visibleBanks().forEach((bank) => {
      const label = document.createElement("label");
      label.className = "bank-select-row";
      label.innerHTML = `
        <input type="checkbox" data-select-bank="${escapeHtml(bank.id)}" ${selectedBankIds.has(bank.id) ? "checked" : ""}>
        <span>${escapeHtml(bank.name)} (${bank.cards.length})</span>
      `;
      refs.bankList.append(label);
    });
  }

  function visibleBanks() {
    return state.banks.slice();
  }

  function hasCurrentBankHistory(bank) {
    if (!bank) return false;
    for (let index = state.reviewHistory.length - 1; index >= 0; index -= 1) {
      if (state.reviewHistory[index] && state.reviewHistory[index].bankId === bank.id) return true;
    }
    return false;
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
    refs.cardToolsLayer.innerHTML = "";
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
    refs.cardCategory.textContent = card ? card.tag || "tags" : "tags";
    refs.flashcard.setAttribute("aria-label", card && !state.study.revealed ? "reveal card" : "flashcard");
    if (!card) {
      refs.cardCopy.innerHTML = renderNoCurrentCard(bank);
      return;
    }
    refs.cardToolsLayer.innerHTML = copyActionsHtml(answerVisible ? "answer" : "question");
    if (card.type === "quiz") {
      refs.cardCopy.classList.add("is-quiz");
      renderQuizCard(card);
      return;
    }
    if (answerVisible) {
      const explanation = visibleExplanation(card);
      refs.cardCopy.innerHTML = `
        <div class="answer-copy">${card.isCloze && card.text ? renderRichHtml(renderClozeReveal(stripMediaSyntax(card.text)), mediaFromValues([card.text, card.imageBack])) : renderRichText(answerText(card) || "no answer", [card.imageBack])}</div>
        ${explanation ? `<div class="explanation">${renderRichText(explanation, [card.imageExplanation])}</div>` : ""}
      `;
    } else {
      refs.cardCopy.innerHTML = renderQuestion(card);
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
    const selected = selectedChoiceIndexes();
    const correctAnswers = card.answerIndexes || [card.answerIndex];
    const answered = state.study.revealed && !state.study.previewingQuestion;
    const locked = state.study.revealed;
    const multi = isMultiAnswerQuiz(card);
    const activeChoice = Number(state.study.quizActiveIndex) || 0;
    const showKeyboardActive = Boolean(state.study.quizKeyboardActive);
    const choices = order.map((choiceIndex, displayIndex) => {
      const isCorrect = correctAnswers.indexOf(choiceIndex) >= 0;
      const isSelected = selected.indexOf(choiceIndex) >= 0;
      const stateClass = answered && isCorrect ? " is-correct" : answered && isSelected && !isCorrect ? " is-wrong" : "";
      const selectedClass = isSelected ? " is-selected" : "";
      const pendingClass = !answered && isSelected ? " is-pending" : "";
      const activeClass = !answered && showKeyboardActive && activeChoice === displayIndex ? " is-key-active" : "";
      const disabled = locked ? " disabled" : "";
      const label = card.choiceLabels[choiceIndex] || indexToLabel(displayIndex);
      const pressed = multi ? ` aria-pressed="${isSelected ? "true" : "false"}"` : "";
      return `<button class="quiz-choice${stateClass}${selectedClass}${pendingClass}${activeClass}" type="button" data-choice="${choiceIndex}"${pressed}${disabled}>
        <span class="quiz-choice-letter">${escapeHtml(label)}</span>
        <span class="quiz-choice-text">${renderRichText(card.choices[choiceIndex])}</span>
      </button>`;
    }).join("");
    const explanation = answered ? visibleExplanation(card) : "";
    refs.cardCopy.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-stem">${renderRichText(card.front || "untitled question", [card.image])}</div>
        <div class="quiz-choices">${choices}</div>
        ${multi && !answered ? `<button class="quiz-check-button${showKeyboardActive && activeChoice >= order.length ? " is-key-active" : ""}" type="button" data-check-quiz><span class="material-symbols-outlined" aria-hidden="true">check</span><span>check</span></button>` : ""}
        ${answered ? `<div class="quiz-feedback ${state.study.quizCorrect ? "is-correct" : "is-wrong"}">${state.study.quizCorrect ? "correct" : "again"}</div>` : ""}
        ${explanation ? `<div class="explanation">${renderRichText(explanation, [card.imageExplanation])}</div>` : ""}
      </div>
    `;
  }

  function isMultiAnswerQuiz(card) {
    return Boolean(card && card.type === "quiz" && (card.answerIndexes || []).length > 1);
  }

  function selectedChoiceIndexes() {
    if (Array.isArray(state.study.quizChoices) && state.study.quizChoices.length) {
      return uniqueNumbers(state.study.quizChoices);
    }
    if (state.study.quizChoice === null || state.study.quizChoice === undefined || state.study.quizChoice === "") return [];
    return Number.isFinite(Number(state.study.quizChoice)) ? [Number(state.study.quizChoice)] : [];
  }

  function sameChoiceSet(left, right) {
    const a = uniqueNumbers(left).sort((x, y) => x - y);
    const b = uniqueNumbers(right).sort((x, y) => x - y);
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return false;
    }
    return true;
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

  function handleCardToolAction(event) {
    const toolsButton = event.target.closest("[data-card-tools]");
    if (toolsButton) {
      event.preventDefault();
      event.stopPropagation();
      state.study.toolsOpen = !state.study.toolsOpen;
      render();
      return true;
    }
    if (event.target.closest("[data-edit-current]")) {
      event.preventDefault();
      event.stopPropagation();
      openCurrentCardEditor();
      return true;
    }
    if (event.target.closest("[data-delete-current]")) {
      event.preventDefault();
      event.stopPropagation();
      deleteCurrentCard();
      return true;
    }
    const copyButton = event.target.closest("[data-copy-card]");
    if (copyButton) {
      event.preventDefault();
      event.stopPropagation();
      copyCurrentCard(copyButton.dataset.copyCard);
      return true;
    }
    return false;
  }

  function handleCardZoneClick(event) {
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || isBankComplete(bank)) return;
    const rect = refs.cardFace.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = rect.width ? x / rect.width : 0.5;
    if (ratio < 0.3) {
      reviewPrevious();
      return;
    }
    if (ratio > 0.7) {
      skipOrForwardCurrent();
      return;
    }
    revealCard();
  }

  function renderQuestion(card) {
    if (card.isCloze && card.text) {
      const text = stripMediaSyntax(card.text);
      const html = escapeHtml(text).replace(/\[\[[^\]]+\]\]/g, '<span class="blank" aria-label="blank"></span>');
      return renderRichHtml(html, mediaFromValues([card.text, card.image]));
    }
    return renderRichText(card.front || card.text || "untitled card", [card.image]);
  }

  function renderClozeReveal(text) {
    const source = String(text || "");
    const pattern = /\[\[([^\]]+)\]\]/g;
    let cursor = 0;
    let html = "";
    let match = pattern.exec(source);
    while (match) {
      html += escapeHtml(source.slice(cursor, match.index));
      html += `<span class="cloze-answer-highlight">${escapeHtml(match[1])}</span>`;
      cursor = match.index + match[0].length;
      match = pattern.exec(source);
    }
    html += escapeHtml(source.slice(cursor));
    return html || escapeHtml(source);
  }

  function clozeRevealText(text) {
    return String(text || "").replace(/\[\[([^\]]+)\]\]/g, "$1");
  }

  function renderRichHtml(html, media) {
    const images = uniqueMedia(media || []);
    return `<div class="rich-text">${html ? `<p>${html}</p>` : ""}${renderMediaBlock(images)}</div>`;
  }

  function renderRichText(value, extraMedia = []) {
    const media = mediaFromValues([value, ...(extraMedia || [])]);
    const text = stripMediaSyntax(value).trim();
    const html = text ? escapeHtml(text).replace(/\r?\n/g, "<br>") : "";
    return renderRichHtml(html, media);
  }

  function stripMediaSyntax(value) {
    return String(value || "")
      .replace(/!\[[^\]]*\]\(([^)]+)\)/g, "")
      .replace(/https?:\/\/[^\s<>)"]+/g, (url) => mediaObject(url) ? "" : url)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function mediaFromValues(values) {
    const media = [];
    (values || []).forEach((value) => {
      const text = String(value || "");
      const markdownPattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match = markdownPattern.exec(text);
      while (match) {
        const item = mediaObject(match[2], match[1]);
        if (item) media.push(item);
        match = markdownPattern.exec(text);
      }
      const urlPattern = /https?:\/\/[^\s<>)"]+/g;
      let urlMatch = urlPattern.exec(text);
      while (urlMatch) {
        const item = mediaObject(urlMatch[0]);
        if (item) media.push(item);
        urlMatch = urlPattern.exec(text);
      }
    });
    return uniqueMedia(media);
  }

  function mediaObject(url, alt = "card image") {
    const source = String(url || "").trim();
    if (!source) return null;
    const drive = driveImageInfo(source);
    if (drive) return { src: drive.direct, href: drive.original, alt: alt || "google drive image" };
    if (isImageUrl(source)) return { src: source, href: source, alt: alt || "card image" };
    return null;
  }

  function uniqueMedia(media) {
    const seen = [];
    const output = [];
    (media || []).forEach((item) => {
      if (!item || !item.src || seen.indexOf(item.src) >= 0) return;
      seen.push(item.src);
      output.push(item);
    });
    return output;
  }

  function renderMediaBlock(media) {
    const items = uniqueMedia(media || []);
    if (!items.length) return "";
    return items.map((item) => `
      <figure class="card-media">
        <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "card image")}" loading="lazy" data-card-image data-image-src="${escapeHtml(item.src)}" data-image-href="${escapeHtml(item.href || item.src)}" data-image-alt="${escapeHtml(item.alt || "card image")}" onerror="this.closest('figure').classList.add('is-error'); this.remove();">
        <figcaption class="image-fallback">image unavailable. check public sharing.</figcaption>
      </figure>
    `).join("");
  }

  function isImageUrl(url) {
    return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(String(url || ""));
  }

  function driveImageInfo(url) {
    const source = String(url || "").trim();
    if (!/https?:\/\/(?:[^/]+\.)?googleusercontent\.com|https?:\/\/drive\.google\.com/i.test(source)) return null;
    if (/\/drive-viewer\//i.test(source) || /\/thumbnail\?/i.test(source)) {
      return { id: "", original: source, direct: source };
    }
    const fileMatch = source.match(/\/file\/d\/([^/?#]+)/i);
    const idMatch = source.match(/[?&]id=([^&#]+)/i);
    const id = fileMatch ? fileMatch[1] : idMatch ? idMatch[1] : "";
    if (!id) return null;
    return {
      id,
      original: source,
      direct: `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`
    };
  }

  function driveSnippets(url) {
    const info = driveImageInfo(url);
    if (!info) return null;
    return {
      direct: info.direct,
      markdown: `![google drive image](${info.direct})`,
      html: `<a href="${info.original}"><img src="${info.direct}" alt="google drive image" /></a>`
    };
  }

  function imageDataFromElement(element) {
    if (!element) return null;
    const src = element.getAttribute("data-image-src") || element.getAttribute("src") || "";
    if (!src) return null;
    return {
      src,
      href: element.getAttribute("data-image-href") || src,
      alt: element.getAttribute("data-image-alt") || element.getAttribute("alt") || "card image"
    };
  }

  function openImagePreview(data) {
    if (!data || !refs.imagePreviewModal) return;
    closeImageMenu();
    refs.imagePreviewImg.src = data.src;
    refs.imagePreviewImg.alt = data.alt || "card image";
    refs.imagePreviewCaption.textContent = data.alt || "card image";
    refs.imagePreviewModal.classList.add("is-open");
    refs.imagePreviewModal.setAttribute("aria-hidden", "false");
    playSfx("tap");
  }

  function closeImagePreview() {
    if (!refs.imagePreviewModal) return;
    refs.imagePreviewModal.classList.remove("is-open");
    refs.imagePreviewModal.setAttribute("aria-hidden", "true");
    refs.imagePreviewImg.removeAttribute("src");
  }

  function openImageMenu(data, x, y) {
    if (!data || !refs.imageActionMenu) return;
    imageMenuData = data;
    const menu = refs.imageActionMenu;
    const shareButton = menu.querySelector("[data-image-action='share']");
    if (shareButton) shareButton.hidden = !navigator.share;
    menu.hidden = false;
    const width = menu.offsetWidth || 160;
    const height = menu.offsetHeight || 160;
    const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    playSfx("tap");
  }

  function closeImageMenu() {
    if (!refs.imageActionMenu) return;
    refs.imageActionMenu.hidden = true;
    imageMenuData = null;
  }

  function handleImageAction(action) {
    const data = imageMenuData;
    if (!data) return;
    if (action === "open") {
      window.open(data.href || data.src, "_blank", "noopener");
      closeImageMenu();
      return;
    }
    if (action === "copy") {
      copyText(data.href || data.src).then(() => toast("image link copied", "tap")).catch(() => toast("copy failed", "error"));
      closeImageMenu();
      return;
    }
    if (action === "save") {
      const link = document.createElement("a");
      link.href = data.src;
      link.download = "flashflow-image";
      link.rel = "noopener";
      document.body.append(link);
      link.click();
      link.remove();
      closeImageMenu();
      toast("image save started", "export");
      return;
    }
    if (action === "share" && navigator.share) {
      navigator.share({ title: data.alt || "flashflow image", url: data.href || data.src }).then(() => closeImageMenu()).catch(() => closeImageMenu());
    }
  }

  function answerText(card) {
    if (card.type === "quiz") {
      return (card.answerIndexes || [card.answerIndex]).map((index) => card.choices[index] || "").filter(Boolean).join(" | ");
    }
    if (card.isCloze && card.clozeAnswers.length) {
      return clozeRevealText(card.text);
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
    const cards = filteredCards(bank);
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
          <div class="card-row-meta">${escapeHtml(card.tag || "tags")} / ${card.type === "quiz" ? "quiz / " : ""}${card.learned ? "learned" : card.rating ? RATING_LABELS[card.rating] : card.skipped ? "skipped" : "unrated"}</div>
        </div>
        <div class="row-actions manager-advanced">
          <button class="mini-button" type="button" data-edit="${card.id}" aria-label="edit card"><span class="material-symbols-outlined" aria-hidden="true">edit</span></button>
          <button class="mini-button" type="button" data-delete="${card.id}" aria-label="delete card"><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
        </div>
      `;
      refs.cardList.append(row);
    });
  }

  function filteredCards(bank) {
    if (!bank || !bank.cards) return [];
    const query = refs.cardSearchInput.value.trim().toLowerCase();
    return bank.cards.filter((card) => {
      const text = `${card.front} ${card.back} ${card.text} ${card.tag} ${card.explanation} ${(card.choices || []).join(" ")}`.toLowerCase();
      return cardMatchesReviewFilter(card) && (!query || text.includes(query));
    });
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function setCardMotion(kind) {
    clearTimeout(cardMotionTimer);
    cardMotion = null;
  }

  function canPreviewFlip(card) {
    return Boolean(card && state.study.revealed);
  }

  function revealCard() {
    blurActiveControl();
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
    blurActiveControl();
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
    blurActiveControl();
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
    blurActiveControl();
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || isBankComplete(bank)) return;
    const selectedRating = Number(state.study.selectedRating) || null;
    const previousRating = card.rating;
    const previousSkipped = card.skipped;
    const previousDueAt = card.dueAt;
    const previousEasyStreak = card.easyStreak;
    const previousLearned = card.learned;
    if (selectedRating && state.study.revealed && selectedRating !== card.rating) {
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
    state.study.quizChoice = null;
    state.study.quizChoices = [];
    state.study.quizActiveIndex = 0;
    state.study.quizKeyboardActive = false;
    state.study.quizCorrect = null;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
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
    state.study.quizChoices = [];
    state.study.quizActiveIndex = 0;
    state.study.quizKeyboardActive = false;
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
    state.study.quizChoices = [];
    state.study.quizActiveIndex = 0;
    state.study.quizKeyboardActive = false;
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
    blurActiveControl();
    const bank = activeBank();
    if (!bank) return;
    let entry = null;
    for (let index = state.reviewHistory.length - 1; index >= 0; index -= 1) {
      if (state.reviewHistory[index] && state.reviewHistory[index].bankId === bank.id) {
        entry = state.reviewHistory[index];
        state.reviewHistory.splice(index, 1);
        break;
      }
    }
    if (!entry) return;
    const card = bank.cards.find((item) => item.id === entry.cardId);
    if (!card) return;
    ensureQueue(bank);
    const index = bank.queue.indexOf(card.id);
    bank.currentIndex = index >= 0 ? index : 0;
    state.study.revealed = entry.type === "rating";
    state.study.previewingQuestion = false;
    state.study.toolsOpen = false;
    state.study.typedAnswer = entry.typedAnswer || "";
    state.study.proposedRating = entry.proposedRating || null;
    state.study.selectedRating = entry.type === "rating" ? entry.rating || null : null;
    state.study.cardId = card.id;
    state.study.quizChoice = null;
    state.study.quizChoices = [];
    state.study.quizActiveIndex = 0;
    state.study.quizKeyboardActive = false;
    state.study.quizCorrect = null;
    state.study.choiceOrderCardId = null;
    state.study.choiceOrder = [];
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
    blurActiveControl();
    const bank = activeBank();
    const card = currentCard();
    if (!bank || !card || card.type !== "quiz" || state.study.revealed) return;
    if (isMultiAnswerQuiz(card)) {
      toggleQuizChoice(choiceIndex);
      state.study.quizKeyboardActive = false;
      saveState();
      render();
      playSfx("tap");
      return;
    }
    gradeQuizChoices([Number(choiceIndex)]);
  }

  function toggleQuizChoice(choiceIndex) {
    const selected = selectedChoiceIndexes();
    const index = selected.indexOf(Number(choiceIndex));
    if (index >= 0) selected.splice(index, 1);
    else selected.push(Number(choiceIndex));
    state.study.quizChoices = selected;
    state.study.quizChoice = selected.length ? selected[0] : null;
  }

  function checkQuizAnswer() {
    const card = currentCard();
    if (!card || card.type !== "quiz" || state.study.revealed) return;
    const selected = selectedChoiceIndexes();
    if (!selected.length) {
      toast("choose an answer", "error");
      return;
    }
    gradeQuizChoices(selected);
  }

  function moveQuizChoice(direction) {
    const card = currentCard();
    if (!card || card.type !== "quiz" || state.study.revealed) return false;
    const order = quizChoiceOrder(card);
    if (!order.length) return false;
    const max = isMultiAnswerQuiz(card) ? order.length : order.length - 1;
    let index = Number(state.study.quizActiveIndex) || 0;
    index += direction;
    if (isMultiAnswerQuiz(card)) {
      if (index < 0) index = max;
      if (index > max) index = 0;
    } else {
      if (index < 0) index = order.length - 1;
      if (index >= order.length) index = 0;
    }
    state.study.quizActiveIndex = index;
    state.study.quizKeyboardActive = true;
    saveState();
    render();
    return true;
  }

  function activateQuizChoice() {
    const card = currentCard();
    if (!card || card.type !== "quiz" || state.study.revealed) return false;
    const order = quizChoiceOrder(card);
    const active = Number(state.study.quizActiveIndex) || 0;
    if (isMultiAnswerQuiz(card) && active >= order.length) {
      checkQuizAnswer();
      return true;
    }
    if (order[active] === undefined) return false;
    answerQuizChoice(order[active]);
    return true;
  }

  function gradeQuizChoices(choices) {
    const card = currentCard();
    if (!card || card.type !== "quiz") return;
    const answerIndexes = card.answerIndexes || [card.answerIndex];
    const correct = sameChoiceSet(choices, answerIndexes);
    state.study.quizChoice = choices.length ? Number(choices[0]) : null;
    state.study.quizChoices = uniqueNumbers(choices);
    state.study.quizCorrect = correct;
    state.study.quizKeyboardActive = false;
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
    state.study.quizChoices = [];
    state.study.quizCorrect = false;
    state.study.quizKeyboardActive = false;
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
    const cards = parseCardsFromText(text);
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
      state.study.cardId = null;
      state.study.quizChoice = null;
      state.study.quizChoices = [];
      state.study.quizActiveIndex = 0;
      state.study.quizCorrect = null;
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
    return parseCardsFromText(text);
  }

  function parseCardsFromText(text) {
    const rows = normalizePastedTable(text).filter((row) => row.some((cell) => cell.trim()));
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

  function normalizePastedTable(text) {
    const value = String(text || "").trim();
    if (!value) return [];
    const markdownRows = parseMarkdownTable(value);
    if (markdownRows.length) return markdownRows;
    if (/\t/.test(value)) {
      return value.split(/\r?\n/).map((line) => line.split("\t").map((cell) => cell.trim()));
    }
    return parseCsv(value);
  }

  function parseMarkdownTable(text) {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length || lines[0].indexOf("|") < 0) return [];
    const rows = [];
    lines.forEach((line) => {
      if (line.indexOf("|") < 0) return;
      const trimmed = line.replace(/^\|/, "").replace(/\|$/, "");
      const cells = trimmed.split("|").map((cell) => cell.trim());
      const separator = cells.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
      if (!separator) rows.push(cells);
    });
    if (rows.length <= 1) return [];
    const headerLength = rows[0].length;
    const answerIndex = rows[0].map(normalizeHeader).findIndex((header) => header === "answer" || header === "correct");
    if (answerIndex < 0) return rows;
    return rows.map((row, rowIndex) => {
      if (rowIndex === 0 || row.length <= headerLength) return row;
      const extra = row.length - headerLength;
      const mergedAnswer = row.slice(answerIndex, answerIndex + extra + 1).join("|");
      return row.slice(0, answerIndex).concat([mergedAnswer], row.slice(answerIndex + extra + 1));
    });
  }

  function htmlTableToText(html) {
    if (!html || html.indexOf("<table") < 0) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return "";
    const lines = [];
    const rows = table.querySelectorAll("tr");
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const cells = rows[rowIndex].querySelectorAll("th,td");
      const values = [];
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
        values.push(cells[cellIndex].textContent.replace(/\s+/g, " ").trim());
      }
      if (values.length) lines.push(values.join("\t"));
    }
    return lines.join("\n");
  }

  function cardFromRecord(record) {
    const forcedType = normalizeCardType(pick(record, ["type", "cardtype"]));
    const rawText = pick(record, ["text", "cloze"]);
    const text = forcedType === "cloze" && !rawText ? pick(record, ["front", "q", "question", "stem", "prompt"]) : rawText;
    const clozeAnswers = extractClozeAnswers(text);
    const isCloze = clozeAnswers.length > 0 || forcedType === "cloze";
    const choiceEntries = getChoiceEntries(record);
    const answerIndexes = parseChoiceAnswers(pick(record, ["answer", "correct"]), choiceEntries);
    const stem = pick(record, ["stem", "question", "front", "q", "prompt"]);
    const image = pick(record, ["image", "imagefront", "frontimage"]);
    const imageBack = pick(record, ["imageback", "answerimage", "backimage"]);
    const imageExplanation = pick(record, ["imageexplanation", "explanationimage"]);
    if (forcedType !== "regular" && forcedType !== "card" && stem && choiceEntries.length && answerIndexes.length) {
      const choices = choiceEntries.map((entry) => entry.value);
      return normalizeCard({
        id: uid("card"),
        type: "quiz",
        sourceId: pick(record, ["id", "sourceid"]),
        difficulty: pick(record, ["difficulty", "diff"]),
        front: stem,
        back: answerIndexes.map((index) => choices[index] || "").filter(Boolean).join(" | "),
        tag: pick(record, ["topic", "tag", "tags", "category"]) || "tags",
        explanation: pick(record, ["explanation", "explain", "note", "notes"]),
        image,
        imageBack,
        imageExplanation,
        choices,
        choiceLabels: choiceEntries.map((entry) => entry.label),
        answerIndex: answerIndexes[0],
        answerIndexes
      });
    }
    const front = pick(record, ["front", "q", "question", "stem", "prompt"]) || (isCloze ? text : "");
    const back = pick(record, ["back", "a", "answer", "response"]) || (isCloze ? clozeAnswers.join(", ") : "");
    if (!front && !back && !text) return null;
    return normalizeCard({
      id: uid("card"),
      front,
      back,
      tag: pick(record, ["tag", "tags", "category"]) || "tags",
      accepted: normalizeAccepted(pick(record, ["accepted", "answers", "acceptedanswers", "acceptedanswer"])),
      explanation: pick(record, ["explanation", "explain", "note", "notes"]),
      image,
      imageBack,
      imageExplanation,
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

  function normalizeCardType(value) {
    const type = normalizeHeader(value);
    if (type === "r" || type === "regular" || type === "card") return "regular";
    if (type === "c" || type === "cloze") return "cloze";
    if (type === "q" || type === "quiz" || type === "mcq") return "quiz";
    if (type === "i" || type === "image" || type === "imagecard") return "image";
    return type;
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

  function parseChoiceAnswers(value, choiceEntries) {
    const text = String(value || "").trim();
    if (!text) return [];
    const whole = parseSingleChoiceAnswer(text, choiceEntries);
    if (whole !== null) return [whole];
    const pieces = text.split(/\s*(?:\||,|;|\band\b)\s*/i).map((part) => part.trim()).filter(Boolean);
    const indexes = [];
    const source = pieces.length ? pieces : [text];
    source.forEach((piece) => {
      const index = parseSingleChoiceAnswer(piece, choiceEntries);
      if (index !== null && indexes.indexOf(index) < 0) indexes.push(index);
    });
    if (!indexes.length) {
      const single = parseSingleChoiceAnswer(text, choiceEntries);
      if (single !== null) indexes.push(single);
    }
    return indexes;
  }

  function parseChoiceAnswer(value, choiceEntries) {
    const indexes = parseChoiceAnswers(value, choiceEntries);
    return indexes.length ? indexes[0] : null;
  }

  function parseSingleChoiceAnswer(value, choiceEntries) {
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
    const rows = [["type", "id", "topic", "difficulty", "stem", ...choiceHeaders, "answer", "explanation", "front", "back", "tags", "accepted", "text", "image", "imageBack", "imageExplanation", "rating", "skipped", "easyStreak", "learned", "dueAt"]];
    bank.cards.forEach((card) => {
      const choiceCells = choiceHeaders.map((_, index) => card.choices && card.choices[index] ? card.choices[index] : "");
      rows.push([
        card.type || "card",
        card.sourceId || card.id,
        card.tag,
        card.difficulty || "",
        card.type === "quiz" ? card.front : "",
        ...choiceCells,
        card.type === "quiz" ? (card.answerIndexes || [card.answerIndex]).map((index) => card.choiceLabels[index] || indexToLabel(index)).join("|") : card.back,
        card.explanation,
        card.type === "quiz" ? "" : card.front,
        card.back,
        card.tag,
        (card.accepted || []).join("|"),
        card.text,
        card.image || "",
        card.imageBack || "",
        card.imageExplanation || "",
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

  function deleteCard(id) {
    const bank = activeBank();
    if (!bank) return;
    const card = bank.cards.find((item) => item.id === id);
    if (!card) return;
    if (!confirm("delete this card?")) return;
    bank.cards = bank.cards.filter((item) => item.id !== id);
    bank.queue = bank.queue.filter((item) => item !== id);
    selectedCardIds.delete(id);
    if (selectedCardId === id) selectedCardId = null;
    ensureQueue(bank);
    saveState();
    render();
    toast("card deleted", "delete");
  }

  function toggleBankSelectionMode() {
    bankSelectionMode = !bankSelectionMode;
    if (!bankSelectionMode) selectedBankIds.clear();
    closeBulkMenus();
    render();
    playSfx("toggle");
  }

  function toggleBankSelection(id, checked) {
    if (checked) selectedBankIds.add(id);
    else selectedBankIds.delete(id);
    render();
  }

  function clearBankSelection() {
    selectedBankIds.clear();
    closeBulkMenus();
    render();
    toast("selection cleared", "toggle");
  }

  function selectAllVisibleBanks() {
    visibleBanks().forEach((bank) => selectedBankIds.add(bank.id));
    closeBulkMenus();
    render();
    toast(`${selectedBankIds.size} bank${selectedBankIds.size === 1 ? "" : "s"} selected`, "toggle");
  }

  function deleteSelectedBanks() {
    if (!selectedBankIds.size) return;
    const count = selectedBankIds.size;
    if (!confirm(`delete ${count} selected bank${count === 1 ? "" : "s"}?`)) return;
    state.banks = state.banks.filter((bank) => !selectedBankIds.has(bank.id));
    if (!state.banks.some((bank) => bank.id === state.activeBankId)) {
      state.activeBankId = state.banks[0] ? state.banks[0].id : null;
    }
    selectedBankIds.clear();
    bankSelectionMode = false;
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    closeBulkMenus();
    state.study.cardId = null;
    state.study.revealed = false;
    saveState();
    render();
    toast(`${count} bank${count === 1 ? "" : "s"} deleted`, "delete");
  }

  function blurActiveControl() {
    const active = document.activeElement;
    if (active && typeof active.blur === "function") active.blur();
  }

  function toggleSelectionMode() {
    selectionMode = !selectionMode;
    if (!selectionMode) selectedCardIds.clear();
    closeBulkMenus();
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
    closeBulkMenus();
    render();
    toast("selection cleared", "toggle");
  }

  function selectAllVisibleCards() {
    const bank = activeBank();
    filteredCards(bank).forEach((card) => selectedCardIds.add(card.id));
    closeBulkMenus();
    render();
    toast(`${selectedCardIds.size} card${selectedCardIds.size === 1 ? "" : "s"} selected`, "toggle");
  }

  function deleteSelectedCards() {
    const bank = activeBank();
    if (!bank || !selectedCardIds.size) return;
    const count = selectedCardIds.size;
    if (!confirm(`delete ${count} selected card${count === 1 ? "" : "s"}?`)) return;
    bank.cards = bank.cards.filter((card) => !selectedCardIds.has(card.id));
    bank.queue = bank.queue.filter((id) => !selectedCardIds.has(id));
    if (selectedCardId && selectedCardIds.has(selectedCardId)) selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    closeBulkMenus();
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
    openCardEditor(card);
  }

  function openCardEditor(card) {
    selectedCardId = card ? card.id : null;
    state.study.toolsOpen = false;
    refs.cardEditTitle.textContent = card ? "edit card" : "add card";
    refs.modalFrontInput.value = card ? card.isCloze && card.text ? card.text : card.front || card.text || "" : "";
    refs.modalBackInput.value = card ? card.type === "quiz" ? "" : card.back || answerText(card) : "";
    refs.modalAcceptedInput.value = card ? (card.accepted || []).join(" | ") : "";
    refs.modalChoicesInput.value = card && card.type === "quiz" ? (card.choices || []).join("\n") : "";
    refs.modalAnswerInput.value = card && card.type === "quiz" ? (card.answerIndexes || [card.answerIndex]).map((index) => card.choiceLabels[index] || indexToLabel(index)).join("|") : "";
    refs.modalExplanationInput.value = card ? card.explanation || "" : "";
    refs.modalTagInput.value = card ? card.tag || "tags" : "";
    refs.modalImageInput.value = card ? card.image || "" : "";
    refs.modalImageBackInput.value = card ? card.imageBack || "" : "";
    refs.cardEditModal.classList.add("is-open");
    refs.cardEditModal.setAttribute("aria-hidden", "false");
    refs.modalFrontInput.focus();
  }

  function closeCardEditor() {
    refs.cardEditModal.classList.remove("is-open");
    refs.cardEditModal.setAttribute("aria-hidden", "true");
  }

  function saveModalCard() {
    let bank = activeBank();
    if (!bank) {
      bank = normalizeBank({ id: uid("bank"), name: "manual bank", cards: [] });
      state.banks.push(bank);
      state.activeBankId = bank.id;
    }
    const existing = selectedCardId ? bank.cards.find((item) => item.id === selectedCardId) : null;
    const choices = refs.modalChoicesInput.value.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean);
    const frontValue = refs.modalFrontInput.value.trim();
    if (!frontValue && !refs.modalBackInput.value.trim() && !choices.length) {
      toast("write a card first", "error");
      return;
    }
    const base = existing || normalizeCard({ id: uid("card"), front: "" });
    const card = base;
    card.front = frontValue;
    card.tag = refs.modalTagInput.value.trim() || "tags";
    card.image = refs.modalImageInput.value.trim();
    card.imageBack = refs.modalImageBackInput.value.trim();
    card.imageExplanation = "";
    card.accepted = normalizeAccepted(refs.modalAcceptedInput.value);
    card.explanation = refs.modalExplanationInput.value.trim();
    if (choices.length) {
      const entries = choices.map((choice, index) => ({ label: indexToLabel(index), value: choice }));
      const answerIndexes = parseChoiceAnswers(refs.modalAnswerInput.value, entries);
      card.type = "quiz";
      card.choices = choices;
      card.choiceLabels = entries.map((entry) => entry.label);
      card.answerIndexes = answerIndexes.length ? answerIndexes : [0];
      card.answerIndex = card.answerIndexes[0];
      card.back = card.answerIndexes.map((index) => choices[index] || "").filter(Boolean).join(" | ");
      card.text = "";
      card.isCloze = false;
      card.clozeAnswers = [];
    } else {
      const text = frontValue.indexOf("[[") >= 0 ? frontValue : "";
      const clozeAnswers = extractClozeAnswers(text);
      card.type = "card";
      card.back = refs.modalBackInput.value.trim() || (clozeAnswers.length ? clozeAnswers.join(", ") : "");
      card.text = text || "";
      card.isCloze = clozeAnswers.length > 0;
      card.clozeAnswers = clozeAnswers;
      card.choices = [];
      card.choiceLabels = [];
      card.answerIndex = null;
      card.answerIndexes = [];
    }
    if (!existing) {
      bank.cards.push(card);
      bank.queue.push(card.id);
      selectedCardId = card.id;
    }
    bank.updatedAt = new Date().toISOString();
    closeCardEditor();
    saveState();
    render();
    toast("card saved", "toggle");
  }

  function newBuilderRow(type = "regular") {
    return {
      id: uid("row"),
      type,
      main: type === "cloze" ? "This is a [[cloze]] card." : type === "quiz" ? "Which option is correct?" : type === "image" ? "what does this image show?" : "",
      back: type === "regular" || type === "image" ? "" : "",
      choices: type === "quiz" ? "choice one\nchoice two\nchoice three" : "",
      answer: type === "quiz" ? "A" : "",
      tags: type === "cloze" ? "cloze" : type === "quiz" ? "quiz" : type === "image" ? "images" : "notes",
      explanation: "",
      image: type === "image" ? "paste public drive image link" : "",
      imageBack: ""
    };
  }

  function openBankBuilder() {
    builderRows = [newBuilderRow("regular"), newBuilderRow("cloze"), newBuilderRow("quiz")];
    builderSelectionMode = false;
    selectedBuilderRowIds.clear();
    refs.builderBankNameInput.value = `mixed bank ${state.banks.length + 1}`;
    renderBuilderRows();
    refs.bankBuilderModal.classList.add("is-open");
    refs.bankBuilderModal.setAttribute("aria-hidden", "false");
    refs.builderBankNameInput.focus();
  }

  function closeBankBuilder() {
    refs.bankBuilderModal.classList.remove("is-open");
    refs.bankBuilderModal.setAttribute("aria-hidden", "true");
    builderSelectionMode = false;
    selectedBuilderRowIds.clear();
    closeBulkMenus();
  }

  function renderBuilderRows() {
    selectedBuilderRowIds.forEach((id) => {
      if (!builderRows.some((row) => row.id === id)) selectedBuilderRowIds.delete(id);
    });
    refs.selectBuilderRowsBtn.dataset.active = String(builderSelectionMode);
    refs.selectBuilderRowsBtn.setAttribute("aria-pressed", String(builderSelectionMode));
    refs.selectBuilderRowsBtn.querySelector("span:last-child").textContent = builderSelectionMode ? "done" : "select rows";
    refs.builderSelectionCount.textContent = `${selectedBuilderRowIds.size} selected`;
    refs.builderBulkMenuWrap.classList.toggle("hidden", !builderSelectionMode);
    if (!builderSelectionMode) setMenuOpen(refs.builderBulkControls, refs.builderBulkMenuBtn, false);
    refs.selectAllBuilderRowsBtn.disabled = !builderSelectionMode || !builderRows.length;
    refs.deleteSelectedBuilderRowsBtn.disabled = !selectedBuilderRowIds.size;
    refs.clearBuilderSelectionBtn.disabled = !selectedBuilderRowIds.size;
    refs.builderRows.innerHTML = "";
    builderRows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.dataset.builderRow = row.id;
      const rowMarker = builderSelectionMode
        ? `<label class="builder-row-select"><input type="checkbox" data-select-builder-row="${escapeHtml(row.id)}" ${selectedBuilderRowIds.has(row.id) ? "checked" : ""}><span>${rowIndex + 1}</span></label>`
        : `${rowIndex + 1}`;
      tr.innerHTML = `
        <td class="builder-row-number">${rowMarker}</td>
        <td>
          <select data-builder-field="type">
            <option value="regular" ${row.type === "regular" ? "selected" : ""}>r</option>
            <option value="cloze" ${row.type === "cloze" ? "selected" : ""}>c</option>
            <option value="quiz" ${row.type === "quiz" ? "selected" : ""}>q</option>
            <option value="image" ${row.type === "image" ? "selected" : ""}>i</option>
          </select>
        </td>
        <td><textarea data-builder-field="main" placeholder="front, cloze text, or stem">${escapeHtml(row.main)}</textarea></td>
        <td><textarea data-builder-field="back" placeholder="back for regular cards">${escapeHtml(row.back)}</textarea></td>
        <td><textarea data-builder-field="choices" placeholder="one quiz choice per line">${escapeHtml(row.choices)}</textarea></td>
        <td><input data-builder-field="answer" type="text" placeholder="answer or A|C" value="${escapeHtml(row.answer)}"></td>
        <td><input data-builder-field="tags" type="text" placeholder="tags" value="${escapeHtml(row.tags)}"></td>
        <td><textarea data-builder-field="explanation" placeholder="short explanation">${escapeHtml(row.explanation)}</textarea></td>
        <td>
          <div class="builder-image-fields">
          <input data-builder-field="image" type="text" placeholder="front image" value="${escapeHtml(row.image)}">
          <input data-builder-field="imageBack" type="text" placeholder="answer image" value="${escapeHtml(row.imageBack)}">
          </div>
        </td>
        <td>
          <button class="icon-button" type="button" data-remove-builder-row="${escapeHtml(row.id)}" aria-label="remove row">
            <span class="material-symbols-outlined" aria-hidden="true">delete</span>
          </button>
        </td>
      `;
      refs.builderRows.append(tr);
    });
  }

  function syncBuilderRowsFromDom() {
    const rows = refs.builderRows.querySelectorAll("[data-builder-row]");
    builderRows = Array.from(rows).map((tr) => {
      const existing = builderRows.find((row) => row.id === tr.dataset.builderRow) || newBuilderRow();
      const row = { ...existing };
      tr.querySelectorAll("[data-builder-field]").forEach((field) => {
        row[field.dataset.builderField] = field.value;
      });
      return row;
    });
  }

  function addBuilderRow(type) {
    syncBuilderRowsFromDom();
    builderRows.push(newBuilderRow(type));
    renderBuilderRows();
  }

  function addMixedBuilderRows() {
    syncBuilderRowsFromDom();
    builderRows.push(newBuilderRow("regular"), newBuilderRow("cloze"), newBuilderRow("quiz"), newBuilderRow("image"));
    renderBuilderRows();
  }

  function toggleBuilderSelectionMode() {
    builderSelectionMode = !builderSelectionMode;
    if (!builderSelectionMode) selectedBuilderRowIds.clear();
    closeBulkMenus();
    renderBuilderRows();
    playSfx("toggle");
  }

  function toggleBuilderRowSelection(id, checked) {
    if (checked) selectedBuilderRowIds.add(id);
    else selectedBuilderRowIds.delete(id);
    renderBuilderRows();
    playSfx("tap");
  }

  function selectAllBuilderRows() {
    syncBuilderRowsFromDom();
    builderRows.forEach((row) => selectedBuilderRowIds.add(row.id));
    closeBulkMenus();
    renderBuilderRows();
    toast(`${selectedBuilderRowIds.size} row${selectedBuilderRowIds.size === 1 ? "" : "s"} selected`, "toggle");
  }

  function clearBuilderSelection() {
    selectedBuilderRowIds.clear();
    closeBulkMenus();
    renderBuilderRows();
    toast("selection cleared", "toggle");
  }

  function deleteSelectedBuilderRows() {
    if (!selectedBuilderRowIds.size) return;
    syncBuilderRowsFromDom();
    const count = selectedBuilderRowIds.size;
    builderRows = builderRows.filter((row) => !selectedBuilderRowIds.has(row.id));
    selectedBuilderRowIds.clear();
    builderSelectionMode = false;
    closeBulkMenus();
    renderBuilderRows();
    toast(`${count} row${count === 1 ? "" : "s"} removed`, "delete");
  }

  function builderRowRecord(row) {
    const type = normalizeCardType(row.type);
    const record = {
      type,
      tags: row.tags || "tags",
      explanation: row.explanation || "",
      image: row.image || "",
      imageback: row.imageBack || ""
    };
    if (type === "quiz") {
      record.stem = row.main || "";
      row.choices.split(/\r?\n/).map((choice) => choice.trim()).filter(Boolean).forEach((choice, index) => {
        record[normalizeHeader(indexToLabel(index))] = choice;
      });
      record.answer = row.answer || "A";
      return record;
    }
    if (type === "cloze") {
      record.text = row.main || "";
      record.back = row.back || "";
      return record;
    }
    record.front = row.main || "";
    record.back = row.back || row.answer || "";
    record.answer = row.answer || "";
    return record;
  }

  function saveBankBuilder() {
    syncBuilderRowsFromDom();
    const cards = builderRows.map((row) => cardFromRecord(builderRowRecord(row))).filter(Boolean);
    if (!cards.length) {
      toast("add at least one valid row", "error");
      return;
    }
    const bank = importCardsAsBank(cards, refs.builderBankNameInput.value.trim() || `mixed bank ${state.banks.length + 1}`);
    if (!bank) {
      toast("bank creation failed", "error");
      return;
    }
    state.activeBankId = bank.id;
    state.study.cardId = null;
    state.study.revealed = false;
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    closeBankBuilder();
    saveState();
    render();
    toast(`created ${cards.length} cards`, "import");
  }

  async function loadSample(sampleType) {
    const type = sampleType === "xlsx" ? "xlsx" : "csv";
    try {
      const path = type === "xlsx" ? "sample-bank.xlsx" : "sample-bank.csv";
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error("sample not found");
      if (type === "xlsx") {
        await importXlsxFile(await response.blob(), "sample bank");
      } else {
        const text = await response.text();
        importCsvText(text, "sample bank");
      }
    } catch {
      toast(`open through a local server or import sample-bank.${type}`, "error");
    }
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
      audioUnlocked = true;
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
      audioUnlocked = audioContext.state === "running";
      return audioContext;
    })().catch(() => {
      audioContext = null;
      audioUnlockPromise = null;
      audioUnlocked = false;
      return null;
    });
    return audioUnlockPromise;
  }

  function playTone(context, kind) {
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
      const start = now + index * 0.055;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });
  }

  function playSfx(kind = "tap") {
    if (!state.settings.sfx) return;
    try {
      if (audioContext && audioContext.state === "running" && audioUnlocked) {
        playTone(audioContext, kind);
        return;
      }
      unlockAudio().then((context) => {
        if (context && context.state === "running") playTone(context, kind);
      });
    } catch {
      audioContext = null;
      audioUnlocked = false;
    }
  }

  function toast(message, sound = "tap") {
    playSfx(sound);
    refs.toast.textContent = message;
    refs.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => refs.toast.classList.remove("is-visible"), 1800);
  }

  function setMenuOpen(menu, button, open) {
    if (!menu) return;
    menu.hidden = !open;
    menu.classList.toggle("hidden", !open);
    if (button) button.setAttribute("aria-expanded", String(open));
  }

  function toggleMenu(menu, button) {
    setMenuOpen(menu, button, Boolean(menu && menu.hidden));
  }

  function closeSampleMenu() {
    setMenuOpen(refs.sampleMenu, refs.loadSampleBtn, false);
  }

  function closeBulkMenus() {
    setMenuOpen(refs.bankBulkControls, refs.bankBulkMenuBtn, false);
    setMenuOpen(refs.bulkControls, refs.cardBulkMenuBtn, false);
    setMenuOpen(refs.builderBulkControls, refs.builderBulkMenuBtn, false);
  }

  function closeFloatingMenus() {
    closeSampleMenu();
    closeBulkMenus();
    closeImageMenu();
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

  function shortcutKey(event) {
    const key = event.key || "";
    const code = event.code || "";
    const keyCode = Number(event.keyCode || event.which) || 0;
    if (key === " " || key === "Spacebar" || code === "Space" || keyCode === 32) return "space";
    if (key === "Escape" || key === "Esc" || keyCode === 27) return "escape";
    if (key === "Enter" || keyCode === 13) return "enter";
    if (key === "ArrowUp" || key === "Up" || keyCode === 38) return "up";
    if (key === "ArrowDown" || key === "Down" || keyCode === 40) return "down";
    if (key === "ArrowLeft" || key === "Left" || key === "<" || keyCode === 37 || ((code === "Comma" || keyCode === 188) && event.shiftKey)) return "previous";
    if (key === "ArrowRight" || key === "Right" || key === ">" || keyCode === 39 || ((code === "Period" || keyCode === 190) && event.shiftKey)) return "forward";
    if (/^[1-4]$/.test(key)) return key;
    if (/^Digit[1-4]$/.test(code) || /^Numpad[1-4]$/.test(code)) return code.slice(-1);
    if (keyCode >= 49 && keyCode <= 52) return String(keyCode - 48);
    if (keyCode >= 97 && keyCode <= 100) return String(keyCode - 96);
    if (/^[a-z]$/i.test(key)) return key.toLowerCase();
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (keyCode >= 65 && keyCode <= 90) return String.fromCharCode(keyCode).toLowerCase();
    return key;
  }

  function quizChoiceFromLetter(card, key) {
    if (!card || card.type !== "quiz" || !/^[a-z]$/.test(key)) return null;
    const order = quizChoiceOrder(card);
    const target = key.toUpperCase();
    for (let displayIndex = 0; displayIndex < order.length; displayIndex += 1) {
      const choiceIndex = order[displayIndex];
      const label = card.choiceLabels[choiceIndex] || indexToLabel(displayIndex);
      if (String(label || "").toUpperCase() === target) return choiceIndex;
    }
    const fallbackIndex = target.charCodeAt(0) - 65;
    return order[fallbackIndex] === undefined ? null : order[fallbackIndex];
  }

  ["pointerdown", "touchstart", "click", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (state.settings.sfx) unlockAudio();
    }, { capture: true, passive: true });
  });

  refs.flashcard.addEventListener("click", (event) => {
    if (handleCardToolAction(event)) return;
    if (event.target.closest("button,input,textarea,select,[data-card-image],.image-action-menu")) return;
    handleCardZoneClick(event);
  });

  refs.cardFace.addEventListener("click", (event) => {
    if (handleCardToolAction(event)) return;
    const image = event.target.closest("[data-card-image]");
    if (image) {
      event.preventDefault();
      event.stopPropagation();
      if (imageLongPressFired) {
        imageLongPressFired = false;
        return;
      }
      openImagePreview(imageDataFromElement(image));
      return;
    }
    const checkButton = event.target.closest("[data-check-quiz]");
    if (checkButton) {
      checkQuizAnswer();
      return;
    }
    const button = event.target.closest("[data-choice]");
    if (!button) return;
    answerQuizChoice(Number(button.dataset.choice));
  });

  refs.cardFace.addEventListener("contextmenu", (event) => {
    const image = event.target.closest("[data-card-image]");
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    openImageMenu(imageDataFromElement(image), event.clientX, event.clientY);
  });

  refs.cardFace.addEventListener("pointerdown", (event) => {
    const image = event.target.closest("[data-card-image]");
    if (!image || (event.pointerType && event.pointerType !== "touch")) return;
    clearTimeout(imageLongPressTimer);
    imageLongPressFired = false;
    imageLongPressTimer = setTimeout(() => {
      imageLongPressFired = true;
      openImageMenu(imageDataFromElement(image), event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2);
    }, 560);
  });

  ["pointerup", "pointercancel", "pointermove"].forEach((eventName) => {
    refs.cardFace.addEventListener(eventName, () => clearTimeout(imageLongPressTimer));
  });

  refs.imagePreviewModal.addEventListener("click", (event) => {
    if (event.target === refs.imagePreviewModal || event.target === refs.imagePreviewImg) closeImagePreview();
  });
  refs.closeImagePreviewBtn.addEventListener("click", closeImagePreview);
  refs.imageActionMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-image-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    handleImageAction(button.dataset.imageAction);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".sample-menu-wrap")) closeSampleMenu();
    if (!event.target.closest("#bankBulkMenuWrap") && !event.target.closest("#cardBulkMenuWrap") && !event.target.closest("#builderBulkMenuWrap")) {
      closeBulkMenus();
    }
    if (!refs.imageActionMenu.hidden && !event.target.closest("#imageActionMenu") && !event.target.closest("[data-card-image]")) {
      closeImageMenu();
    }
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
  refs.closeBankBuilderBtn.addEventListener("click", closeBankBuilder);
  refs.bankBuilderModal.addEventListener("click", (event) => {
    if (event.target === refs.bankBuilderModal) closeBankBuilder();
  });
  refs.addRegularRowBtn.addEventListener("click", () => addBuilderRow("regular"));
  refs.addClozeRowBtn.addEventListener("click", () => addBuilderRow("cloze"));
  refs.addQuizRowBtn.addEventListener("click", () => addBuilderRow("quiz"));
  refs.addImageRowBtn.addEventListener("click", () => addBuilderRow("image"));
  refs.addMixedRowsBtn.addEventListener("click", addMixedBuilderRows);
  refs.selectBuilderRowsBtn.addEventListener("click", toggleBuilderSelectionMode);
  refs.builderBulkMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(refs.builderBulkControls, refs.builderBulkMenuBtn);
  });
  refs.selectAllBuilderRowsBtn.addEventListener("click", selectAllBuilderRows);
  refs.deleteSelectedBuilderRowsBtn.addEventListener("click", deleteSelectedBuilderRows);
  refs.clearBuilderSelectionBtn.addEventListener("click", clearBuilderSelection);
  refs.saveBankBuilderBtn.addEventListener("click", saveBankBuilder);
  refs.builderRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-builder-row]");
    if (!button) return;
    syncBuilderRowsFromDom();
    builderRows = builderRows.filter((row) => row.id !== button.dataset.removeBuilderRow);
    renderBuilderRows();
  });
  refs.builderRows.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-select-builder-row]");
    if (!checkbox) return;
    toggleBuilderRowSelection(checkbox.dataset.selectBuilderRow, checkbox.checked);
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
    if (state.settings.typing && !state.settings.autoRatingUserSet) {
      state.settings.autoRating = true;
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
    state.settings.autoRatingUserSet = true;
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
    blurActiveControl();
    state.activeBankId = refs.bankSelect.value;
    state.study.cardId = null;
    resetStudyTransient(null);
    selectedCardId = null;
    selectedCardIds.clear();
    selectionMode = false;
    saveState();
    render();
  });
  refs.selectBanksBtn.addEventListener("click", toggleBankSelectionMode);
  refs.createBankBtn.addEventListener("click", openBankBuilder);
  refs.bankBulkMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(refs.bankBulkControls, refs.bankBulkMenuBtn);
  });
  refs.selectAllBanksBtn.addEventListener("click", selectAllVisibleBanks);
  refs.bulkDeleteBanksBtn.addEventListener("click", deleteSelectedBanks);
  refs.clearBankSelectionBtn.addEventListener("click", clearBankSelection);
  refs.bankList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-select-bank]");
    if (!checkbox) return;
    toggleBankSelection(checkbox.dataset.selectBank, checkbox.checked);
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

  refs.loadSampleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(refs.sampleMenu, refs.loadSampleBtn);
  });
  refs.sampleMenu.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-sample-type]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    closeSampleMenu();
    await loadSample(button.dataset.sampleType || "csv");
  });

  refs.pasteImportBtn.addEventListener("click", () => {
    importCsvText(refs.pasteArea.value, refs.pasteNameInput.value.trim() || "pasted bank");
  });

  refs.pasteArea.addEventListener("paste", (event) => {
    const data = event.clipboardData;
    if (!data) return;
    const html = data.getData("text/html");
    const tableText = htmlTableToText(html);
    if (!tableText) return;
    event.preventDefault();
    const start = refs.pasteArea.selectionStart || 0;
    const end = refs.pasteArea.selectionEnd || 0;
    const value = refs.pasteArea.value;
    refs.pasteArea.value = value.slice(0, start) + tableText + value.slice(end);
    refs.pasteArea.dispatchEvent(new Event("input"));
  });

  refs.settingsTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-settings-tab]");
    if (!tab) return;
    activeSettingsPanel = tab.dataset.settingsTab || "typing";
    render();
    playSfx("toggle");
  });

  refs.infoTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-info-tab]");
    if (!tab) return;
    activeInfoPanel = tab.dataset.infoTab || "general";
    renderInfoPanels();
    playSfx("toggle");
  });

  refs.copyPromptBtn.addEventListener("click", () => {
    copyText(refs.aiPromptText.textContent || "").then(() => toast("prompt copied", "tap")).catch(() => toast("copy failed", "error"));
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
  refs.cardBulkMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu(refs.bulkControls, refs.cardBulkMenuBtn);
  });
  refs.selectAllCardsBtn.addEventListener("click", selectAllVisibleCards);
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
      openCardEditor(bank.cards.find((card) => card.id === editButton.dataset.edit));
    }
    if (deleteButton) {
      deleteCard(deleteButton.dataset.delete);
    }
  });

  refs.addCardBtn.addEventListener("click", () => openCardEditor(null));
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
    saveState();
    render();
    toast("state cleared", "reset");
  });

  document.addEventListener("fullscreenchange", updateFullscreenIcon);

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typingInField = target && /input|textarea|select/i.test(target.tagName);
    if ((event.ctrlKey || event.metaKey || event.altKey) && event.key !== "Escape") return;
    const key = shortcutKey(event);
    const ratingKey = ["1", "2", "3", "4"].includes(key);
    if (key === "escape") {
      closeFloatingMenus();
      closeImagePreview();
      if (refs.cardEditModal.classList.contains("is-open")) closeCardEditor();
      if (refs.infoModal.classList.contains("is-open")) closeInfo();
      return;
    }
    if (typingInField) {
      if (target === refs.typingAnswer && ratingKey && state.study.revealed) {
        event.preventDefault();
        rateCurrent(Number(key));
      }
      return;
    }
    if (key === "space") {
      event.preventDefault();
      revealCard();
    }
    if (key === "up") {
      if (moveQuizChoice(-1)) {
        event.preventDefault();
        return;
      }
    }
    if (key === "down") {
      if (moveQuizChoice(1)) {
        event.preventDefault();
        return;
      }
    }
    if (key === "enter") {
      if (activateQuizChoice()) {
        event.preventDefault();
        return;
      }
    }
    if (ratingKey) {
      const card = currentCard();
      if (card && card.type === "quiz" && !state.study.revealed) {
        const order = quizChoiceOrder(card);
        const displayIndex = Number(key) - 1;
        if (order[displayIndex] !== undefined) {
          event.preventDefault();
          answerQuizChoice(order[displayIndex]);
          return;
        }
      } else if (state.study.revealed) {
        event.preventDefault();
        rateCurrent(Number(key));
        return;
      }
    }
    if (/^[a-z]$/.test(key)) {
      const card = currentCard();
      const choiceIndex = quizChoiceFromLetter(card, key);
      if (choiceIndex !== null && !state.study.revealed) {
        event.preventDefault();
        answerQuizChoice(choiceIndex);
        return;
      }
    }
    if (key === "previous") {
      event.preventDefault();
      reviewPrevious();
    }
    if (key === "forward") {
      event.preventDefault();
      skipOrForwardCurrent();
    }
  });

  window.flashflowApp = {
    importCsvText,
    importFile,
    importXlsxFile,
    parseCardsFromCsv,
    parseCardsFromText,
    normalizePastedTable,
    shortcutKey,
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
