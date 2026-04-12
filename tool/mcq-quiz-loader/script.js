const UI = {
  file: document.getElementById('file'),
  loadBtn: document.getElementById('loadBtn'),
  submitBtn: document.getElementById('submitBtn'),
  retryBtn: document.getElementById('retryBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  resetBtn: document.getElementById('resetBtn'),
  displayMode: document.getElementById('displayMode'),
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
  helpModal: document.getElementById('helpModal'),
  guideModal: document.getElementById('guideModal'),
};

let bank = [], pool = [], poolName = 'Full', cursor = 0;
let submitted = false, wrongIDs = new Set();
let answers = new Map(), choiceMaps = new Map();
let toastTimer = null;
let pdfLoader = null;

// ── Toast ──
function showToast(msg, type='') {
  clearTimeout(toastTimer);
  UI.toast.textContent = msg;
  UI.toast.className = 'toast show' + (type ? ' ' + type : '');
  toastTimer = setTimeout(() => { UI.toast.className = 'toast'; }, 3000);
}

// ── File label ──
UI.file.addEventListener('change', () => {
  if(UI.file.files[0]) {
    UI.fileNameDisplay.textContent = UI.file.files[0].name;
    UI.fileNameDisplay.style.display = 'inline';
    UI.filePlaceholder.style.display = 'none';
  } else {
    UI.fileNameDisplay.style.display = 'none';
    UI.filePlaceholder.style.display = 'inline';
  }
});

function shuffleArray(arr) {
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function clamp(n,lo,hi){ return Math.max(lo,Math.min(hi,n)); }

function indexToLabel(index){
  let n = Number(index);
  if(!Number.isInteger(n) || n < 0) return '';
  let label = '';
  do{
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  }while(n >= 0);
  return label;
}

function labelToIndex(label){
  const up = String(label || '').trim().toUpperCase();
  if(!/^[A-Z]+$/.test(up)) return null;
  let value = 0;
  for(const ch of up){
    value = value * 26 + (ch.charCodeAt(0) - 64);
  }
  return value - 1;
}

function getChoiceEntries(row){
  const lookup = new Map(
    Object.entries(row || {}).map(([key, value])=>[
      String(key || '').trim().toUpperCase(),
      String(value ?? '')
    ])
  );
  const entries = [];
  for(let i = 0; i < 702; i++){
    const label = indexToLabel(i);
    if(!lookup.has(label)) break;
    const value = lookup.get(label);
    if(String(value).trim() !== ''){
      entries.push({label, value});
    }
  }
  return entries;
}

function parseAnswer(val, choiceEntries=[]){
  if(val===undefined||val===null) return null;
  const s=String(val).trim();
  if(!s) return null;
  const up=s.toUpperCase();
  const labeledIndex = choiceEntries.findIndex(entry=>entry.label === up);
  if(labeledIndex !== -1) return labeledIndex;
  const num=parseInt(s,10);
  if(!Number.isNaN(num)){
    if(num === 0 && choiceEntries.length) return 0;
    if(num >= 1 && num <= choiceEntries.length) return num - 1;
    if(num >= 0 && num < choiceEntries.length) return num;
  }
  return null;
}

function normalizeRow(r,idx){
  const id=(r.ID??r.Id??r.id??`q${idx+1}`).toString().trim();
  const topic=(r.Topic??r.topic??'General').toString().trim()||'General';
  const diff=(r.Difficulty??r.diff??'Medium').toString().trim()||'Medium';
  const stem=(r.Stem??r.stem??'').toString().trim();
  const choiceEntries=getChoiceEntries(r);
  const choices=choiceEntries.map(entry=>entry.value);
  const ans=parseAnswer(r.Answer??r.answer??r.Correct??r.correct, choiceEntries);
  const explanation=(r.Explanation??r.explanation??'').toString();
  if(!stem||choices.length<1||ans===null) return null;
  return {id,topic,diff,stem,choices,answer:ans,explanation};
}

function simpleCSVParse(text){
  const rows=[];
  let cur=[],field='',inQuotes=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQuotes){
      if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(ch==='"') inQuotes=false;
      else field+=ch;
    } else {
      if(ch==='"') inQuotes=true;
      else if(ch===','){ cur.push(field); field=''; }
      else if(ch==='\n'){ cur.push(field); rows.push(cur); cur=[]; field=''; }
      else if(ch==='\r'){}
      else field+=ch;
    }
  }
  if(field.length||cur.length){ cur.push(field); rows.push(cur); }
  if(!rows.length) return [];
  const header=rows[0].map(h=>h.trim());
  return rows.slice(1).filter(r=>r.some(x=>String(x).trim()!==''))
    .map(r=>{ const obj={}; header.forEach((h,i)=>obj[h]=(r[i]??'')); return obj; });
}

