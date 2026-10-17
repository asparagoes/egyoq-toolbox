(() => {
'use strict';
const data = window.ONBOARDING;
const config = window.VA_FORM_CONFIG || {};
const sections = data.sections;
const allItems = sections.flatMap(section => section.items.map(item => ({...item, sectionTitle: section.title})));
const STORAGE = config.storageKey || 'va-onboarding-proposal-v2';
const labels = { agree: 'Agree', change: 'Suggest changes', discuss: 'Discuss during onboarding' };
const root = document.getElementById('section-content');
const notice = document.getElementById('notice');
const iconPaths = {
  agree: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1.06 14.06-3.53-3.53 1.41-1.41 2.12 2.12 4.95-4.95 1.41 1.41-6.36 6.36Z',
  change: 'M14.06 9.02 14.98 9.94 5.92 19H5v-.92l9.06-9.06ZM17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83a.996.996 0 0 0 0-1.41l-2.34-2.34A.97.97 0 0 0 17.66 3ZM3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25Z',
  discuss: 'M4 4h16v12H5.17L4 17.17V4Zm2 2v6h12V6H6Zm0 8h10v-2H6v2Z'
  };
const state = {
  step: 0,
  answers: {},
  comments: {},
  duties: Object.fromEntries(data.duties.map(item => [item[0], item[2]])),
  facts: {
    employerName: data.employerName,
    employerRole: data.employerRole,
    virtualAssistantName: data.virtualAssistantName,
    virtualAssistantRole: data.virtualAssistantRole
  }
};

try {
  const saved = JSON.parse(sessionStorage.getItem(STORAGE) || 'null');
  if (saved && typeof saved === 'object') {
    Object.assign(state.answers, saved.answers || {});
    Object.assign(state.comments, saved.comments || {});
    Object.assign(state.duties, saved.duties || {});
    Object.assign(state.facts, saved.facts || {});
    if (typeof saved.step === 'number') state.step = saved.step;
  }
} catch (_) {}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const slug = value => String(value).replace(/[^a-z0-9_-]+/ig, '-');

function save() {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify({
      step: state.step,
      answers: state.answers,
      comments: state.comments,
      duties: state.duties,
      facts: state.facts
    }));
  } catch (_) {}
}

function showNotice(message, type = 'error') {
  notice.hidden = false;
  notice.className = `notice ${type === 'success' ? 'success' : ''}`.trim();
  notice.textContent = message;
  notice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearNotice() {
  notice.hidden = true;
  notice.textContent = '';
  notice.className = 'notice';
}

function optionIcon(type) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[type]}"></path></svg>`;
}

function identitySummary() {
  document.getElementById('identity-summary').innerHTML = `
    <div class="identity-card">
      <span class="label">Employer</span>
      <span class="name">${esc(state.facts.employerName || data.employerName)}</span>
      <span class="role">${esc(state.facts.employerRole || data.employerRole)}</span>
    </div>
    <div class="identity-card">
      <span class="label">Virtual Assistant</span>
      <span class="name">${esc(state.facts.virtualAssistantName || data.virtualAssistantName)}</span>
      <span class="role">${esc(state.facts.virtualAssistantRole || data.virtualAssistantRole)}</span>
    </div>`;
}

function field(label, id, options = {}) {
  const type = options.type || 'text';
  const value = esc(state.facts[id] || options.value || '');
  const helper = options.helper ? `<div class="helper">${esc(options.helper)}</div>` : '';
  if (type === 'textarea') {
    return `<div class="field"><label for="${id}">${esc(label)}</label><textarea id="${id}" data-fact="${id}" placeholder="${esc(options.placeholder || '')}">${value}</textarea>${helper}</div>`;
  }
  if (type === 'select') {
    return `<div class="field"><label for="${id}">${esc(label)}</label><select id="${id}" data-fact="${id}">${(options.choices || []).map(choice => `<option value="${esc(choice)}" ${state.facts[id] === choice ? 'selected' : ''}>${esc(choice)}</option>`).join('')}</select>${helper}</div>`;
  }
  return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" data-fact="${id}" type="${esc(type)}" value="${value}" placeholder="${esc(options.placeholder || '')}">${helper}</div>`;
}

