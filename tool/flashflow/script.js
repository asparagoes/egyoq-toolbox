import { Dexie } from "https://unpkg.com/dexie/dist/modern/dexie.mjs";
import Papa from "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm";
import { diffChars } from "https://cdn.jsdelivr.net/npm/diff@8.0.3/+esm";
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from "https://unpkg.com/ts-fsrs@4.7.1/dist/index.mjs?module";

const db = new Dexie("FlashFlow_Pro_v1");
db.version(1).stores({
  cards:"id,deck_id,due_ms,created_ms",
  reviews:"++id,card_id,review_ms",
  sessions:"++id,session_key,day_key,deck_scope,source",
  decks:"id,name,active,created_ms"
});

const $ = id => document.getElementById(id);
const ui = {
  csvFile:$("csvFile"), btnOptions:$("btnOptions"), optionsPanel:$("optionsPanel"),
  btnManageCards:$("btnManageCards"), btnHelp:$("btnHelp"), helpDialog:$("helpDialog"), btnCloseHelp:$("btnCloseHelp"),
  btnReset:$("btnReset"), statsText:$("statsText"), btnThemeQuick:$("btnThemeQuick"),
  optTheme:$("optTheme"), optCardOnly:$("optCardOnly"), optHideLabels:$("optHideLabels"), optSwapPanels:$("optSwapPanels"), optHoverPanels:$("optHoverPanels"),
  optDefaultLearningSteps:$("optDefaultLearningSteps"), optDefaultRelearningSteps:$("optDefaultRelearningSteps"),
  optDefaultDeadline:$("optDefaultDeadline"), optDefaultDeadlineDate:$("optDefaultDeadlineDate"), optDefaultDeadlineTime:$("optDefaultDeadlineTime"),
  optDefaultStudyStart:$("optDefaultStudyStart"), optDefaultStudyEnd:$("optDefaultStudyEnd"),
  optReverse:$("optReverse"), optAutoRate:$("optAutoRate"), optRandomize:$("optRandomize"),
  optDelay:$("optDelay"), optQuestionLimit:$("optQuestionLimit"), optVoice:$("optVoice"), optTts:$("optTts"),
  btnShowPanels:$("btnShowPanels"),
  subjectSwitcher:$("subjectSwitcher"), deckTabs:$("deckTabs"),
  planSummary:$("planSummary"), planGoalValue:$("planGoalValue"), planGoalSub:$("planGoalSub"), sessionList:$("sessionList"), decksSummary:$("decksSummary"), decksList:$("decksList"),
  calendarTitle:$("calendarTitle"), calendarGrid:$("calendarGrid"), calendarLegend:$("calendarLegend"), btnCalendarPrev:$("btnCalendarPrev"), btnCalendarNext:$("btnCalendarNext"),
  reviewTyping:$("reviewTyping"), reviewAutoRate:$("reviewAutoRate"), reviewRandomize:$("reviewRandomize"),
  reviewVoice:$("reviewVoice"), reviewTts:$("reviewTts"), reviewHideLabels:$("reviewHideLabels"),
  reviewCardOnly:$("reviewCardOnly"), reviewDelay:$("reviewDelay"), reviewTimeLimit:$("reviewTimeLimit"),
  modeValue:$("modeValue"), modeSub:$("modeSub"), optTimezone:$("optTimezone"),
  deckLearningSteps:$("deckLearningSteps"), deckRelearningSteps:$("deckRelearningSteps"),
  deckDeadline:$("deckDeadline"), deckDeadlineDate:$("deckDeadlineDate"), deckDeadlineTime:$("deckDeadlineTime"),
  deckStudyStart:$("deckStudyStart"), deckStudyEnd:$("deckStudyEnd"), btnCustomSession:$("btnCustomSession"),
  timerWrap:$("timerWrap"), timerVal:$("timerVal"), timerFill:$("timerFill"),
  metaRow:$("metaRow"), queueLabel:$("queueLabel"), sessionLine:$("sessionLine"),
  progressText:$("progressText"), progressPct:$("progressPct"), progressFillAgain:$("progressFillAgain"), progressFillHard:$("progressFillHard"), progressFillGood:$("progressFillGood"), btnHistoryBack:$("btnHistoryBack"), btnHistoryForward:$("btnHistoryForward"),
  question:$("question"), inputRow:$("inputRow"), answerInput:$("answerInput"), btnMic:$("btnMic"),
  btnShowAnswer:$("btnShowAnswer"), btnEditAnswer:$("btnEditAnswer"), btnEditCard:$("btnEditCard"), btnDeleteCard:$("btnDeleteCard"),
  statusLine:$("statusLine"), diffBox:$("diffBox"), revealBox:$("revealBox"), answer:$("answer"),
  explanationSection:$("explanationSection"), explanation:$("explanation"), acceptedList:$("acceptedList"),
  ratings:$("ratings"), manageDialog:$("manageDialog"), manageCardList:$("manageCardList"),
  btnSelectAllCards:$("btnSelectAllCards"), btnClearCardSelection:$("btnClearCardSelection"),
  btnExportCardsCsv:$("btnExportCardsCsv"), btnDeleteSelectedCards:$("btnDeleteSelectedCards"), btnCloseManage:$("btnCloseManage"),
  editCardDialog:$("editCardDialog"), editFront:$("editFront"), editBack:$("editBack"), editAccepted:$("editAccepted"),
  editExplanation:$("editExplanation"), btnCloseEditCard:$("btnCloseEditCard"), btnSaveEditCard:$("btnSaveEditCard"),
  toast:$("toast")
};

const DAY_MS = 86400000;
const SETTINGS_KEY = "flashflow_pro_settings";
const settings = {
  theme:"dark",
  typingMode:true,
  autoRateTyping:false,
  randomizeCards:false,
  voiceEnabled:false,
  ttsEnabled:false,
  hideLabels:true,
  cardOnlyView:false,
  swapPanels:false,
  hoverExpandPanels:true,
  reverseImport:false,
  autoAdvanceDelaySec:5,
  perQuestionLimitSec:0,
  defaultLearningSteps:"1m 10m 1d",
  defaultRelearningSteps:"10m",
  defaultDeadlineEnabled:false,
  defaultDeadlineDateISO:"",
  defaultDeadlineTime:"09:00",
  defaultStudyStartTime:"08:00",
  defaultStudyEndTime:"22:00",
  timezone:"Asia/Manila",
  selectedDeckId:"",
  panelOrder:{left:["studyPlan","calendar","decks"],right:["reviewBehavior","mode"]},
  collapsed:{}
};

let currentCard = null;
let queue = [];
let queueStats = {again:0, hard:0, good:0};
let revealed = false;
let recognition = null;
let listening = false;
let timerFrame = null;
let timerDeadline = 0;
let timerTotal = 0;
let autoAdvanceTimer = null;
let activeSession = null;
let lastPlan = [];
let lastDeckSignature = "";
let deckCache = [];
let calendarCursor = new Date();
let reviewUndoStack = [];
let reviewRedoStack = [];
const DEFAULT_DECK_RULES = {
  learningSteps:"1m 10m 1d",
  relearningSteps:"10m",
  deadlineEnabled:false,
  deadlineDateISO:"",
  deadlineTime:"09:00",
  studyStartTime:"08:00",
  studyEndTime:"22:00",
  color:"#8b5cf6",
  sessionStartMode:"now",
  sessionStartAt:""
};
const DECK_COLORS = ["#8b5cf6","#22c55e","#3b82f6","#f97316","#ec4899","#14b8a6","#eab308","#f43f5e"];