function ensureSheetJS(){
  return new Promise((resolve,reject)=>{
    if(window.XLSX) return resolve();
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload=()=>resolve();
    s.onerror=()=>reject(new Error('Failed to load XLSX parser.'));
    document.head.appendChild(s);
  });
}

function ensureJsPDF(){
  if(window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if(pdfLoader) return pdfLoader;
  pdfLoader = new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
    s.onload=()=>{
      if(window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error('PDF library loaded but did not initialize.'));
    };
    s.onerror=()=>reject(new Error('Failed to load PDF exporter.'));
    document.head.appendChild(s);
  }).catch(err=>{
    pdfLoader = null;
    throw err;
  });
  return pdfLoader;
}

async function loadBankFromFile(file){
  const name=file.name.toLowerCase();
  if(name.endsWith('.csv')){
    const text=await file.text();
    const raw=simpleCSVParse(text);
    return raw.map((r,i)=>normalizeRow(r,i)).filter(Boolean);
  }
  if(name.endsWith('.xlsx')){
    await ensureSheetJS();
    const data=await file.arrayBuffer();
    const wb=window.XLSX.read(data,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]];
    const raw=window.XLSX.utils.sheet_to_json(ws,{defval:''});
    return raw.map((r,i)=>normalizeRow(r,i)).filter(Boolean);
  }
  throw new Error('Unsupported file type. Use .xlsx or .csv');
}

function buildChoiceMap(q){
  const idxs=q.choices.map((_,i)=>i);
  if(UI.shuffleC.checked) shuffleArray(idxs);
  return idxs;
}

function diffClass(diff){
  const d=diff.toLowerCase();
  if(d==='easy'||d==='low') return 'diff-easy';
  if(d==='hard'||d==='high') return 'diff-hard';
  return 'diff-med';
}

function updateTop(){
  const display=UI.displayMode.value;
  UI.modeTag.textContent = display==='one' ? 'One-by-one' : 'All at once';
  UI.poolTag.textContent = `${poolName} pool`;
  UI.countTag.textContent = `${pool.length} question${pool.length!==1?'s':''}`;
  const answered=[...answers.keys()].filter(k=>pool.some(q=>q.id===k)).length;
  UI.ansTag.textContent = `${answered} answered`;
  const pct=pool.length ? Math.round(100*answered/pool.length) : 0;
  UI.pbar.style.width=pct+'%';

  // active state on pills when bank loaded
  [UI.bankTag,UI.modeTag,UI.poolTag,UI.countTag,UI.ansTag].forEach(el=>{
    el.classList.toggle('active', pool.length>0);
  });
}

function getReviewState(q){
  const chosen=answers.get(q.id);
  if(chosen===undefined) return 'unanswered';
  return chosen===q.answer ? 'correct' : 'incorrect';
}

function getReviewCounts(){
  return {
    all: pool.length,
    correct: pool.filter(q=>getReviewState(q)==='correct').length,
    incorrect: pool.filter(q=>getReviewState(q)==='incorrect').length,
    unanswered: pool.filter(q=>getReviewState(q)==='unanswered').length,
  };
}