function introSection() {
  return `
    <div class="intro-grid">
      <div class="info-card">
        <h3>Who this proposal is for</h3>
        <p><strong>Employer:</strong> ${esc(state.facts.employerName || data.employerName)} — ${esc(state.facts.employerRole || data.employerRole)}</p>
        <p><strong>Virtual Assistant:</strong> ${esc(state.facts.virtualAssistantName || data.virtualAssistantName)} — ${esc(state.facts.virtualAssistantRole || data.virtualAssistantRole)}</p>
        <div class="tag-row">
          <span class="chip yellow">Personal + business support</span>
          <span class="chip mint">Creative coordination</span>
          <span class="chip pink">Flexible availability</span>
        </div>
      </div>
      <div class="summary-card">
        <h3>What the Employer can do here</h3>
        <ul class="info-list">
          <li>Review each proposal and select <strong>Agree</strong>, <strong>Suggest changes</strong>, or <strong>Discuss during onboarding</strong>.</li>
          <li>Enter practical details such as tools, collaborators, access needs, and immediate priorities.</li>
          <li>Preview the completed response summary as a PDF before final submission.</li>
          <li>If certain information is easier to send through iMessage or email later, that can be noted in the form.</li>
        </ul>
      </div>
    </div>`;
}

function trackerSampleTable() {
  const sample = data.trackerSample;
  return `
    <div class="sample-wrap">
      <h3>Sample tracker layout</h3>
      <p>This sample is only to illustrate how the proposed Google Sheets tracker might be organized.</p>
      <table class="sample-table">
        <thead><tr>${sample.columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead>
        <tbody>${sample.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function extraContent(section) {
  let html = '';
  if (section.introMode) {
    html += introSection();
    html += `<div class="fact-panel"><h3>Parties</h3><div class="grid-fields">${field('Employer name','employerName')}${field('Employer role / title','employerRole')}</div><div class="grid-fields">${field('Virtual Assistant name','virtualAssistantName')}${field('Virtual Assistant role / title','virtualAssistantRole')}</div></div>`;
  }
  if (section.checklist) {
    html += `<div class="fact-panel"><h3>Proposed duty levels</h3><p>These are the Virtual Assistant's suggested starting levels. The Employer may adjust them.</p><table class="duty-table"><thead><tr><th>Responsibility</th><th>Suggested level</th></tr></thead><tbody>${data.duties.map(duty => `<tr><td>${esc(duty[1])}</td><td><select aria-label="${esc(duty[1])}" data-duty="${esc(duty[0])}">${['Primary','As needed','Not assigned','Discuss'].map(level => `<option value="${level}" ${state.duties[duty[0]] === level ? 'selected' : ''}>${level}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (section.facts) {
    const group = (number, title, description, body) => `
      <section class="details-group" aria-labelledby="details-group-${number}">
        <div class="details-group-heading">
          <span class="details-number" aria-hidden="true">${number}</span>
          <div>
            <h3 id="details-group-${number}">${title}</h3>
            <p>${description}</p>
          </div>
        </div>
        <div class="details-group-fields">${body}</div>
      </section>`;
    const accessStatuses = ['Choose status', 'Already granted', 'Grant access later', 'Not needed', 'Discuss during onboarding'];
    const accessRows = [
      ['accessBusinessEmail', 'Business email / support inbox', 'For assigned messages and customer inquiries'],
      ['accessCalendar', 'Calendar / scheduling', 'For appointments, reminders and meeting coordination'],
      ['accessFiles', 'Shared files / trackers', 'For documents, brand assets and task management'],
      ['accessSocial', 'Social media / creative accounts', 'For approved content and coordination'],
      ['accessPlatform', 'Application / website tools', 'For occasional testing or authorized administration']
    ];
    const accessMatrix = `
      <div class="access-matrix" role="group" aria-label="Access requirements">
        <div class="access-matrix-header"><span>Account or workspace</span><span>Access decision</span></div>
        ${accessRows.map(([id, label, hint]) => `
          <div class="access-matrix-row">
            <div class="access-matrix-label"><label for="${id}">${label}</label><p>${hint}</p></div>
            <select id="${id}" data-fact="${id}">
              ${accessStatuses.map(status => `<option value="${esc(status)}" ${state.facts[id] === status ? 'selected' : ''}>${esc(status)}</option>`).join('')}
            </select>
          </div>`).join('')}
      </div>`;
    html += `
      <div class="details-overview">
        <strong>What to fill in</strong>
        <p>Tell the Virtual Assistant who is involved, which tools already exist, and which accounts need access. Fill only what you know; missing details can be sent later through iMessage or email.</p>
        <p class="details-known"><strong>Already mentioned:</strong> zcal, iMessage, application beta access and existing brand materials. You do not need to provide these again.</p>
      </div>
      ${group('01', 'People & collaborators', 'Who else works with you, and who might the Virtual Assistant coordinate with?', `
        ${field('Current team situation', 'teamStatus', {type:'select', choices:['Choose an option','No other contributors','Existing employees / contractors','Planning to hire','Both existing and planned contributors','Not sure / discuss later']})}
        ${field('Existing or planned roles (optional)', 'team', {type:'textarea', placeholder:'Example: Social media designer — considering; video editor — currently freelance', helper:'Roles and status are sufficient. Names are optional.'})}
        ${field('Who should the Virtual Assistant coordinate with? (optional)', 'coordination', {placeholder:'Example: Social media designer for approved briefs and reviews'})}
      `)}
      ${group('02', 'Current systems & tools', 'Identify tools already in use, so nothing unnecessary is set up or replaced.', `
        <div class="grid-fields">
          ${field('Scheduling / calendars', 'calendarTools', {placeholder:'Example: zcal; another calendar if applicable'})}
          ${field('Email / communication', 'inboxTools', {placeholder:'Example: iMessage; business inbox if used'})}
          ${field('Files / task tracking', 'workTools', {placeholder:'Example: Google Drive, Sheets, Notion, if used'})}
          ${field('Social / app / other tools', 'tools', {placeholder:'Example: website admin, social accounts, beta dashboard'})}
        </div>
        <p class="details-footnote">List tool names or purposes only. No passwords, recovery codes or banking details.</p>
      `)}
      ${group('03', 'Access & permissions', 'Indicate the access level needed. Granting an account is a separate, authorized step.', `
        ${accessMatrix}
        ${field('Any specific permissions or limits? (optional)', 'access', {type:'textarea', placeholder:'Example: View calendar and send confirmations; no permission to cancel appointments without approval'})}
      `)}
      ${group('04', 'Sharing details & next steps', 'Choose how the Virtual Assistant should receive missing information and follow up.', `
        <div class="grid-fields">
          ${field('How would you like to share remaining details?', 'accessMethod', {type:'select', choices:['Choose a method','Send later through iMessage','Send later through email','Share through an existing folder','Discuss during onboarding','No additional details needed'], helper:'Access credentials should be shared using an appropriate secure method, not entered here.'})}
          ${field('Preferred channel for follow-ups', 'channel', {type:'select', choices:['Choose a channel','iMessage (current)','Email','Either iMessage or email','Discuss during onboarding']})}
        </div>
        ${field('Where should the Virtual Assistant look for shared links/files? (optional)', 'sendWhere', {placeholder:'Example: Existing iMessage thread or shared Drive folder'})}
        ${field('Other instructions or restrictions (optional)', 'restrictions', {type:'textarea', placeholder:'Anything to clarify during onboarding or keep restricted to authorized people'})}
      `)}
      <p class="details-endnote">This section is an inventory and a permission request—not a place to enter passwords or personal financial information.</p>`;
  }
  if (section.sampleTracker) {
    html += trackerSampleTable();
  }
  if (section.finalFacts) {
    html += `<div class="fact-panel"><h3>Final details</h3><div class="grid-fields">${field('Proposed start date','start',{type:'date'})}${field('Weekly payment day / method','payment',{placeholder:'e.g. Fridays through current arrangement'})}</div><div class="grid-fields">${field('Immediate priorities to delegate','priorities',{placeholder:'Top 1–3 priorities'})}${field('Other follow-ups','followups',{placeholder:'Access, files, or actions still pending'})}</div>${field('Final notes for onboarding discussion','notes',{type:'textarea',placeholder:'Optional summary or unresolved points.'})}</div>`;
  }
  return html;
}

