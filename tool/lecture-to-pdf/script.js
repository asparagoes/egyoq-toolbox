'use strict';
const $ = id => document.getElementById(id);
const video = $('video');
const analysis = document.createElement('canvas');
analysis.width = 192; analysis.height = 108;
const ctx = analysis.getContext('2d', {willReadFrequently:true});
const render = document.createElement('canvas');
let slides = [], sourceURL = '', busy = false, cancelled = false, ready = false, savedCrop = null;
let sessionFile = null, scanState = null, storageReady = false, saving = Promise.resolve(), loadingSavedVideo = false, restoreTime = null, exporting = false;
let saveRevision = 0, pendingSaves = 0;
const settingIds = ['left','top','right','bottom','interval','sensitivity','builds','width'];
const visibleSlides = () => scanState?.pending ? [...slides, scanState.pending] : slides;
const fileIdentity = file => ({name:file.name,size:file.size,lastModified:file.lastModified});
const sameFile = (a,b) => a && b && a.name===b.name && a.size===b.size && a.lastModified===b.lastModified;
function saveProgress() {
  if (!storageReady || !sessionFile) return saving;
  const revision=++saveRevision;pendingSaves++;
  const snapshot = structuredClone({version:1,file:sessionFile,slides,savedCrop,scanState,
    settings:Object.fromEntries(settingIds.map(id=>[id,$(id).value])),playhead:ready?video.currentTime||0:restoreTime||0,savedAt:Date.now()});
  $('saveStatus').textContent='Saving progress on this device…';
  saving = saving.then(()=>lectureSession.save(snapshot)).then(()=>{
    if(revision===saveRevision)$('saveStatus').textContent='Progress saved in this browser. If you close the tab, reselect the same video to continue.';
  }).catch(()=>{if(revision===saveRevision)$('saveStatus').textContent='Progress could not be saved. Browser storage may be full or unavailable; keep this tab open to avoid losing results.';}).finally(()=>{pendingSaves--;});
  return saving;
}
async function restoreProgress() {
  try {
    const saved = await lectureSession.load();
    if (saved?.version===1 && saved.file && Array.isArray(saved.slides)) {
      sessionFile=saved.file;slides=saved.slides;savedCrop=saved.savedCrop;scanState=saved.scanState;
      restoreTime=saved.playhead||0;
      for(const id of settingIds)if(saved.settings?.[id]!==undefined)$(id).value=saved.settings[id];
      $('source').textContent=`Saved video: ${sessionFile.name}`;
      $('status').textContent=`Saved session restored. Choose ${sessionFile.name} again to ${scanState?'resume scanning':'export your slides'}.`;
      $('progress').value=scanState?scanState.nextIndex/scanState.total:slides.length?1:0;
      $('saveStatus').textContent='Saved progress restored. Your video is not stored; choose the same file to reconnect it.';
    } else $('saveStatus').textContent='The most recent session is saved automatically in this browser. Clearing browser data removes it.';
    storageReady=true;
  } catch {
    $('saveStatus').textContent='Browser storage is unavailable. Progress will only last while this tab remains open.';
  }
  gallery();
}
const time = t => [Math.floor(t/3600),Math.floor(t/60)%60,Math.floor(t)%60].map(n=>String(n).padStart(2,'0')).join(':');
function crop() {
  const v = ['left','top','right','bottom'].map(id=>Number($(id).value));
  if (v.some(n=>!Number.isFinite(n)||n<0||n>90)||v[0]+v[2]>=95||v[1]+v[3]>=95) throw Error('Keep at least 5% of the video in both dimensions.');
  return {x:video.videoWidth*v[0]/100,y:video.videoHeight*v[1]/100,w:video.videoWidth*(100-v[0]-v[2])/100,h:video.videoHeight*(100-v[1]-v[3])/100};
}
function draw(canvas, area, width) {
  canvas.width = Math.max(1,Math.round(width)); canvas.height = Math.max(1,Math.round(width*area.h/area.w));
  canvas.getContext('2d').drawImage(video,area.x,area.y,area.w,area.h,0,0,canvas.width,canvas.height);
}
function seek(t) {
  t = Math.max(0,Math.min(t,video.duration-0.001));
  if(Math.abs(video.currentTime-t)<0.001 && video.readyState>=2) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>done(Error('Video seeking timed out. Try a browser-supported MP4 or WebM.')),20000);
    function done(error){clearTimeout(timer);video.removeEventListener('seeked',ok);video.removeEventListener('error',fail);error?reject(error):resolve();}
    const ok=()=>done(); const fail=()=>done(Error('The video could not be decoded.'));
    video.addEventListener('seeked',ok,{once:true});video.addEventListener('error',fail,{once:true}); video.currentTime=t;
  });
}
function signature(area) {
  ctx.drawImage(video,area.x,area.y,area.w,area.h,0,0,192,108);
  const rgba=ctx.getImageData(0,0,192,108).data, gray=new Uint8Array(192*108);
  for(let i=0;i<gray.length;i++)gray[i]=(rgba[i*4]*.299+rgba[i*4+1]*.587+rgba[i*4+2]*.114);
  return gray;
}
// Pixel differences above a noise floor suppress compression noise and tiny cursor moves.
function difference(a,b){let changed=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>28)changed++;return changed/a.length;}
function isBuild(a,b){let added=0,removed=0;for(let i=0;i<a.length;i++){if(a[i]-b[i]>28)added++;if(b[i]-a[i]>28)removed++;}const total=added+removed;return total/a.length<.20 && total>0 && Math.min(added,removed)/total<.18;}
function controls(){
  $('file').disabled=busy;video.controls=!busy;
  for(const id of settingIds)$(id).disabled=busy||((savedCrop||scanState)&&['left','top','right','bottom'].includes(id))||(scanState&&['interval','sensitivity','builds'].includes(id));
  $('scan').disabled=busy||!ready;$('capture').disabled=busy||!ready;$('preview').disabled=busy||!ready;
  $('resume').disabled=busy||!ready||!scanState;
  $('cancel').textContent=exporting?'Cancel export':'Pause scan';
  $('scan').textContent=visibleSlides().length||scanState?'Start new scan':'Find slides';
  $('cancel').disabled=!busy;$('export').disabled=busy||!ready||!visibleSlides().some(s=>s.selected);$('select').disabled=busy||!visibleSlides().length;$('clear').disabled=busy||!sessionFile;
  $('count').textContent=`${visibleSlides().filter(s=>s.selected).length} / ${visibleSlides().length} selected`;
  for(const input of $('gallery').querySelectorAll('input,button'))input.disabled=busy||(input.tagName==='BUTTON'&&!ready);
}
function gallery(){
  $('gallery').replaceChildren();
  slides.sort((a,b)=>a.t-b.t);
  for(const s of [...visibleSlides()].sort((a,b)=>a.t-b.t)){const card=document.createElement('article');card.className='slide'+(s.selected?'':' excluded');
    const img=document.createElement('img');img.src=s.thumb;img.alt=`Slide at ${time(s.t)}`;img.loading='lazy';
    const row=document.createElement('div');row.className='row';const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=s.selected;
    check.onchange=()=>{s.selected=check.checked;card.classList.toggle('excluded',!s.selected);controls();saveProgress();};label.append(check,'Keep slide');
    const jump=document.createElement('button');jump.textContent=time(s.t);jump.onclick=async()=>{try{await seek(s.t);video.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){$('status').textContent=e.message;}};
    row.append(label,jump);card.append(img,row);$('gallery').append(card);
  }controls();
}
function frame(t,sig){draw(render,savedCrop,320);return {t,sig,thumb:render.toDataURL('image/jpeg',.7),selected:true};}
function preview(){try{draw($('cropPreview'),crop(),480);}catch(e){$('status').textContent=e.message;}}
$('file').onchange=async()=>{
  await restored;
  const file=$('file').files[0];if(!file)return;
  if(sessionFile&&!sameFile(sessionFile,fileIdentity(file))){$('status').textContent=`This is a different video. Choose ${sessionFile.name}, or use Clear results to start a different lecture.`;$('file').value='';return;}
  loadingSavedVideo=Boolean(sessionFile);sessionFile=fileIdentity(file);
  if(sourceURL)URL.revokeObjectURL(sourceURL);ready=false;gallery();
  sourceURL=URL.createObjectURL(file);video.src=sourceURL;$('source').textContent=file.name;$('status').textContent='Reading video…';
};
video.onloadedmetadata=()=>{ready=Number.isFinite(video.duration)&&video.duration>0&&video.videoWidth>0;$('source').textContent=`${sessionFile?.name||'Video'} · ${time(video.duration)} · ${video.videoWidth} × ${video.videoHeight}`;$('status').textContent=ready?(loadingSavedVideo?(scanState?'Video reconnected. Use Resume scan to continue from the saved checkpoint.':'Video reconnected. Your saved slides are ready to review and export.'):'Set the crop, then find slides.'):'This video has no usable duration.';controls();if(ready&&!loadingSavedVideo)saveProgress();};
video.onloadeddata=async()=>{try{if(restoreTime!==null){const t=restoreTime;restoreTime=null;await seek(t);}preview();await saveProgress();}catch(e){$('status').textContent=e.message;}};
video.onerror=()=>{ready=false;$('status').textContent='Cannot decode this video. Try a supported MP4 or WebM.';controls();};
$('preview').onclick=preview;
for(const id of settingIds)$(id).onchange=()=>{if(['left','top','right','bottom'].includes(id))preview();saveProgress();};
$('cancel').onclick=()=>{cancelled=true;$('status').textContent='Stopping after the current frame and saving progress…';};
$('clear').onclick=async()=>{
  busy=true;controls();await restored;await saving;
  slides=[];savedCrop=null;scanState=null;sessionFile=null;ready=false;restoreTime=null;
  if(sourceURL)URL.revokeObjectURL(sourceURL);sourceURL='';video.removeAttribute('src');video.load();$('file').value='';
  try{await lectureSession.clear();$('saveStatus').textContent='Saved session removed.';}catch{$('saveStatus').textContent='Could not remove the saved session from browser storage.';}
  busy=false;gallery();$('progress').value=0;$('source').textContent='Choose a lecture video.';$('status').textContent='Results cleared. Choose a video to start again.';
};
$('select').onclick=()=>{visibleSlides().forEach(s=>s.selected=true);gallery();saveProgress();};
$('capture').onclick=()=>{try{savedCrop ||= crop();slides.push(frame(video.currentTime,signature(savedCrop)));gallery();$('status').textContent='Current frame added.';saveProgress();}catch(e){$('status').textContent=e.message;}};
async function scan(resume=false){
  try{
    const area=resume?savedCrop:crop(),step=resume?scanState.step:Number($('interval').value),threshold=resume?scanState.threshold:Number($('sensitivity').value),final=resume?scanState.final:$('builds').value==='final';
    if(!Number.isFinite(step)||step<.25||step>30)throw Error('Choose an interval between 0.25 and 30 seconds.');
    video.pause();busy=true;cancelled=false;
    if(!resume){slides=[];savedCrop=area;scanState={nextIndex:0,last:null,pending:null,step,threshold,final,total:Math.ceil(video.duration/step)};}
    gallery();await saveProgress();
    const state=scanState,total=state.total;
    function commit(){if(!state.pending)return;const prev=slides[slides.length-1];if(final&&prev&&isBuild(prev.sig,state.pending.sig))slides[slides.length-1]=state.pending;else slides.push(state.pending);state.pending=null;}
    for(let i=state.nextIndex;i<total;i++){
      if(cancelled)break;const t=Math.min(i*step,video.duration-.001);await seek(t);if(cancelled)break;
      const sig=signature(area);
      if(state.last&&difference(state.last,sig)<threshold){if(!state.pending)state.pending=frame(t,sig);else if(difference(state.pending.sig,sig)<threshold){state.pending.t=t;draw(render,area,320);state.pending.thumb=render.toDataURL('image/jpeg',.7);}else{commit();state.pending=frame(t,sig);}}
      else if(state.pending)commit();
      state.last=sig;state.nextIndex=i+1;$('progress').value=state.nextIndex/total;$('status').textContent=`Scanning ${time(t)} / ${time(video.duration)} · ${visibleSlides().length} slides · ${state.nextIndex.toLocaleString()} samples`;
      if(i%5===0)await saveProgress();
      if(i%25===0)await new Promise(r=>setTimeout(r,0));
    }
    if(!cancelled){commit();if(!slides.length&&state.last)slides.push(frame(video.currentTime,state.last));scanState=null;}
    $('status').textContent=`${cancelled?'Scan paused. Use Resume scan to continue.':'Scan complete.'} ${visibleSlides().length} slides found. Review before exporting. Small edits and animation detection are approximate.`;
  }catch(e){$('status').textContent=e.message;}finally{await saveProgress();busy=false;gallery();}
}
$('scan').onclick=()=>scan();$('resume').onclick=()=>scan(true);
// Minimal image-only PDF writer. JPEGs are embedded directly, without a network dependency.
function pdfBlob(images){
  const enc=new TextEncoder(),parts=[],offsets=[0];let length=0;
  const put=v=>{const bytes=typeof v==='string'?enc.encode(v):v;parts.push(bytes);length+=bytes.length;};
  const obj=(id,body,stream)=>{offsets[id]=length;put(`${id} 0 obj\n${body}`);if(stream){put(`\nstream\n`);put(stream);put('\nendstream');}put('\nendobj\n');};
  put('%PDF-1.4\n');obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,`<< /Type /Pages /Count ${images.length} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
  images.forEach((im,i)=>{const id=3+i*3,w=im.w*72/96,h=im.h*72/96;const content=enc.encode(`q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`);
    obj(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${id+1} 0 R >> >> /Contents ${id+2} 0 R >>`);
    obj(id+1,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>`,im.bytes);
    obj(id+2,`<< /Length ${content.length} >>`,content);
  });const start=length;put(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)put(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);put(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);return new Blob(parts,{type:'application/pdf'});
}
$('export').onclick=async()=>{
  busy=true;exporting=true;cancelled=false;video.pause();controls();const images=[];
  try{await saveProgress();const chosen=visibleSlides().filter(s=>s.selected).sort((a,b)=>a.t-b.t);for(let i=0;i<chosen.length;i++){
    if(cancelled)break;await seek(chosen[i].t);if(cancelled)break;const cap=Number($('width').value)||savedCrop.w;draw(render,savedCrop,Math.min(cap,savedCrop.w));
    const blob=await new Promise(r=>render.toBlob(r,'image/jpeg',.92));if(!blob)throw Error('Unable to encode this slide. Try a smaller PDF width.');images.push({w:render.width,h:render.height,bytes:new Uint8Array(await blob.arrayBuffer())});
    $('progress').value=(i+1)/chosen.length;$('status').textContent=`Preparing PDF · ${i+1} / ${chosen.length} slides`;
  }if(cancelled){$('status').textContent='PDF export cancelled. Your slide selections are kept.';return;}
  const blob=pdfBlob(images),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(sessionFile?.name.replace(/\.[^.]+$/,'')||'lecture')+'-slides.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);$('status').textContent=`PDF downloaded · ${images.length} slides · ${(blob.size/1048576).toFixed(1)} MB`;
  }catch(e){$('status').textContent=e.message;}finally{busy=false;exporting=false;controls();}
};
controls();
const restored=restoreProgress();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveProgress();});
window.addEventListener('pagehide',()=>{saveProgress();});
window.addEventListener('beforeunload',event=>{if(busy||pendingSaves){event.preventDefault();event.returnValue='';}});
