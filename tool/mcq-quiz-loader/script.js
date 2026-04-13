const SESSION_KEY = 'mcq-quiz-loader:session';

const UI = {
  file: document.getElementById('file'),
  loadBtn: document.getElementById('loadBtn'),
  submitBtn: document.getElementById('submitBtn'),
  retryBtn: document.getElementById('retryBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn'),
  reshuffleBtn: document.getElementById('reshuffleBtn'),
  prevSetBtn: document.getElementById('prevSetBtn'),
  nextSetBtn: document.getElementById('nextSetBtn'),
  setSelect: document.getElementById('setSelect'),
  setSummary: document.getElementById('setSummary'),
  setControls: document.getElementById('setControls'),
  exportScope: document.getElementById('exportScope'),
  exportRangeWrap: document.getElementById('exportRangeWrap'),
  exportSetStart: document.getElementById('exportSetStart'),
  exportSetEnd: document.getElementById('exportSetEnd'),
  exportFilename: document.getElementById('exportFilename'),
  downloadModal: document.getElementById('downloadModal'),
  displayMode: document.getElementById('displayMode'),
  splitBySet: document.getElementById('splitBySet'),
  shuffleQ: document.getElementById('shuffleQ'),
  shuffleC: document.getElementById('shuffleC'),
  showExp: document.getElementById('showExp'),
  requireAll: document.getElementById('requireAll'),
  limit: document.getElementById('limit'),
  bankTag: document.getElementById('bankTag'),
  modeTag: document.getElementById('modeTag'),
  poolTag: document.getElementById('poolTag'),
  countTag: document.getElementById('countTag'),
  ansTag: document.getElementById('ansTag'),
  pbar: document.getElementById('pbar'),
  pBoundaries: document.getElementById('pBoundaries'),
  pActiveSet: document.getElementById('pActiveSet'),
  quiz: document.getElementById('quiz'),
  results: document.getElementById('results'),
  scoreBig: document.getElementById('scoreBig'),
  scoreDetail: document.getElementById('scoreDetail'),
  scoreMsg: document.getElementById('scoreMsg'),
  wrongBlock: document.getElementById('wrongBlock'),
  wrongList: document.getElementById('wrongList'),
  toast: document.getElementById('toast'),
  fileNameDisplay: document.getElementById('fileNameDisplay'),
  filePlaceholder: document.getElementById('filePlaceholder'),
  reviewFilter: document.getElementById('reviewFilter'),
  reviewFilterWrap: document.getElementById('reviewFilterWrap'),
  btnCloseDownload: document.getElementById('btnCloseDownload'),
  btnCancelDownload: document.getElementById('btnCancelDownload'),
  btnConfirmDownload: document.getElementById('btnConfirmDownload'),
  helpModal: document.getElementById('helpModal'),
  guideModal: document.getElementById('guideModal'),
};

let bank = [];
let bankLabel = '';
let sets = [];
let pool = [];
let answers = new Map();
let choiceMaps = new Map();
let unitStates = new Map();
let currentSetIndex = 0;
let cursor = 0;
let toastTimer = null;
let pdfLoader = null;

function defaultUnitState() {
  return {
    submitted: false,
    wrongIDs: [],
    reviewFilter: 'all',
    retryMode: false,
    cursor: 0,
  };
}

function normalizeUnitState(raw = {}) {
  return {
    submitted: !!raw.submitted,
    wrongIDs: Array.isArray(raw.wrongIDs) ? [...new Set(raw.wrongIDs.map(String))] : [],
    reviewFilter: ['all', 'correct', 'incorrect', 'unanswered'].includes(raw.reviewFilter) ? raw.reviewFilter : 'all',
    retryMode: !!raw.retryMode,
    cursor: Number.isInteger(raw.cursor) && raw.cursor >= 0 ? raw.cursor : 0,
  };
}

function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  UI.toast.textContent = msg;
  UI.toast.className = 'toast show' + (type ? ' ' + type : '');
  toastTimer = setTimeout(() => {
    UI.toast.className = 'toast';
  }, 3000);
}

function updateFileNameDisplay(name = '') {
  if (name) {
    UI.fileNameDisplay.textContent = name;
    UI.fileNameDisplay.style.display = 'inline';
    UI.filePlaceholder.style.display = 'none';
  } else {
    UI.fileNameDisplay.style.display = 'none';
    UI.filePlaceholder.style.display = 'inline';
  }
}

UI.file.addEventListener('change', () => {
  updateFileNameDisplay(UI.file.files[0]?.name || '');
});

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function indexToLabel(index) {
  let n = Number(index);
  if (!Number.isInteger(n) || n < 0) return '';
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function labelToIndex(label) {
  const up = String(label || '').trim().toUpperCase();
  if (!/^[A-Z]+$/.test(up)) return null;
  let value = 0;
  for (const ch of up) value = value * 26 + (ch.charCodeAt(0) - 64);
  return value - 1;
}

function getChoiceEntries(row) {
  const lookup = new Map(
    Object.entries(row || {}).map(([key, value]) => [
      String(key || '').trim().toUpperCase(),
      String(value ?? ''),
    ]),
  );
  const entries = [];
  for (let i = 0; i < 702; i++) {
    const label = indexToLabel(i);
    if (!lookup.has(label)) break;
    const value = lookup.get(label);
    if (String(value).trim() !== '') entries.push({ label, value });
  }
  return entries;
}

function parseAnswer(val, choiceEntries = []) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const up = s.toUpperCase();
  const labeledIndex = choiceEntries.findIndex(entry => entry.label === up);
  if (labeledIndex !== -1) return labeledIndex;
  const num = parseInt(s, 10);
  if (!Number.isNaN(num)) {
    if (num === 0 && choiceEntries.length) return 0;
    if (num >= 1 && num <= choiceEntries.length) return num - 1;
    if (num >= 0 && num < choiceEntries.length) return num;
  }
  return null;
}

