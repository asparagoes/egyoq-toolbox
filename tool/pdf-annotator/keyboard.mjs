// Keep native editing and browser text selection intact when they own the keys.
export function shortcutAction(event, {editing=false, textSelected=false, hasAnnotation=false}={}) {
  if(event.isComposing || event.defaultPrevented) return null;
  const key=event.key.toLowerCase(), mod=event.ctrlKey||event.metaKey;
  if(key==='escape') return 'escape';
  if(mod && key==='s') return event.shiftKey?'export':'save';
  if(mod && key==='o') return event.shiftKey?'open-project':'open';
  if(editing) return null;
  if(mod){
    if(key==='z')return event.shiftKey?'redo':'undo';
    if(key==='y')return 'redo';
    if(hasAnnotation && key==='d')return 'duplicate';
    if(!textSelected && hasAnnotation && key==='c')return 'copy';
    if(!textSelected && hasAnnotation && key==='x')return 'cut';
    if(key==='v')return 'paste';
  }
  if((mod||event.altKey) && ['+','=','-','0'].includes(key))return key==='0'?'fit':key==='-'?'zoom-out':'zoom-in';
  if(mod||event.altKey)return null;
  if(key==='?' || key==='f1')return 'help';
  if(hasAnnotation && ['delete','backspace'].includes(key))return 'delete';
  if(hasAnnotation && key.startsWith('arrow'))return key;
  return ({s:'select',t:'text',h:'highlight',n:'note',d:'draw',e:'erase'})[key]||null;
}
