import test from 'node:test';
import assert from 'node:assert/strict';
import {shortcutAction} from '../keyboard.mjs';
const key=(key,flags={},context={})=>shortcutAction({key,...flags},context);
test('tool shortcuts ignore typing, modifiers, IME composition, and handled events',()=>{
  for(const [letter,tool] of Object.entries({s:'select',t:'text',h:'highlight',n:'note',d:'draw',e:'erase'})){
    assert.equal(key(letter),tool);assert.equal(key(letter.toUpperCase()),tool);
    assert.equal(key(letter,{}, {editing:true}),null);
    assert.equal(key(letter,{isComposing:true}),null);
    assert.equal(key(letter,{defaultPrevented:true}),null);
  }
});
test('delete and movement require an annotation and leave native editing intact',()=>{
  for(const name of ['Delete','Backspace','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']){
    assert.equal(key(name),null);
    assert.equal(key(name,{}, {hasAnnotation:true}),name.startsWith('Arrow')?name.toLowerCase():'delete');
    assert.equal(key(name,{}, {hasAnnotation:true,editing:true}),null);
  }
});
test('Windows and Mac save/open/export and undo/redo conventions',()=>{
  for(const mod of ['ctrlKey','metaKey']){
    const flags={[mod]:true};
    for(const [letter,action]of Object.entries({s:'save',o:'open',z:'undo',y:'redo'}))assert.equal(key(letter,flags),action);
    for(const [letter,action]of Object.entries({s:'export',o:'open-project',z:'redo'}))assert.equal(key(letter,{...flags,shiftKey:true}),action);
    assert.equal(key('z',flags,{editing:true}),null);
    assert.equal(key('s',flags,{editing:true}),'save');
    assert.equal(key('d',flags,{hasAnnotation:true}),'duplicate');
    assert.equal(key('c',flags,{hasAnnotation:true}),'copy');
    assert.equal(key('x',flags,{hasAnnotation:true}),'cut');
    assert.equal(key('c',flags,{hasAnnotation:true,textSelected:true}),null);
    assert.equal(key('v',flags,{editing:true}),null);
  }
});
test('zoom, fit, escape and help',()=>{
  for(const mod of ['ctrlKey','metaKey','altKey']){
    assert.equal(key('+',{[mod]:true}),'zoom-in');assert.equal(key('-',{[mod]:true}),'zoom-out');assert.equal(key('0',{[mod]:true}),'fit');
  }
  assert.equal(key('Escape',{}, {editing:true}),'escape');
  assert.equal(key('?'),'help');assert.equal(key('F1'),'help');
});