function normalizeRow(row, idx) {
  const id = (row.ID ?? row.Id ?? row.id ?? `q${idx + 1}`).toString().trim();
  const topic = (row.Topic ?? row.topic ?? 'General').toString().trim() || 'General';
  const diff = (row.Difficulty ?? row.diff ?? 'Medium').toString().trim() || 'Medium';
  const stem = (row.Stem ?? row.stem ?? '').toString().trim();
  const choiceEntries = getChoiceEntries(row);
  const choices = choiceEntries.map(entry => entry.value);
  const choiceLabels = choiceEntries.map(entry => entry.label);
  const ans = parseAnswer(row.Answer ?? row.answer ?? row.Correct ?? row.correct, choiceEntries);
  const explanation = (row.Explanation ?? row.explanation ?? '').toString();
  if (!stem || choices.length < 1 || ans === null) return null;
  return { id, topic, diff, stem, choices, choiceLabels, answer: ans, explanation };
}

function simpleCSVParse(text) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else if (ch === '\r') {
      } else field += ch;
    }
  }
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(x => String(x).trim() !== '')).map(r => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    return obj;
  });
}

function ensureSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load XLSX parser.'));
    document.head.appendChild(s);
  });
}

function ensureJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (pdfLoader) return pdfLoader;
  pdfLoader = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    s.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('PDF library loaded but did not initialize.'));
    };
    s.onerror = () => reject(new Error('Failed to load PDF exporter.'));
    document.head.appendChild(s);
  }).catch(err => {
    pdfLoader = null;
    throw err;
  });
  return pdfLoader;
}

async function loadBankFromFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return simpleCSVParse(text).map((r, i) => normalizeRow(r, i)).filter(Boolean);
  }
  if (name.endsWith('.xlsx')) {
    await ensureSheetJS();
    const data = await file.arrayBuffer();
    const wb = window.XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
    return raw.map((r, i) => normalizeRow(r, i)).filter(Boolean);
  }
  throw new Error('Unsupported file type. Use .xlsx or .csv');
}

function buildChoiceMap(q) {
  const idxs = q.choices.map((_, i) => i);
  if (UI.shuffleC.checked) shuffleArray(idxs);
  return idxs;
}

function diffClass(diff) {
  const d = diff.toLowerCase();
  if (d === 'easy' || d === 'low') return 'diff-easy';
  if (d === 'hard' || d === 'high') return 'diff-hard';
  return 'diff-med';
}

function safeFilename(base) {
  return (String(base || 'mcq-results').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'mcq-results');
}

function answerTextFor(q, idx) {
  if (idx === undefined || idx === null || idx < 0) return 'No answer selected';
  const label = q.choiceLabels?.[idx] || indexToLabel(idx);
  return `${label}. ${String(q.choices[idx] ?? '').trim()}`;
}

function getQuestionLimit() {
  let lim = parseInt(UI.limit.value, 10);
  if (Number.isNaN(lim) || lim < 1) lim = 1;
  const maxQuestions = Math.max(1, bank.length || 1);
  lim = clamp(lim, 1, maxQuestions);
  UI.limit.max = String(maxQuestions);
  UI.limit.value = String(lim);
  return lim;
}

function getBaseUnits() {
  if (!bank.length) return [];
  if (!UI.splitBySet.checked) {
    return [{ key: 'full', index: 0, title: 'Full bank', shortTitle: 'Full bank', start: 0, end: bank.length - 1, items: bank.slice() }];
  }
  const setSize = getQuestionLimit();
  const list = [];
  for (let start = 0, setIndex = 0; start < bank.length; start += setSize, setIndex++) {
    const end = Math.min(bank.length, start + setSize) - 1;
    list.push({ key: `set-${setIndex}`, index: setIndex, title: `Set ${setIndex + 1} of ${Math.ceil(bank.length / setSize)}`, shortTitle: `Set ${setIndex + 1}`, start, end, items: bank.slice(start, end + 1) });
  }
  return list;
}

function rebuildUnits({ resetStates = false } = {}) {
  const prev = unitStates;
  sets = getBaseUnits();
  const next = new Map();
  for (const unit of sets) {
    if (!resetStates && prev.has(unit.key)) next.set(unit.key, normalizeUnitState(prev.get(unit.key)));
    else next.set(unit.key, defaultUnitState());
  }
  unitStates = next;
  currentSetIndex = clamp(currentSetIndex, 0, Math.max(0, sets.length - 1));
  if (!UI.splitBySet.checked) currentSetIndex = 0;
}

function getCurrentUnit() {
  if (!sets.length) return null;
  return UI.splitBySet.checked ? sets[currentSetIndex] : sets[0];
}

function getUnitState(key) {
  if (!unitStates.has(key)) unitStates.set(key, defaultUnitState());
  return unitStates.get(key);
}

function getCurrentUnitState() {
  const unit = getCurrentUnit();
  return unit ? getUnitState(unit.key) : defaultUnitState();
}

function getUnitItems(unit) {
  if (!unit) return [];
  const state = getUnitState(unit.key);
  if (!state.retryMode) return unit.items;
  return unit.items.filter(q => state.wrongIDs.includes(q.id));
}

function getCurrentPool() {
  return getUnitItems(getCurrentUnit());
}

function getReviewState(q) {
  const chosen = answers.get(q.id);
  if (chosen === undefined) return 'unanswered';
  return chosen === q.answer ? 'correct' : 'incorrect';
}

function getReviewCounts(items = pool) {
  return {
    all: items.length,
    correct: items.filter(q => getReviewState(q) === 'correct').length,
    incorrect: items.filter(q => getReviewState(q) === 'incorrect').length,
    unanswered: items.filter(q => getReviewState(q) === 'unanswered').length,
  };
}