function proposalCard(item) {
  const chosen = state.answers[item.id] || '';
  return `
    <article class="proposal">
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      <div class="options" role="group" aria-label="Response options for ${esc(item.title)}">
        ${Object.entries(labels).map(([value,label]) => `
          <button type="button" class="choice-btn" data-answer="${item.id}" data-value="${value}" aria-pressed="${chosen === value}">
            ${optionIcon(value)} <span>${esc(label)}</span>
          </button>`).join('')}
      </div>
      <div class="comment" id="comment-${esc(item.id)}" ${chosen === 'change' || chosen === 'discuss' ? '' : 'hidden'}>
        <label for="text-${esc(item.id)}">${chosen === 'change' ? 'Suggested change' : 'Discussion note'}</label>
        <textarea id="text-${esc(item.id)}" data-comment="${esc(item.id)}" placeholder="Optional notes...">${esc(state.comments[item.id] || '')}</textarea>
      </div>
    </article>`;
}

function renderNav() {
  const nav = document.getElementById('section-nav');
  nav.innerHTML = sections.map((section, index) => `
    <button type="button" data-nav="${index}" class="${index === state.step ? 'active' : ''}">
      <span class="step-number">${index + 1}</span>
      <span>${esc(section.title)}</span>
    </button>`).join('');
  nav.querySelectorAll('[data-nav]').forEach(button => button.onclick = () => moveTo(Number(button.dataset.nav)));
  const completed = sections.filter(section => section.items.every(item => state.answers[item.id])).length;
  document.getElementById('progress-bar').style.width = `${(completed / sections.length) * 100}%`;
  document.getElementById('progress-label').textContent = `${completed} of ${sections.length} sections answered`;
}

