const questions = [
  {round:1, category:"Biblical Foundation", answer:"IMAGE OF GOD", clue:"Humanity has dignity and value because people are created to reflect God.", bonus:"Why does being made in the image of God give every person dignity?"},
  {round:1, category:"Biblical Foundation", answer:"BODY AND SOUL", clue:"Christianity teaches that humans are a unity of physical and spiritual dimensions.", bonus:"Why does Christianity reject the idea that only the soul matters?"},
  {round:1, category:"Biblical Foundation", answer:"COMMUNION", clue:"Human beings are relational and are called to live with God and with others.", bonus:"How does communion show that the human person is not isolated?"},
  {round:1, category:"Biblical Foundation", answer:"FREE WILL", clue:"This gift allows the human person to choose good, reject evil, and act responsibly.", bonus:"Why is free will important in the Christian understanding of moral responsibility?"},
  {round:1, category:"Biblical Foundation", answer:"STEWARDSHIP", clue:"This means humans are entrusted to care for creation responsibly.", bonus:"How does stewardship show humanity's responsibility before God?"},

  {round:2, category:"Early Church Thinkers", answer:"IRENAEUS", clue:"He taught that Christ restores humanity by undoing Adam's disobedience.", bonus:"What does Irenaeus teach about Christ restoring the whole human person?"},
  {round:2, category:"Early Church Thinkers", answer:"TERTULLIAN", clue:"He believed the human person is a complete unity of body and soul, and defended the resurrection of the flesh.", bonus:"Why is the resurrection of the body important in Tertullian's view?"},
  {round:2, category:"Early Church Thinkers", answer:"AUGUSTINE", clue:"He emphasized the soul, body, will, and the choice between good and evil.", bonus:"How does Augustine's view of the will connect to moral responsibility?"},
  {round:2, category:"Early Church Thinkers", answer:"ORIGEN", clue:"He reflected deeply on the soul, spiritual growth, and the journey toward God.", bonus:"How does spiritual growth shape the Christian view of the human person?"},
  {round:2, category:"Early Church Thinkers", answer:"GREGORY OF NYSSA", clue:"He taught that the human person is called to continuous growth toward God.", bonus:"What does continuous growth toward God say about human destiny?"},

  {round:3, category:"Medieval Thinkers", answer:"AQUINAS", clue:"He combined faith and reason and taught that humans have intellect and will.", bonus:"Why are intellect and will important in Aquinas's view of the person?"},
  {round:3, category:"Medieval Thinkers", answer:"BONAVENTURE", clue:"He taught that the human person returns to God through knowledge, love, and grace.", bonus:"How does Bonaventure describe the human journey back to God?"},
  {round:3, category:"Medieval Thinkers", answer:"ECKHART", clue:"He taught that the soul contains a Divine Spark and must let go of ego to experience God.", bonus:"What does releasement or letting go mean in Eckhart's perspective?"},
  {round:3, category:"Medieval Thinkers", answer:"INTELLECT AND WILL", clue:"Aquinas used these two powers to explain human knowledge, choice, and moral action.", bonus:"How do intellect and will work together in moral decision-making?"},
  {round:3, category:"Medieval Thinkers", answer:"GRACE", clue:"This divine help heals, elevates, and guides the human person toward God.", bonus:"Why is grace necessary in the Christian view of human fulfillment?"},

  {round:4, category:"Christian View of the Person", answer:"HUMAN DIGNITY", clue:"This means every person has worth that does not depend on status, success, or ability.", bonus:"How does Christianity defend the dignity of every human person?"},
  {round:4, category:"Christian View of the Person", answer:"MORAL RESPONSIBILITY", clue:"Because humans can know and choose, they are accountable for their actions.", bonus:"Why are knowledge and freedom connected to responsibility?"},
  {round:4, category:"Christian View of the Person", answer:"RELATIONAL BEING", clue:"Christianity sees the human person as made for relationship with God and others.", bonus:"Why is relationship central to the Christian view of humanity?"},
  {round:4, category:"Christian View of the Person", answer:"RESURRECTION OF THE BODY", clue:"This belief shows that the body is not disposable but part of the person's final destiny.", bonus:"How does belief in resurrection affirm the value of the body?"},
  {round:4, category:"Final Challenge", answer:"HUMAN PERSON IS MADE FOR GOD", clue:"This summarizes the Christian belief that humans find their purpose, dignity, and fulfillment in God.", bonus:"Explain how this phrase summarizes the full lesson."}
];