function getVisibleQuestions() {
  const state = getCurrentUnitState();
  if (!state.submitted) return pool;
  if (state.reviewFilter === 'all') return pool;
  return pool.filter(q => getReviewState(q) === state.reviewFilter);
}
function updateReviewFilterUI() {
  const state = getCurrentUnitState();
  const shouldShow = state.submitted && pool.length > 0;
  UI.reviewFilterWrap.classList.toggle('hidden', !shouldShow);
  if (!shouldShow) {
    UI.reviewFilter.value = 'all';
    return;
  }
  UI.reviewFilter.value = state.reviewFilter;
  const counts = getReviewCounts(pool);
  [...UI.reviewFilter.options].forEach(option => {
    const count = counts[option.value] ?? 0;
    option.disabled = option.value !== 'all' && count === 0;
  });
  if (UI.reviewFilter.value !== 'all' && (counts[UI.reviewFilter.value] ?? 0) === 0) {
    state.reviewFilter = 'all';
    UI.reviewFilter.value = 'all';
  }
}

function getFilteredEmptyMessage() {
  const labelMap = {
    correct: 'No correct questions in this attempt.',
    incorrect: 'No incorrect questions in this attempt.',
    unanswered: 'No missed or unanswered questions in this attempt.',
  };
  return labelMap[getCurrentUnitState().reviewFilter] || 'No questions match this filter.';
}

function updateProgressBar() {
  const answered = bank.filter(q => answers.has(q.id)).length;
  const pct = bank.length ? Math.round((100 * answered) / bank.length) : 0;
  UI.pbar.style.left = '0%';
  UI.pbar.style.width = `${pct}%`;

  const unit = getCurrentUnit();
  if (!UI.splitBySet.checked || sets.length <= 1 || !bank.length || !unit) {
    UI.pBoundaries.classList.add('hidden');
    UI.pBoundaries.innerHTML = '';
    UI.pActiveSet.classList.add('hidden');
    UI.pActiveSet.style.left = '0%';
    UI.pActiveSet.style.width = '0%';
    return;
  }

  UI.pBoundaries.classList.remove('hidden');
  UI.pBoundaries.innerHTML = '';
  for (let i = 1; i < sets.length; i++) {
    const marker = document.createElement('span');
    marker.style.left = `${(sets[i].start / bank.length) * 100}%`;
    UI.pBoundaries.appendChild(marker);
  }
  UI.pActiveSet.classList.remove('hidden');
  const unitLeft = (unit.start / bank.length) * 100;
  const unitWidth = ((unit.end - unit.start + 1) / bank.length) * 100;
  const answeredInUnit = unit.items.filter(q => answers.has(q.id)).length;
  const fillRatio = unit.items.length ? answeredInUnit / unit.items.length : 0;
  UI.pActiveSet.style.left = `${unitLeft}%`;
  UI.pActiveSet.style.width = `${unitWidth}%`;
  UI.pbar.style.left = `${unitLeft}%`;
  UI.pbar.style.width = `${unitWidth * fillRatio}%`;
}

function updateTop() {
  const display = UI.displayMode.value;
  const unit = getCurrentUnit();
  const state = getCurrentUnitState();
  const answeredInPool = pool.filter(q => answers.has(q.id)).length;

  UI.modeTag.textContent = display === 'one' ? 'One-by-one' : 'All at once';
  if (!unit) UI.poolTag.textContent = 'Full pool';
  else if (state.retryMode) UI.poolTag.textContent = `${unit.shortTitle} · Wrong only`;
  else UI.poolTag.textContent = UI.splitBySet.checked ? unit.shortTitle : 'Full pool';
  UI.countTag.textContent = `${pool.length} question${pool.length !== 1 ? 's' : ''}`;
  UI.ansTag.textContent = `${answeredInPool} answered`;
  [UI.bankTag, UI.modeTag, UI.poolTag, UI.countTag, UI.ansTag].forEach(el => {
    el.classList.toggle('active', bank.length > 0);
  });
  updateProgressBar();
}

function updateSetControlsUI() {
  const show = UI.splitBySet.checked && sets.length > 0;
  UI.setControls.classList.toggle('hidden', !show);
  if (!show) {
    UI.nextSetBtn.classList.remove('btn-advance-ready');
    return;
  }

  UI.setSelect.innerHTML = '';
  sets.forEach((unit, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = unit.shortTitle;
    if (idx === currentSetIndex) option.selected = true;
    UI.setSelect.appendChild(option);
  });

  const unit = getCurrentUnit();
  const state = getCurrentUnitState();
  UI.prevSetBtn.disabled = currentSetIndex <= 0;
  UI.nextSetBtn.disabled = currentSetIndex >= sets.length - 1;
  UI.nextSetBtn.classList.toggle('btn-advance-ready', state.submitted && currentSetIndex < sets.length - 1);
  UI.setSummary.textContent = unit ? `${unit.title} · Questions ${unit.start + 1}–${unit.end + 1}` : 'Set 1 of 1';
}