function reviewSection() {
  const answered = allItems.filter(item => state.answers[item.id]).length;
  const unanswered = allItems.length - answered;
  const pending = allItems.filter(item => state.answers[item.id] === 'change' || state.answers[item.id] === 'discuss' || !state.answers[item.id]);
  return `
    <section class="review-panel">
      <h3>Review before submission</h3>
      <p>${answered} of ${allItems.length} proposals have a recorded response. ${unanswered ? `Unanswered items will be marked as pending.` : 'All proposals have a response.'}</p>
      <ul class="review-list">
        <li><span class="status">Agreed:</span> ${allItems.filter(item => state.answers[item.id] === 'agree').length}</li>
        <li><span class="status">Suggest changes:</span> ${allItems.filter(item => state.answers[item.id] === 'change').length}</li>
        <li><span class="status">Discuss during onboarding:</span> ${allItems.filter(item => state.answers[item.id] === 'discuss').length}</li>
        <li><span class="status">Pending / unanswered:</span> ${unanswered}</li>
      </ul>
    </section>
    <section class="review-panel">
      <h3>Items that may still need discussion</h3>
      <ul class="review-list">${pending.length ? pending.map(item => `<li><strong>${esc(item.title)}</strong> — ${esc(labels[state.answers[item.id]] || 'Pending / unanswered')}</li>`).join('') : '<li>No pending discussion items.</li>'}</ul>
    </section>
    <div class="submit-strip">
      <button type="button" class="action-btn secondary" id="preview-pdf">Preview results as PDF</button>
      <button type="button" class="action-btn warn" id="edit-responses">Edit responses again</button>
      <button type="button" class="action-btn primary" id="submit-responses">Submit responses</button>
    </div>
    <p class="legend-note"><strong>Email delivery: Cloudflare Worker</strong> · Submitting generates a PDF attachment and sends it to the Virtual Assistant. You stay on this page, and your answers remain editable.</p>
    ${window.location.protocol === 'file:' ? '<p class="local-preview-warning" role="note"><strong>Local file preview:</strong> PDF preview works here, but Email submission is unavailable from a <code>file://</code> page. Use the included local server or publish the page to GitHub Pages to test email delivery.</p>' : ''}`;
}