function getResultGroups(){
  return {
    correct: pool.filter(q=>getReviewState(q)==='correct'),
    incorrect: pool.filter(q=>getReviewState(q)==='incorrect'),
    unanswered: pool.filter(q=>getReviewState(q)==='unanswered'),
  };
}

function answerTextFor(q, idx){
  if(idx===undefined || idx===null || idx<0) return 'No answer selected';
  return `${indexToLabel(idx)}. ${String(q.choices[idx] ?? '').trim()}`;
}

function safeFilename(base){
  return String(base || 'mcq-results')
    .toLowerCase()
    .replace(/\.[^.]+$/,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'') || 'mcq-results';
}

async function downloadResultsPdf(){
  if(!submitted || !pool.length){
    showToast('Submit the quiz first before downloading results.','error');
    return;
  }
  const originalLabel = UI.downloadBtn.innerHTML;
  UI.downloadBtn.disabled = true;
  UI.downloadBtn.textContent = 'Preparing PDF…';
  try{
    const jsPDF = await ensureJsPDF();
    const doc = new jsPDF({unit:'pt', format:'a4'});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    const maxWidth = pageWidth - margin * 2;
    const lineGap = 16;
    const blockGap = 12;
    let y = margin;

    const colors = {
      title:[14,29,46],
      body:[46,69,92],
      muted:[94,113,138],
      teal:[24,140,126],
      green:[38,166,91],
      red:[220,80,86],
      amber:[193,132,26]
    };

    function ensureSpace(heightNeeded=40){
      if(y + heightNeeded <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    }

    function writeWrapped(text, opts={}){
      const {
        size=11,
        color=colors.body,
        style='normal',
        gap=lineGap
      } = opts;
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), maxWidth);
      const height = Math.max(gap, lines.length * (size + 3));
      ensureSpace(height + 4);
      doc.text(lines, margin, y);
      y += height;
    }

    function writeRule(){
      ensureSpace(10);
      doc.setDrawColor(220, 227, 236);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
    }

    const groups = getResultGroups();
    const correctCount = groups.correct.length;
    const incorrectCount = groups.incorrect.length;
    const unansweredCount = groups.unanswered.length;
    const pct = pool.length ? Math.round(100 * correctCount / pool.length) : 0;
    const bankLabel = UI.bankTag.textContent.replace(/\s+/g,' ').trim() || 'MCQ Quiz Loader';

    writeWrapped('MCQ Quiz Loader Results', {size:20, style:'bold', color:colors.title, gap:24});
    writeWrapped(bankLabel, {size:11, color:colors.teal, style:'bold'});
    writeWrapped(`Score: ${pct}% · ${correctCount} correct out of ${pool.length}`, {size:11, style:'bold'});
    writeWrapped(`Correct: ${correctCount} · Incorrect: ${incorrectCount} · Missed / unanswered: ${unansweredCount}`, {size:10, color:colors.muted});
    writeWrapped(`Generated: ${new Date().toLocaleString()}`, {size:10, color:colors.muted});
    y += 4;
    writeRule();

    const sectionConfigs = [
      ['Correct Answers', groups.correct, colors.green],
      ['Incorrect Answers', groups.incorrect, colors.red],
      ['Missed / Unanswered', groups.unanswered, colors.amber],
    ];

    sectionConfigs.forEach(([title, items, color])=>{
      writeWrapped(`${title} (${items.length})`, {size:15, style:'bold', color, gap:20});
      if(!items.length){
        writeWrapped('None in this category.', {size:10, color:colors.muted});
        y += 2;
        return;
      }
      items.forEach((q, index)=>{
        const chosen = answers.get(q.id);
        writeWrapped(`${index + 1}. ${q.stem}`, {size:12, style:'bold', color:colors.title, gap:18});
        writeWrapped(`Your answer: ${answerTextFor(q, chosen)}`, {size:10});
        writeWrapped(`Correct answer: ${answerTextFor(q, q.answer)}`, {size:10, style:'bold'});
        if(q.explanation){
          writeWrapped(`Explanation: ${q.explanation}`, {size:10, color:colors.body});
        }
        y += 2;
        writeRule();
      });
      y += blockGap;
    });

    doc.save(`${safeFilename(bankLabel)}-results.pdf`);
    showToast('Results PDF downloaded.','success');
  }catch(err){
    console.error(err);
    showToast('Could not generate the PDF right now.','error');
  }finally{
    UI.downloadBtn.innerHTML = originalLabel;
    UI.downloadBtn.disabled = !submitted || !pool.length;
  }
}