const tieBreaker = {round:"TB", category:"Tie-Breaker", answer:"PERSONS IN COMMUNION", clue:"This phrase describes humans as relational beings called to community and love.", bonus:"Why are persons in communion central to the Christian view of the human person?"};

const BG_MUSIC_SRC = "./assets/audio/background-music.mp3";

const $ = id => document.getElementById(id);
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");
const bgAudio = $("backgroundAudio");
bgAudio.src = BG_MUSIC_SRC;

let currentIndex = -1;
let currentQuestion = null;
let guessedLetters = new Set();
let wrongLetters = new Set();
let currentTurn = "Left Team";
let firstStartingTeam = null;
let leftScore = 0;
let rightScore = 0;
let lives = 6;
let gameStarted = false;
let roundSolved = false;
let gameFinished = false;
let usingTieBreaker = false;
let answerRevealed = false;
let helpStep = 0;
let showStartAfterHelp = false;
let sfxOn = true;
let musicEnabled = true;
let audioCtx = null;
let solveAttempted = false;
let questionStartState = null;
let lastAnsweredState = null;

function norm(s){return String(s).toUpperCase().replace(/\s+/g," ").trim()}
function answerLetters(){return [...new Set(norm(currentQuestion.answer).replace(/ /g,"").split(""))]}
function isSolved(){return answerLetters().every(l => guessedLetters.has(l))}
function setStatus(msg){$("statusText").textContent = msg}
function updateScores(){$("leftScore").textContent=leftScore;$("rightScore").textContent=rightScore}
function addPoints(team, points){
  team === "Left Team" ? leftScore += points : rightScore += points;
  updateScores();
}
function hasLettersEntered(){
  return guessedLetters.size > 0 || wrongLetters.size > 0;
}
function canSolveNow(){
  // Solve is allowed while the game is started, a question is active, the round isn't solved,
  // the game isn't finished, and there have been no letters entered yet.
  return gameStarted && currentQuestion && !roundSolved && !gameFinished && !hasLettersEntered();
}
function updateSolveAvailability(){
  const btn = $("solveBtn");
  if(btn) btn.disabled = !canSolveNow();
}
function captureQuestionState(){
  return {
    guessedLetters:[...guessedLetters],
    wrongLetters:[...wrongLetters],
    currentTurn,
    leftScore,
    rightScore,
    lives,
    roundSolved,
    answerRevealed,
    solveAttempted
  };
}
function applyQuestionState(state, status){
  if(!state) return;
  guessedLetters = new Set(state.guessedLetters);
  wrongLetters = new Set(state.wrongLetters);
  currentTurn = state.currentTurn;
  leftScore = state.leftScore;
  rightScore = state.rightScore;
  lives = state.lives;
  roundSolved = state.roundSolved;
  answerRevealed = state.answerRevealed;
  solveAttempted = state.solveAttempted;
  updateScores();
  updateTurnUI();
  renderHearts();
  updateLogs();
  initKeyboard();
  renderWord(answerRevealed);
  guessedLetters.forEach(letter => markKey(letter, "correct"));
  wrongLetters.forEach(letter => markKey(letter, "wrong"));
  setBonusAvailable(false);
  setIllustrationResult(null);
  drawFigure();
  updateSolveAvailability();
  setStatus(status);
}
function rememberQuestionStart(){
  questionStartState = captureQuestionState();
  lastAnsweredState = null;
}
function updateTurnUI(){
  $("turnLabel").textContent = currentTurn;
  $("turnLabel").style.color = currentTurn === "Left Team" ? "var(--pink)" : "var(--orange)";
  $("leftTurnBadge").classList.toggle("visible", currentTurn === "Left Team");
  $("rightTurnBadge").classList.toggle("visible", currentTurn === "Right Team");
  $("leftBadge").classList.toggle("active", currentTurn === "Left Team");
  $("rightBadge").classList.toggle("active", currentTurn === "Right Team");
}
function switchTurn(){
  currentTurn = currentTurn === "Left Team" ? "Right Team" : "Left Team";
  updateTurnUI();
  playTone(260,.06,"triangle");
}
function setBonusAvailable(v){
  $("bonusBtn").disabled = !v;
  $("bonusBtn").classList.toggle("bonus-ready", !!v);
}
function setIllustrationResult(type){
  const p = $("figurePanel");
  p.classList.remove("result-correct","result-wrong","result-solved");
  if(type) p.classList.add(`result-${type}`);
}
function markKey(letter, type){
  const btn = document.querySelector(`.key[data-letter="${letter}"]`);
  if(!btn) return;
  btn.classList.remove("correct","wrong");
  if(type) btn.classList.add(type);
  btn.disabled = true;
}
function isTextEntryTarget(target){
  return target && ["INPUT","TEXTAREA"].includes(target.tagName);
}
function hasOpenModal(){
  return ["helpModal","shortcutsModal","bonusModal","tieModal","winnerModal","solveModal","rouletteWrap"]
    .some(id => $(id) && $(id).style.display === "flex");
}