function updateRetryButtonUI() {
  const state = getCurrentUnitState();
  const hasWrong = state.wrongIDs.length > 0;
  UI.retryBtn.disabled = !bank.length || (!state.retryMode && !hasWrong);
  UI.retryBtn.innerHTML = state.retryMode
    ? 'Return to set'
    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>Retry Wrong`;
}

function updateReshuffleButtonUI() {
  UI.reshuffleBtn.disabled = !bank.length || !UI.shuffleQ.checked;
}

function updatePrimaryActionUI() {
  const state = getCurrentUnitState();
  const shouldHighlightSubmit = bank.length > 0 && pool.length > 0 && !state.submitted && !state.retryMode;
  UI.submitBtn.classList.toggle('btn-submit-ready', shouldHighlightSubmit);
}

function updateBankTag() {
  if (!bank.length) {
    UI.bankTag.innerHTML = '<div class="dot"></div>No bank loaded';
    return;
  }
  UI.bankTag.innerHTML = `<div class="dot"></div>${escHtml(bankLabel || 'Loaded bank')} (${bank.length})`;
}

function serializeSession() {
  return {
    bank,
    bankLabel,
    settings: {
      displayMode: UI.displayMode.value,
      shuffleQ: UI.shuffleQ.checked,
      shuffleC: UI.shuffleC.checked,
      showExp: UI.showExp.checked,
      requireAll: UI.requireAll.checked,
      limit: UI.limit.value,
      splitBySet: UI.splitBySet.checked,
      currentSetIndex,
      exportScope: UI.exportScope.value,
      exportSetStart: UI.exportSetStart.value,
      exportSetEnd: UI.exportSetEnd.value,
      exportFilename: UI.exportFilename.value,
    },
    answers: Array.from(answers.entries()),
    choiceMaps: Array.from(choiceMaps.entries()),
    unitStates: Object.fromEntries(Array.from(unitStates.entries())),
  };
}

function saveSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializeSession()));
  } catch (err) {
    console.error(err);
  }
}

function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    bank = Array.isArray(data.bank) ? data.bank : [];
    bankLabel = String(data.bankLabel || '');
    UI.displayMode.value = ['all', 'one'].includes(data.settings?.displayMode) ? data.settings.displayMode : 'all';
    UI.shuffleQ.checked = !!data.settings?.shuffleQ;
    UI.shuffleC.checked = data.settings?.shuffleC !== false;
    UI.showExp.checked = data.settings?.showExp !== false;
    UI.requireAll.checked = !!data.settings?.requireAll;
    UI.splitBySet.checked = !!data.settings?.splitBySet;
    UI.limit.value = String(data.settings?.limit || (bank.length || 50));
    UI.exportScope.value = ['current', 'full', 'range'].includes(data.settings?.exportScope) ? data.settings.exportScope : 'current';
    UI.exportSetStart.value = String(data.settings?.exportSetStart || '');
    UI.exportSetEnd.value = String(data.settings?.exportSetEnd || '');
    UI.exportFilename.value = String(data.settings?.exportFilename || '');
    currentSetIndex = Number.isInteger(data.settings?.currentSetIndex) ? data.settings.currentSetIndex : 0;
    answers = new Map(Array.isArray(data.answers) ? data.answers : []);
    choiceMaps = new Map(Array.isArray(data.choiceMaps) ? data.choiceMaps : []);
    unitStates = new Map(Object.entries(data.unitStates || {}).map(([key, value]) => [key, normalizeUnitState(value)]));
    updateFileNameDisplay(bankLabel);
    rebuildUnits({ resetStates: false });
    pool = getCurrentPool();
    cursor = getCurrentUnitState().cursor;
    return bank.length > 0;
  } catch (err) {
    console.error(err);
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function resetStructuralState({ preserveAnswers = true } = {}) {
  answers = preserveAnswers ? answers : new Map();
  choiceMaps = preserveAnswers ? choiceMaps : new Map();
  rebuildUnits({ resetStates: true });
  pool = getCurrentPool();
  const state = getCurrentUnitState();
  state.cursor = 0;
  cursor = 0;
}

function refreshDerivedState({ resetStates = false } = {}) {
  rebuildUnits({ resetStates });
  pool = getCurrentPool();
  cursor = getCurrentUnitState().cursor;
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function renderQuestion(q, index, total, single) {
  const card = document.createElement('div');
  card.className = 'qcard';
  card.id = `card_${q.id}`;

  const meta = document.createElement('div');
  meta.className = 'q-meta';
  meta.innerHTML = `<span class="q-tag num">Q${index + 1} / ${total}</span><span class="q-tag">${q.topic}</span><span class="q-tag ${diffClass(q.diff)}">${q.diff}</span>`;

  const stem = document.createElement('div');
  stem.className = 'q-stem';
  stem.textContent = q.stem;

  const choicesDiv = document.createElement('div');
  choicesDiv.className = 'choices';
  if (!choiceMaps.has(q.id)) choiceMaps.set(q.id, buildChoiceMap(q));
  const map = choiceMaps.get(q.id);

  map.forEach((origIdx, dispIdx) => {
    const txt = q.choices[origIdx];
    const label = document.createElement('label');
    label.className = 'choice-label';
    label.htmlFor = `${q.id}_${dispIdx}`;
    const checked = answers.get(q.id) === origIdx;
    if (checked) label.classList.add('selected');
    label.innerHTML = `
      <input type="radio" name="${q.id}" id="${q.id}_${dispIdx}" value="${dispIdx}" ${checked ? 'checked' : ''} ${getCurrentUnitState().submitted ? 'disabled' : ''}>
      <div class="choice-letter">${q.choiceLabels?.[origIdx] || indexToLabel(dispIdx)}</div>
      <div class="choice-text">${escHtml(String(txt))}</div>`;
    choicesDiv.appendChild(label);
  });

  choicesDiv.addEventListener('click', e => {
    if (getCurrentUnitState().submitted) return;
    const label = e.target.closest('.choice-label');
    if (!label) return;
    const input = label.querySelector(`input[name="${q.id}"]`);
    if (!input) return;
    const dispIdx = parseInt(input.value, 10);
    const origIdx = map[dispIdx];
    if (answers.get(q.id) !== origIdx) return;
    e.preventDefault();
    input.checked = false;
    answers.delete(q.id);
    card.querySelectorAll('.choice-label').forEach(l => l.classList.remove('selected'));
    updateTop();
    saveSession();
  });

  choicesDiv.addEventListener('change', () => {
    if (getCurrentUnitState().submitted) return;
    const sel = card.querySelector(`input[name="${q.id}"]:checked`);
    if (!sel) return;
    const dispIdx = parseInt(sel.value, 10);
    const origIdx = map[dispIdx];
    answers.set(q.id, origIdx);
    card.querySelectorAll('.choice-label').forEach(l => l.classList.remove('selected'));
    sel.closest('.choice-label').classList.add('selected');
    updateTop();
    saveSession();
  });

  const explain = document.createElement('div');
  explain.className = 'explanation';
  explain.id = `exp_${q.id}`;

  card.appendChild(meta);
  card.appendChild(stem);
  card.appendChild(choicesDiv);

  if (single) {
    const nav = document.createElement('div');
    nav.className = 'q-nav';

    const prev = document.createElement('button');
    prev.className = 'btn btn-ghost';
    prev.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Prev`;
    prev.disabled = cursor === 0;
    prev.onclick = () => {
      const state = getCurrentUnitState();
      state.cursor = clamp(state.cursor - 1, 0, total - 1);
      render();
    };

    const progressTxt = document.createElement('span');
    progressTxt.className = 'q-progress-text';
    const answered = pool.filter(item => answers.has(item.id)).length;
    progressTxt.textContent = `${answered} of ${total} answered`;

    const next = document.createElement('button');
    next.className = 'btn btn-ghost';
    next.innerHTML = `Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
    next.disabled = cursor === total - 1;
    next.onclick = () => {
      const state = getCurrentUnitState();
      state.cursor = clamp(state.cursor + 1, 0, total - 1);
      render();
    };

    nav.appendChild(prev);
    nav.appendChild(progressTxt);
    nav.appendChild(next);
    card.appendChild(nav);
  }

  card.appendChild(explain);
  return card;
}

function applyFeedback() {
  const state = getCurrentUnitState();
  const wrong = new Set();
  pool.forEach(q => {
    const card = document.getElementById(`card_${q.id}`);
    if (!card) return;
    const labels = card.querySelectorAll('.choice-label');
    labels.forEach(l => l.classList.remove('correct', 'wrong'));

    const map = choiceMaps.get(q.id) || buildChoiceMap(q);
    const chosen = answers.get(q.id);
    const correct = q.answer;
    const exp = document.getElementById(`exp_${q.id}`);

    if (chosen === undefined) {
      wrong.add(q.id);
      if (UI.showExp.checked && exp) {
        exp.style.display = 'block';
        exp.className = 'explanation wrong-exp';
        exp.innerHTML = `<div class="exp-label" style="color:var(--amber)">Not answered</div>${escHtml(q.explanation) || 'No explanation provided.'}`;
      }
      return;
    }

    const chosenDisp = map.indexOf(chosen);
    const correctDisp = map.indexOf(correct);
    const chosenLabel = card.querySelector(`label[for="${q.id}_${chosenDisp}"]`);
    const correctLabel = card.querySelector(`label[for="${q.id}_${correctDisp}"]`);

    if (chosen === correct) {
      if (chosenLabel) chosenLabel.classList.add('correct');
      if (UI.showExp.checked && exp) {
        exp.style.display = 'block';
        exp.className = 'explanation correct-exp';
        exp.innerHTML = `<div class="exp-label" style="color:var(--green)">Correct ✓</div>${escHtml(q.explanation) || 'No explanation provided.'}`;
      }
    } else {
      wrong.add(q.id);
      if (chosenLabel) chosenLabel.classList.add('wrong');
      if (correctLabel) correctLabel.classList.add('correct');
      if (UI.showExp.checked && exp) {
        exp.style.display = 'block';
        exp.className = 'explanation wrong-exp';
        exp.innerHTML = `<div class="exp-label" style="color:var(--red)">Incorrect ✗</div><div style="margin-bottom:6px;font-size:12px;color:var(--text-3)">Correct answer: <b style="color:var(--text)">${escHtml(q.choices[correct])}</b></div>${escHtml(q.explanation) || 'No explanation provided.'}`;
      }
    }
  });
  state.wrongIDs = Array.from(wrong);
  updateRetryButtonUI();
}

function showResults() {
  const state = getCurrentUnitState();
  const total = pool.length;
  const correct = pool.filter(q => answers.get(q.id) === q.answer).length;
  const pct = total ? Math.round((100 * correct) / total) : 0;

  UI.scoreBig.textContent = `${pct}%`;
  UI.scoreDetail.textContent = `${correct} correct out of ${total}`;
  UI.scoreMsg.textContent = pct >= 90
    ? 'Excellent work. Consider reshuffling or moving to the next set.'
    : pct >= 75
      ? 'Good progress. Hit Retry Wrong to master weak spots.'
      : 'Keep going. Review explanations and retry the ones you missed.';

  UI.wrongList.innerHTML = '';
  if (state.wrongIDs.length) {
    UI.wrongBlock.classList.remove('hidden');
    state.wrongIDs.forEach(id => {
      const q = pool.find(item => item.id === id) || bank.find(item => item.id === id);
      const li = document.createElement('li');
      li.textContent = q ? q.stem : id;
      UI.wrongList.appendChild(li);
    });
  } else {
    UI.wrongBlock.classList.add('hidden');
  }

  UI.downloadBtn.disabled = false;
  UI.results.style.display = 'block';
}

function render() {
  pool = getCurrentPool();
  const state = getCurrentUnitState();
  cursor = clamp(state.cursor, 0, Math.max(0, getVisibleQuestions().length - 1));
  state.cursor = cursor;

  UI.quiz.innerHTML = '';
  UI.results.style.display = 'none';
  updateBankTag();
  updateSetControlsUI();
  updateReviewFilterUI();
  updateRetryButtonUI();
  updateReshuffleButtonUI();
  updatePrimaryActionUI();

  if (!bank.length) {
    UI.quiz.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3>No question bank loaded</h3>
        <p>Choose an XLSX or CSV file above and click <strong>Load Bank</strong> to begin.</p>
      </div>`;
    UI.submitBtn.disabled = true;
    UI.downloadBtn.disabled = true;
    updateTop();
    saveSession();
    return;
  }

  const visiblePool = getVisibleQuestions();
  const display = UI.displayMode.value;
  if (!visiblePool.length) {
    UI.quiz.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8"></circle><path d="M9.5 9.5h.01M14.5 9.5h.01M9 15c.9-.9 1.9-1.4 3-1.4 1.1 0 2.1.5 3 1.4"></path>
          </svg>
        </div>
        <h3>Nothing to show</h3>
        <p>${state.retryMode ? 'This retry pool is empty. Return to the full set or continue to another set.' : getFilteredEmptyMessage()}</p>
      </div>`;
    updateTop();
    if (state.submitted) {
      applyFeedback();
      showResults();
    }
    saveSession();
    return;
  }

  if (display === 'one') {
    state.cursor = clamp(state.cursor, 0, visiblePool.length - 1);
    cursor = state.cursor;
    UI.quiz.appendChild(renderQuestion(visiblePool[cursor], cursor, visiblePool.length, true));
  } else {
    visiblePool.forEach((q, i) => UI.quiz.appendChild(renderQuestion(q, i, visiblePool.length, false)));
  }

  UI.submitBtn.disabled = false;
  UI.downloadBtn.disabled = !state.submitted;
  updateTop();
  if (state.submitted) {
    applyFeedback();
    showResults();
  }
  saveSession();
}
function getExportUnits() {
  if (UI.splitBySet.checked && UI.exportScope.value === 'full') return sets;
  if (UI.splitBySet.checked && UI.exportScope.value === 'range') {
    const start = clamp(parseInt(UI.exportSetStart.value, 10) || 0, 0, Math.max(0, sets.length - 1));
    const end = clamp(parseInt(UI.exportSetEnd.value, 10) || start, start, Math.max(0, sets.length - 1));
    return sets.slice(start, end + 1);
  }
  const current = getCurrentUnit();
  return current ? [current] : [];
}

function getDefaultExportFilename() {
  const base = safeFilename(bankLabel || 'mcq-results');
  if (!UI.splitBySet.checked || UI.exportScope.value === 'full') return base;
  const unit = getCurrentUnit();
  if (UI.exportScope.value === 'range') {
    const start = clamp(parseInt(UI.exportSetStart.value, 10) || 0, 0, Math.max(0, sets.length - 1));
    const end = clamp(parseInt(UI.exportSetEnd.value, 10) || start, start, Math.max(0, sets.length - 1));
    return `${base}-set-${start + 1}-to-${end + 1}`;
  }
  return unit ? `${base}-${safeFilename(unit.shortTitle || 'current-set')}` : base;
}

function updateDownloadModalUI() {
  const splitEnabled = UI.splitBySet.checked && sets.length > 1;
  const rangeOption = [...UI.exportScope.options].find(option => option.value === 'range');
  if (rangeOption) rangeOption.disabled = !splitEnabled;
  if (!splitEnabled && UI.exportScope.value === 'range') {
    UI.exportScope.value = 'current';
  }

  UI.exportRangeWrap.classList.toggle('hidden', !(splitEnabled && UI.exportScope.value === 'range'));
  if (!splitEnabled) return;

  const startIndex = clamp(parseInt(UI.exportSetStart.value, 10) || currentSetIndex, 0, Math.max(0, sets.length - 1));
  const endIndex = clamp(parseInt(UI.exportSetEnd.value, 10) || startIndex, startIndex, Math.max(0, sets.length - 1));

  UI.exportSetStart.innerHTML = '';
  UI.exportSetEnd.innerHTML = '';
  sets.forEach((unit, idx) => {
    const startOption = document.createElement('option');
    startOption.value = String(idx);
    startOption.textContent = unit.shortTitle;
    if (idx === startIndex) startOption.selected = true;
    UI.exportSetStart.appendChild(startOption);

    const endOption = document.createElement('option');
    endOption.value = String(idx);
    endOption.textContent = unit.shortTitle;
    if (idx === endIndex) endOption.selected = true;
    UI.exportSetEnd.appendChild(endOption);
  });

  if (parseInt(UI.exportSetEnd.value, 10) < parseInt(UI.exportSetStart.value, 10)) {
    UI.exportSetEnd.value = UI.exportSetStart.value;
  }
}

function openDownloadModal() {
  const currentState = getCurrentUnitState();
  if (!bank.length || !currentState.submitted) {
    showToast('Submit the current bank or set first before downloading results.', 'error');
    return;
  }
  updateDownloadModalUI();
  if (!UI.exportFilename.value.trim()) {
    UI.exportFilename.value = getDefaultExportFilename();
  }
  openModal('downloadModal');
  requestAnimationFrame(() => {
    UI.exportFilename.focus();
    UI.exportFilename.select();
  });
}

async function downloadResultsPdf() {
  const currentState = getCurrentUnitState();
  if (!bank.length || (!currentState.submitted && UI.exportScope.value === 'current')) {
    showToast('Submit the current bank or set first before downloading results.', 'error');
    return;
  }
  const previewWindow = window.open('', '_blank');
  if (previewWindow) previewWindow.opener = null;
  const originalLabel = UI.downloadBtn.innerHTML;
  UI.downloadBtn.disabled = true;
  UI.downloadBtn.textContent = 'Preparing PDF…';
  try {
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    const maxWidth = pageWidth - margin * 2;
    const lineGap = 16;
    const blockGap = 12;
    let y = margin;

    const colors = {
      title: [14, 29, 46],
      body: [46, 69, 92],
      muted: [94, 113, 138],
      teal: [24, 140, 126],
      green: [38, 166, 91],
      red: [220, 80, 86],
      amber: [193, 132, 26],
    };

    function ensureSpace(heightNeeded = 40) {
      if (y + heightNeeded <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    }

    function writeWrapped(text, opts = {}) {
      const { size = 11, color = colors.body, style = 'normal', gap = lineGap } = opts;
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), maxWidth);
      const height = Math.max(gap, lines.length * (size + 3));
      ensureSpace(height + 4);
      doc.text(lines, margin, y);
      y += height;
    }

    function writeRule() {
      ensureSpace(10);
      doc.setDrawColor(220, 227, 236);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    }

    const exportUnits = getExportUnits();
    const allItems = exportUnits.flatMap(unit => unit.items);
    const correctCount = allItems.filter(q => getReviewState(q) === 'correct').length;
    const incorrectCount = allItems.filter(q => getReviewState(q) === 'incorrect').length;
    const unansweredCount = allItems.filter(q => getReviewState(q) === 'unanswered').length;
    const pct = allItems.length ? Math.round((100 * correctCount) / allItems.length) : 0;
    const exportName = safeFilename(UI.exportFilename.value.trim() || getDefaultExportFilename());

    doc.setProperties({
      title: `${exportName}-results`,
      subject: 'MCQ Quiz Loader Results',
    });

    writeWrapped('MCQ Quiz Loader Results', { size: 20, style: 'bold', color: colors.title, gap: 24 });
    writeWrapped(bankLabel || 'Loaded bank', { size: 11, color: colors.teal, style: 'bold' });
    writeWrapped(`Score: ${pct}% · ${correctCount} correct out of ${allItems.length}`, { size: 11, style: 'bold' });
    writeWrapped(`Correct: ${correctCount} · Incorrect: ${incorrectCount} · Missed / unanswered: ${unansweredCount}`, { size: 10, color: colors.muted });
    writeWrapped(`Generated: ${new Date().toLocaleString()}`, { size: 10, color: colors.muted });
    writeRule();

    for (const unit of exportUnits) {
      const unitItems = unit.items;
      const groups = {
        correct: unitItems.filter(q => getReviewState(q) === 'correct'),
        incorrect: unitItems.filter(q => getReviewState(q) === 'incorrect'),
        unanswered: unitItems.filter(q => getReviewState(q) === 'unanswered'),
      };
      writeWrapped(unit.title, { size: 15, style: 'bold', color: colors.teal, gap: 20 });

      const sectionConfigs = [
        ['Correct Answers', groups.correct, colors.green],
        ['Incorrect Answers', groups.incorrect, colors.red],
        ['Missed / Unanswered', groups.unanswered, colors.amber],
      ];

      sectionConfigs.forEach(([title, items, color]) => {
        writeWrapped(`${title} (${items.length})`, { size: 13, style: 'bold', color, gap: 18 });
        if (!items.length) {
          writeWrapped('None in this category.', { size: 10, color: colors.muted });
          return;
        }
        items.forEach((q, index) => {
          const chosen = answers.get(q.id);
          writeWrapped(`${index + 1}. ${q.stem}`, { size: 12, style: 'bold', color: colors.title, gap: 18 });
          writeWrapped(`Your answer: ${answerTextFor(q, chosen)}`, { size: 10 });
          writeWrapped(`Correct answer: ${answerTextFor(q, q.answer)}`, { size: 10, style: 'bold' });
          if (q.explanation) writeWrapped(`Explanation: ${q.explanation}`, { size: 10, color: colors.body });
          y += 2;
          writeRule();
        });
      });
      y += blockGap;
    }

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    if (previewWindow) {
      previewWindow.location.href = pdfUrl;
    } else {
      window.open(pdfUrl, '_blank');
    }
    closeModal('downloadModal');
    showToast('Results PDF opened in a new tab.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Could not generate the PDF right now.', 'error');
  } finally {
    UI.downloadBtn.innerHTML = originalLabel;
    UI.downloadBtn.disabled = !getCurrentUnitState().submitted;
  }
}

function buildBankSession({ resetStates = false } = {}) {
  refreshDerivedState({ resetStates });
  render();
}

async function onLoad() {
  const file = UI.file.files[0];
  if (!file) {
    showToast('Choose a .xlsx or .csv file first.', 'error');
    return;
  }
  UI.loadBtn.disabled = true;
  UI.loadBtn.textContent = 'Loading…';
  try {
    const loaded = await loadBankFromFile(file);
    if (!loaded.length) {
      showToast('No valid questions found — check column names.', 'error');
      return;
    }
    bank = loaded;
    bankLabel = file.name;
    updateFileNameDisplay(bankLabel);
    UI.limit.max = String(Math.max(1, loaded.length));
    UI.limit.value = String(Math.max(1, loaded.length));
    currentSetIndex = 0;
    answers = new Map();
    choiceMaps = new Map();
    buildBankSession({ resetStates: true });
    showToast(`Loaded ${loaded.length} questions successfully.`, 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message, 'error');
  } finally {
    UI.loadBtn.disabled = false;
    UI.loadBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> Load Bank`;
  }
}