function escapeHtml(s){return String(s ?? "").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));}
function uid(){return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);} 
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function splitStepList(raw){
  const tokens = String(raw || "").trim().split(/\s+/).filter(Boolean);
  return tokens.filter(token=>/^\d+(?:\.\d+)?[smhd]$/i.test(token));
}
function normalizeStepString(raw, fallback){
  const tokens = splitStepList(raw);
  return tokens.length ? tokens.join(" ") : fallback;
}
function normalizeDeckRules(data={}){
  return {
    learningSteps: normalizeStepString(data.learningSteps, DEFAULT_DECK_RULES.learningSteps),
    relearningSteps: normalizeStepString(data.relearningSteps, DEFAULT_DECK_RULES.relearningSteps),
    deadlineEnabled: !!data.deadlineEnabled,
    deadlineDateISO: String(data.deadlineDateISO || ""),
    deadlineTime: String(data.deadlineTime || DEFAULT_DECK_RULES.deadlineTime),
    studyStartTime: String(data.studyStartTime || DEFAULT_DECK_RULES.studyStartTime),
    studyEndTime: String(data.studyEndTime || DEFAULT_DECK_RULES.studyEndTime),
    color: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(data.color || "")) ? String(data.color) : DEFAULT_DECK_RULES.color,
    sessionStartMode: ["now","custom","manual"].includes(String(data.sessionStartMode || "")) ? String(data.sessionStartMode) : DEFAULT_DECK_RULES.sessionStartMode,
    sessionStartAt: String(data.sessionStartAt || "")
  };
}
function deckRulesFromSettings(){
  return normalizeDeckRules({
    learningSteps: settings.defaultLearningSteps,
    relearningSteps: settings.defaultRelearningSteps,
    deadlineEnabled: settings.defaultDeadlineEnabled,
    deadlineDateISO: settings.defaultDeadlineDateISO,
    deadlineTime: settings.defaultDeadlineTime,
    studyStartTime: settings.defaultStudyStartTime,
    studyEndTime: settings.defaultStudyEndTime
  });
}
function decorateDeck(deck){
  const rules = normalizeDeckRules(deck || {});
  return {...(deck || {}), ...rules};
}
function pickNextDeckColor(){
  const used = new Set(deckCache.map(deck=>deck.color));
  return DECK_COLORS.find(color=>!used.has(color)) || DECK_COLORS[deckCache.length % DECK_COLORS.length];
}
function norm(s){
  return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
}
function dayKey(ms){
  const fmt = new Intl.DateTimeFormat("en-CA",{timeZone:settings.timezone,year:"numeric",month:"2-digit",day:"2-digit"});
  return fmt.format(new Date(ms));
}
function fmtShort(ms){return new Intl.DateTimeFormat("en-US",{timeZone:settings.timezone,month:"short",day:"numeric"}).format(new Date(ms));}
function fmtTime(ms){return new Intl.DateTimeFormat("en-US",{timeZone:settings.timezone,hour:"numeric",minute:"2-digit"}).format(new Date(ms));}
function fmtDateTime(ms){return new Intl.DateTimeFormat("en-US",{timeZone:settings.timezone,month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(ms));}
function timeToMinutes(v){const [h,m]=String(v || "00:00").split(":").map(Number); return clamp((h||0)*60 + (m||0),0,1439);} 
function toast(msg){
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  setTimeout(()=>ui.toast.classList.remove("show"),2200);
}
function setStatus(msg){ui.statusLine.textContent = msg || "";}
function clearAutoAdvance(){ if(autoAdvanceTimer){ clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; } }

function loadSettings(){
  try{ const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); Object.assign(settings,saved); }catch{}
  if("deadlineEnabled" in settings && !("defaultDeadlineEnabled" in settings)) settings.defaultDeadlineEnabled = !!settings.deadlineEnabled;
  if("deadlineDateISO" in settings && !("defaultDeadlineDateISO" in settings)) settings.defaultDeadlineDateISO = settings.deadlineDateISO || "";
  if("deadlineTime" in settings && !("defaultDeadlineTime" in settings)) settings.defaultDeadlineTime = settings.deadlineTime || "09:00";
  if("studyStartTime" in settings && !("defaultStudyStartTime" in settings)) settings.defaultStudyStartTime = settings.studyStartTime || "08:00";
  if("studyEndTime" in settings && !("defaultStudyEndTime" in settings)) settings.defaultStudyEndTime = settings.studyEndTime || "22:00";
  settings.defaultLearningSteps = normalizeStepString(settings.defaultLearningSteps, DEFAULT_DECK_RULES.learningSteps);
  settings.defaultRelearningSteps = normalizeStepString(settings.defaultRelearningSteps, DEFAULT_DECK_RULES.relearningSteps);
  if(!settings.panelOrder) settings.panelOrder = {left:["studyPlan","calendar","decks"],right:["reviewBehavior","mode"]};
  settings.panelOrder.left = (settings.panelOrder.left || ["studyPlan","calendar","decks"]).filter(id=>["studyPlan","calendar","decks"].includes(id));
  settings.panelOrder.right = (settings.panelOrder.right || ["reviewBehavior","mode"]).filter(id=>["reviewBehavior","mode"].includes(id));
  if(!settings.panelOrder.left.length) settings.panelOrder.left = ["studyPlan","calendar","decks"];
  if(!settings.panelOrder.right.length) settings.panelOrder.right = ["reviewBehavior","mode"];
  if(!settings.collapsed) settings.collapsed = {};
}
function saveSettings(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function syncToggleButton(btn, active){ if(!btn) return; btn.setAttribute("aria-pressed", active ? "true" : "false"); }
function renderDeckTabs(){
  if(!ui.subjectSwitcher || !ui.deckTabs) return;
  ui.subjectSwitcher.classList.toggle("hidden", deckCache.length === 0);
  ui.deckTabs.innerHTML = "";
  for(const deck of deckCache){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `subject-tab ${settings.selectedDeckId === deck.id ? "active" : ""} ${deck.active !== false ? "" : "inactive"}`.trim();
    btn.innerHTML = `<span class="subject-dot" style="background:${escapeHtml(deck.color)}"></span><span>${escapeHtml(deck.name)}</span>`;
    btn.addEventListener("click", async ()=>{
      settings.selectedDeckId = deck.id;
      saveSettings();
      syncUI();
      activeSession = null;
      await refreshEverything();
      if(currentCard?.deck_id !== deck.id) await nextCard();
    });
    ui.deckTabs.appendChild(btn);
  }
}
function selectedDeck(){ return deckCache.find(deck=>deck.id === settings.selectedDeckId) || null; }
function selectedDeckRules(){ return selectedDeck() || deckRulesFromSettings(); }
function ensureSelectedDeck(){ if(settings.selectedDeckId && deckCache.some(deck=>deck.id === settings.selectedDeckId)) return; settings.selectedDeckId = deckCache.find(deck=>deck.active !== false)?.id || deckCache[0]?.id || ""; }
function syncDeckSettingsFields(){
  const rules = selectedDeck();
  const deck = selectedDeck();
  if(!deck){
    ui.deckLearningSteps.value = "";
    ui.deckRelearningSteps.value = "";
    ui.deckDeadline.checked = false;
    ui.deckDeadlineDate.value = "";
    ui.deckDeadlineTime.value = "09:00";
    ui.deckStudyStart.value = "08:00";
    ui.deckStudyEnd.value = "22:00";
    ui.modeValue.textContent = "No deck";
    ui.modeSub.textContent = "Import or select a deck to edit deck-specific settings.";
    return;
  }
  ui.deckLearningSteps.value = rules.learningSteps;
  ui.deckRelearningSteps.value = rules.relearningSteps;
  ui.deckDeadline.checked = rules.deadlineEnabled;
  ui.deckDeadlineDate.value = rules.deadlineDateISO || "";
  ui.deckDeadlineTime.value = rules.deadlineTime || "09:00";
  ui.deckStudyStart.value = rules.studyStartTime || "08:00";
  ui.deckStudyEnd.value = rules.studyEndTime || "22:00";
  ui.modeValue.textContent = deck.name;
  ui.modeSub.textContent = `Editing ${deck.name}. This deck alone controls the Study Plan panel and keeps its own learning and deadline rules.`;
}

function syncUI(){
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle("card-only", !!settings.cardOnlyView);
  document.body.classList.toggle("swap-panels", !!settings.swapPanels);

  ui.optTheme.value = settings.theme;
  ui.optCardOnly.checked = settings.cardOnlyView;
  ui.optHideLabels.checked = settings.hideLabels;
  ui.optSwapPanels.checked = settings.swapPanels;
  ui.optHoverPanels.checked = settings.hoverExpandPanels;
  ui.optReverse.checked = settings.reverseImport;
  ui.optAutoRate.checked = settings.autoRateTyping;
  ui.optRandomize.checked = settings.randomizeCards;
  ui.optDefaultLearningSteps.value = settings.defaultLearningSteps;
  ui.optDefaultRelearningSteps.value = settings.defaultRelearningSteps;
  ui.optDefaultDeadline.checked = settings.defaultDeadlineEnabled;
  ui.optDefaultDeadlineDate.value = settings.defaultDeadlineDateISO || "";
  ui.optDefaultDeadlineTime.value = settings.defaultDeadlineTime || "09:00";
  ui.optDefaultStudyStart.value = settings.defaultStudyStartTime || "08:00";
  ui.optDefaultStudyEnd.value = settings.defaultStudyEndTime || "22:00";
  ui.optDelay.value = settings.autoAdvanceDelaySec;
  ui.optQuestionLimit.value = settings.perQuestionLimitSec;
  ui.optVoice.checked = settings.voiceEnabled;
  ui.optTts.checked = settings.ttsEnabled;

  syncToggleButton(ui.reviewTyping, settings.typingMode);
  syncToggleButton(ui.reviewAutoRate, settings.autoRateTyping);
  syncToggleButton(ui.reviewRandomize, settings.randomizeCards);
  syncToggleButton(ui.reviewVoice, settings.voiceEnabled);
  syncToggleButton(ui.reviewTts, settings.ttsEnabled);
  syncToggleButton(ui.reviewHideLabels, settings.hideLabels);
  syncToggleButton(ui.reviewCardOnly, settings.cardOnlyView);
  ui.reviewDelay.value = settings.autoAdvanceDelaySec;
  ui.reviewTimeLimit.value = settings.perQuestionLimitSec;

  ui.optTimezone.value = settings.timezone;
  ui.btnThemeQuick.textContent = settings.theme === "dark" ? "🌙 Dark" : "☀ Light";
  renderDeckTabs();
  syncDeckSettingsFields();
}

function applyPanelLayout(){
  for(const [side, order] of Object.entries(settings.panelOrder)){
    const stack = document.getElementById(side === "left" ? "leftStack" : "rightStack");
    for(const id of order){
      const panel = stack.querySelector(`[data-panel-id="${id}"]`);
      if(panel) stack.appendChild(panel);
    }
  }
  document.querySelectorAll("[data-panel-id]").forEach(panel=>{
    const id = panel.dataset.panelId;
    panel.classList.toggle("collapsed", !!settings.collapsed[id]);
    panel.classList.remove("hover-open");
    const pinBtn = panel.querySelector(".collapse-btn");
    const pinned = !panel.classList.contains("collapsed");
    pinBtn.textContent = pinned ? "◉" : "◎";
    pinBtn.title = pinned ? "Pinned open" : "Auto collapse / hover open";
    pinBtn.setAttribute("aria-label", pinBtn.title);
  });
  setupPanelDragging();
  setupPanelHoverBehavior();
}

let dragArmedPanel = null;
let draggingPanel = null;

function panelAfterElement(stack, y){
  const items = [...stack.querySelectorAll("[data-panel-id]:not(.dragging)")];
  return items.reduce((closest, child)=>{
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);
    if(offset < 0 && offset > closest.offset){
      return {offset, element:child};
    }
    return closest;
  }, {offset:Number.NEGATIVE_INFINITY, element:null}).element;
}

