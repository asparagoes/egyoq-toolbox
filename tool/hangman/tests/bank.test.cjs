const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const {parseBank} = require('../js/bank-parser.js');

test('accepts BOM, comments, CRLF, plain words and optional fields', () => {
  const bank = parseBank('\uFEFF# Example\r\nwater | Formula H2O? | Explain. | Science\r\n\r\nteamwork');
  assert.equal(bank.length, 2);
  assert.deepEqual(bank[0], {round:1, answer:'WATER', clue:'Formula H2O?', bonus:'Explain.', category:'Science'});
  assert.equal(bank[1].clue, 'Guess the word or phrase.');
  assert.equal(bank[1].bonus, 'Explain the answer or use it in a sentence.');
  assert.equal(parseBank(Array(6).fill('WORD').join('\n'))[5].round, 2);
});

test('rejects invalid entries with original line numbers and enforces limits', () => {
  assert.throws(() => parseBank('# comment\n\n123 | Numbers only\nWORD | '), /Line 3:.*\nLine 4:/);
  for(const text of ['', '# empty', 'café | Clue', 'A'.repeat(81), 'WORD | clue | bonus | topic | extra', 'A | ' + 'x'.repeat(1001)]){
    assert.throws(() => parseBank(text));
  }
  assert.equal(parseBank(Array(500).fill('WORD').join('\n')).length, 500);
  assert.throws(() => parseBank(Array(501).fill('WORD').join('\n')), /500/);
});

test('sample file parses and question punctuation remains intact', () => {
  const bank = parseBank(readFileSync(require.resolve('../sample-bank.txt'), 'utf8'));
  assert.equal(bank.length, 5);
  assert.equal(bank[3].answer, 'ICE-CREAM');
  assert.equal(parseBank('H2O | What is water?')[0].answer, 'H2O');
});

// Minimal DOM for exercising the actual game's upload, scoring and reset handlers.
// Rendering and audio are stubbed; these checks do not claim visual browser QA.
function gameHarness(){
  const nodes = new Map();
  class Element {
    constructor(){
      this.style = {setProperty(){}}; this.dataset = {}; this.children = []; this.handlers = {};
      this.value = '0.5'; this.paused = true; this.className = '';
      const classes = new Set();
      this.classList = {add:(...c)=>c.forEach(x=>classes.add(x)), remove:(...c)=>c.forEach(x=>classes.delete(x)), contains:c=>classes.has(c), toggle:(c,on)=>on ? classes.add(c) : classes.delete(c)};
    }
    append(...items){this.children.push(...items)}
    appendChild(item){this.children.push(item)}
    set innerHTML(value){this.children = []}
    addEventListener(event, handler){this.handlers[event] = handler}
    querySelector(){return new Element()}
    focus(){}
    getContext(){return new Proxy({}, {get:()=>()=>{}})}
  }
  const get = id => {if(!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id)};
  const document = {
    getElementById:get, createElement:()=>new Element(), body:new Element(), documentElement:new Element(),
    addEventListener(){},
    querySelector:selector => document.querySelectorAll(selector)[0],
    querySelectorAll:selector => {
      if(selector.startsWith('.key')) return get('keyboard').children.filter(n=>!selector.includes('data-letter') || selector.includes(`"${n.dataset.letter}"`));
      return [];
    }
  };
  const pending = new Map(); let timer = 0;
  const context = vm.createContext({document, window:{addEventListener(){}}, HangmanBank:{parseBank}, console,
    getComputedStyle:()=>({getPropertyValue:()=> '#000'}), confirm:()=>true,
    setTimeout:fn=>{pending.set(++timer,fn);return timer}, clearTimeout:id=>pending.delete(id),
    setInterval:()=>++timer, clearInterval(){}});
  vm.runInContext(readFileSync(require.resolve('../js/game.js'), 'utf8'), context);
  vm.runInContext('sfxOn = false; musicEnabled = false;', context);
  return {get, run:code=>vm.runInContext(code, context), pending};
}

test('custom answers remain solvable with punctuation, bonuses work, ties avoid theology', async () => {
  const h = gameHarness();
  const file = {name:'science.txt', size:100, text:async()=>"H2O | Formula for water? | Explain its atoms. | Chemistry"};
  const input = h.get('bankFile'); input.files = [file];
  await input.handlers.change({target:input});
  assert.match(h.get('activeBankLabel').textContent, /science.txt · 1 question/);
  h.run('startGame()');
  assert.equal(h.get('clueText').textContent, 'Formula for water?');
  assert.equal(h.get('questionLabel').textContent, '1 / 1');
  assert.equal(h.get('wordDisplay').children[0].children[1].children[0].textContent, '2');
  h.run('handleGuess("H"); handleGuess("O"); openBonus();');
  assert.equal(h.run('roundSolved'), true);
  assert.equal(h.run('leftScore'), 7); // Two correct letters plus the existing +5 completion award.
  assert.equal(h.get('bonusText').textContent, 'Explain its atoms.');
  h.run('leftScore = 0; rightScore = 0; finishGame();');
  assert.equal(h.run('gameFinished'), true);
  assert.notEqual(h.get('tieModal').style.display, 'flex');
  assert.match(h.get('winnerModalText').textContent, /Still tied/);
  h.run('resetGame(false)');
  assert.equal(h.run('questions.length'), 1);
  assert.equal(h.run('leftScore'), 0);
  h.get('defaultBankBtn').onclick();
  assert.equal(h.run('questions.length'), 20);
  assert.equal(h.run('tieBreaker === defaultTieBreaker'), true);
});

test('failed uploads preserve active bank and stale file reads cannot replace defaults', async () => {
  const h = gameHarness(), input = h.get('bankFile');
  input.files = [{name:'bad.txt', size:10, text:async()=> '123 | Impossible answer'}];
  await input.handlers.change({target:input});
  assert.equal(h.run('questions === defaultQuestions'), true);
  assert.match(h.get('bankStatus').textContent, /Line 1:/);
  assert.equal(h.get('openingStartBtn').disabled, false);
  let finishRead;
  input.files = [{name:'slow.txt', size:10, text:()=>new Promise(resolve=>finishRead=resolve)}];
  const reading = input.handlers.change({target:input});
  h.get('defaultBankBtn').onclick();
  finishRead('WORD | Clue');
  await reading;
  assert.equal(h.run('questions === defaultQuestions'), true);
  assert.match(h.get('bankStatus').textContent, /Theology default/);
});