function onSubmit() {
  if (!pool.length) return;
  if (UI.requireAll.checked) {
    const unanswered = pool.filter(q => answers.get(q.id) === undefined);
    if (unanswered.length) {
      showToast(`${unanswered.length} question(s) still unanswered.`, 'error');
      return;
    }
  }
  const state = getCurrentUnitState();
  state.submitted = true;
  state.reviewFilter = 'all';
  applyFeedback();
  showResults();
  render();
}

function toggleRetryMode() {
  const state = getCurrentUnitState();
  if (state.retryMode) {
    state.retryMode = false;
    state.cursor = 0;
    render();
    return;
  }
  if (!state.wrongIDs.length) {
    showToast('No missed questions to retry in this bank or set.', 'error');
    return;
  }
  state.retryMode = true;
  state.submitted = false;
  state.reviewFilter = 'all';
  state.cursor = 0;
  render();
}

function reshuffleBank() {
  if (!bank.length) {
    showToast('Load a bank first before reshuffling.', 'error');
    return;
  }
  if (!UI.shuffleQ.checked) {
    showToast('Turn on Shuffle questions first.', 'error');
    return;
  }
  if (UI.splitBySet.checked) {
    const unit = getCurrentUnit();
    if (!unit || !unit.items.length) {
      showToast('No current set to reshuffle.', 'error');
      return;
    }
    const shuffledItems = unit.items.slice();
    shuffleArray(shuffledItems);
    bank.splice(unit.start, shuffledItems.length, ...shuffledItems);
    refreshDerivedState({ resetStates: false });
    render();
    showToast('Current set reshuffled.', 'success');
    return;
  }

  shuffleArray(bank);
  resetStructuralState({ preserveAnswers: true });
  render();
  showToast('Question bank reshuffled.', 'success');
}