function syncPanelOrderFromDom(side){
  const stack = document.getElementById(side === "left" ? "leftStack" : "rightStack");
  settings.panelOrder[side] = [...stack.querySelectorAll("[data-panel-id]")].map(panel=>panel.dataset.panelId);
  saveSettings();
}

function setupPanelDragging(){
  document.querySelectorAll("[data-panel-id]").forEach(panel=>{
    panel.draggable = true;
    if(panel.dataset.dragReady === "true") return;
    panel.dataset.dragReady = "true";

    const handle = panel.querySelector(".drag-handle");
    handle?.addEventListener("pointerdown", ()=>{
      dragArmedPanel = panel;
    });
    handle?.addEventListener("pointerup", ()=>{
      if(dragArmedPanel === panel) dragArmedPanel = null;
    });
    handle?.addEventListener("pointercancel", ()=>{
      if(dragArmedPanel === panel) dragArmedPanel = null;
    });

    panel.addEventListener("dragstart", e=>{
      if(dragArmedPanel !== panel){
        e.preventDefault();
        return;
      }
      draggingPanel = panel;
      panel.classList.add("dragging");
      try{
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", panel.dataset.panelId);
      }catch{}
    });

    panel.addEventListener("dragend", ()=>{
      panel.classList.remove("dragging");
      dragArmedPanel = null;
      draggingPanel = null;
    });
  });

  document.querySelectorAll(".side-stack").forEach(stack=>{
    if(stack.dataset.dragReady === "true") return;
    stack.dataset.dragReady = "true";

    stack.addEventListener("dragover", e=>{
      if(!draggingPanel) return;
      const side = stack.id === "leftStack" ? "left" : "right";
      if(draggingPanel.dataset.side !== side) return;
      e.preventDefault();
      const after = panelAfterElement(stack, e.clientY);
      if(after == null) stack.appendChild(draggingPanel);
      else stack.insertBefore(draggingPanel, after);
    });

    stack.addEventListener("drop", e=>{
      if(!draggingPanel) return;
      const side = stack.id === "leftStack" ? "left" : "right";
      if(draggingPanel.dataset.side !== side) return;
      e.preventDefault();
      syncPanelOrderFromDom(side);
      applyPanelLayout();
    });
  });
}

function setupPanelHoverBehavior(){
  document.querySelectorAll("[data-panel-id]").forEach(panel=>{
    if(panel.dataset.hoverReady === "true") return;
    panel.dataset.hoverReady = "true";

    const openPreview = ()=>{
      if(settings.hoverExpandPanels && panel.classList.contains("collapsed")) panel.classList.add("hover-open");
    };
    const closePreview = ()=>{
      if(!panel.matches(":hover") && !panel.contains(document.activeElement)) panel.classList.remove("hover-open");
    };

    panel.addEventListener("pointerenter", openPreview);
    panel.addEventListener("pointerleave", closePreview);
    panel.addEventListener("focusin", openPreview);
    panel.addEventListener("focusout", ()=>requestAnimationFrame(closePreview));
  });
}

async function persistPlannerSource(){
  const targetDeck = selectedDeck();
  if(!targetDeck) return;
  const rules = capDeckStudyWindowEnd(normalizeDeckRules({
    learningSteps: ui.deckLearningSteps.value,
    relearningSteps: ui.deckRelearningSteps.value,
    deadlineEnabled: ui.deckDeadline.checked,
    deadlineDateISO: ui.deckDeadlineDate.value || "",
    deadlineTime: ui.deckDeadlineTime.value || "09:00",
    studyStartTime: ui.deckStudyStart.value || "08:00",
    studyEndTime: ui.deckStudyEnd.value || "22:00",
    color: targetDeck.color || DEFAULT_DECK_RULES.color,
    sessionStartMode: targetDeck.sessionStartMode || "now",
    sessionStartAt: targetDeck.sessionStartAt || ""
  }));
  await db.decks.update(targetDeck.id, rules);
  deckCache = await getDecks();
}

function persistDefaultDeckSettings(){
  settings.defaultLearningSteps = normalizeStepString(ui.optDefaultLearningSteps.value, DEFAULT_DECK_RULES.learningSteps);
  settings.defaultRelearningSteps = normalizeStepString(ui.optDefaultRelearningSteps.value, DEFAULT_DECK_RULES.relearningSteps);
  settings.defaultDeadlineEnabled = ui.optDefaultDeadline.checked;
  settings.defaultDeadlineDateISO = ui.optDefaultDeadlineDate.value || "";
  settings.defaultDeadlineTime = ui.optDefaultDeadlineTime.value || "09:00";
  settings.defaultStudyStartTime = ui.optDefaultStudyStart.value || "08:00";
  settings.defaultStudyEndTime = ui.optDefaultStudyEnd.value || "22:00";
  capStudyWindowEnd();
}