function getVisibleQuestions(){
  if(!submitted) return pool;
  const filter=UI.reviewFilter.value;
  if(filter==='all') return pool;
  return pool.filter(q=>getReviewState(q)===filter);
}

function updateReviewFilterUI(){
  const shouldShow=submitted && pool.length>0;
  UI.reviewFilterWrap.classList.toggle('hidden', !shouldShow);
  if(!shouldShow){
    UI.reviewFilter.value='all';
    return;
  }
  const counts=getReviewCounts();
  [...UI.reviewFilter.options].forEach(option=>{
    const count=counts[option.value] ?? 0;
    option.disabled=option.value!=='all' && count===0;
  });
  if(UI.reviewFilter.value!=='all' && (counts[UI.reviewFilter.value] ?? 0)===0){
    UI.reviewFilter.value='all';
  }
}

function getFilteredEmptyMessage(){
  const labelMap = {
    correct: 'No correct questions in this attempt.',
    incorrect: 'No incorrect questions in this attempt.',
    unanswered: 'No missed or unanswered questions in this attempt.'
  };
  return labelMap[UI.reviewFilter.value] || 'No questions match this filter.';
}

function renderQuestion(q, index, total, single){
  const card=document.createElement('div');
  card.className='qcard';
  card.id=`card_${q.id}`;

  // Meta
  const meta=document.createElement('div');
  meta.className='q-meta';
  meta.innerHTML = `<span class="q-tag num">Q${index+1} / ${total}</span><span class="q-tag">${q.topic}</span><span class="q-tag ${diffClass(q.diff)}">${q.diff}</span>`;

  // Stem
  const stem=document.createElement('div');
  stem.className='q-stem';
  stem.textContent=q.stem;

  // Choices
  const choicesDiv=document.createElement('div');
  choicesDiv.className='choices';
  if(!choiceMaps.has(q.id)) choiceMaps.set(q.id,buildChoiceMap(q));
  const map=choiceMaps.get(q.id);

  map.forEach((origIdx,dispIdx)=>{
    const txt=q.choices[origIdx];
    const label=document.createElement('label');
    label.className='choice-label';
    label.htmlFor=`${q.id}_${dispIdx}`;
    const checked=answers.get(q.id)===origIdx;
    if(checked) label.classList.add('selected');
    label.innerHTML = `
      <input type="radio" name="${q.id}" id="${q.id}_${dispIdx}" value="${dispIdx}" ${checked?'checked':''} ${submitted?'disabled':''}>
      <div class="choice-letter">${indexToLabel(dispIdx)}</div>
      <div class="choice-text">${escHtml(String(txt))}</div>`;
    choicesDiv.appendChild(label);
  });

  choicesDiv.addEventListener('click',(e)=>{
    if(submitted) return;
    const label=e.target.closest('.choice-label');
    if(!label) return;
    const input=label.querySelector(`input[name="${q.id}"]`);
    if(!input) return;
    const dispIdx=parseInt(input.value,10);
    const origIdx=map[dispIdx];
    if(answers.get(q.id)!==origIdx) return;
    e.preventDefault();
    input.checked=false;
    answers.delete(q.id);
    card.querySelectorAll('.choice-label').forEach(l=>l.classList.remove('selected'));
    updateTop();
  });

  choicesDiv.addEventListener('change',()=>{
    if(submitted) return;
    const sel=card.querySelector(`input[name="${q.id}"]:checked`);
    if(!sel) return;
    const dispIdx=parseInt(sel.value,10);
    const origIdx=map[dispIdx];
    answers.set(q.id,origIdx);
    // Update selected styles
    card.querySelectorAll('.choice-label').forEach(l=>l.classList.remove('selected'));
    sel.closest('.choice-label').classList.add('selected');
    updateTop();
  });

  // Explanation
  const explain=document.createElement('div');
  explain.className='explanation';
  explain.id=`exp_${q.id}`;

  card.appendChild(meta);
  card.appendChild(stem);
  card.appendChild(choicesDiv);

  // Navigation (one-by-one mode)
  if(single){
    const nav=document.createElement('div');
    nav.className='q-nav';

    const prev=document.createElement('button');
    prev.className='btn btn-ghost';
    prev.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Prev`;
    prev.disabled=(cursor===0);
    prev.onclick=()=>{ cursor=clamp(cursor-1,0,total-1); render(); };

    const progressTxt=document.createElement('span');
    progressTxt.className='q-progress-text';
    const answered=[...answers.keys()].filter(k=>pool.some(q=>q.id===k)).length;
    progressTxt.textContent=`${answered} of ${total} answered`;

    const next=document.createElement('button');
    next.className='btn btn-ghost';
    next.innerHTML = `Next <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`;
    next.disabled=(cursor===total-1);
    next.onclick=()=>{ cursor=clamp(cursor+1,0,total-1); render(); };

    nav.appendChild(prev);
    nav.appendChild(progressTxt);
    nav.appendChild(next);
    card.appendChild(nav);
  }

  card.appendChild(explain);
  return card;
}

function escHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function render(){
  UI.quiz.innerHTML='';
  UI.results.style.display='none';
  updateReviewFilterUI();

  if(!pool.length){
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
    updateTop();
    UI.downloadBtn.disabled = true;
    return;
  }

  const visiblePool=getVisibleQuestions();
  const display=UI.displayMode.value;
  if(!visiblePool.length){
    UI.quiz.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8"></circle><path d="M9.5 9.5h.01M14.5 9.5h.01M9 15c.9-.9 1.9-1.4 3-1.4 1.1 0 2.1.5 3 1.4"></path>
          </svg>
        </div>
        <h3>Nothing to show</h3>
        <p>${getFilteredEmptyMessage()}</p>
      </div>`;
    updateTop();
    if(submitted){
      showResults();
    }
    return;
  }

  if(display==='one'){
    cursor=clamp(cursor,0,visiblePool.length-1);
    UI.quiz.appendChild(renderQuestion(visiblePool[cursor],cursor,visiblePool.length,true));
  } else {
    visiblePool.forEach((q,i)=>UI.quiz.appendChild(renderQuestion(q,i,visiblePool.length,false)));
  }

  UI.submitBtn.disabled=false;
  UI.downloadBtn.disabled=!submitted;
  updateTop();
  updateReviewFilterUI();

  if(submitted){
    applyFeedback();
    showResults();
  }
}

