'use strict';
const $ = id => document.getElementById(id);
const video = $('video');
const analysis = document.createElement('canvas');
analysis.width = 192; analysis.height = 108;
const ctx = analysis.getContext('2d', {willReadFrequently:true});
const render = document.createElement('canvas');
let slides = [], sourceURL = '', busy = false, cancelled = false, ready = false, savedCrop = null;
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
  for(const id of ['left','top','right','bottom','interval','sensitivity','builds','width'])$(id).disabled=busy||(slides.length>0&&['left','top','right','bottom'].includes(id));
  $('scan').disabled=busy||!ready;$('capture').disabled=busy||!ready;$('preview').disabled=busy||!ready;
  $('cancel').disabled=!busy;$('export').disabled=busy||!slides.some(s=>s.selected);$('select').disabled=busy||!slides.length;$('clear').disabled=busy||!slides.length;
  $('count').textContent=`${slides.filter(s=>s.selected).length} / ${slides.length} selected`;
  for(const input of $('gallery').querySelectorAll('input,button'))input.disabled=busy;
}
function gallery(){
  $('gallery').replaceChildren();
  slides.sort((a,b)=>a.t-b.t);
  for(const s of slides){const card=document.createElement('article');card.className='slide'+(s.selected?'':' excluded');
    const img=document.createElement('img');img.src=s.thumb;img.alt=`Slide at ${time(s.t)}`;img.loading='lazy';
    const row=document.createElement('div');row.className='row';const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=s.selected;
    check.onchange=()=>{s.selected=check.checked;card.classList.toggle('excluded',!s.selected);controls();};label.append(check,'Keep slide');
    const jump=document.createElement('button');jump.textContent=time(s.t);jump.onclick=async()=>{try{await seek(s.t);video.scrollIntoView({behavior:'smooth',block:'center'});}catch(e){$('status').textContent=e.message;}};
    row.append(label,jump);card.append(img,row);$('gallery').append(card);
  }controls();
}
function frame(t,sig){draw(render,savedCrop,320);return {t,sig,thumb:render.toDataURL('image/jpeg',.7),selected:true};}
function preview(){try{draw($('cropPreview'),crop(),480);}catch(e){$('status').textContent=e.message;}}
$('file').onchange=()=>{
  if(sourceURL)URL.revokeObjectURL(sourceURL);slides=[];savedCrop=null;ready=false;gallery();
  const file=$('file').files[0];if(!file)return;
  sourceURL=URL.createObjectURL(file);video.src=sourceURL;$('source').textContent=file.name;$('status').textContent='Reading video…';
};
video.onloadedmetadata=()=>{ready=Number.isFinite(video.duration)&&video.duration>0&&video.videoWidth>0;$('source').textContent=`${$('file').files[0]?.name||'Video'} · ${time(video.duration)} · ${video.videoWidth} × ${video.videoHeight}`;$('status').textContent=ready?'Set the crop, then find slides.':'This video has no usable duration.';controls();};
video.onloadeddata=preview;video.onerror=()=>{ready=false;$('status').textContent='Cannot decode this video. Try a supported MP4 or WebM.';controls();};
$('preview').onclick=preview;for(const id of ['left','top','right','bottom'])$(id).onchange=preview;
$('cancel').onclick=()=>{cancelled=true;$('status').textContent='Cancelling after the current frame…';};
$('clear').onclick=()=>{slides=[];savedCrop=null;gallery();$('status').textContent='Results cleared. You can adjust the crop.';};
$('select').onclick=()=>{slides.forEach(s=>s.selected=true);gallery();};
$('capture').onclick=()=>{try{savedCrop ||= crop();slides.push(frame(video.currentTime,signature(savedCrop)));gallery();$('status').textContent='Current frame added.';}catch(e){$('status').textContent=e.message;}};
$('scan').onclick=async()=>{
  try{
    const area=crop(),step=Number($('interval').value),threshold=Number($('sensitivity').value),final=$('builds').value==='final';
    if(!Number.isFinite(step)||step<.25||step>30)throw Error('Choose an interval between 0.25 and 30 seconds.');
    video.pause();busy=true;cancelled=false;slides=[];savedCrop=area;gallery();
    let pending=null,last=null,stable=0;const total=Math.ceil(video.duration/step);let checked=0;
    function commit(){if(!pending)return;const prev=slides[slides.length-1];if(final&&prev&&isBuild(prev.sig,pending.sig))slides[slides.length-1]=pending;else slides.push(pending);pending=null;}
    for(let i=0;i<total;i++){
      if(cancelled)break;const t=Math.min(i*step,video.duration-.001);await seek(t);if(cancelled)break;
      const sig=signature(area);
      if(last&&difference(last,sig)<threshold){stable++;if(!pending)pending=frame(t,sig);else if(difference(pending.sig,sig)<threshold){pending.t=t;/* refresh only a small thumbnail */draw(render,area,320);pending.thumb=render.toDataURL('image/jpeg',.7);}else{commit();pending=frame(t,sig);}}
      else{if(pending)commit();stable=0;}
      last=sig;checked++;$('progress').value=checked/total;$('status').textContent=`Scanning ${time(t)} / ${time(video.duration)} · ${slides.length+(pending?1:0)} slides · ${checked.toLocaleString()} samples`;
      if(i%25===0)await new Promise(r=>setTimeout(r,0));
    }
    commit();if(!slides.length&&last&&!cancelled)slides.push(frame(video.currentTime,last));
    $('status').textContent=`${cancelled?'Scan cancelled; partial results kept.':'Scan complete.'} ${slides.length} slides found. Review before exporting. Small edits and animation detection are approximate.`;
  }catch(e){$('status').textContent=e.message;}finally{busy=false;gallery();}
};
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
  busy=true;cancelled=false;video.pause();controls();const images=[];
  try{const chosen=slides.filter(s=>s.selected);for(let i=0;i<chosen.length;i++){
    if(cancelled)break;await seek(chosen[i].t);if(cancelled)break;const cap=Number($('width').value)||savedCrop.w;draw(render,savedCrop,Math.min(cap,savedCrop.w));
    const blob=await new Promise(r=>render.toBlob(r,'image/jpeg',.92));if(!blob)throw Error('Unable to encode this slide. Try a smaller PDF width.');images.push({w:render.width,h:render.height,bytes:new Uint8Array(await blob.arrayBuffer())});
    $('progress').value=(i+1)/chosen.length;$('status').textContent=`Preparing PDF · ${i+1} / ${chosen.length} slides`;
  }if(cancelled){$('status').textContent='PDF export cancelled. Your slide selections are kept.';return;}
  const blob=pdfBlob(images),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=($('file').files[0]?.name.replace(/\.[^.]+$/,'')||'lecture')+'-slides.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);$('status').textContent=`PDF downloaded · ${images.length} slides · ${(blob.size/1048576).toFixed(1)} MB`;
  }catch(e){$('status').textContent=e.message;}finally{busy=false;controls();}
};
controls();