function renderHearts(){
  $("livesLabel").textContent = lives;
  const row = $("livesRow");
  row.innerHTML = "";
  for(let i=0;i<6;i++){
    const h = document.createElement("span");
    h.className = "heart" + (i >= lives ? " lost" : "");
    h.textContent = "❤️";
    row.appendChild(h);
  }
}

function updateLogs(){
  $("wrongLetters").textContent = [...wrongLetters].sort().join(", ") || "None";
  $("correctLetters").textContent = [...guessedLetters].sort().join(", ") || "None";
}

function initKeyboard(){
  const keyboard = $("keyboard");
  keyboard.innerHTML = "";
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(letter => {
    const btn = document.createElement("button");
    btn.className = "key";
    btn.textContent = letter;
    btn.dataset.letter = letter;
    btn.onclick = () => handleGuess(letter, btn);
    keyboard.appendChild(btn);
  });
}

function disableKeyboard(){
  document.querySelectorAll(".key").forEach(k => k.disabled = true);
  if($("solveBtn")) $("solveBtn").disabled = true;
}

function renderWord(revealAll=false){
  const box = $("wordDisplay");
  box.innerHTML = "";
  if(!currentQuestion) return;

  const normalized = norm(currentQuestion.answer);
  const words = normalized.split(" ");
  const letterCount = normalized.replace(/ /g, "").length;
  const maxWordLength = Math.max(...words.map(word => word.length));

  box.classList.toggle("long-phrase", letterCount >= 16 || normalized.length >= 22);
  box.classList.toggle("very-long-phrase", letterCount >= 22 || maxWordLength >= 11);

  words.forEach(word => {
    const group = document.createElement("div");
    group.className = "word-group";
    if(word.length >= 10) group.classList.add("compact-word");

    word.split("").forEach(ch => {
      const slot = document.createElement("div");
      slot.className = "slot";
      const char = document.createElement("div");
      char.className = "char";
      char.textContent = revealAll || guessedLetters.has(ch) ? ch : "";
      const line = document.createElement("div");
      line.className = "line";
      slot.append(char,line);
      group.appendChild(slot);
    });
    box.appendChild(group);
  });
}

function chooseStartingTeam(callback){
  const team = Math.random() < .5 ? "Left Team" : "Right Team";
  const wrap = $("rouletteWrap");
  const wheel = $("rouletteWheel");
  const text = $("rouletteText");
  const deg = team === "Left Team" ? 1440 + 90 : 1440 + 270;

  text.textContent = "Choosing...";
  wheel.style.setProperty("--spin", deg + "deg");
  wheel.style.animation = "none";
  void wheel.offsetWidth;
  wheel.style.animation = "spinWheel 1.8s cubic-bezier(.18,.78,.2,1) forwards";
  wrap.style.display = "flex";
  playRouletteSound();

  let timer;
  function close(){
    clearTimeout(timer);
    wrap.style.display = "none";
    if(callback) callback(team);
  }
  $("rouletteCloseBtn").onclick = close;

  setTimeout(() => {
    text.textContent = `${team} starts!`;
    currentTurn = team;
    updateTurnUI();
    timer = setTimeout(close, 1800);
  }, 1250);
}