function onReset() {
  bank = [];
  bankLabel = '';
  sets = [];
  pool = [];
  answers = new Map();
  choiceMaps = new Map();
  unitStates = new Map();
  currentSetIndex = 0;
  cursor = 0;
  UI.displayMode.value = 'all';
  UI.splitBySet.checked = false;
  UI.shuffleQ.checked = false;
  UI.shuffleC.checked = true;
  UI.showExp.checked = true;
  UI.requireAll.checked = false;
  UI.exportScope.value = 'current';
  UI.exportSetStart.value = '';
  UI.exportSetEnd.value = '';
  UI.exportFilename.value = '';
  UI.limit.value = '50';
  UI.limit.max = '500';
  UI.reviewFilter.value = 'all';
  UI.submitBtn.disabled = true;
  UI.retryBtn.disabled = true;
  UI.downloadBtn.disabled = true;
  updateFileNameDisplay('');
  updateBankTag();
  UI.file.value = '';
  clearSession();
  render();
  showToast('Quiz reset.');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal.show')) document.body.style.overflow = '';
}

async function copyPrompt(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  try {
    await navigator.clipboard.writeText(el.value);
    showToast('Prompt copied.', 'success');
  } catch {
    el.select();
    document.execCommand('copy');
    showToast('Prompt copied.', 'success');
  }
}
UI.loadBtn.addEventListener('click', onLoad);
UI.submitBtn.addEventListener('click', onSubmit);
UI.retryBtn.addEventListener('click', toggleRetryMode);
UI.downloadBtn.addEventListener('click', openDownloadModal);
UI.resetBtn.addEventListener('click', onReset);
UI.reshuffleBtn.addEventListener('click', reshuffleBank);