function bindSettings(){
  const handlers = [
    [ui.optTheme,"change",()=>settings.theme = ui.optTheme.value],
    [ui.optCardOnly,"change",()=>settings.cardOnlyView = ui.optCardOnly.checked],
    [ui.optHideLabels,"change",()=>settings.hideLabels = ui.optHideLabels.checked],
    [ui.optSwapPanels,"change",()=>settings.swapPanels = ui.optSwapPanels.checked],
    [ui.optHoverPanels,"change",()=>settings.hoverExpandPanels = ui.optHoverPanels.checked],
    [ui.optReverse,"change",()=>settings.reverseImport = ui.optReverse.checked],
    [ui.optAutoRate,"change",()=>settings.autoRateTyping = ui.optAutoRate.checked],
    [ui.optRandomize,"change",()=>settings.randomizeCards = ui.optRandomize.checked],
    [ui.optDelay,"input",()=>settings.autoAdvanceDelaySec = clamp(Number(ui.optDelay.value)||0,0,60)],
    [ui.optQuestionLimit,"input",()=>settings.perQuestionLimitSec = clamp(Number(ui.optQuestionLimit.value)||0,0,600)],
    [ui.optVoice,"change",()=>settings.voiceEnabled = ui.optVoice.checked],
    [ui.optTts,"change",()=>settings.ttsEnabled = ui.optTts.checked],
    [ui.optDefaultLearningSteps,"change",persistDefaultDeckSettings],
    [ui.optDefaultRelearningSteps,"change",persistDefaultDeckSettings],
    [ui.optDefaultDeadline,"change",persistDefaultDeckSettings],
    [ui.optDefaultDeadlineDate,"input",persistDefaultDeckSettings],
    [ui.optDefaultDeadlineTime,"input",persistDefaultDeckSettings],
    [ui.optDefaultStudyStart,"input",persistDefaultDeckSettings],
    [ui.optDefaultStudyEnd,"input",persistDefaultDeckSettings],
    [ui.reviewDelay,"input",()=>settings.autoAdvanceDelaySec = clamp(Number(ui.reviewDelay.value)||0,0,60)],
    [ui.reviewTimeLimit,"input",()=>settings.perQuestionLimitSec = clamp(Number(ui.reviewTimeLimit.value)||0,0,600)],
    [ui.optTimezone,"change",()=>settings.timezone = ui.optTimezone.value],
  ];
  for(const [el,ev,fn] of handlers){
    el.addEventListener(ev, async ()=>{
      fn();
      capStudyWindowEnd();
      saveSettings();
      syncUI();
      applyPanelLayout();
      setupVoice();
      if(currentCard) showQuestion(currentCard, true);
      await refreshEverything();
    });
  }

  [ui.deckLearningSteps, ui.deckRelearningSteps, ui.deckDeadline, ui.deckDeadlineDate, ui.deckDeadlineTime, ui.deckStudyStart, ui.deckStudyEnd].forEach(el=>{
    el.addEventListener(el.type === "checkbox" ? "change" : "input", async ()=>{
      await persistPlannerSource();
      saveSettings();
      syncUI();
      if(currentCard) showQuestion(currentCard, true);
      await refreshEverything();
    });
  });

  const reviewToggleHandlers = [
    [ui.reviewTyping, ()=>settings.typingMode = !settings.typingMode],
    [ui.reviewAutoRate, ()=>settings.autoRateTyping = !settings.autoRateTyping],
    [ui.reviewRandomize, ()=>settings.randomizeCards = !settings.randomizeCards],
    [ui.reviewVoice, ()=>settings.voiceEnabled = !settings.voiceEnabled],
    [ui.reviewTts, ()=>settings.ttsEnabled = !settings.ttsEnabled],
    [ui.reviewHideLabels, ()=>settings.hideLabels = !settings.hideLabels],
    [ui.reviewCardOnly, ()=>settings.cardOnlyView = !settings.cardOnlyView]
  ];
  for(const [el, fn] of reviewToggleHandlers){
    el.addEventListener("click", async ()=>{
      fn();
      saveSettings();
      syncUI();
      applyPanelLayout();
      setupVoice();
      if(currentCard) showQuestion(currentCard, true);
      await refreshEverything();
    });
  }
}

function capStudyWindowEnd(){
  if(!settings.defaultDeadlineEnabled || !settings.defaultDeadlineDateISO) return;
  const max = timeToMinutes(settings.defaultDeadlineTime);
  const current = timeToMinutes(settings.defaultStudyEndTime);
  if(current > max) settings.defaultStudyEndTime = settings.defaultDeadlineTime;
}

function capDeckStudyWindowEnd(rules){
  const next = normalizeDeckRules(rules);
  if(!next.deadlineEnabled || !next.deadlineDateISO) return next;
  const max = timeToMinutes(next.deadlineTime);
  const current = timeToMinutes(next.studyEndTime);
  if(current > max) next.studyEndTime = next.deadlineTime;
  return next;
}
function deadlineMs(source=settings){
  if(!source.deadlineEnabled || !source.deadlineDateISO) return null;
  const ms = new Date(`${source.deadlineDateISO}T${source.deadlineTime || "09:00"}`).getTime();
  return Number.isFinite(ms) ? ms : null;
}
function capDueToDeadline(ms, source=settings){
  const dl = deadlineMs(source);
  return dl ? Math.min(ms, dl - 3600000) : ms;
}

function makeScheduler(ruleSource=settings){
  const rules = ruleSource.learningSteps ? normalizeDeckRules(ruleSource) : deckRulesFromSettings();
  let request_retention = 0.90;
  let maximum_interval = 36500;
  const dl = deadlineMs(rules);
  if(dl){
    const days = Math.max(1, Math.ceil((dl - Date.now()) / DAY_MS));
    maximum_interval = Math.max(1, Math.floor(days / 2));
    if(days <= 3) request_retention = 0.97;
    else if(days <= 7) request_retention = 0.95;
    else if(days <= 14) request_retention = 0.93;
  }
  return fsrs(generatorParameters({
    request_retention, maximum_interval,
    enable_fuzz:true, enable_short_term:true,
    learning_steps:splitStepList(rules.learningSteps),
    relearning_steps:splitStepList(rules.relearningSteps)
  }));
}

function stateOf(card){ return card?.fsrs_card?.state; }
function isNew(card){ return stateOf(card) === State.New; }
function stateLabel(card){
  const state = stateOf(card);
  if(state === State.New) return "New";
  if(state === State.Learning) return "Learning";
  if(state === State.Review) return "Review";
  if(state === State.Relearning) return "Relearning";
  return "";
}
function bucketForGrade(gradeInt){
  if(gradeInt === 1) return "again";
  if(gradeInt === 2) return "hard";
  return "good";
}
function bucketForCard(card){
  if(card?.queue_bucket) return card.queue_bucket;
  if(isNew(card)) return "good";
  if([State.Learning, State.Relearning].includes(stateOf(card))) return "hard";
  return "good";
}
function queueDeckId(){
  return settings.selectedDeckId || "";
}