function loadQuestion(index, tie=false){
  if(!tie && index >= questions.length){finishGame();return}

  currentIndex = index;
  currentQuestion = tie ? tieBreaker : questions[index];
  usingTieBreaker = tie;
  answerRevealed = false;
  guessedLetters = new Set();
  wrongLetters = new Set();
  solveAttempted = false;
  questionStartState = null;
  lastAnsweredState = null;
  lives = 6;
  roundSolved = false;
  setBonusAvailable(false);
  setIllustrationResult(null);

  $("roundLabel").textContent = currentQuestion.round;
  $("questionLabel").textContent = tie ? "Tie / 1" : `${index+1} / ${questions.length}`;
  $("categoryLabel").textContent = currentQuestion.category;
  $("clueText").textContent = currentQuestion.clue;
  $("winnerBanner").style.display = "none";

  renderHearts();
  updateLogs();
  initKeyboard();
  renderWord();
  drawFigure();

  updateSolveAvailability();

  if(index === 0 || tie){
    chooseStartingTeam(team => {
      if(!tie) firstStartingTeam = team;
      setStatus("Roulette picked the starter. Choose a letter!");
      rememberQuestionStart();
    });
  } else {
    if(firstStartingTeam === "Right Team"){
      currentTurn = index % 2 === 0 ? "Right Team" : "Left Team";
    } else {
      currentTurn = index % 2 === 0 ? "Left Team" : "Right Team";
    }
    updateTurnUI();
    setStatus(`${currentTurn} starts this question.`);
    rememberQuestionStart();
  }
}

function handleGuess(letter, btn){
  if(!gameStarted || roundSolved || gameFinished) return;
  if(guessedLetters.has(letter) || wrongLetters.has(letter)) return;

  const beforeGuess = captureQuestionState();
  const ans = norm(currentQuestion.answer);
  if(ans.includes(letter)){
    guessedLetters.add(letter);
    markKey(letter, "correct");
    updateSolveAvailability();
    addPoints(currentTurn, 1);
    renderWord();
    updateLogs();
    setIllustrationResult("correct");
    playCorrect();

    if(isSolved()){
      lastAnsweredState = beforeGuess;
      roundSolved = true;
      addPoints(currentTurn, 5);
      disableKeyboard();
      setBonusAvailable(true);
      setIllustrationResult("solved");
      setStatus(`${currentTurn} solved it! Bonus is available.`);
      confetti();
      playWin();
      playBonusAvailable();
    } else {
      setStatus(`${currentTurn} got a correct letter! +1 point`);
    }
  } else {
    wrongLetters.add(letter);
    markKey(letter, "wrong");
    updateSolveAvailability();
    lives--;
    renderHearts();
    updateLogs();
    drawFigure();
    setIllustrationResult("wrong");
    playWrong();
    playHit();

    if(lives <= 0){
      lastAnsweredState = beforeGuess;
      roundSolved = true;
      renderWord(true);
      disableKeyboard();
      setBonusAvailable(true);
      setStatus(`No hearts left! Answer: ${currentQuestion.answer}`);
      playGameOver();
    } else {
      setStatus(`${currentTurn} missed. Turn switches!`);
      switchTurn();
      playSwitch();
    }
  }
}

function revealAnswer(){
  if(!gameStarted || !currentQuestion) return;
  lastAnsweredState = captureQuestionState();
  answerRevealed = true;
  roundSolved = true;
  renderWord(true);
  disableKeyboard();
  setBonusAvailable(true);
  setIllustrationResult("solved");
  setStatus(`Answer revealed: ${currentQuestion.answer}`);
  playReveal();
}

function openSolveModal(){
  if(!gameStarted || roundSolved || gameFinished || !currentQuestion) return;
  if(!canSolveNow()){
    setStatus("Solve is only available before any letter guess or solve attempt.");
    updateSolveAvailability();
    playButtonPress();
    return;
  }
  playButtonPress();
  $("solveInput").value = "";
  $("solveModal").style.display = "flex";
  $("solveInput").focus();
}

function closeSolveModal(){
  $("solveModal").style.display = "none";
  playButtonPress();
}