function applyFeedback(){
  wrongIDs=new Set();
  pool.forEach(q=>{
    const card=document.getElementById(`card_${q.id}`);
    if(!card) return;
    const labels=card.querySelectorAll('.choice-label');
    labels.forEach(l=>l.classList.remove('correct','wrong'));

    const map=choiceMaps.get(q.id);
    const chosen=answers.get(q.id);
    const correct=q.answer;
    const exp=document.getElementById(`exp_${q.id}`);

    if(chosen===undefined){
      wrongIDs.add(q.id);
      if(UI.showExp.checked){
        exp.style.display='block';
        exp.className='explanation wrong-exp';
        exp.innerHTML=`<div class="exp-label" style="color:var(--amber)">Not answered</div>${escHtml(q.explanation)||'No explanation provided.'}`;
      }
      return;
    }

    const chosenDisp=map.indexOf(chosen);
    const correctDisp=map.indexOf(correct);
    const chosenLabel=card.querySelector(`label[for="${q.id}_${chosenDisp}"]`);
    const correctLabel=card.querySelector(`label[for="${q.id}_${correctDisp}"]`);

    if(chosen===correct){
      if(chosenLabel) chosenLabel.classList.add('correct');
      if(UI.showExp.checked){
        exp.style.display='block';
        exp.className='explanation correct-exp';
        exp.innerHTML=`<div class="exp-label" style="color:var(--green)">Correct ✓</div>${escHtml(q.explanation)||'No explanation provided.'}`;
      }
    } else {
      wrongIDs.add(q.id);
      if(chosenLabel) chosenLabel.classList.add('wrong');
      if(correctLabel) correctLabel.classList.add('correct');
      if(UI.showExp.checked){
        exp.style.display='block';
        exp.className='explanation wrong-exp';
        exp.innerHTML=`<div class="exp-label" style="color:var(--red)">Incorrect ✗</div><div style="margin-bottom:6px;font-size:12px;color:var(--text-3)">Correct answer: <b style="color:var(--text)">${escHtml(q.choices[correct])}</b></div>${escHtml(q.explanation)||'No explanation provided.'}`;
      }
    }
  });
}