async function getDecks(){
  const decks = await db.decks.orderBy("created_ms").toArray();
  const updates = [];
  const assignedColors = new Set();
  const normalized = decks.map(deck=>{
    const fallbackColor = deck.color || DECK_COLORS.find(color=>!assignedColors.has(color)) || DECK_COLORS[assignedColors.size % DECK_COLORS.length];
    assignedColors.add(fallbackColor);
    const merged = decorateDeck({...deck, color: fallbackColor});
    if(
      deck.learningSteps !== merged.learningSteps ||
      deck.relearningSteps !== merged.relearningSteps ||
      deck.deadlineEnabled !== merged.deadlineEnabled ||
      deck.deadlineDateISO !== merged.deadlineDateISO ||
      deck.deadlineTime !== merged.deadlineTime ||
      deck.studyStartTime !== merged.studyStartTime ||
      deck.studyEndTime !== merged.studyEndTime ||
      deck.color !== merged.color ||
      deck.sessionStartMode !== merged.sessionStartMode ||
      deck.sessionStartAt !== merged.sessionStartAt
    ){
      updates.push(db.decks.update(deck.id, {
        learningSteps: merged.learningSteps,
        relearningSteps: merged.relearningSteps,
        deadlineEnabled: merged.deadlineEnabled,
        deadlineDateISO: merged.deadlineDateISO,
        deadlineTime: merged.deadlineTime,
        studyStartTime: merged.studyStartTime,
        studyEndTime: merged.studyEndTime,
        color: merged.color,
        sessionStartMode: merged.sessionStartMode,
        sessionStartAt: merged.sessionStartAt
      }));
    }
    return merged;
  });
  if(updates.length) await Promise.all(updates);
  deckCache = normalized;
  ensureSelectedDeck();
  return normalized;
}
async function getActiveDeckIds(){ return (await getDecks()).filter(d=>d.active !== false).map(d=>d.id); }
function deckSignature(ids){ return [...ids].sort().join(","); }

async function getActiveCards(){
  const ids = await getActiveDeckIds();
  if(!ids.length) return [];
  const all = await db.cards.toArray();
  return all.filter(c=>ids.includes(c.deck_id));
}
async function getSelectedDeckCards(){
  const deckId = queueDeckId();
  if(deckId) return await db.cards.where("deck_id").equals(deckId).toArray();
  return getActiveCards();
}

async function createDeck(file){
  const base = (file.name || "Deck").replace(/\.[^.]+$/,"");
  const names = new Set((await getDecks()).map(d=>d.name));
  let name = base || "Deck";
  let i = 2;
  while(names.has(name)) name = `${base} (${i++})`;
  const defaults = deckRulesFromSettings();
  const deck = { id: uid(), name, active:true, created_ms:Date.now(), color:pickNextDeckColor(), sessionStartMode:"now", sessionStartAt:"", ...defaults };
  await db.decks.add(deck);
  return deck;
}

async function renameDeck(deck){
  const next = prompt("Rename deck", deck.name);
  if(!next) return false;
  const name = next.trim();
  if(!name || name === deck.name) return false;
  await db.transaction("rw", db.decks, db.cards, async ()=>{
    await db.decks.update(deck.id, {name});
    const cards = await db.cards.where("deck_id").equals(deck.id).toArray();
    for(const c of cards) await db.cards.update(c.id, {deck_name:name});
  });
  return true;
}

async function setOnlyDeck(deckId){
  const decks = await getDecks();
  await db.transaction("rw", db.decks, async ()=>{
    for(const d of decks) await db.decks.update(d.id, {active: d.id === deckId});
  });
}

async function deleteDeck(deck){
  const cards = await db.cards.where("deck_id").equals(deck.id).toArray();
  if(!confirm(`Delete "${deck.name}" and ${cards.length} card(s)?`)) return false;
  const ids = cards.map(c=>c.id);
  await db.transaction("rw", db.decks, db.cards, db.reviews, async ()=>{
    for(const cid of ids){
      const reviewIds = await db.reviews.where("card_id").equals(cid).primaryKeys();
      if(reviewIds.length) await db.reviews.bulkDelete(reviewIds);
    }
    if(ids.length) await db.cards.bulkDelete(ids);
    await db.decks.delete(deck.id);
  });
  return true;
}

function parseLetters(raw){
  const m = String(raw || "").toUpperCase().match(/[A-E]/g);
  return m ? [...new Set(m)] : [];
}
function parseMarkedText(text){
  const results = [];
  const regex = /\[\[(.+?)\]\]/g;
  const markers = [];
  let m;
  while((m = regex.exec(text)) !== null){
    const [left, hint] = m[1].split("|").map(x => (x || "").trim());
    markers.push({raw:m[0], start:m.index, end:m.index + m[0].length, answers:left.split(";").map(s=>s.trim()).filter(Boolean), hint:hint || ""});
  }
  if(!markers.length) return [];
  for(let idx=0; idx<markers.length; idx++){
    let front = "", last = 0;
    for(let i=0;i<markers.length;i++){
      const marker = markers[i];
      front += text.slice(last, marker.start);
      front += (i === idx) ? `_____${marker.hint ? ` (${marker.hint})` : ""}` : (marker.answers[0] || "<?>");
      last = marker.end;
    }
    front += text.slice(last);
    let back = text;
    for(const marker of markers) back = back.replace(marker.raw, marker.answers[0] || "<?>");
    results.push({
      front_plain:front, front_html:escapeHtml(front), spoken_front:front,
      back_plain:back, back_html:escapeHtml(back), accepted:markers[idx].answers,
      explanation_html:"", meta:{}
    });
  }
  return results;
}
function buildQuestionBankCard(row){
  const stem = String(row.Stem || row.stem || "").trim();
  if(!stem) return [];
  const letters = parseLetters(row.Answer || row.answer || "");
  const accepted = [];
  for(const letter of letters){
    accepted.push(letter);
    const choice = String(row[letter] || row[letter.toLowerCase()] || "").trim();
    if(choice) accepted.push(`${letter}. ${choice}`);
  }
  const answerText = letters.length ? letters.join(", ") : String(row.Answer || row.answer || "").trim();
  return [{
    front_plain:stem,
    front_html:escapeHtml(stem),
    spoken_front:stem,
    back_plain:answerText,
    back_html:escapeHtml(answerText),
    accepted:accepted.length ? accepted : [answerText],
    explanation_html:String(row.Explanation || row.explanation || "").trim() ? escapeHtml(String(row.Explanation || row.explanation || "").trim()) : "",
    meta:{
      id:String(row.ID || row.id || "").trim(),
      topic:String(row.Topic || row.topic || "").trim(),
      difficulty:String(row.Difficulty || row.difficulty || "").trim()
    }
  }];
}
function buildFrontBackCards(row){
  const front = String(row.front || row.Front || "").trim();
  const back = String(row.back || row.Back || "").trim();
  if(!front || !back) return [];
  const answers = String(row.answers || row.Answers || "").split(";").map(s=>s.trim()).filter(Boolean);
  const cards = [{
    front_plain:front, front_html:escapeHtml(front), spoken_front:front,
    back_plain:back, back_html:escapeHtml(back), accepted:answers.length ? answers : [back],
    explanation_html:"", meta:{topic:String(row.tags || row.Tags || "").trim()}
  }];
  if(settings.reverseImport){
    cards.push({
      front_plain:back, front_html:escapeHtml(back), spoken_front:back,
      back_plain:front, back_html:escapeHtml(front), accepted:[front],
      explanation_html:"", meta:{topic:"Reverse"}
    });
  }
  return cards;
}

async function importCSV(file){
  const deck = await createDeck(file);
  const parsed = await new Promise((resolve,reject)=>{
    Papa.parse(file, {header:true, skipEmptyLines:true, complete:resolve, error:reject});
  });
  const rows = parsed.data || [];
  const nowMs = Date.now();
  let created = 0;
  await db.transaction("rw", db.cards, async ()=>{
    for(const row of rows){
      let cards = buildQuestionBankCard(row);
      if(!cards.length){
        const text = String(row.text || row.Text || "").trim();
        if(text && /\[\[.+?\]\]/.test(text)) cards = parseMarkedText(text);
      }
      if(!cards.length) cards = buildFrontBackCards(row);
      for(const card of cards){
        await db.cards.add({
          id:uid(), deck_id:deck.id, deck_name:deck.name, created_ms:nowMs, due_ms:nowMs,
          fsrs_card:createEmptyCard(new Date(nowMs)), queue_bucket:"good", ...card
        });
        created++;
      }
    }
  });
  toast(`Imported ${created} card(s) into "${deck.name}"`);
  settings.selectedDeckId = deck.id;
  saveSettings();
  activeSession = null;
  await refreshEverything();
  await nextCard();
}