UI.displayMode.addEventListener('change', render);
UI.shuffleQ.addEventListener('change', () => {
  updateReshuffleButtonUI();
  saveSession();
});
UI.shuffleC.addEventListener('change', () => {
  choiceMaps = new Map();
  render();
});
UI.showExp.addEventListener('change', render);
UI.requireAll.addEventListener('change', saveSession);
UI.limit.addEventListener('change', () => {
  if (!bank.length) return;
  resetStructuralState({ preserveAnswers: true });
  render();
});
UI.splitBySet.addEventListener('change', () => {
  currentSetIndex = 0;
  resetStructuralState({ preserveAnswers: true });
  render();
});
UI.setSelect.addEventListener('change', () => {
  currentSetIndex = clamp(parseInt(UI.setSelect.value, 10) || 0, 0, Math.max(0, sets.length - 1));
  render();
});
UI.prevSetBtn.addEventListener('click', () => {
  currentSetIndex = clamp(currentSetIndex - 1, 0, Math.max(0, sets.length - 1));
  render();
});
UI.nextSetBtn.addEventListener('click', () => {
  currentSetIndex = clamp(currentSetIndex + 1, 0, Math.max(0, sets.length - 1));
  render();
});
UI.exportScope.addEventListener('change', saveSession);
UI.exportScope.addEventListener('change', () => {
  updateDownloadModalUI();
  if (!UI.exportFilename.value.trim() || UI.exportFilename.value === getDefaultExportFilename()) {
    UI.exportFilename.value = getDefaultExportFilename();
  }
  saveSession();
});
UI.exportSetStart.addEventListener('change', () => {
  if (parseInt(UI.exportSetEnd.value, 10) < parseInt(UI.exportSetStart.value, 10)) {
    UI.exportSetEnd.value = UI.exportSetStart.value;
  }
  if (!UI.exportFilename.value.trim()) {
    UI.exportFilename.value = getDefaultExportFilename();
  }
  saveSession();
});
UI.exportSetEnd.addEventListener('change', () => {
  if (parseInt(UI.exportSetEnd.value, 10) < parseInt(UI.exportSetStart.value, 10)) {
    UI.exportSetStart.value = UI.exportSetEnd.value;
  }
  if (!UI.exportFilename.value.trim()) {
    UI.exportFilename.value = getDefaultExportFilename();
  }
  saveSession();
});
UI.exportFilename.addEventListener('input', saveSession);

