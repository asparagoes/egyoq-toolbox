/*
 * Dependency-free, browser-side PDF renderer for the Employer / Virtual Assistant
 * proposal. Uses standard PDF vector graphics and built-in Helvetica fonts.
 * All PDF content is assembled locally. It is not sent anywhere until the
 * Employer submits the completed form.
 */
(() => {
  'use strict';
  const W = 595.28, H = 841.89, M = 43, CONTENT_W = W - 2 * M;
  const C = {
    ink: [34, 49, 42],
    dark: [34, 53, 44],
    accent: [182, 95, 61],
    accentLight: [250, 238, 229],
    muted: [101, 115, 106],
    border: [222, 229, 222],
    light: [247, 249, 246],
    white: [255, 255, 255],
    agree: [42, 103, 72],
    agreeLight: [230, 243, 233],
    change: [158, 80, 49],
    changeLight: [252, 238, 230],
    discuss: [131, 101, 43],
    discussLight: [253, 246, 223],
    pending: [104, 113, 108],
    pendingLight: [241, 244, 241]
  };
  const num = value => Number(value.toFixed(2)).toString();
  const color = rgb => rgb.map(v => num(v / 255)).join(' ');
  const plain = value => String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[^\t\n\r\x20-\x7e]/g, '?');
  const esc = value => plain(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const canvas = document.createElement('canvas');
  const measureCtx = canvas.getContext('2d');
  function width(text, size = 10, bold = false) {
    const t = plain(text);
    if (!measureCtx) return t.length * size * (bold ? .55 : .49);
    measureCtx.font = `${bold ? '700 ' : ''}${size}px Arial, sans-serif`;
    return measureCtx.measureText(t).width * 1.02;
  }
  function wrap(text, maxWidth, size, bold = false) {
    const lines = [];
    for (const raw of plain(text).split(/\n/)) {
      if (!raw.trim()) { lines.push(''); continue; }
      let current = '';
      for (const word of raw.trim().split(/\s+/)) {
        if (!current) {
          if (width(word, size, bold) <= maxWidth) { current = word; continue; }
          let section = '';
          for (const char of word) {
            if (section && width(section + char, size, bold) > maxWidth) { lines.push(section); section = char; }
            else section += char;
          }
          current = section;
          continue;
        }
        if (width(`${current} ${word}`, size, bold) <= maxWidth) current += ` ${word}`;
        else { lines.push(current); current = word; }
      }
      if (current) lines.push(current);
    }
    return lines;
  }
  class PDF {
    constructor() { this.pages = []; this.page = null; }
    newPage() { this.page = []; this.pages.push(this.page); }
    cmd(value) { this.page.push(value); }
    rect(x, top, w, h, fill, border = null) {
      const y = H - top - h;
      if (fill) this.cmd(`${color(fill)} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`);
      if (border) this.cmd(`${color(border)} RG 0.7 w ${num(x)} ${num(y)} ${num(w)} ${num(h)} re S`);
    }
    line(x1, top1, x2, top2, rgb = C.border, thickness = 1) {
      this.cmd(`${color(rgb)} RG ${num(thickness)} w ${num(x1)} ${num(H-top1)} m ${num(x2)} ${num(H-top2)} l S`);
    }
    text(t, x, top, size = 10, opts = {}) {
      const selected = opts.bold ? 'F2' : 'F1';
      this.cmd(`BT /${selected} ${num(size)} Tf ${color(opts.color || C.ink)} rg 1 0 0 1 ${num(x)} ${num(H-top-size)} Tm (${esc(t)}) Tj ET`);
    }
    lines(lines, x, top, size = 10, lh = 14, opts = {}) {
      lines.forEach((line, index) => this.text(line, x, top + index * lh, size, opts));
    }
    blob() {
      const objects = [];
      const add = data => { objects.push(data); return objects.length; };
      const normalFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const boldFont = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pagesId = add('');
      const pageIds = [];
      for (const commands of this.pages) {
        const stream = commands.join('\n') + '\n';
        const streamId = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
        pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(W)} ${num(H)}] /Resources << /Font << /F1 ${normalFont} 0 R /F2 ${boldFont} 0 R >> >> /Contents ${streamId} 0 R >>`));
      }
      objects[pagesId-1] = `<< /Type /Pages /Kids [${pageIds.map(id => id+' 0 R').join(' ')}] /Count ${pageIds.length} >>`;
      const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let pdf = '%PDF-1.4\n';
      const offsets = [0];
      objects.forEach((obj, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
      for (let i=1;i<=objects.length;i++) pdf += `${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
      pdf += `trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return new Blob([pdf], {type: 'application/pdf'});
    }
  }

  window.createOnboardingPdf = function({data,sections,allItems,state,labels}) {
    const pdf = new PDF();
    let top = 0;
    const fact = id => String(state.facts[id] || '').trim() || 'Not provided';
    const availableHeight = () => H - 59 - top;
    function startPage(cover = false) {
      pdf.newPage();
      if (cover) {
        pdf.rect(0,0,W,216,C.dark);
        pdf.rect(M,32,42,4,C.accent);
        pdf.text('EMPLOYER / VIRTUAL ASSISTANT',M,47,10,{color:C.white,bold:true});
        pdf.text('Creative & Operations',M,80,25,{color:C.white,bold:true});
        pdf.text('Virtual Assistant',M,111,25,{color:C.white,bold:true});
        pdf.text('Onboarding proposal & working arrangements',M,156,11,{color:[221,235,225]});
        pdf.text('Prepared for employer review',M,179,9,{color:[221,235,225]});
        top = 236;
      } else {
        pdf.rect(0,0,W,64,C.dark);
        pdf.rect(0,64,W,3,C.accent);
        pdf.text('CREATIVE & OPERATIONS VIRTUAL ASSISTANT',M,22,9,{bold:true,color:C.white});
        pdf.text('EMPLOYER RESPONSE',W-M-width('EMPLOYER RESPONSE',8,true),24,8,{bold:true,color:[222,235,226]});
        top = 91;
      }
    }
    function need(height) { if (top+height > H-59) startPage(); }
    function infoBox(x, y, w, label, value) {
      pdf.rect(x,y,w,70,C.light,C.border);
      pdf.rect(x,y,3,70,C.accent);
      pdf.text(label.toUpperCase(),x+13,y+11,8,{bold:true,color:C.muted});
      pdf.lines(wrap(value,w-25,11.3,true).slice(0,2),x+13,y+30,11.3,14,{bold:true,color:C.ink});
    }
    function snapshotBox(x, y, w, label, value) {
      pdf.rect(x,y,w,68,C.accentLight);
      pdf.text(value,x+12,y+11,18,{bold:true,color:C.dark});
      pdf.text(label.toUpperCase(),x+12,y+42,7.8,{bold:true,color:C.accent});
    }
    function sectionHeader(index, section) {
      const title = wrap(section.title, CONTENT_W-66,18.2,true);
      const intro = wrap(section.intro, CONTENT_W-66,9.7);
      const height = 52 + title.length*23 + intro.length*15;
      need(height+18);
      pdf.rect(M,top+3,40,34,C.accentLight);
      pdf.text(String(index).padStart(2,'0'),M+11,top+10,15,{bold:true,color:C.accent});
      pdf.text('SECTION ' + String(index).padStart(2,'0') + ' / ' + String(sections.length).padStart(2,'0'), M+57, top+2,8,{bold:true,color:C.accent});
      pdf.lines(title,M+57,top+18,18.2,23,{bold:true,color:C.dark});
      pdf.lines(intro,M+57,top+23+title.length*23,9.7,15,{color:C.muted});
      top += height;
      pdf.line(M,top-7,W-M,top-7,C.border,.7);
    }
    function notePanel(label, text, opts={}) {
      const headingLines = wrap(label,CONTENT_W-24,10.5,true);
      const bodyLines = wrap(text || 'Not provided',CONTENT_W-24,9.2);
      const total = 24+headingLines.length*15+bodyLines.length*13;
      need(total+10);
      pdf.rect(M,top,CONTENT_W,total,C.light,C.border);
      pdf.lines(headingLines,M+12,top+10,10.5,15,{bold:true,color:C.dark});
      pdf.lines(bodyLines,M+12,top+15+headingLines.length*15,9.2,13,{color:C.muted});
      top+=total+10;
    }
    function card(item, sectionNo, itemNo) {
      const titleSize=12.2, bodySize=9.6;
      const widthText=CONTENT_W-39;
      const titleLines=wrap(item.title,widthText,titleSize,true);
      const bodyLines=wrap(item.body,widthText,bodySize);
      const comment=(state.comments[item.id] || '').trim();
      const noteLines=comment?wrap(comment,widthText-19,9.2):[];
      const titleH=titleLines.length*16;
      const bodyH=bodyLines.length*14;
      const noteH=noteLines.length?28+noteLines.length*13:0;
      const cardH=24+titleH+10+bodyH+14+22+noteH+18;
      need(cardH+12);
      const y=top;
      pdf.rect(M,y,CONTENT_W,cardH,C.white,C.border);
      pdf.rect(M,y,3,cardH,C.accent);
      pdf.text(`PROPOSAL ${String(sectionNo).padStart(2,'0')}.${String(itemNo).padStart(2,'0')}`,M+16,y+12,7.8,{bold:true,color:C.accent});
      pdf.lines(titleLines,M+16,y+29,titleSize,16,{bold:true,color:C.dark});
      const bodyStart=y+29+titleH+8;
      pdf.lines(bodyLines,M+16,bodyStart,bodySize,14,{color:[73,88,79]});
      const responseY=bodyStart+bodyH+13;
      pdf.line(M+16,responseY-5,W-M-16,responseY-5,C.border,.6);
      pdf.text('EMPLOYER RESPONSE',M+16,responseY+3,8,{bold:true,color:C.muted});
      const val=state.answers[item.id]||'pending';
      const response=labels[val]||'Pending / unanswered';
      const colors=val==='agree'?[C.agree,C.agreeLight]:val==='change'?[C.change,C.changeLight]:val==='discuss'?[C.discuss,C.discussLight]:[C.pending,C.pendingLight];
      const badgeWidth=Math.min(210, Math.max(69,width(response,8.8,true)+24));
      const badgeX=W-M-16-badgeWidth;
      pdf.rect(badgeX,responseY-2,badgeWidth,22,colors[1]);
      pdf.text(response,badgeX+12,responseY+3,8.8,{bold:true,color:colors[0]});
      if (comment) {
        const panelY=responseY+29;
        const panelH=12+noteLines.length*13+10;
        pdf.rect(M+16,panelY,CONTENT_W-32,panelH,C.light);
        pdf.text('EMPLOYER NOTE',M+26,panelY+8,7.4,{bold:true,color:C.accent});
        pdf.lines(noteLines,M+26,panelY+20,9.2,13,{color:C.ink});
      }
      top+=cardH+12;
    }
    function simpleTable(title, rows, opts={}) {
      need(58);
      pdf.text(title,M,top,12.2,{bold:true,color:C.dark});
      top+=23;
      rows.forEach((row,i)=>{
        const left=wrap(row[0],177,8.6,true);
        const right=wrap(row[1],CONTENT_W-202,9.2);
        const h=Math.max(left.length*12.5,right.length*13)+16;
        need(h+6);
        pdf.rect(M,top,CONTENT_W,h,i%2?C.white:C.light);
        pdf.lines(left,M+10,top+8,8.6,12.5,{bold:true,color:C.muted});
        pdf.lines(right,M+197,top+8,9.2,13,{color:C.ink});
        top+=h;
      });
      top+=17;
    }
    function trackerTable(tracker) {
      need(70);
      pdf.text('Sample tracker layout',M,top,12.5,{bold:true,color:C.dark});
      top+=23;
      const cols=[175,64,119,151],heads=['TASK','PRIORITY','APPROVAL','STATUS'];
      pdf.rect(M,top,CONTENT_W,30,C.dark);
      let pos=M;
      heads.forEach((h,i)=>{pdf.text(h,pos+9,top+9,8,{bold:true,color:C.white});pos+=cols[i];});
      top+=30;
      for (let i=0;i<tracker.rows.length;i++){
        const raw=tracker.rows[i];
        const cells=[raw[0],raw[2],raw[4],raw[5]];
        const lines=cells.map((value,k)=>wrap(value,cols[k]-17,8.5));
        const h=Math.max(...lines.map(v=>v.length))*12+18;
        need(h+2);
        pdf.rect(M,top,CONTENT_W,h,i%2?C.white:C.light,C.border);
        pos=M;
        for(let k=0;k<4;k++){
          pdf.lines(lines[k],pos+9,top+9,8.5,12,{color:C.ink});
          pos+=cols[k];
        }
        top+=h;
      }
      top+=10;
      notePanel('Illustrative example only', 'Actual deadlines will be tracked with the applicable Illinois and Philippines time zones.');
    }
    function footerAll() {
      pdf.pages.forEach((page,i)=>{
        const oldPage=pdf.page;
        pdf.page=page;
        pdf.line(M,H-44,W-M,H-44,C.border,.8);
        pdf.text('Employer / Virtual Assistant  |  For discussion; not a signed agreement',M,H-34,7.8,{color:C.muted});
        const label=`PAGE ${String(i+1).padStart(2,'0')} / ${String(pdf.pages.length).padStart(2,'0')}`;
        pdf.text(label,W-M-width(label,7.8,true),H-34,7.8,{bold:true,color:C.muted});
        pdf.page=oldPage;
      });
    }

    startPage(true);
    infoBox(M,236,249,'Employer',fact('employerName')==='Not provided'?data.employerName:fact('employerName'));
    infoBox(M+260,236,CONTENT_W-260,'Virtual Assistant',fact('virtualAssistantName')==='Not provided'?data.virtualAssistantName:fact('virtualAssistantName'));
    const sw=(CONTENT_W-16)/3;
    snapshotBox(M,320,sw,'Weekly fee','$180');
    snapshotBox(M+sw+8,320,sw,'Weekly capacity','10–15 h');
    snapshotBox(M+(sw+8)*2,320,sw,'Initial review','30 days');
    top=414;

    for (let i=0;i<sections.length;i++){
      const section=sections[i];
      if(i!==0 && availableHeight()<145)startPage();
      sectionHeader(i+1,section);
      if (section.introMode) {
        notePanel('Purpose', 'The Virtual Assistant has prepared suggested working arrangements for the Employer to review. These proposals support personal, executive, administrative, creative, and professional assistance.');
        notePanel('How to respond', 'Choose Agree, Suggest changes, or Discuss during onboarding for each working proposal. Existing tools, access details, and follow-up information may be provided now or shared later through iMessage or email.');
      }
      for (let j=0;j<section.items.length;j++) card(section.items[j],i+1,j+1);
      if(section.checklist){
        simpleTable('Suggested responsibility levels',data.duties.map(([id,name])=>[name,state.duties[id]||'Not set']));
      }
      if(section.facts){
        simpleTable('01  People and collaborators',[
          ['Team situation',fact('teamStatus')],
          ['Existing or planned contributors',fact('team')],
          ['VA coordination with',fact('coordination')]
        ]);
        simpleTable('02  Current systems and tools',[
          ['Scheduling and calendars',fact('calendarTools')],
          ['Email and communications',fact('inboxTools')],
          ['Files and work tracking',fact('workTools')],
          ['Social, app and other tools',fact('tools')]
        ]);
        simpleTable('03  Access permissions',[
          ['Business email / support inbox',fact('accessBusinessEmail')],
          ['Calendar / scheduling',fact('accessCalendar')],
          ['Shared files / trackers',fact('accessFiles')],
          ['Social media / creative accounts',fact('accessSocial')],
          ['Application / website tools',fact('accessPlatform')],
          ['Specific access limits',fact('access')]
        ]);
        simpleTable('04  Sharing and next steps',[
          ['Share remaining details via',fact('accessMethod')],
          ['Preferred follow-up channel',fact('channel')],
          ['Where links / files will be sent',fact('sendWhere')],
          ['Instructions / restrictions',fact('restrictions')]
        ]);
      }
      if(section.sampleTracker)trackerTable(data.trackerSample);
      if(section.finalFacts){
        simpleTable('Employer-provided onboarding details',[
          ['Proposed start date',fact('start')],
          ['Weekly payment day / method',fact('payment')],
          ['Immediate priorities',fact('priorities')],
          ['Other follow-ups',fact('followups')],
          ['Final discussion notes',fact('notes')]
        ]);
      }
    }

    if(availableHeight()<230)startPage();
    const summaryTitle='Decision summary';
    const pending=allItems.filter(item=>state.answers[item.id]==='change' || state.answers[item.id]==='discuss');
    pdf.rect(M,top,CONTENT_W,46,C.dark);
    pdf.text(summaryTitle,M+14,top+12,16,{bold:true,color:C.white});
    top+=61;
    const counts=[
      ['Agree',allItems.filter(i=>state.answers[i.id]==='agree').length],
      ['Suggest changes',allItems.filter(i=>state.answers[i.id]==='change').length],
      ['Discuss',allItems.filter(i=>state.answers[i.id]==='discuss').length],
      ['Unanswered',allItems.filter(i=>!state.answers[i.id]).length]
    ];
    const colWidth=(CONTENT_W-18)/4;
    counts.forEach(([label,count],i)=>{
      const x=M+i*(colWidth+6);
      pdf.rect(x,top,colWidth,57,C.light,C.border);
      pdf.text(String(count),x+10,top+7,19,{bold:true,color:C.dark});
      pdf.text(label.toUpperCase(),x+10,top+37,7.2,{bold:true,color:C.muted});
    });
    top+=78;
    if(pending.length){
      pdf.text('Items proposed for change or discussion',M,top,11.2,{bold:true,color:C.dark});
      top+=20;
      for(const item of pending){
        const s=labels[state.answers[item.id]]||'Unanswered';
        const lines=wrap(item.title+' - '+s,CONTENT_W-14,9.6);
        need(lines.length*13+9);
        pdf.lines(lines,M+11,top,9.6,13,{color:C.ink});
        pdf.rect(M,top+5,3,5,C.accent);
        top+=lines.length*13+10;
      }
    } else {
      notePanel('No changes or discussion items selected', 'Unanswered proposals are still pending and have not been approved. See their individual response labels in the preceding sections.');
    }
    need(67);
    top+=10;
    pdf.line(M,top,W-M,top,C.border,.8);
    top+=14;
    pdf.lines(wrap('This record summarizes the Employer\'s selections. It is not an electronic signature or a replacement for any required service agreement, confidentiality agreement, or intellectual-property terms.',CONTENT_W,8.4),M,top,8.4,12,{color:C.muted});

    footerAll();
    return pdf.blob();
  };
})();