async function buildQueue(includeFuture=false){
  const cards = await getSelectedDeckCards();
  const now = Date.now();
  const scoped = cards;
  let due = scoped.filter(c => c.due_ms <= now || isNew(c));
  const rank = {again:0, hard:1, good:2};
  due.sort((a,b)=>{
    const bucketDelta = rank[bucketForCard(a)] - rank[bucketForCard(b)];
    return bucketDelta || a.due_ms - b.due_ms;
  });
  if(settings.randomizeCards){
    for(let i=due.length-1;i>0;i--){
      const j = Math.floor(Math.random() * (i+1));
      [due[i], due[j]] = [due[j], due[i]];
    }
  }
  if(includeFuture){
    let future = scoped.filter(c => c.due_ms > now).sort((a,b)=>a.due_ms - b.due_ms).slice(0, 30);
    if(settings.randomizeCards){
      for(let i=future.length-1;i>0;i--){
        const j = Math.floor(Math.random() * (i+1));
        [future[i], future[j]] = [future[j], future[i]];
      }
    }
    queue = [...due, ...future];
  }else{
    queue = due;
  }
  queueStats = queue.reduce((acc, card)=>{
    const bucket = bucketForCard(card);
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {again:0, hard:0, good:0});
}

function renderMeta(card){
  ui.metaRow.innerHTML = "";
  if(!card || settings.hideLabels){
    ui.metaRow.classList.add("hidden");
    return;
  }
  ui.metaRow.classList.remove("hidden");
  const items = [];
  const phase = stateLabel(card);
  if(phase) items.push(["", phase]);
  if(card.meta?.id) items.push(["", card.meta.id]);
  if(card.meta?.topic) items.push(["topic", card.meta.topic]);
  if(card.meta?.difficulty) items.push(["diff", card.meta.difficulty]);
  if(card.deck_name) items.push(["deck", card.deck_name]);
  for(const [cls, text] of items){
    const span = document.createElement("span");
    span.className = `pill ${cls}`.trim();
    span.textContent = text;
    ui.metaRow.appendChild(span);
  }
}

function resetRevealUI(){
  revealed = false;
  clearAutoAdvance();
  stopTimer();
  ui.diffBox.classList.add("hidden");
  ui.diffBox.innerHTML = "";
  ui.revealBox.classList.add("hidden");
  ui.answer.textContent = "";
  ui.explanation.textContent = "";
  ui.explanationSection.classList.add("hidden");
  ui.acceptedList.innerHTML = "";
  ui.ratings.classList.add("hidden");
  ui.btnEditAnswer.classList.add("hidden");
  setStatus("");
}

function setupVoice(){
  recognition = null;
  listening = false;
  ui.btnMic.classList.remove("on");
  if(!settings.voiceEnabled || !settings.typingMode){
    ui.btnMic.classList.add("hidden");
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    ui.btnMic.classList.add("hidden");
    return;
  }
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onresult = e => {
    let transcript = "";
    for(let i=e.resultIndex;i<e.results.length;i++) transcript += e.results[i][0].transcript;
    ui.answerInput.value = transcript.trim();
  };
  recognition.onend = ()=>{ listening = false; ui.btnMic.classList.remove("on"); };
  recognition.onerror = ()=>{ listening = false; ui.btnMic.classList.remove("on"); };
  ui.btnMic.classList.toggle("hidden", !currentCard || !settings.typingMode);
}
function toggleMic(){
  if(!recognition) return;
  if(listening){ recognition.stop(); return; }
  try{
    listening = true;
    ui.btnMic.classList.add("on");
    recognition.start();
  }catch{
    listening = false;
    ui.btnMic.classList.remove("on");
  }
}
function speakQuestion(text){
  if(!settings.voiceEnabled || !settings.ttsEnabled || !("speechSynthesis" in window)) return;
  try{
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    speechSynthesis.speak(utter);
  }catch{}
}
function anyModalOpen(){
  return [ui.helpDialog, ui.manageDialog, ui.editCardDialog].some(dialog=>dialog?.open);
}
function isEditableShortcutTarget(target){
  if(target === ui.answerInput) return false;
  return !!target.closest("textarea, select, input");
}
function triggerRevealFromShortcut(){
  if(!currentCard || revealed) return;
  const info = revealAnswer();
  if(settings.typingMode && settings.autoRateTyping && info){
    const target = info.best || currentCard.accepted?.[0] || currentCard.back_plain || "";
    const wrong = wrongPercent(info.user, target);
    scheduleAutoAdvance(autoGradeFromWrong(wrong), {user_answer:info.user, matched_answer:target, wrong_percent:wrong});
  }
}

function startTimer(){
  stopTimer();
  const secs = Number(settings.perQuestionLimitSec) || 0;
  if(secs <= 0 || !currentCard) return;
  timerTotal = secs * 1000;
  timerDeadline = Date.now() + timerTotal;
  ui.timerWrap.classList.remove("hidden");

  function tick(){
    const left = Math.max(0, timerDeadline - Date.now());
    const pct = (left / timerTotal) * 100;
    ui.timerVal.textContent = `${Math.ceil(left/1000)}s`;
    ui.timerFill.style.width = `${pct}%`;
    ui.timerFill.className = "timer-fill" + (pct <= 20 ? " danger" : pct <= 50 ? " warn" : "");
    if(left <= 0){
      if(!revealed){
        revealAnswer();
        setStatus("Time is up. Rate the card to continue.");
      }
      return;
    }
    timerFrame = requestAnimationFrame(tick);
  }
  timerFrame = requestAnimationFrame(tick);
}
function stopTimer(){
  if(timerFrame){ cancelAnimationFrame(timerFrame); timerFrame = null; }
  ui.timerWrap.classList.add("hidden");
}

function showQuestion(card, sameCard=false){
  currentCard = card;
  renderMeta(card);
  if(!sameCard) resetRevealUI();
  ui.question.innerHTML = card.front_html || escapeHtml(card.front_plain || "");
  ui.inputRow.classList.toggle("hidden", !settings.typingMode);
  ui.answerInput.disabled = !settings.typingMode;
  ui.answerInput.value = sameCard ? ui.answerInput.value : "";
  ui.btnShowAnswer.classList.toggle("hidden", revealed);
  ui.btnEditCard.classList.remove("hidden");
  ui.btnDeleteCard.classList.remove("hidden");
  ui.btnEditAnswer.classList.toggle("hidden", !settings.typingMode || !revealed);
  ui.btnMic.classList.toggle("hidden", !settings.voiceEnabled || !settings.typingMode || !recognition);
  const sessionDeck = deckCache.find(deck=>deck.id === (activeSession?.deck_id || card.deck_id));
  ui.sessionLine.textContent = `Session: ${activeSession ? (activeSession.source === "custom" ? "Custom" : "Recommended") : "—"}${sessionDeck ? ` · ${sessionDeck.name}` : ""}`;
  if(settings.typingMode) ui.answerInput.focus();
  speakQuestion(card.spoken_front || card.front_plain || "");
  startTimer();
}

function levenshtein(a,b){
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if(!m) return n;
  if(!n) return m;
  const dp = Array.from({length:m+1}, (_,i)=>Array.from({length:n+1}, (_,j)=> i === 0 ? j : j === 0 ? i : 0));
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
}
function bestMatch(user, accepted){
  const list = (accepted || []).filter(Boolean);
  if(!list.length) return "";
  const exact = list.find(a => norm(a) === norm(user));
  if(exact) return exact;
  return list.reduce((best, cur)=>levenshtein(user,cur) < levenshtein(user,best) ? cur : best, list[0]);
}
function wrongPercent(user, target){
  const a = norm(user), b = norm(target);
  if(!a && !b) return 0;
  return clamp(Math.round((levenshtein(a,b) / Math.max(1, b.length)) * 100), 0, 100);
}
function autoGradeFromWrong(p){
  if(p <= 25) return 4;
  if(p <= 50) return 3;
  if(p <= 75) return 2;
  return 1;
}

function renderDiff(correctRaw, userRaw){
  const correct = norm(correctRaw), user = norm(userRaw);
  const parts = diffChars(correct, user, {ignoreCase:true});
  ui.diffBox.innerHTML = "";
  for(const part of parts){
    const span = document.createElement("span");
    span.className = part.removed ? "missing" : part.added ? "extra" : "same";
    span.textContent = part.value;
    ui.diffBox.appendChild(span);
  }
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.style.marginTop = "8px";
  hint.textContent = "Green = correct · red = missing · orange = extra";
  ui.diffBox.appendChild(hint);
  ui.diffBox.classList.remove("hidden");
}

function revealAnswer(){
  if(!currentCard || revealed) return null;
  revealed = true;
  stopTimer();
  ui.btnShowAnswer.classList.add("hidden");
  ui.btnEditAnswer.classList.toggle("hidden", !settings.typingMode);
  ui.answerInput.disabled = true;

  const user = settings.typingMode ? (ui.answerInput.value || "") : "";
  const best = bestMatch(user, currentCard.accepted || []);
  if(settings.typingMode && user.trim()) renderDiff(best || currentCard.back_plain || "", user);

  ui.answer.innerHTML = currentCard.back_html || escapeHtml(currentCard.back_plain || "");
  if(currentCard.explanation_html){
    ui.explanationSection.classList.remove("hidden");
    ui.explanation.innerHTML = currentCard.explanation_html;
  }
  for(const a of (currentCard.accepted || [])){
    const tag = document.createElement("span");
    tag.className = "acc-tag";
    tag.textContent = a;
    ui.acceptedList.appendChild(tag);
  }
  ui.revealBox.classList.remove("hidden");
  ui.ratings.classList.remove("hidden");
  return {user, best};
}

async function recordSessionCard(){
  if(!activeSession) return;
  const existing = await db.sessions.where("session_key").equals(activeSession.session_key).first();
  const now = Date.now();
  if(!existing){
    await db.sessions.add({
      session_key:activeSession.session_key,
      source:activeSession.source,
      day_key:dayKey(now),
      planned_ms:activeSession.planned_ms || now,
      deck_scope:lastDeckSignature,
      deck_id:activeSession.deck_id || currentCard?.deck_id || "",
      cards_reviewed:1,
      completed_ms:now
    });
  }else{
    await db.sessions.update(existing.id, {
      deck_id:existing.deck_id || activeSession.deck_id || currentCard?.deck_id || "",
      cards_reviewed:(existing.cards_reviewed || 0)+1,
      completed_ms:now
    });
  }
}

function scheduleAutoAdvance(gradeInt, meta, wrong){
  clearAutoAdvance();
  const delayMs = clamp(Number(settings.autoAdvanceDelaySec)||0, 0, 60) * 1000;
  const labels = ["","Again","Hard","Good","Easy"];
  setStatus(`Auto-rated ${labels[gradeInt]}${Number.isFinite(wrong) ? ` · ${wrong}% wrong` : ""}${delayMs ? ` · next in ${settings.autoAdvanceDelaySec}s` : ""}`);
  if(delayMs === 0){
    gradeCard(gradeInt, meta);
  }else{
    autoAdvanceTimer = setTimeout(()=>gradeCard(gradeInt, meta), delayMs);
  }
}

async function gradeCard(gradeInt, meta={}){
  if(!currentCard) return;
  clearAutoAdvance();
  const deck = decorateDeck(await db.decks.get(currentCard.deck_id));
  const scheduler = makeScheduler(deck);
  const rating = gradeInt === 1 ? Rating.Again : gradeInt === 2 ? Rating.Hard : gradeInt === 3 ? Rating.Good : Rating.Easy;
  const beforeCard = structuredClone(currentCard);
  const result = scheduler.next(currentCard.fsrs_card, new Date(), rating);
  let dueMs = result.card.due instanceof Date ? result.card.due.getTime() : Date.parse(result.card.due);
  dueMs = capDueToDeadline(dueMs, deck);
  const queueBucket = bucketForGrade(gradeInt);
  let reviewId = null;

  await db.transaction("rw", db.cards, db.reviews, async ()=>{
    await db.cards.update(currentCard.id, {fsrs_card:result.card, due_ms:dueMs, queue_bucket:queueBucket});
    reviewId = await db.reviews.add({
      card_id:currentCard.id, review_ms:Date.now(), rating:gradeInt,
      user_answer:meta.user_answer || "", matched_answer:meta.matched_answer || "", wrong_percent:meta.wrong_percent ?? null
    });
  });
  reviewUndoStack.push({
    beforeCard,
    afterCard:{...beforeCard, fsrs_card:result.card, due_ms:dueMs, queue_bucket:queueBucket},
    reviewId,
    meta:{...meta, rating:gradeInt}
  });
  reviewRedoStack = [];

  await recordSessionCard();
  await nextCard();
}

async function undoLastReview(){
  const entry = reviewUndoStack.pop();
  if(!entry) return;
  await db.transaction("rw", db.cards, db.reviews, async ()=>{
    await db.cards.put(entry.beforeCard);
    if(entry.reviewId != null) await db.reviews.delete(entry.reviewId);
  });
  reviewRedoStack.push(entry);
  currentCard = entry.beforeCard;
  activeSession = activeSession || {source:"custom", session_key:`custom-${Date.now()}`, planned_ms:Date.now(), deck_id:entry.beforeCard.deck_id};
  await buildQueue(activeSession?.source === "custom");
  const bucket = bucketForCard(entry.beforeCard);
  queueStats[bucket] = Math.max(0, (queueStats[bucket] || 0) - 1);
  showQuestion(entry.beforeCard);
  await refreshEverything();
}

async function redoLastReview(){
  const entry = reviewRedoStack.pop();
  if(!entry) return;
  let reviewId = null;
  await db.transaction("rw", db.cards, db.reviews, async ()=>{
    await db.cards.put(entry.afterCard);
    reviewId = await db.reviews.add({
      card_id:entry.afterCard.id,
      review_ms:Date.now(),
      rating:entry.meta.rating,
      user_answer:entry.meta.user_answer || "",
      matched_answer:entry.meta.matched_answer || "",
      wrong_percent:entry.meta.wrong_percent ?? null
    });
  });
  reviewUndoStack.push({...entry, reviewId});
  await nextCard();
}

// Restore missing helpers: openEditCard, saveCurrentCardEdits, refreshEverything
function openEditCard(){
  if(!currentCard) return;
  ui.editFront.value = currentCard.front_plain || "";
  ui.editBack.value = currentCard.back_plain || "";
  ui.editAccepted.value = (currentCard.accepted || []).join("; ");
  ui.editExplanation.value = (currentCard.explanation_html || "").replace(/<[^>]+>/g,"");
  ui.editCardDialog.showModal();
}

async function saveCurrentCardEdits(){
  if(!currentCard) return;
  const front = ui.editFront.value.trim();
  const back = ui.editBack.value.trim();
  const accepted = ui.editAccepted.value.split(";").map(s=>s.trim()).filter(Boolean);
  const explanation = ui.editExplanation.value.trim();
  await db.cards.update(currentCard.id, {
    front_plain:front, front_html:escapeHtml(front), spoken_front:front,
    back_plain:back, back_html:escapeHtml(back), accepted,
    explanation_html:explanation ? escapeHtml(explanation) : ""
  });
  ui.editCardDialog.close();
  const updated = await db.cards.get(currentCard.id);
  if(updated) showQuestion(updated);
  await refreshEverything();
}

async function refreshEverything(){
  try{
    deckCache = await getDecks();
    syncUI();
    if(typeof refreshStats === 'function') await refreshStats();
    if(typeof refreshProgress === 'function') await refreshProgress();
    if(typeof refreshPlan === 'function') await refreshPlan();
    if(typeof refreshDecksUI === 'function') await refreshDecksUI();
  }catch(err){ console.error('refreshEverything failed', err); }
}

// ...existing code...

window.addEventListener("keydown", async e=>{
  if(!currentCard || anyModalOpen()) return;
  if((e.key === " " || e.key === "Enter") && !isEditableShortcutTarget(e.target)){
    e.preventDefault();
    if(document.activeElement instanceof HTMLElement && document.activeElement.matches("button")) document.activeElement.blur();
    triggerRevealFromShortcut();
  }
  if(e.key === "ArrowLeft" && !isEditableShortcutTarget(e.target)){ e.preventDefault(); await undoLastReview(); }
  if(e.key === "ArrowRight" && !isEditableShortcutTarget(e.target)){ e.preventDefault(); await redoLastReview(); }
  if(["1","2","3","4"].includes(e.key) && !ui.ratings.classList.contains("hidden") && !isEditableShortcutTarget(e.target)){
    const user = settings.typingMode ? (ui.answerInput.value || "") : "";
    const matched = bestMatch(user, currentCard.accepted || []);
    const wrong = (settings.typingMode && user.trim()) ? wrongPercent(user, matched || currentCard.back_plain || "") : null;
    await handleGrade(Number(e.key), {user_answer:user, matched_answer:matched, wrong_percent:wrong});
  }
});

ui.csvFile.addEventListener("change", async e=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try{ await importCSV(file); } catch(err){ console.error(err); toast(`Import failed: ${err && err.message ? err.message : String(err)}`); }
  finally{ ui.csvFile.value = ""; }
});
document.addEventListener("click", e=>{
  const btn = e.target.closest("button");
  if(btn) requestAnimationFrame(()=>btn.blur());
});
ui.btnThemeQuick.addEventListener("click", ()=>{
  settings.theme = settings.theme === "dark" ? "light" : "dark";
  saveSettings(); syncUI();
});
ui.btnOptions.addEventListener("click", e=>{ e.stopPropagation(); ui.optionsPanel.classList.toggle("hidden"); });
document.addEventListener("click", e=>{ if(!e.target.closest(".dd-wrap")) ui.optionsPanel.classList.add("hidden"); });