function renderSection() {
  clearNotice();
  const section = sections[state.step];
  identitySummary();
  document.getElementById('step-label').textContent = `Section ${state.step + 1} of ${sections.length}`;
  document.getElementById('section-title').textContent = section.title;
  document.getElementById('section-intro').textContent = section.intro;
  const content = `
    ${section.items.length ? `<div class="proposal-list">${section.items.map(proposalCard).join('')}</div>` : ''}
    ${extraContent(section)}
    ${state.step === sections.length - 1 ? reviewSection() : ''}`;
  root.innerHTML = content;

  root.querySelectorAll('[data-answer]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.answer;
      const value = button.dataset.value;
      // Clicking the active choice again clears it, rather than locking a selection in.
      // Native buttons also support Enter and Space without special keyboard handlers.
      if (state.answers[id] === value) {
        delete state.answers[id];
      } else {
        state.answers[id] = value;
      }
      const chosen = state.answers[id] || '';
      button.closest('.options').querySelectorAll('[data-answer]').forEach(option => {
        option.setAttribute('aria-pressed', String(option.dataset.value === chosen));
      });
      const comment = document.getElementById(`comment-${id}`);
      if (comment) {
        comment.hidden = !(chosen === 'change' || chosen === 'discuss');
        const label = comment.querySelector('label');
        if (label) label.textContent = chosen === 'change' ? 'Suggested change' : 'Discussion note';
      }
      save();
      renderNav();
    });
  });
  root.querySelectorAll('[data-comment]').forEach(textarea => textarea.addEventListener('input', () => {
    state.comments[textarea.dataset.comment] = textarea.value;
    save();
  }));
  root.querySelectorAll('[data-duty]').forEach(select => select.addEventListener('change', () => {
    state.duties[select.dataset.duty] = select.value;
    save();
  }));
  root.querySelectorAll('[data-fact]').forEach(input => input.addEventListener('input', () => {
    state.facts[input.dataset.fact] = input.value;
    save();
    if (['employerName','employerRole','virtualAssistantName','virtualAssistantRole'].includes(input.dataset.fact)) identitySummary();
  }));

  if (state.step === sections.length - 1) {
    document.getElementById('preview-pdf').onclick = previewPdf;
    document.getElementById('edit-responses').onclick = () => moveTo(0);
    document.getElementById('submit-responses').onclick = submitResponses;
  }

  document.getElementById('prev').disabled = state.step === 0;
  const nextButton = document.getElementById('next');
  nextButton.hidden = state.step === sections.length - 1;
  if (!nextButton.hidden) nextButton.textContent = 'Next section';
  renderNav();
  save();
}

function moveTo(index) {
  state.step = Math.max(0, Math.min(sections.length - 1, index));
  renderSection();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('prev').onclick = () => moveTo(state.step - 1);
document.getElementById('next').onclick = () => {
  if (state.step < sections.length - 1) moveTo(state.step + 1);
};

function createPdfBlob() {
  if (typeof window.createOnboardingPdf !== 'function') {
    throw new Error('Local PDF generator is unavailable. Reload the page and try again.');
  }
  return window.createOnboardingPdf({data, sections, allItems, state, labels});
}

function previewPdf() {
  try {
    const blob = createPdfBlob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    showNotice('PDF preview opened in a new tab.', 'success');
  } catch (error) {
    showNotice(`Unable to generate the PDF preview: ${error.message}`);
  }
}

async function submitResponses() {
  if (!/^https?:$/.test(window.location.protocol)) {
    showNotice('Open this form on GitHub Pages or a local web server to submit. PDF preview still works offline.');
    return;
  }
  const endpoint = String(config.workerEndpoint || '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/?$/i.test(endpoint)) {
    showNotice('Enter your Cloudflare Worker URL in config.js before submitting.');
    return;
  }
  const unanswered = allItems.filter(item => !state.answers[item.id]).length;
  if (unanswered && !window.confirm(`${unanswered} proposal(s) are still unanswered. Submit anyway?`)) return;
  const button = document.getElementById('submit-responses');
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Sending PDF…';
  try {
    const blob = createPdfBlob();
    if (blob.size > 1_000_000) throw new Error('The PDF is too large for the current Worker limit (1 MB).');
    const pdfBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the PDF.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfBase64 })
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok || result.success !== true) {
      throw new Error(result.error || `Email service returned HTTP ${response.status}.`);
    }
    showNotice('Your PDF submission was accepted by the email service. The Virtual Assistant will verify the attachment arrives in Gmail.', 'success');
  } catch (error) {
    showNotice(`Submission failed: ${error.message} Your answers are still saved; please try again.`);
  } finally {
    button.disabled = false;
    button.textContent = 'Submit responses';
  }
}

renderSection();
})();