function showResults(){
  const total=pool.length;
  let correct=0;
  pool.forEach(q=>{ if(answers.get(q.id)===q.answer) correct++; });
  const pct=total ? Math.round(100*correct/total) : 0;

  UI.scoreBig.textContent=`${pct}%`;
  UI.scoreDetail.textContent=`${correct} correct out of ${total}`;
  UI.scoreMsg.textContent=pct>=90
    ? 'Excellent work. Consider increasing the limit or drilling wrong-only.'
    : pct>=75
    ? 'Good progress. Hit Retry Wrong to master weak spots.'
    : 'Keep going. Review explanations and retry the ones you missed.';

  UI.wrongList.innerHTML='';
  if(wrongIDs.size){
    UI.wrongBlock.classList.remove('hidden');
    [...wrongIDs].forEach(id=>{
      const q=pool.find(x=>x.id===id);
      const li=document.createElement('li');
      li.textContent=q?q.stem:id;
      UI.wrongList.appendChild(li);
    });
    UI.retryBtn.disabled=false;
  } else {
    UI.wrongBlock.classList.add('hidden');
    UI.retryBtn.disabled=true;
  }

  UI.downloadBtn.disabled=false;
  UI.results.style.display='block';
  UI.results.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function buildPool(fromWrong=false){
  submitted=false;
  UI.results.style.display='none';
  UI.reviewFilter.value='all';
  UI.downloadBtn.disabled=true;
  poolName=fromWrong?'Wrong':'Full';
  let arr=fromWrong?bank.filter(q=>wrongIDs.has(q.id)):bank.slice();
  if(UI.shuffleQ.checked) shuffleArray(arr);
  let lim=parseInt(UI.limit.value,10);
  if(Number.isNaN(lim)||lim<1) lim=50;
  const maxQuestions = Math.max(1, bank.length || 1);
  UI.limit.max = String(maxQuestions);
  lim=Math.max(1,Math.min(maxQuestions,lim));
  UI.limit.value=lim;
  pool=arr.slice(0,lim);
  cursor=clamp(cursor,0,Math.max(0,pool.length-1));
  choiceMaps=new Map();
  const keep=new Map();
  for(const [id,val] of answers.entries()) if(pool.some(q=>q.id===id)) keep.set(id,val);
  answers=keep;
  render();
}

async function onLoad(){
  const f=UI.file.files[0];
  if(!f){ showToast('Choose a .xlsx or .csv file first.','error'); return; }
  UI.loadBtn.disabled=true;
  UI.loadBtn.textContent='Loading…';
  try{
    const loaded=await loadBankFromFile(f);
    if(!loaded.length){
      showToast('No valid questions found — check column names.','error');
      return;
    }
    bank=loaded;
    UI.limit.max = String(Math.max(1, loaded.length));
    UI.limit.value = String(Math.max(1, loaded.length));
    const pill=UI.bankTag;
    pill.innerHTML=`<div class="dot"></div>${escHtml(f.name)} (${loaded.length})`;
    buildPool(false);
    showToast(`Loaded ${loaded.length} questions successfully.`,'success');
  }catch(e){
    showToast(e.message,'error');
  } finally {
    UI.loadBtn.disabled=false;
    UI.loadBtn.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg> Load Bank`;
  }
}

function onSubmit(){
  if(!pool.length) return;
  if(UI.requireAll.checked){
    const unanswered=pool.filter(q=>answers.get(q.id)===undefined);
    if(unanswered.length){
      showToast(`${unanswered.length} question(s) still unanswered.`,'error');
      return;
    }
  }
  submitted=true;
  UI.reviewFilter.value='all';
  applyFeedback();
  showResults();
  updateReviewFilterUI();
  render();
}

function onReset(){
  bank=[];pool=[];poolName='Full';cursor=0;submitted=false;
  wrongIDs=new Set();answers=new Map();choiceMaps=new Map();
  UI.bankTag.innerHTML=`<div class="dot"></div>No bank loaded`;
  UI.submitBtn.disabled=true;UI.retryBtn.disabled=true;UI.downloadBtn.disabled=true;
  UI.limit.value='50';
  UI.limit.max='500';
  UI.fileNameDisplay.style.display='none';
  UI.filePlaceholder.style.display='inline';
  UI.file.value='';
  UI.reviewFilter.value='all';
  UI.quiz.innerHTML='';
  UI.results.style.display='none';
  render();
  showToast('Quiz reset.');
}

function openModal(id){
  const modal=document.getElementById(id);
  if(!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}

function closeModal(id){
  const modal=document.getElementById(id);
  if(!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  if(!document.querySelector('.modal.show')){
    document.body.style.overflow='';
  }
}

async function copyPrompt(targetId){
  const el=document.getElementById(targetId);
  if(!el) return;
  try{
    await navigator.clipboard.writeText(el.value);
    showToast('Prompt copied.','success');
  }catch{
    el.select();
    document.execCommand('copy');
    showToast('Prompt copied.','success');
  }
}

UI.loadBtn.addEventListener('click',onLoad);
UI.submitBtn.addEventListener('click',onSubmit);
UI.retryBtn.addEventListener('click',()=>buildPool(true));
UI.downloadBtn.addEventListener('click',downloadResultsPdf);
UI.resetBtn.addEventListener('click',onReset);
UI.displayMode.addEventListener('change',render);
UI.reviewFilter.addEventListener('change',()=>{
  const counts=getReviewCounts();
  const selected=UI.reviewFilter.value;
  if(submitted && selected!=='all' && (counts[selected] ?? 0)===0){
    showToast(getFilteredEmptyMessage() + ' Showing all questions instead.','error');
    UI.reviewFilter.value='all';
  }
  render();
});
UI.shuffleQ.addEventListener('change',()=>{ if(bank.length) buildPool(poolName==='Wrong'); });
UI.shuffleC.addEventListener('change',()=>{ if(pool.length){ choiceMaps=new Map(); render(); } });
UI.showExp.addEventListener('change',()=>{ if(pool.length) render(); });
UI.limit.addEventListener('change',()=>{ if(bank.length) buildPool(poolName==='Wrong'); });
document.getElementById('btnHelp').addEventListener('click',()=>openModal('helpModal'));
document.getElementById('btnGuide').addEventListener('click',()=>openModal('guideModal'));
document.getElementById('btnCloseHelp').addEventListener('click',()=>closeModal('helpModal'));
document.getElementById('btnCloseGuide').addEventListener('click',()=>closeModal('guideModal'));
document.querySelectorAll('[data-close-modal]').forEach(node=>{
  node.addEventListener('click',()=>closeModal(node.getAttribute('data-close-modal')));
});
document.querySelectorAll('.copy-btn').forEach(btn=>{
  btn.addEventListener('click',()=>copyPrompt(btn.getAttribute('data-copy-target')));
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  closeModal('helpModal');
  closeModal('guideModal');
});
render();