ui.btnHelp.addEventListener("click", ()=>ui.helpDialog.showModal());
ui.btnCloseHelp.addEventListener("click", ()=>ui.helpDialog.close());
ui.btnShowPanels.addEventListener("click", ()=>{ settings.cardOnlyView = false; saveSettings(); syncUI(); });

ui.btnReset.addEventListener("click", async ()=>{
  if(!confirm("Delete all local decks, cards, and history?")) return;
  await db.delete();
  localStorage.removeItem(SETTINGS_KEY);
  location.reload();
});

ui.btnCustomSession.addEventListener("click", async ()=>{
  activeSession = {source:"custom", session_key:`custom-${Date.now()}`, planned_ms:Date.now()};
  await nextCard(true);
});

ui.btnMic.addEventListener("click", toggleMic);
ui.btnShowAnswer.addEventListener("click", triggerRevealFromShortcut);
ui.btnHistoryBack.addEventListener("click", undoLastReview);
ui.btnHistoryForward.addEventListener("click", redoLastReview);
ui.btnCalendarPrev.addEventListener("click", ()=>{ calendarCursor.setMonth(calendarCursor.getMonth() - 1); renderCalendar(lastPlan, deckCache.filter(deck=>deck.active !== false)); });
ui.btnCalendarNext.addEventListener("click", ()=>{ calendarCursor.setMonth(calendarCursor.getMonth() + 1); renderCalendar(lastPlan, deckCache.filter(deck=>deck.active !== false)); });
ui.btnEditAnswer.addEventListener("click", ()=>{
  clearAutoAdvance();
  ui.answerInput.disabled = false;
  ui.answerInput.focus();
  setStatus("Edit your answer, then reveal again or rate manually.");
});
ui.btnEditCard.addEventListener("click", openEditCard);
ui.btnDeleteCard.addEventListener("click", async ()=>{
  if(!currentCard) return;
  await deleteCards([currentCard.id]);
  currentCard = null;
  await refreshEverything();
  await nextCard();
});