function solveAnswer(rawAnswer){
  if(!gameStarted || roundSolved || gameFinished || !currentQuestion) return;

  const submitted = norm(rawAnswer);
  if(!submitted) return;

  if(!canSolveNow()){
    setStatus("Solve is only available before any letter guess or solve attempt.");
    updateSolveAvailability();
    return;
  }

  const beforeSolve = captureQuestionState();
  // do not mark solveAttempted here — allow repeated solve attempts as long as no letters have been guessed
  updateSolveAvailability();

  if(submitted === norm(currentQuestion.answer)){
    lastAnsweredState = beforeSolve;
    const remainingLetters = answerLetters().filter(letter => !guessedLetters.has(letter));
    remainingLetters.forEach(letter => {
      guessedLetters.add(letter);
      markKey(letter, "correct");
    });

    addPoints(currentTurn, remainingLetters.length);
    roundSolved = true;
    renderWord(true);
    updateLogs();
    disableKeyboard();
    setBonusAvailable(true);
    setIllustrationResult("solved");
    $("solveModal").style.display = "none";
    setStatus(`${currentTurn} solved it! +${remainingLetters.length} unique letter points.`);
    confetti();
    playWin();
    playBonusAvailable();
    return;
  }

  // wrong full answer: lose a life and reflect on the illustration (no wrong letter added)
  lives--;
  $("solveModal").style.display = "none";
  renderHearts();
  drawFigure();
  setIllustrationResult("wrong");
  playWrong();
  playHit();

  if(lives <= 0){
    lastAnsweredState = beforeSolve;
    roundSolved = true;
    renderWord(true);
    disableKeyboard();
    setBonusAvailable(true);
    setStatus(`No hearts left! Answer: ${currentQuestion.answer}`);
    playGameOver();
  } else {
    setStatus(`${currentTurn} missed the full answer. Turn switches!`);
    switchTurn();
    playSwitch();
  }
}

function nextQuestion(){
  if(!gameStarted) return;
  playButtonPress();
  if(usingTieBreaker){finishGame(true);return}
  loadQuestion(currentIndex + 1, false);
  playLevelUp();
}

function startGame(){
  gameStarted = true;
  gameFinished = false;
  usingTieBreaker = false;
  firstStartingTeam = null;
  leftScore = 0;
  rightScore = 0;
  updateScores();
  playButtonPress();
  loadQuestion(0, false);
  tryStartMusic();
}

function finishGame(afterTie=false){
  if(!afterTie && leftScore === rightScore){
    $("tieModal").style.display = "flex";
    playButtonPress();
    return;
  }

  gameFinished = true;
  roundSolved = true;
  disableKeyboard();

  let msg = "";
  if(leftScore > rightScore) msg = `🏆 Left Team Wins!`;
  else if(rightScore > leftScore) msg = `🏆 Right Team Wins!`;
  else msg = `🤝 Still tied!`;

  $("winnerBanner").textContent = `${msg} ${leftScore} - ${rightScore}`;
  $("winnerBanner").style.display = "block";
  $("winnerModalText").textContent = msg;
  $("winnerModalScore").textContent = `Final Score — Left Team: ${leftScore} | Right Team: ${rightScore}`;
  $("winnerModal").style.display = "flex";
  setStatus("All rounds complete!");
  confetti(80);
  playWin();
}

function resetGame(){
  if(!confirm("Reset the entire game?")) return;
  currentIndex = -1;
  currentQuestion = null;
  guessedLetters = new Set();
  wrongLetters = new Set();
  currentTurn = "Left Team";
  firstStartingTeam = null;
  leftScore = 0;
  rightScore = 0;
  lives = 6;
  gameStarted = false;
  roundSolved = false;
  gameFinished = false;
  usingTieBreaker = false;
  solveAttempted = false;
  questionStartState = null;
  lastAnsweredState = null;
  updateScores();
  updateTurnUI();
  $("roundLabel").textContent = "0";
  $("questionLabel").textContent = `0 / ${questions.length}`;
  $("categoryLabel").textContent = "---";
  $("clueText").textContent = "Press Begin to start.";
  setStatus("Welcome to the game!");
  setBonusAvailable(false);
  setIllustrationResult(null);
  renderHearts();
  updateLogs();
  initKeyboard();
  updateSolveAvailability();
  $("wordDisplay").innerHTML = "";
  drawFigure();
}

function returnQuestion(){
  if(!gameStarted || !currentQuestion){
    setStatus("No active question to return.");
    return;
  }

  if(roundSolved && lastAnsweredState){
    applyQuestionState(lastAnsweredState, "Returned to the previous state.");
    lastAnsweredState = null;
    return;
  }

  if(questionStartState){
    applyQuestionState(questionStartState, "Returned this question to its unanswered state.");
    return;
  }

  setStatus("Question is not ready to return yet.");
}

function openBonus(){
  if($("bonusBtn").disabled) return;
  playButtonPress();
  $("bonusText").textContent = currentQuestion.bonus;
  $("bonusModal").style.display = "flex";
}

function closeBonus(){
  $("bonusModal").style.display = "none";
  playButtonPress();
  setStatus("Bonus skipped. Press Next when ready.");
}

