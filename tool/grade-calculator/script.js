(function(){
  const TERMS = ["prelims","midterms","finals"];
  const STORAGE_KEY = "grade_calc_v4";
  const SETUP_LONG_PRESS_MS = 280;

  const uid = () => Math.random().toString(36).slice(2,10) + "_" + Date.now().toString(36);
  const clamp = (x,a,b) => Math.min(b, Math.max(a, x));
  const num = (x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };
  const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
  const $ = (id) => document.getElementById(id);
  const setupSort = {
    holdTimer: null,
    candidate: null,
    active: null
  };
  const subjectSort = {
    active: null,
    justSorted: false
  };

  function toast(msg, type='') {
    const t = document.createElement('div');
    t.className = 'toast';
    if (type === 'danger') t.style.background = 'var(--red)';
    if (type === 'success') t.style.background = '#16a34a';
    t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2400);
    setTimeout(() => t.remove(), 2700);
  }

  function defaultSubject(name="Example Subject"){
    const cs = uid(), ex = uid();
    const q = uid(), hw = uid(), att = uid();

    const cats = [
      { id: cs, name:"Class Standing", weight:50, children:[
        { id:q,   name:"Written Quizzes", weight:30, children:null },
        { id:hw,  name:"Homework / Problem Set", weight:15, children:null },
        { id:att, name:"Class Participation / Attendance", weight:5, children:null },
      ]},
      { id: ex, name:"Exam", weight:50, children:null }
    ];

    const leafGrid = {};
    for (const leaf of getLeafNodes(cats)) {
      leafGrid[leaf.id] = { cols:10, prelims:makeGrid(10), midterms:makeGrid(10), finals:makeGrid(10) };
    }

    return {
      id: uid(),
      name,
      base: 40,
      cap100: true,
      categories: cats,
      leafGrid,
      goal: {
        targetFinal:null,
        usePrelims:"computed",
        prelimsCustom:null,
        useMidterms:"computed",
        midtermsCustom:null
      }
    };
  }

  function makeGrid(cols){
    return { max:Array(cols).fill(null), score:Array(cols).fill(null) };
  }

  function deepClone(x){
    return JSON.parse(JSON.stringify(x));
  }

  function getLeafNodes(nodes){
    const out = [];
    (function walk(arr){
      for (const n of arr){
        if (n.children && n.children.length) walk(n.children);
        else out.push(n);
      }
    })(nodes);
    return out;
  }

  function findNodeById(nodes, targetId){
    for (const node of nodes || []){
      if (node.id === targetId) return node;
      if (node.children){
        const found = findNodeById(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  function getSiblingList(subject, parentId){
    if (!parentId) return subject.categories;
    const parentNode = findNodeById(subject.categories, parentId);
    return parentNode && Array.isArray(parentNode.children) ? parentNode.children : null;
  }

  function clearSubjectDropIndicators(){
    elSubjectList.querySelectorAll('.subject-item.drop-before, .subject-item.drop-after, .subject-item.drag-source').forEach(item=>{
      item.classList.remove('drop-before', 'drop-after', 'drag-source');
    });
  }

  function updateSubjectGhostPosition(clientX, clientY){
    if (!subjectSort.active?.ghost) return;
    subjectSort.active.ghost.style.left = `${clientX + 12}px`;
    subjectSort.active.ghost.style.top = `${clientY + 12}px`;
  }

  function cleanupSubjectSort(){
    clearSubjectDropIndicators();
    if (subjectSort.active?.ghost?.isConnected){
      subjectSort.active.ghost.remove();
    }
    subjectSort.active = null;
    document.body.style.userSelect = '';
  }

  function updateSubjectSortTarget(clientX, clientY){
    if (!subjectSort.active) return;

    clearSubjectDropIndicators();
    subjectSort.active.sourceEl.classList.add('drag-source');

    const hovered = document.elementFromPoint(clientX, clientY)?.closest('.subject-item');
    if (!hovered || hovered === subjectSort.active.sourceEl){
      subjectSort.active.targetId = null;
      subjectSort.active.position = null;
      return;
    }

    const rect = hovered.getBoundingClientRect();
    const position = clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    hovered.classList.add(position === 'before' ? 'drop-before' : 'drop-after');
    subjectSort.active.targetId = hovered.dataset.sid;
    subjectSort.active.position = position;
  }

  function finishSubjectSort(){
    const active = subjectSort.active;
    if (!active) return;

    if (active.targetId && active.position){
      const list = state.subjects;
      const fromIndex = list.findIndex(s=>s.id === active.subjectId);
      const [moved] = fromIndex >= 0 ? list.splice(fromIndex, 1) : [null];
      const targetIndex = list.findIndex(s=>s.id === active.targetId);

      if (moved && targetIndex >= 0){
        const insertIndex = active.position === 'before' ? targetIndex : targetIndex + 1;
        list.splice(insertIndex, 0, moved);
        saveState();
        subjectSort.justSorted = true;
        render();
        cleanupSubjectSort();
        setTimeout(()=>{ subjectSort.justSorted = false; }, 180);
        toast('Subject order updated.','success');
        return;
      }

      if (moved){
        list.splice(Math.max(fromIndex, 0), 0, moved);
      }
    }

    cleanupSubjectSort();
  }

  function handleSubjectPointerDown(e){
    const handle = e.target.closest('.subject-drag-handle');
    if (!handle || !elSubjectList.contains(handle)) return;

    const item = handle.closest('.subject-item');
    if (!item) return;

    e.preventDefault();
    cleanupSubjectSort();

    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = `${e.clientX + 12}px`;
    ghost.style.top = `${e.clientY + 12}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '500';
    ghost.style.opacity = '.96';
    ghost.style.transform = 'rotate(1deg)';
    ghost.style.boxShadow = '0 14px 32px rgba(15, 23, 42, .18)';
    ghost.style.background = 'var(--surface)';
    ghost.classList.remove('drop-before', 'drop-after', 'drag-source', 'active');
    document.body.appendChild(ghost);

    subjectSort.active = {
      pointerId: e.pointerId,
      subjectId: item.dataset.sid,
      sourceEl: item,
      ghost,
      targetId: null,
      position: null
    };

    item.classList.add('drag-source');
    document.body.style.userSelect = 'none';
    updateSubjectGhostPosition(e.clientX, e.clientY);
  }

  function handleSubjectPointerMove(e){
    if (!subjectSort.active || e.pointerId !== subjectSort.active.pointerId) return;
    e.preventDefault();
    updateSubjectGhostPosition(e.clientX, e.clientY);
    updateSubjectSortTarget(e.clientX, e.clientY);
  }

  function handleSubjectPointerEnd(e){
    if (!subjectSort.active || e.pointerId !== subjectSort.active.pointerId) return;
    finishSubjectSort();
  }

  let state = loadState();

  function loadState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.subjects) && s.subjects.length) {
          return {
            subjects: s.subjects,
            activeSubjectId: s.activeSubjectId || s.subjects[0].id,
            activeTerm: s.activeTerm || "prelims",
            activeTab: s.activeTab || "scores"
          };
        }
      }
    } catch (e) {}

    const s0 = defaultSubject();
    return {
      subjects:[s0],
      activeSubjectId:s0.id,
      activeTerm:"prelims",
      activeTab:"scores"
    };
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeSubject(){
    return state.subjects.find(x => x.id === state.activeSubjectId) || state.subjects[0];
  }

  const elSidebar = $('sidebar');
  const elOverlay = $('overlay');
  const elSubjectList = $('subjectList');
  const elBaseInput = $('baseInput');
  const elCap100 = $('cap100');
  const elSubjectName = $('subjectName');
  const elSummaryStrip = $('summaryStrip');
  const elBannerInvalid = $('bannerInvalid');
  const elScoresArea = $('scoresArea');
  const elSetupArea = $('setupArea');
  const elSemesterSummary = $('semesterSummary');

  const elTargetFinal = $('targetFinal');
  const elUsePrelims = $('usePrelims');
  const elPrelimsCustom = $('prelimsCustom');
  const elUseMidterms = $('useMidterms');
  const elMidtermsCustom = $('midtermsCustom');
  const elGoalResult = $('goalResult');

  function validateWeights(subject){
    const errors = [];
    const tops = subject.categories || [];

    if (tops.length < 2) errors.push("Need at least 2 top-level categories.");

    const sumTop = round2(tops.reduce((a,c)=>a+num(c.weight),0));
    if (sumTop !== 100) errors.push(`Top-level weights total ${sumTop}% (must be 100%).`);

    function walk(node){
      if (node.children && node.children.length){
        const sum = round2(node.children.reduce((a,c)=>a+num(c.weight),0));
        const pW = round2(num(node.weight));
        if (sum !== pW) errors.push(`"${node.name}" children total ${sum}% (must be ${pW}%).`);
        node.children.forEach(walk);
      }
    }

    tops.forEach(walk);
    return { ok: errors.length===0, errors };
  }

  function ensureLeafGrid(subject){
    const leaves = getLeafNodes(subject.categories);
    subject.leafGrid = subject.leafGrid || {};

    for (const leaf of leaves){
      if (!subject.leafGrid[leaf.id]){
        subject.leafGrid[leaf.id] = {
          cols:10,
          prelims:makeGrid(10),
          midterms:makeGrid(10),
          finals:makeGrid(10)
        };
      }
      const g = subject.leafGrid[leaf.id];
      for (const t of TERMS){
        if (!g[t]) g[t] = makeGrid(g.cols || 10);
        resizeGrid(g[t], g.cols || 10);
      }
    }

    const set = new Set(leaves.map(l=>l.id));
    for (const k of Object.keys(subject.leafGrid)){
      if (!set.has(k)) delete subject.leafGrid[k];
    }
  }

  function resizeGrid(grid, cols){
    grid.max = (grid.max || []).slice(0, cols);
    grid.score = (grid.score || []).slice(0, cols);

    while (grid.max.length < cols) grid.max.push(null);
    while (grid.score.length < cols) grid.score.push(null);
  }

  function computeLeaf(subject, leafId, term){
    const g = subject.leafGrid[leafId];
    if (!g) return {sumScore:0,sumMax:0,rawPercent:0,transmuted:subject.base};

    const grid = g[term];
    const sumScore = (grid.score || []).reduce((a,v)=>a+(Number.isFinite(Number(v)) ? Number(v) : 0),0);
    const sumMax = (grid.max || []).reduce((a,v)=>a+(Number.isFinite(Number(v)) ? Number(v) : 0),0);

    const raw = sumMax > 0 ? (sumScore / sumMax) : 0;
    let trans = num(subject.base) + raw * (100 - num(subject.base));
    if (subject.cap100) trans = Math.min(100, trans);
    trans = Math.max(0, trans);

    return { sumScore, sumMax, rawPercent: raw * 100, transmuted: trans };
  }

  function computeContribution(subject, node, term){
    if (node.children && node.children.length){
      return node.children.reduce((a,ch)=>a+computeContribution(subject,ch,term),0);
    }
    const leaf = computeLeaf(subject, node.id, term);
    return leaf.transmuted * (num(node.weight) / 100);
  }

  function computeTerm(subject, term){
    return clamp(subject.categories.reduce((a,top)=>a+computeContribution(subject,top,term),0),0,100);
  }

  function computeSemester(subject){
    const p = computeTerm(subject,"prelims");
    const m = computeTerm(subject,"midterms");
    const f = computeTerm(subject,"finals");
    const midGrade = (p/3) + (2*m/3);
    const finalGrade = (midGrade/3) + (2*f/3);
    return { prelims:p, midterms:m, finals:f, midGrade, finalGrade };
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g,c=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function updateDisplays(){
    const subj = activeSubject();
    const v = validateWeights(subj);

    if (!v.ok){
      elBannerInvalid.className = "alert danger show";
      elBannerInvalid.innerHTML = `<strong>⚠️ Fix weights to enable computation</strong><ul style="margin:6px 0 0;padding-left:18px;">${v.errors.map(e=>`<li>${escapeHtml(e)}</li>`).join("")}</ul>`;
    } else {
      elBannerInvalid.className = "alert danger";
      elBannerInvalid.innerHTML = "";
    }

    const existingChips = elSummaryStrip.querySelectorAll('.summary-chip');

    if (v.ok){
      const sem = computeSemester(subj);
      const finalPass = sem.finalGrade >= 75;
      const chips = [
        {t:"Prelims", v:round2(sem.prelims), cls:""},
        {t:"Midterms", v:round2(sem.midterms), cls:""},
        {t:"Finals", v:round2(sem.finals), cls:""},
        {t:"Midterm Grade", v:round2(sem.midGrade), cls:"highlight"},
        {t:"Final Grade", v:round2(sem.finalGrade), cls:`highlight ${finalPass?'pass':'fail'}`},
        {t:"Status", v:finalPass ? "PASSING" : "BELOW 75", cls:finalPass ? "pass" : "fail"},
      ];

      if (existingChips.length === chips.length){
        chips.forEach((c,i)=>{
          existingChips[i].className = `summary-chip ${c.cls}`;
          existingChips[i].querySelector('.sc-val').textContent = String(c.v);
        });
      } else {
        elSummaryStrip.innerHTML = "";
        chips.forEach(c=>{
          const d = document.createElement("div");
          d.className = `summary-chip ${c.cls}`;
          d.innerHTML = `<div class="sc-val">${escapeHtml(String(c.v))}</div><div class="sc-label">${escapeHtml(c.t)}</div>`;
          elSummaryStrip.appendChild(d);
        });
      }
    } else {
      elSummaryStrip.innerHTML = `<div style="grid-column:1/-1;font-size:12px;color:var(--muted);padding:4px 0;">Summary unavailable — fix weights in Setup first.</div>`;
    }

    const term = state.activeTerm;
    for (const block of elScoresArea.querySelectorAll('.sheet-block')){
      const leafId = block.dataset.leafId;
      if (!leafId) continue;
      const metrics = computeLeaf(subj, leafId, term);
      const mp = block.querySelector('.sheet-metrics');
      if (mp){
        const pills = mp.querySelectorAll('.metric-pill');
        if (pills[0]) pills[0].textContent = `Total: ${round2(metrics.sumScore)} / ${round2(metrics.sumMax)}`;
        if (pills[1]) pills[1].textContent = `Raw: ${round2(metrics.rawPercent)}%`;
        if (pills[2]) pills[2].textContent = `Score (B${num(subj.base)}): ${round2(metrics.transmuted)}`;
        if (pills[3]) pills[3].textContent = `Weighted: ${round2(metrics.transmuted * (num(block.dataset.leafWeight||0)) / 100)}`;
      }

      const totalCells = block.querySelectorAll('td.total-cell');
      totalCells.forEach(tc=>{
        if (tc.dataset.row === 'max') tc.textContent = String(round2(metrics.sumMax));
        if (tc.dataset.row === 'score') tc.textContent = String(round2(metrics.sumScore));
      });
    }

    if (v.ok){
      const sem = computeSemester(subj);
      elSemesterSummary.style.display = "";
      elSemesterSummary.innerHTML = `
        <div class="sem-header">📋 Semester Summary</div>
        <div class="sem-row">
          <div class="sem-cell"><div class="sem-val" style="color:var(--prelims)">${round2(sem.prelims)}</div><div class="sem-lbl">Prelims</div></div>
          <div class="sem-cell"><div class="sem-val" style="color:var(--midterms)">${round2(sem.midterms)}</div><div class="sem-lbl">Midterms</div></div>
          <div class="sem-cell"><div class="sem-val" style="color:var(--finals)">${round2(sem.finals)}</div><div class="sem-lbl">Finals</div></div>
          <div class="sem-cell"><div class="sem-val">${round2(sem.midGrade)}</div><div class="sem-lbl">Midterm Grade</div></div>
        </div>
        <div class="sem-row highlight sem-border-top">
          <div class="sem-cell" style="grid-column:1/3"><div class="sem-val" style="font-size:20px;">${round2(sem.finalGrade)}</div><div class="sem-lbl">Final Grade</div></div>
          <div class="sem-cell" style="grid-column:3/5"><div class="sem-val">${sem.finalGrade>=75?'✓ PASSING':'✗ BELOW 75'}</div><div class="sem-lbl">Status</div></div>
        </div>
      `;
    } else {
      elSemesterSummary.style.display = "none";
    }

    elSubjectList.querySelectorAll('.subject-item').forEach(item=>{
      const sid = item.dataset.sid;
      const s = state.subjects.find(x=>x.id===sid);
      if (!s) return;
      const badge = item.querySelector('.subject-grade-badge');
      if (!badge) return;
      const sv = validateWeights(s);
      if (sv.ok){
        const sem = computeSemester(s);
        const pass = sem.finalGrade >= 75;
        badge.className = `subject-grade-badge ${pass?'pass':'fail'}`;
        badge.textContent = String(round2(sem.finalGrade));
      } else {
        badge.className = 'subject-grade-badge';
        badge.textContent = '—';
      }
    });

    renderGoal(subj, v.ok);
    saveState();
  }

  function render(){
    cleanupSubjectSort();
    const subj = activeSubject();
    ensureLeafGrid(subj);

    elSubjectList.innerHTML = "";
    state.subjects.forEach(s=>{
      const v = validateWeights(s);
      let gradeHTML = '<span class="subject-grade-badge">—</span>';
      if (v.ok){
        const sem = computeSemester(s);
        const pass = sem.finalGrade >= 75;
        gradeHTML = `<span class="subject-grade-badge ${pass?'pass':'fail'}">${round2(sem.finalGrade)}</span>`;
      }
      const div = document.createElement("div");
      div.className = "subject-item" + (s.id === subj.id ? " active" : "");
      div.dataset.sid = s.id;
      div.innerHTML = `
        <div class="subject-item-main">
          <div class="subject-item-copy">
            <div class="s-name">${escapeHtml(s.name||"(unnamed)")}</div>
            <div class="s-sub">Base ${num(s.base)} · ${(s.categories||[]).length} categories</div>
          </div>
          ${gradeHTML}
        </div>
        <button type="button" class="subject-drag-handle" aria-label="Reorder subject">
          <svg class="subject-drag-icon" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="2.5" r="1.1"></circle>
            <circle cx="3" cy="6" r="1.1"></circle>
            <circle cx="3" cy="9.5" r="1.1"></circle>
            <circle cx="9" cy="2.5" r="1.1"></circle>
            <circle cx="9" cy="6" r="1.1"></circle>
            <circle cx="9" cy="9.5" r="1.1"></circle>
          </svg>
        </button>
      `;
      div.addEventListener('click', (e)=>{
        if (e.target.closest('.subject-drag-handle')) return;
        if (subjectSort.justSorted) return;
        state.activeSubjectId = s.id;
        saveState();
        render();
        closeSidebar();
      });
      elSubjectList.appendChild(div);
    });

    if (document.activeElement !== elSubjectName) elSubjectName.value = subj.name || "";
    if (document.activeElement !== elBaseInput) elBaseInput.value = num(subj.base);
    elCap100.checked = !!subj.cap100;

    document.querySelectorAll('.term-tab').forEach(t=>{
      t.classList.toggle('active', t.dataset.term === state.activeTerm);
    });

    document.querySelectorAll('.nav-tab').forEach(t=>{
      t.classList.toggle('active', t.dataset.tab === state.activeTab);
    });

    $('tab-scores').style.display = state.activeTab === "scores" ? "block" : "none";
    $('tab-setup').style.display = state.activeTab === "setup" ? "block" : "none";
    $('tab-goal').style.display = state.activeTab === "goal" ? "block" : "none";

    const v = validateWeights(subj);
    if (!v.ok){
      elBannerInvalid.className = "alert danger show";
      elBannerInvalid.innerHTML = `<strong>⚠️ Fix weights to enable computation</strong><ul style="margin:6px 0 0;padding-left:18px;">${v.errors.map(e=>`<li>${escapeHtml(e)}</li>`).join("")}</ul>`;
    } else {
      elBannerInvalid.className = "alert danger";
      elBannerInvalid.innerHTML = "";
    }

    elSummaryStrip.innerHTML = "";
    if (v.ok){
      const sem = computeSemester(subj);
      const finalPass = sem.finalGrade >= 75;
      const chips = [
        {t:"Prelims", v:round2(sem.prelims), cls:""},
        {t:"Midterms", v:round2(sem.midterms), cls:""},
        {t:"Finals", v:round2(sem.finals), cls:""},
        {t:"Midterm Grade", v:round2(sem.midGrade), cls:"highlight"},
        {t:"Final Grade", v:round2(sem.finalGrade), cls:`highlight ${finalPass?'pass':'fail'}`},
        {t:"Status", v:finalPass?"PASSING":"BELOW 75", cls:finalPass?"pass":"fail"},
      ];

      chips.forEach(c=>{
        const d = document.createElement("div");
        d.className = `summary-chip ${c.cls}`;
        d.innerHTML = `<div class="sc-val">${escapeHtml(String(c.v))}</div><div class="sc-label">${escapeHtml(c.t)}</div>`;
        elSummaryStrip.appendChild(d);
      });
    } else {
      const d = document.createElement("div");
      d.style.cssText = "grid-column:1/-1;font-size:12px;color:var(--muted);padding:4px 0;";
      d.textContent = "Summary unavailable — fix weights in Setup first.";
      elSummaryStrip.appendChild(d);
    }

    renderScores(subj, v.ok);
    renderSetup(subj);
    renderGoal(subj, v.ok);
    saveState();
  }

  function renderScores(subj, canCompute){
    elScoresArea.innerHTML = "";

    if (!canCompute){
      const b = document.createElement("div");
      b.className = "alert warning show";
      b.innerHTML = "<strong>Setup required:</strong> Fix your category weights in the <b>Setup</b> tab. You can still enter scores.";
      elScoresArea.appendChild(b);
    }

    const groups = groupLeavesByTop(subj.categories);

    for (const group of groups){
      const section = document.createElement("div");
      section.className = "stack";

      const gh = document.createElement("div");
      gh.className = "group-header";
      gh.innerHTML = `<div class="group-name">${escapeHtml(group.name)}</div><span class="group-weight-badge">${round2(num(group.weight))}%</span>`;
      section.appendChild(gh);

      for (const leaf of group.leaves){
        section.appendChild(renderSheetBlock(subj, leaf));
      }

      elScoresArea.appendChild(section);
    }

    if (canCompute){
      const sem = computeSemester(subj);
      elSemesterSummary.style.display = "";
      elSemesterSummary.innerHTML = `
        <div class="sem-header">📋 Semester Summary</div>
        <div class="sem-row">
          <div class="sem-cell"><div class="sem-val" style="color:var(--prelims)">${round2(sem.prelims)}</div><div class="sem-lbl">Prelims</div></div>
          <div class="sem-cell"><div class="sem-val" style="color:var(--midterms)">${round2(sem.midterms)}</div><div class="sem-lbl">Midterms</div></div>
          <div class="sem-cell"><div class="sem-val" style="color:var(--finals)">${round2(sem.finals)}</div><div class="sem-lbl">Finals</div></div>
          <div class="sem-cell"><div class="sem-val">${round2(sem.midGrade)}</div><div class="sem-lbl">Midterm Grade</div></div>
        </div>
        <div class="sem-row highlight sem-border-top">
          <div class="sem-cell" style="grid-column:1/3"><div class="sem-val" style="font-size:20px;">${round2(sem.finalGrade)}</div><div class="sem-lbl">Final Grade</div></div>
          <div class="sem-cell" style="grid-column:3/5"><div class="sem-val">${sem.finalGrade>=75?'✓ PASSING':'✗ BELOW 75'}</div><div class="sem-lbl">Status</div></div>
        </div>
      `;
    } else {
      elSemesterSummary.style.display = "none";
    }
  }

  function groupLeavesByTop(categories){
    return categories.map(top=>({
      name:top.name,
      weight:top.weight,
      leaves:getLeafNodes([top])
    }));
  }

  function renderSheetBlock(subj, leaf){
    const term = state.activeTerm;
    const g = subj.leafGrid[leaf.id];
    const cols = g.cols || 10;
    resizeGrid(g[term], cols);
    const metrics = computeLeaf(subj, leaf.id, term);

    const wrap = document.createElement('div');
    wrap.className = `sheet-block term-${term}`;
    wrap.dataset.leafId = leaf.id;
    wrap.dataset.leafWeight = num(leaf.weight);

    const titleBar = document.createElement('div');
    titleBar.className = 'sheet-title';
    titleBar.innerHTML = `
      <div>
        <div class="sheet-name">${escapeHtml(leaf.name)} <span class="sheet-weight">— ${round2(num(leaf.weight))}%</span></div>
        <div class="sheet-metrics">
          <span class="metric-pill">Total: ${round2(metrics.sumScore)} / ${round2(metrics.sumMax)}</span>
          <span class="metric-pill">Raw: ${round2(metrics.rawPercent)}%</span>
          <span class="metric-pill transmuted">Score (B${num(subj.base)}): ${round2(metrics.transmuted)}</span>
          <span class="metric-pill">Weighted: ${round2(metrics.transmuted * num(leaf.weight) / 100)}</span>
        </div>
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn small icon ghost" data-act="remCol" ${cols<=1?'disabled':''}>－</button>
        <button type="button" class="btn small icon ghost" data-act="addCol" ${cols>=30?'disabled':''}>＋</button>
      </div>
    `;

    titleBar.querySelector('[data-act="addCol"]').onclick = ()=>{
      g.cols = clamp(num(g.cols)+1,1,30);
      for (const t of TERMS) resizeGrid(g[t], g.cols);
      saveState();
      render();
    };

    titleBar.querySelector('[data-act="remCol"]').onclick = ()=>{
      if (num(g.cols)<=1) return;
      g.cols = num(g.cols)-1;
      for (const t of TERMS) resizeGrid(g[t], g.cols);
      saveState();
      render();
    };

    wrap.appendChild(titleBar);

    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'sheet-scroll';

    const table = document.createElement('table');
    table.className = 'score-table';

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const th0 = document.createElement('th');
    th0.textContent = '';
    trh.appendChild(th0);

    for (let i=0;i<cols;i++){
      const th = document.createElement('th');
      th.textContent = String(i+1);
      trh.appendChild(th);
    }

    const thT = document.createElement('th');
    thT.textContent = 'Total';
    trh.appendChild(thT);

    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tbody.appendChild(buildRow('Max', g[term].max, (idx,val)=>{
      g[term].max[idx]=val;
      saveState();
      updateDisplays();
    }, round2(metrics.sumMax), 'max'));

    tbody.appendChild(buildRow('Score', g[term].score, (idx,val)=>{
      g[term].score[idx]=val;
      saveState();
      updateDisplays();
    }, round2(metrics.sumScore), 'score', true));

    table.appendChild(tbody);

    scrollWrap.appendChild(table);
    wrap.appendChild(scrollWrap);
    return wrap;
  }

  function buildRow(label, arr, onChange, total, rowKey='', isScore=false){
    const tr = document.createElement('tr');
    tr.className = isScore ? 'row-score' : 'row-max';

    const td0 = document.createElement('td');
    td0.textContent = label;
    tr.appendChild(td0);

    for (let i=0;i<arr.length;i++){
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.className = 'cell-input';
      inp.inputMode = 'decimal';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.placeholder = '';
      inp.value = arr[i] != null ? String(arr[i]) : '';
      inp.oninput = ()=>{
        const raw = inp.value.trim();
        const parsed = raw === '' ? null : parseFloat(raw);
        onChange(i, (parsed !== null && Number.isFinite(parsed)) ? parsed : null);
      };
      inp.onkeydown = (e)=>{
        if (e.key === 'Enter'){
          e.preventDefault();
          const allInputs = Array.from(tr.closest('table').querySelectorAll('input.cell-input'));
          const idx = allInputs.indexOf(inp);
          if (idx < allInputs.length - 1) allInputs[idx + 1].focus();
        }
      };
      td.appendChild(inp);
      tr.appendChild(td);
    }

    const tdT = document.createElement('td');
    tdT.className = 'total-cell';
    tdT.dataset.row = rowKey;
    tdT.textContent = String(total);
    tr.appendChild(tdT);

    return tr;
  }

  function normalizeEmptyChildren(nodes){
    for (const n of nodes){
      if (Array.isArray(n.children) && n.children.length===0) n.children = null;
      if (n.children) normalizeEmptyChildren(n.children);
    }
  }

  function clearSetupDropIndicators(){
    elSetupArea.querySelectorAll('.setup-node.drop-before, .setup-node.drop-after, .setup-node.sort-armed, .setup-node.drag-source').forEach(node=>{
      node.classList.remove('drop-before', 'drop-after', 'sort-armed', 'drag-source');
    });
  }

  function updateSetupGhostPosition(clientX, clientY){
    if (!setupSort.active?.ghost) return;
    setupSort.active.ghost.style.left = `${clientX + 14}px`;
    setupSort.active.ghost.style.top = `${clientY + 14}px`;
  }

  function cancelSetupSortCandidate(){
    if (setupSort.holdTimer){
      clearTimeout(setupSort.holdTimer);
      setupSort.holdTimer = null;
    }
    if (setupSort.candidate?.nodeEl){
      setupSort.candidate.nodeEl.classList.remove('sort-armed');
    }
    setupSort.candidate = null;
  }

  function cleanupSetupSort(){
    cancelSetupSortCandidate();
    clearSetupDropIndicators();
    if (setupSort.active?.ghost?.isConnected){
      setupSort.active.ghost.remove();
    }
    setupSort.active = null;
    document.body.style.userSelect = '';
  }

  function beginSetupSort(){
    const candidate = setupSort.candidate;
    if (!candidate) return;

    const subj = activeSubject();
    const sourceList = getSiblingList(subj, candidate.parentId);
    if (!sourceList || sourceList.length < 2){
      cleanupSetupSort();
      return;
    }

    const rect = candidate.nodeEl.getBoundingClientRect();
    const ghost = candidate.nodeEl.cloneNode(true);
    ghost.style.position = 'fixed';
    ghost.style.left = `${candidate.startX + 14}px`;
    ghost.style.top = `${candidate.startY + 14}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '500';
    ghost.style.opacity = '.95';
    ghost.style.transform = 'rotate(1deg)';
    ghost.style.boxShadow = '0 14px 32px rgba(15, 23, 42, .18)';
    ghost.style.background = 'var(--surface)';
    ghost.classList.remove('drop-before', 'drop-after', 'sort-armed', 'drag-source');
    document.body.appendChild(ghost);

    setupSort.active = {
      nodeId: candidate.nodeId,
      parentId: candidate.parentId,
      sourceEl: candidate.nodeEl,
      pointerId: candidate.pointerId,
      ghost,
      targetId: null,
      position: null
    };

    candidate.nodeEl.classList.remove('sort-armed');
    candidate.nodeEl.classList.add('drag-source');
    setupSort.candidate = null;
    setupSort.holdTimer = null;
    document.body.style.userSelect = 'none';
    updateSetupGhostPosition(candidate.startX, candidate.startY);
  }

  function updateSetupSortTarget(clientX, clientY){
    if (!setupSort.active) return;

    clearSetupDropIndicators();
    setupSort.active.sourceEl.classList.add('drag-source');

    const hovered = document.elementFromPoint(clientX, clientY)?.closest('.setup-node');
    if (!hovered || hovered === setupSort.active.sourceEl){
      setupSort.active.targetId = null;
      setupSort.active.position = null;
      return;
    }

    if ((hovered.dataset.parentId || '') !== (setupSort.active.parentId || '')){
      setupSort.active.targetId = null;
      setupSort.active.position = null;
      return;
    }

    const rect = hovered.getBoundingClientRect();
    const position = clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    hovered.classList.add(position === 'before' ? 'drop-before' : 'drop-after');
    setupSort.active.targetId = hovered.dataset.nodeId;
    setupSort.active.position = position;
  }

  function finishSetupSort(){
    const active = setupSort.active;
    if (!active) return;

    const subj = activeSubject();
    const list = getSiblingList(subj, active.parentId);

    if (list && active.targetId && active.position){
      const fromIndex = list.findIndex(node=>node.id === active.nodeId);
      const [moved] = fromIndex >= 0 ? list.splice(fromIndex, 1) : [null];
      const targetIndex = list.findIndex(node=>node.id === active.targetId);

      if (moved && targetIndex >= 0){
        const insertIndex = active.position === 'before' ? targetIndex : targetIndex + 1;
        list.splice(insertIndex, 0, moved);
        ensureLeafGrid(subj);
        saveState();
        render();
        cleanupSetupSort();
        toast('Order updated.','success');
        return;
      }

      if (moved){
        list.splice(Math.max(fromIndex, 0), 0, moved);
      }
    }

    cleanupSetupSort();
  }

  function handleSetupPointerDown(e){
    const header = e.target.closest('.setup-node-header');
    if (!header || !elSetupArea.contains(header)) return;
    if (e.target.closest('button, input, select, label, a')) return;

    const nodeEl = header.closest('.setup-node');
    if (!nodeEl) return;

    cleanupSetupSort();
    nodeEl.classList.add('sort-armed');
    setupSort.candidate = {
      nodeEl,
      nodeId: nodeEl.dataset.nodeId,
      parentId: nodeEl.dataset.parentId || '',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY
    };
    setupSort.holdTimer = setTimeout(beginSetupSort, SETUP_LONG_PRESS_MS);
  }

  function handleSetupPointerMove(e){
    if (setupSort.candidate && !setupSort.active){
      if (e.pointerId !== setupSort.candidate.pointerId) return;
      const moved = Math.hypot(e.clientX - setupSort.candidate.startX, e.clientY - setupSort.candidate.startY);
      if (moved > 8){
        cancelSetupSortCandidate();
      }
      return;
    }

    if (!setupSort.active || e.pointerId !== setupSort.active.pointerId) return;
    e.preventDefault();
    updateSetupGhostPosition(e.clientX, e.clientY);
    updateSetupSortTarget(e.clientX, e.clientY);
  }

  function handleSetupPointerEnd(e){
    if (setupSort.candidate && (!setupSort.active || e.pointerId === setupSort.candidate.pointerId)){
      cancelSetupSortCandidate();
    }
    if (setupSort.active && e.pointerId === setupSort.active.pointerId){
      finishSetupSort();
    }
  }

  function renderSetup(subj){
    cleanupSetupSort();
    elSetupArea.innerHTML = '';
    subj.categories = subj.categories || [];
    normalizeEmptyChildren(subj.categories);
    subj.categories.forEach(top=>{
      elSetupArea.appendChild(renderSetupNode(subj, top, null));
    });
  }

  function renderSetupNode(subj, node, parent){
    const hasChildren = !!(node.children && node.children.length);
    const fallbackName = (node.name && String(node.name).trim()) || (parent ? 'Sub category' : 'Category');

    const wrap = document.createElement('div');
    wrap.className = `setup-node${parent ? ' child-node' : ''}`;
    wrap.dataset.nodeId = node.id;
    wrap.dataset.parentId = parent ? parent.id : '';

    const nodeHeader = document.createElement('div');
    nodeHeader.className = 'setup-node-header';

    const left = document.createElement('div');
    left.className = 'row';
    left.style.minWidth = '0';
    left.innerHTML = `
      <span class="pill">${parent ? 'child' : 'top'}</span>
      ${hasChildren ? `<span class="pill" style="font-size:10px;">parent</span>` : ''}
    `;

    const sortHint = document.createElement('div');
    sortHint.className = 'setup-sort-hint';
    sortHint.innerHTML = `
      <svg class="setup-sort-icon" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="2.5" r="1.1"></circle>
        <circle cx="3" cy="6" r="1.1"></circle>
        <circle cx="3" cy="9.5" r="1.1"></circle>
        <circle cx="9" cy="2.5" r="1.1"></circle>
        <circle cx="9" cy="6" r="1.1"></circle>
        <circle cx="9" cy="9.5" r="1.1"></circle>
      </svg>
    `;

    const body = document.createElement('div');
    body.className = 'setup-node-body';

    const editRow = document.createElement('div');
    editRow.className = 'setup-edit-row';

    const nameWrap = document.createElement('div');
    nameWrap.className = 'setup-inline-name';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'setup-name-input';
    nameInput.placeholder = parent ? 'Sub category name' : 'Category name';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;
    nameInput.maxLength = 26;
    nameInput.value = node.name || '';
    nameInput.oninput = ()=>{
      node.name = nameInput.value;
      saveState();
    };
    nameInput.onblur = ()=>{
      node.name = nameInput.value.trim() || fallbackName;
      saveState();
      render();
    };
    nameInput.onkeydown = (e)=>{
      if (e.key === 'Enter'){
        e.preventDefault();
        nameInput.blur();
      }
    };
    nameWrap.appendChild(nameInput);

    const weightWrap = document.createElement('label');
    weightWrap.className = 'setup-weight-field';

    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.className = 'setup-weight-input';
    weightInput.inputMode = 'decimal';
    weightInput.min = '0';
    weightInput.max = '100';
    weightInput.step = '0.01';
    weightInput.value = round2(num(node.weight));

    const commitWeight = (shouldRender = false)=>{
      const parsed = parseFloat(weightInput.value.trim());
      node.weight = Number.isFinite(parsed) ? clamp(parsed, 0, 100) : 0;
      saveState();
      if (shouldRender) render();
    };

    weightInput.oninput = ()=> commitWeight(false);
    weightInput.onblur = ()=>{
      commitWeight(true);
    };
    weightInput.onkeydown = (e)=>{
      if (e.key === 'Enter'){
        e.preventDefault();
        weightInput.blur();
      }
    };

    const weightSuffix = document.createElement('span');
    weightSuffix.className = 'setup-inline-suffix';
    weightSuffix.textContent = '%';

    weightWrap.appendChild(weightInput);
    weightWrap.appendChild(weightSuffix);

    editRow.appendChild(nameWrap);
    editRow.appendChild(weightWrap);

    const actionRow = document.createElement('div');
    actionRow.className = 'setup-action-row';

    const btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.className = 'btn small setup-action-btn';
    btnToggle.innerHTML = hasChildren
      ? `<svg class="setup-btn-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.2 2.8C9.6 2.4 6.8 3.1 5 4.9c-2 2-2.2 5.1-.5 6.8 1.7 1.7 4.8 1.5 6.8-.5 1.8-1.8 2.5-4.6 2.1-8.2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 11.1c1.8-2 3.8-3.6 6.2-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="setup-btn-label">Make leaf</span>`
      : `<svg class="setup-btn-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="setup-btn-label">Add children</span>`;
    btnToggle.onclick = ()=>{
      if (hasChildren){
        node.children = null;
      } else {
        const w = num(node.weight);
        node.children = [
          {id:uid(), name:'Sub A', weight:round2(w/2), children:null},
          {id:uid(), name:'Sub B', weight:round2(w-round2(w/2)), children:null}
        ];
      }
      ensureLeafGrid(subj);
      saveState();
      render();
    };

    const btnAddChild = document.createElement('button');
    btnAddChild.type = 'button';
    btnAddChild.className = 'btn small primary setup-action-btn';
    btnAddChild.innerHTML = `<svg class="setup-btn-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="setup-btn-label">Child</span>`;
    btnAddChild.style.display = hasChildren ? '' : 'none';
    btnAddChild.onclick = ()=>{
      node.children.push({
        id:uid(),
        name:`Sub ${node.children.length+1}`,
        weight:0,
        children:null
      });
      ensureLeafGrid(subj);
      saveState();
      render();
    };

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn small danger setup-action-btn';
    btnDel.innerHTML = `<svg class="setup-btn-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5l.5-9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="setup-btn-label">Delete</span>`;
    btnDel.onclick = ()=>{
      if (!parent){
        if (subj.categories.length <= 2){
          toast('Keep at least 2 top-level categories.', 'danger');
          return;
        }
        subj.categories = subj.categories.filter(x=>x.id!==node.id);
      } else {
        parent.children = parent.children.filter(x=>x.id!==node.id);
        if (parent.children.length===0) parent.children = null;
      }
      ensureLeafGrid(subj);
      saveState();
      render();
    };

    actionRow.appendChild(btnToggle);
    actionRow.appendChild(btnAddChild);
    actionRow.appendChild(btnDel);

    body.appendChild(editRow);
    body.appendChild(actionRow);

    wrap.appendChild(nodeHeader);
    nodeHeader.appendChild(left);
    nodeHeader.appendChild(sortHint);
    wrap.appendChild(body);

    if (hasChildren){
      const childrenWrap = document.createElement('div');
      childrenWrap.className = 'setup-children';
      node.children.forEach(ch=>{
        childrenWrap.appendChild(renderSetupNode(subj, ch, node));
      });
      wrap.appendChild(childrenWrap);
    }

    return wrap;
  }

  function renderGoal(subj, canCompute){
    if (document.activeElement !== elTargetFinal) elTargetFinal.value = subj.goal.targetFinal ?? '';
    if (document.activeElement !== elPrelimsCustom) elPrelimsCustom.value = subj.goal.prelimsCustom ?? '';
    if (document.activeElement !== elMidtermsCustom) elMidtermsCustom.value = subj.goal.midtermsCustom ?? '';

    elUsePrelims.value = subj.goal.usePrelims;
    elUseMidterms.value = subj.goal.useMidterms;

    $('prelimsCustomWrap').style.display = subj.goal.usePrelims === "custom" ? '' : 'none';
    $('midtermsCustomWrap').style.display = subj.goal.useMidterms === "custom" ? '' : 'none';

    if (!canCompute){
      elGoalResult.className = 'alert danger show goal-result';
      elGoalResult.textContent = 'Fix weights in Setup first.';
      return;
    }

    const target = Number(subj.goal.targetFinal);
    if (!Number.isFinite(target)){
      elGoalResult.className = 'alert goal-result';
      return;
    }

    const sem = computeSemester(subj);
    const p = (subj.goal.usePrelims === 'custom' && Number.isFinite(Number(subj.goal.prelimsCustom)))
      ? Number(subj.goal.prelimsCustom)
      : sem.prelims;

    const m = (subj.goal.useMidterms === 'custom' && Number.isFinite(Number(subj.goal.midtermsCustom)))
      ? Number(subj.goal.midtermsCustom)
      : sem.midterms;

    const midGrade = (p/3) + (2*m/3);
    const finalsNeeded = (target - (midGrade/3)) * (3/2);
    const feasible = finalsNeeded >= 0 && finalsNeeded <= 100;

    elGoalResult.className = `alert show goal-result ${feasible ? 'success' : 'danger'}`;
    elGoalResult.innerHTML = feasible
      ? `<div style="font-weight:800;font-size:15px;">You need a Finals term grade of <span style="font-family:var(--mono);font-size:18px;">${round2(finalsNeeded)}</span></div>
         <div style="margin-top:6px;font-size:12px;color:inherit;opacity:.75;">to reach a final grade of ${round2(target)} · Current computed final: ${round2(sem.finalGrade)}</div>`
      : `<div style="font-weight:800;">Target ${round2(target)} is not reachable.</div>
         <div style="margin-top:6px;font-size:12px;opacity:.75;">Required Finals term grade: ${round2(finalsNeeded)} (out of 0–100 range)</div>`;
  }

  function download(filename, content, mime="application/json"){
    const blob = new Blob([content], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
      URL.revokeObjectURL(url);
      a.remove();
    },0);
  }

  function closeSidebar(){
    elSidebar.classList.remove('open');
    elOverlay.classList.remove('show');
  }

  function openHelp(){
    $('helpModal').classList.add('show');
    $('helpModal').setAttribute('aria-hidden', 'false');
  }

  function closeHelp(){
    $('helpModal').classList.remove('show');
    $('helpModal').setAttribute('aria-hidden', 'true');
  }

  $('btnMenu').addEventListener('click', ()=>{
    elSidebar.classList.toggle('open');
    elOverlay.classList.toggle('show');
  });

  elOverlay.addEventListener('click', closeSidebar);

  $('btnHelp').addEventListener('click', openHelp);
  $('btnCloseHelp').addEventListener('click', closeHelp);
  $('helpBackdrop').addEventListener('click', closeHelp);
  elSubjectList.addEventListener('pointerdown', handleSubjectPointerDown);
  document.addEventListener('pointermove', handleSubjectPointerMove, {passive:false});
  document.addEventListener('pointerup', handleSubjectPointerEnd);
  document.addEventListener('pointercancel', handleSubjectPointerEnd);
  elSetupArea.addEventListener('pointerdown', handleSetupPointerDown);
  document.addEventListener('pointermove', handleSetupPointerMove, {passive:false});
  document.addEventListener('pointerup', handleSetupPointerEnd);
  document.addEventListener('pointercancel', handleSetupPointerEnd);
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){
      closeSidebar();
      closeHelp();
      cleanupSetupSort();
    }
  });

  elSubjectName.addEventListener('input', ()=>{
    activeSubject().name = elSubjectName.value;
    saveState();
    updateDisplays();
  });

  elBaseInput.addEventListener('input', ()=>{
    activeSubject().base = clamp(Number(elBaseInput.value)||0,0,99);
    saveState();
    render();
  });

  elCap100.addEventListener('change', ()=>{
    activeSubject().cap100 = elCap100.checked;
    saveState();
    render();
  });

  $('termTabs').addEventListener('click', e=>{
    const t = e.target.closest('.term-tab');
    if (!t) return;
    state.activeTerm = t.dataset.term;
    saveState();
    render();
  });

  $('navTabs').addEventListener('click', e=>{
    const t = e.target.closest('.nav-tab');
    if (!t) return;
    state.activeTab = t.dataset.tab;
    saveState();
    render();
  });

  $('btnAddSubject').addEventListener('click', ()=>{
    const s = defaultSubject(`Subject ${state.subjects.length+1}`);
    state.subjects.push(s);
    state.activeSubjectId = s.id;
    saveState();
    render();
    toast('New subject added!');
  });

  $('btnDuplicate').addEventListener('click', ()=>{
    const subj = activeSubject();
    const copy = deepClone(subj);
    copy.id = uid();
    copy.name = (subj.name || 'Subject') + ' (copy)';

    const map = new Map();
    function remap(nodes){
      for (const n of nodes){
        const old = n.id;
        n.id = uid();
        map.set(old, n.id);
        if (n.children) remap(n.children);
      }
    }
    remap(copy.categories);

    const newLG = {};
    for (const [oldId,val] of Object.entries(copy.leafGrid || {})){
      const nId = map.get(oldId);
      if (nId) newLG[nId] = val;
    }
    copy.leafGrid = newLG;

    state.subjects.push(copy);
    state.activeSubjectId = copy.id;
    saveState();
    render();
    toast('Subject duplicated!');
  });

  $('btnDelete').addEventListener('click', ()=>{
    if (state.subjects.length <= 1){
      toast('Keep at least one subject.', 'danger');
      return;
    }
    const subj = activeSubject();
    if (!confirm(`Delete "${subj.name}"?`)) return;
    state.subjects = state.subjects.filter(x=>x.id!==subj.id);
    state.activeSubjectId = state.subjects[0].id;
    saveState();
    render();
    toast('Subject deleted.');
  });

  $('btnAddTop').addEventListener('click', ()=>{
    const subj = activeSubject();
    subj.categories.push({
      id:uid(),
      name:`Category ${subj.categories.length+1}`,
      weight:0,
      children:null
    });
    ensureLeafGrid(subj);
    saveState();
    render();
  });

  elTargetFinal.addEventListener('input', ()=>{
    activeSubject().goal.targetFinal = elTargetFinal.value === '' ? null : (parseFloat(elTargetFinal.value) || null);
    saveState();
    updateDisplays();
  });

  elUsePrelims.addEventListener('change', ()=>{
    activeSubject().goal.usePrelims = elUsePrelims.value;
    saveState();
    render();
  });

  elUseMidterms.addEventListener('change', ()=>{
    activeSubject().goal.useMidterms = elUseMidterms.value;
    saveState();
    render();
  });

  elPrelimsCustom.addEventListener('input', ()=>{
    activeSubject().goal.prelimsCustom = elPrelimsCustom.value === '' ? null : (parseFloat(elPrelimsCustom.value) || null);
    saveState();
    updateDisplays();
  });

  elMidtermsCustom.addEventListener('input', ()=>{
    activeSubject().goal.midtermsCustom = elMidtermsCustom.value === '' ? null : (parseFloat(elMidtermsCustom.value) || null);
    saveState();
    updateDisplays();
  });

  function setupExportImport(exportBtn, importInput){
    if (exportBtn) exportBtn.addEventListener('click', ()=>{
      const payload = {version:4, exportedAt:new Date().toISOString(), state};
      download('grade-calculator.json', JSON.stringify(payload,null,2));
      toast('Exported successfully!','success');
    });

    if (importInput) importInput.addEventListener('change', async ()=>{
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try{
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!payload || !payload.state || !Array.isArray(payload.state.subjects)) throw new Error('Invalid file');
        if (!confirm('Import will replace your current data. Continue?')) return;
        state = payload.state;
        if (!state.subjects.length){
          const s0 = defaultSubject();
          state.subjects = [s0];
          state.activeSubjectId = s0.id;
        }
        saveState();
        render();
        toast('Imported successfully!','success');
      } catch (e){
        toast('Import failed: ' + e.message, 'danger');
      } finally {
        importInput.value = '';
      }
    });
  }

  setupExportImport($('btnExport'), $('fileImport'));
  setupExportImport($('sideExport'), $('fileImport2'));

  $('sideExport').onclick = ()=>{
    const payload = {version:4, exportedAt:new Date().toISOString(), state};
    download('grade-calculator.json', JSON.stringify(payload,null,2));
    toast('Exported!','success');
  };

  $('btnReset').addEventListener('click', ()=>{
    if (!confirm('Reset deletes ALL saved data on this device. Continue?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    saveState();
    render();
    toast('Data reset.');
  });

  (function(){
    const tip = $('js-tooltip');
    let showTimer = null;
    let hideTimer = null;

    function showTip(text, x, y) {
      clearTimeout(hideTimer);
      tip.textContent = text;
      tip.style.display = 'block';

      const pad = 12;
      tip.style.left = '0px';
      tip.style.top = '0px';

      requestAnimationFrame(() => {
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let lx = x - tw / 2;
        let ly = y - th - 10;

        if (lx < pad) lx = pad;
        if (lx + tw > window.innerWidth - pad) lx = window.innerWidth - tw - pad;
        if (ly < pad) ly = y + 20;

        tip.style.left = lx + 'px';
        tip.style.top = ly + 'px';
        tip.classList.add('visible');
      });
    }

    function hideTip() {
      clearTimeout(showTimer);
      tip.classList.remove('visible');
      setTimeout(() => { tip.style.display = 'none'; }, 120);
    }

    document.addEventListener('mouseover', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      const text = el.dataset.tip;
      if (!text) return;
      clearTimeout(hideTimer);
      showTimer = setTimeout(() => {
        const r = el.getBoundingClientRect();
        showTip(text, r.left + r.width / 2, r.top);
      }, 320);
    });

    document.addEventListener('mouseout', e => {
      const el = e.target.closest('[data-tip]');
      if (!el) return;
      clearTimeout(showTimer);
      hideTimer = setTimeout(hideTip, 80);
    });

    document.addEventListener('mouseover', e => {
      if (!e.target.closest('[data-tip]')) return;
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideTip, 2500);
    });

    document.addEventListener('scroll', hideTip, true);
    document.addEventListener('mousedown', hideTip, true);
  })();

  render();
})();