UI.reviewFilter.addEventListener('change', () => {
  const state = getCurrentUnitState();
  const counts = getReviewCounts(pool);
  const selected = UI.reviewFilter.value;
  if (state.submitted && selected !== 'all' && (counts[selected] ?? 0) === 0) {
    showToast(getFilteredEmptyMessage() + ' Showing all questions instead.', 'error');
    state.reviewFilter = 'all';
    UI.reviewFilter.value = 'all';
  } else {
    state.reviewFilter = selected;
  }
  render();
});

document.getElementById('btnHelp').addEventListener('click', () => openModal('helpModal'));
document.getElementById('btnGuide').addEventListener('click', () => openModal('guideModal'));
UI.btnConfirmDownload.addEventListener('click', downloadResultsPdf);
UI.btnCloseDownload.addEventListener('click', () => closeModal('downloadModal'));
UI.btnCancelDownload.addEventListener('click', () => closeModal('downloadModal'));
document.getElementById('btnCloseHelp').addEventListener('click', () => closeModal('helpModal'));
document.getElementById('btnCloseGuide').addEventListener('click', () => closeModal('guideModal'));
document.querySelectorAll('[data-close-modal]').forEach(node => {
  node.addEventListener('click', () => closeModal(node.getAttribute('data-close-modal')));
});
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => copyPrompt(btn.getAttribute('data-copy-target')));
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeModal('downloadModal');
  closeModal('helpModal');
  closeModal('guideModal');
});

restoreSession();
render();