function openHelpModal(startAfter=false){
  showStartAfterHelp = !!startAfter;
  helpStep = 0;
  $("helpModal").style.display = "flex";
  $("closeHelpBtn").textContent = showStartAfterHelp ? "Skip Instructions" : "Close";
  updateHelpStep();
  playButtonPress();
}

function closeHelpModal(){
  $("helpModal").style.display = "none";
  playButtonPress();
  if(showStartAfterHelp){
    showStartAfterHelp = false;
    $("startOverlay").classList.add("show");
  }
}

function updateHelpStep(){
  const steps = [...document.querySelectorAll(".instruction-step")];
  steps.forEach((s,i) => s.classList.toggle("active", i === helpStep));
  $("helpStepCounter").textContent = `${helpStep+1} / ${steps.length}`;
  $("prevHelpBtn").disabled = helpStep === 0;
  $("nextHelpBtn").textContent = helpStep === steps.length - 1 ? "Done" : "Next";
}

// drawing
function strokeLine(x1,y1,x2,y2,j=.5){
  for(let i=0;i<2;i++){
    ctx.beginPath();
    ctx.moveTo(x1+Math.random()*j-j/2, y1+Math.random()*j-j/2);
    ctx.lineTo(x2+Math.random()*j-j/2, y2+Math.random()*j-j/2);
    ctx.stroke();
  }
}
function fillCircle(x,y,r,fill="#f7f4ea"){
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function drawFigure(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.save();
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--brown").trim();
  ctx.lineWidth = 5.3;
  strokeLine(320,110,320,585,.05);
  strokeLine(92,110,548,110,.05);
  strokeLine(140,585,500,585,.05);
  ctx.restore();

  // number of wrong parts to show: either based on explicit wrong letters OR based on lost lives
  const wrongFromLetters = wrongLetters.size;
  const wrongFromLives = 6 - lives; // when solve causes lives--, wrongLetters may be unchanged
  const w = Math.max(wrongFromLetters, wrongFromLives);

  if(w >= 2) drawLeftArm();
  if(w >= 3) drawRightArm();
  if(w >= 4) drawBody();
  if(w >= 5) drawLeftFoot();
  if(w >= 6) drawRightFoot();
  if(w >= 1) drawHead(lives <= 0);
}
function drawHead(dead=false){
  fillCircle(320,150,38);
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.arc(320,150,38,0,Math.PI*2);
  ctx.stroke();
  ctx.lineWidth = 3;
  if(dead){
    strokeLine(308,147,315,154,.06);
    strokeLine(315,147,308,154,.06);
    strokeLine(325,147,332,154,.06);
    strokeLine(332,147,325,154,.06);
    strokeLine(310,166,330,166,.06);
  } else {
    fillCircle(312,150,3.5,"#111");
    fillCircle(328,150,3.5,"#111");
    ctx.beginPath();
    ctx.arc(320,163,10,0.12*Math.PI,0.88*Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}
function drawLeftArm(){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=5.8;strokeLine(320,190,196,110,.06);ctx.restore();
}
function drawRightArm(){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=5.8;strokeLine(320,190,444,110,.06);ctx.restore();
}
function drawBody(){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=6;strokeLine(320,190,320,390,.05);ctx.restore();
}
function drawLeftFoot(){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=5.2;strokeLine(320,390,300,540,.05);strokeLine(300,540,315,558,.05);ctx.restore();
}
function drawRightFoot(){
  ctx.save();ctx.strokeStyle="#111";ctx.lineWidth=5.2;strokeLine(320,390,340,540,.05);strokeLine(340,540,325,558,.05);ctx.restore();
}

// audio
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq=440, duration=.1, type="sine", vol=null){
  if(!sfxOn) return;
  const ac = getAudioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol ?? Number($("sfxVolume").value);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + duration);
  osc.stop(ac.currentTime + duration);
}

function playCorrect(){
  playTone(650, .07, "triangle");
  setTimeout(()=>playTone(820, .07, "triangle"), 65);
  setTimeout(()=>playTone(980, .05, "triangle"), 110);
}

function playWrong(){
  playTone(160, .18, "sawtooth", Number($("sfxVolume").value)*.5);
  setTimeout(()=>playTone(140, .12, "sawtooth", Number($("sfxVolume").value)*.4), 100);
}

function playReveal(){
  playTone(500, .08, "sine");
  setTimeout(()=>playTone(650, .08, "sine"), 100);
  setTimeout(()=>playTone(800, .1, "sine"), 180);
}

function playWin(){
  [523, 659, 784, 988, 1175].forEach((f,i)=>
    setTimeout(()=>playTone(f, .12, "triangle"), i*95)
  );
}

function playRouletteSound(){
  let i = 0;
  const t = setInterval(() => {
    playTone(260+i*18, .04, "square", .12);
    if(++i > 16) clearInterval(t);
  }, 70);
}

function playBonusAvailable(){
  playTone(587, .08, "sine");
  setTimeout(()=>playTone(784, .08, "sine"), 120);
  setTimeout(()=>playTone(1047, .12, "sine"), 240);
}

function playLevelUp(){
  [440, 494, 523, 587, 659].forEach((f,i)=>
    setTimeout(()=>playTone(f, .08, "triangle"), i*60)
  );
}

function playSwitch(){
  playTone(300, .05, "triangle");
  setTimeout(()=>playTone(400, .05, "triangle"), 80);
}

function playGameOver(){
  playTone(200, .15, "sawtooth", Number($("sfxVolume").value)*.6);
  setTimeout(()=>playTone(160, .15, "sawtooth", Number($("sfxVolume").value)*.6), 160);
  setTimeout(()=>playTone(140, .2, "sawtooth", Number($("sfxVolume").value)*.7), 320);
}

function playHit(){
  playTone(800, .05, "square");
  setTimeout(()=>playTone(750, .05, "square"), 50);
  setTimeout(()=>playTone(700, .06, "square"), 100);
}

function playButtonPress(){
  playTone(480, .04, "triangle");
}

function updateMusicStatus(message){
  if($("musicStatus")) $("musicStatus").textContent = message;
  if($("musicToggleBtn")){
    const label = $("musicToggleBtn").querySelector("span:last-child");
    if(label) label.textContent = bgAudio.paused ? "Play Music" : "Pause Music";
  }
}

async function tryStartMusic(){
  if(!musicEnabled) return;
  if(!bgAudio.src) bgAudio.src = BG_MUSIC_SRC;
  bgAudio.volume = Number($("musicVolume").value);
  bgAudio.muted = false;
  try{
    await bgAudio.play();
    updateMusicStatus("Music is playing.");
  } catch(e){
    updateMusicStatus("Music was blocked. Press Play Music.");
    console.warn("Music could not play:", e);
  }
}

function toggleMusic(){
  musicEnabled = true;
  if(bgAudio.paused){
    tryStartMusic();
  } else {
    bgAudio.pause();
    updateMusicStatus("Music is paused.");
  }
}

function confetti(count=35){
  const colors=["#3151ff","#E9468E","#F28C28","#f2cf4f","#1aa453"];
  for(let i=0;i<count;i++){
    const d=document.createElement("div");
    d.className="confetti";
    d.style.left=Math.random()*100+"vw";
    d.style.background=colors[i%colors.length];
    d.style.animationDelay=Math.random()*.25+"s";
    document.body.appendChild(d);
    setTimeout(()=>d.remove(),1800);
  }
}

function toggleFullscreen(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}
document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("fullscreen-active", !!document.fullscreenElement);
});