ui.ratings.addEventListener("click", async e=>{
  const btn = e.target.closest("[data-grade]");
  if(!btn || !currentCard) return;
  const user = settings.typingMode ? (ui.answerInput.value || "") : "";
  const matched = bestMatch(user, currentCard.accepted || []);
  const wrong = (settings.typingMode && user.trim()) ? wrongPercent(user, matched || currentCard.back_plain || "") : null;
  await handleGrade(Number(btn.dataset.grade), {user_answer:user, matched_answer:matched, wrong_percent:wrong});
});

ui.answerInput.addEventListener("keydown", e=>{
  if(e.key !== "Enter") return;
  e.preventDefault();
  triggerRevealFromShortcut();
});

window.addEventListener("keydown", async e=>{
  if(!currentCard || anyModalOpen()) return;
  if((e.key === " " || e.key === "Enter") && !isEditableShortcutTarget(e.target)){
    e.preventDefault();
    if(document.activeElement instanceof HTMLElement && document.activeElement.matches("button")) document.activeElement.blur();
    triggerRevealFromShortcut();
  }
  if(e.key === "ArrowLeft" && !isEditableShortcutTarget(e.target)){ e.preventDefault(); await undoLastReview(); }
  if(e.key === "ArrowRight" && !isEditableShortcutTarget(e.target)){ e.preventDefault(); await redoLastReview(); }
  if(["1","2","3","4"].includes(e.key) && !ui.ratings.classList.contains("hidden") && !isEditableShortcutTarget(e.target)){
    const user = settings.typingMode ? (ui.answerInput.value || "") : "";
    const matched = bestMatch(user, currentCard.accepted || []);
    const wrong = (settings.typingMode && user.trim()) ? wrongPercent(user, matched || currentCard.back_plain || "") : null;
    await handleGrade(Number(e.key), {user_answer:user, matched_answer:matched, wrong_percent:wrong});
  }
});

ui.btnManageCards.addEventListener("click", openManageCards);
ui.btnCloseManage.addEventListener("click", ()=>ui.manageDialog.close());
ui.btnSelectAllCards.addEventListener("click", ()=>ui.manageCardList.querySelectorAll('input[type="checkbox"]').forEach(c=>c.checked = true));
ui.btnClearCardSelection.addEventListener("click", ()=>ui.manageCardList.querySelectorAll('input[type="checkbox"]').forEach(c=>c.checked = false));
ui.btnExportCardsCsv.addEventListener("click", async ()=>{
  const selected = [...ui.manageCardList.querySelectorAll('input[type="checkbox"]:checked')].map(el=>el.dataset.cardId);
  let cards;
  if(selected.length){
    cards = await Promise.all(selected.map(id=>db.cards.get(id)));
    cards = cards.filter(Boolean);
  }else{
    cards = await getSelectedDeckCards();
  }
  exportCardsCsv(cards, "flashflow-export.csv");
});
ui.btnDeleteSelectedCards.addEventListener("click", async ()=>{
  const ids = [...ui.manageCardList.querySelectorAll('input[type="checkbox"]:checked')].map(el=>el.dataset.cardId);
  await deleteCards(ids);
  ui.manageDialog.close();
  await refreshEverything();
  await openManageCards();
  await nextCard();
});
ui.btnCloseEditCard.addEventListener("click", ()=>ui.editCardDialog.close());
ui.btnSaveEditCard.addEventListener("click", saveCurrentCardEdits);

document.querySelectorAll(".collapse-btn").forEach(btn=>btn.addEventListener("click", ()=>{
  const panel = btn.closest("[data-panel-id]");
  const id = panel.dataset.panelId;
  settings.collapsed[id] = !settings.collapsed[id];
  saveSettings();
  applyPanelLayout();
}));

bindSettings();
loadSettings();
capStudyWindowEnd();
syncUI();
applyPanelLayout();
setupVoice();
await refreshEverything();

const existing = await db.cards.count();
if(existing){
  await nextCard();
}else{
  ui.inputRow.classList.toggle("hidden", !settings.typingMode);
}