// events
$("openingStartBtn").onclick = () => {
  playButtonPress();
  $("openingScreen").style.display = "none";
  openHelpModal(true);
};

$("titleFullscreenBtn").onclick = () => {
  playButtonPress();
  toggleFullscreen();
};

$("realStartBtn").onclick = () => {
  playButtonPress();
  $("startOverlay").classList.remove("show");
  startGame();
};

$("startBtn").onclick = () => {
  if(!gameStarted){
    playButtonPress();
    $("openingScreen").style.display = "none";
    $("startOverlay").classList.add("show");
  }
};

$("nextBtn").onclick = () => {
  nextQuestion();
};

$("revealBtn").onclick = () => {
  playButtonPress();
  revealAnswer();
};

$("solveBtn").onclick = openSolveModal;

$("bonusBtn").onclick = openBonus;

$("fullscreenBtn").onclick = () => {
  playButtonPress();
  toggleFullscreen();
};

$("helpBtn").onclick = () => {
  openHelpModal(false);
};

$("shortcutsBtn").onclick = () => {
  playButtonPress();
  $("shortcutsModal").style.display = "flex";
};

$("returnBtn").onclick = () => {
  playButtonPress();
  returnQuestion();
};

$("resetBtn").onclick = () => {
  playButtonPress();
  resetGame();
};

$("settingsBtn").onclick = () => {
  playButtonPress();
  $("settingsPanel").style.display = $("settingsPanel").style.display === "block" ? "none" : "block";
};

$("closeSettingsBtn").onclick = () => {
  playButtonPress();
  $("settingsPanel").style.display = "none";
};

$("musicToggleBtn").onclick = () => {
  playButtonPress();
  toggleMusic();
};

$("musicVolume").oninput = () => {
  bgAudio.volume = Number($("musicVolume").value);
  if(!bgAudio.paused) updateMusicStatus("Music is playing.");
};

$("sfxVolume").oninput = () => {
  sfxOn = Number($("sfxVolume").value) > 0;
};

$("prevHelpBtn").onclick = () => {
  if(helpStep > 0){
    playButtonPress();
    helpStep--;
    updateHelpStep();
  }
};

$("nextHelpBtn").onclick = () => {
  const steps = document.querySelectorAll(".instruction-step").length;
  if(helpStep < steps - 1){
    playButtonPress();
    helpStep++;
    updateHelpStep();
  } else {
    closeHelpModal();
  }
};

$("closeHelpBtn").onclick = closeHelpModal;

$("closeShortcutsBtn").onclick = () => {
  playButtonPress();
  $("shortcutsModal").style.display = "none";
};

$("solveForm").onsubmit = e => {
  e.preventDefault();
  playButtonPress();
  solveAnswer($("solveInput").value);
};

$("closeSolveBtn").onclick = closeSolveModal;

$("bonusLeftBtn").onclick = () => {
  playWin();
  addPoints("Left Team",3);
  $("bonusModal").style.display = "none";
  setStatus("Bonus awarded to Left Team! +3");
};

$("bonusRightBtn").onclick = () => {
  playWin();
  addPoints("Right Team",3);
  $("bonusModal").style.display = "none";
  setStatus("Bonus awarded to Right Team! +3");
};

$("closeBonusBtn").onclick = closeBonus;

$("startTieBtn").onclick = () => {
  playButtonPress();
  $("tieModal").style.display = "none";
  loadQuestion(0,true);
};

$("closeWinnerBtn").onclick = () => {
  playButtonPress();
  $("winnerModal").style.display = "none";
};

window.addEventListener("keydown", e => {
  const letter = e.key.toUpperCase();

  if(e.key === "Escape"){
    playButtonPress();
    ["helpModal","shortcutsModal","bonusModal","tieModal","winnerModal","solveModal","rouletteWrap"].forEach(id => {
      const el = $(id);
      if(el) el.style.display = "none";
    });
    return;
  }

  if(isTextEntryTarget(e.target)) return;

  if($("helpModal").style.display === "flex"){
    if(e.key === "ArrowRight" || e.key === "Enter"){
      e.preventDefault();
      $("nextHelpBtn").click();
    } else if(e.key === "ArrowLeft"){
      e.preventDefault();
      $("prevHelpBtn").click();
    }
    return;
  }

  if(e.altKey){
    const shortcuts = {
      B: openBonus,
      F: toggleFullscreen,
      H: () => openHelpModal(false),
      K: () => {$("shortcutsModal").style.display = "flex";},
      M: toggleMusic,
      N: nextQuestion,
      Q: returnQuestion,
      R: revealAnswer,
      S: openSolveModal
    };
    if(shortcuts[letter]){
      e.preventDefault();
      playButtonPress();
      shortcuts[letter]();
      return;
    }
  }

  if(e.key === "?" && $("helpModal").style.display !== "flex"){
    e.preventDefault();
    openHelpModal(false);
    return;
  }

  if(e.key === "/" && !roundSolved){
    e.preventDefault();
    openSolveModal();
    return;
  }

  if(e.key === "Enter"){
    if($("openingScreen").style.display !== "none"){
      e.preventDefault();
      $("openingStartBtn").click();
      return;
    }
    if($("startOverlay").classList.contains("show")){
      e.preventDefault();
      $("realStartBtn").click();
      return;
    }
    if(roundSolved){
      e.preventDefault();
      nextQuestion();
      return;
    }
  }

  if(hasOpenModal()) return;

  if(/^[A-Z]$/.test(letter)){
    const btn = [...document.querySelectorAll(".key")].find(k => k.dataset.letter === letter);
    if(btn && !btn.disabled) handleGuess(letter, btn);
  }
});

// init
initKeyboard();
renderHearts();
updateLogs();
updateScores();
updateTurnUI();
updateSolveAvailability();
drawFigure();
