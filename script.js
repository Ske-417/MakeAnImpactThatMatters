// シンプルなクライアント実装
// 盤は7x7のグリッドにスパイラルで30マスを配置（ゴールは中心）

const COLORS = ["#ff6b6b","#4dabf7","#ffd43b","#6be5a7","#a88cff","#ff9f6b"];

const BOARD_SIZE = 7;
const PATH_LENGTH = 30; // プレイヤーが通るマス数（start含む? We'll make start index 0, goal is last）
const START_INDEX = 0;
const GOAL_INDEX = PATH_LENGTH - 1;

// DOM
const boardEl = document.getElementById("board");
const playerCountSel = document.getElementById("playerCount");
const playerNamesDiv = document.getElementById("playerNames");
const startBtn = document.getElementById("startBtn");
const gameSection = document.getElementById("game");
const setupSection = document.getElementById("setup");
const playersInfo = document.getElementById("playersInfo");
const turnText = document.getElementById("turnText");
const rollBtn = document.getElementById("rollBtn");
const diceResult = document.getElementById("diceResult");
const eventOverlay = document.getElementById("eventOverlay");
const eventTitle = document.getElementById("eventTitle");
const eventBody = document.getElementById("eventBody");
const eventOkBtn = document.getElementById("eventOkBtn");

let players = [];
let currentTurn = 0;
let positions = []; // path coords list of length PATH_LENGTH: {r,c}
let cells = []; // element refs for grid (7x7 array)
let gameActive = false;

// 初期: プレイヤー名入力フォームを人数に応じて表示
function renderNameInputs() {
  playerNamesDiv.innerHTML = "";
  const n = parseInt(playerCountSel.value,10);
  for (let i=0;i<n;i++){
    const div = document.createElement("div");
    div.className = "playerNameInput";
    div.innerHTML = `
      <label>名前
        <input data-idx="${i}" placeholder="プレイヤー ${i+1}" />
      </label>
    `;
    playerNamesDiv.appendChild(div);
  }
}
playerCountSel.addEventListener("change", renderNameInputs);
renderNameInputs();

// スパイラルでPATH_LENGTHの座標を生成（7x7グリッドの外側から中へ）
function generateSpiralCoords(size, steps) {
  const center = Math.floor(size/2);
  // We'll generate full spiral visiting outermost ring clockwise starting at top-left corner of ring.
  // Simpler: generate a spiral starting at (0,0) moving right, down, left, up inward, until we collect positions.
  const gridVisited = Array.from({length:size}, ()=>Array(size).fill(false));
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  let dir = 0;
  let r = 0, c = 0;
  const result = [];
  for (let i=0;i<size*size && result.length < steps;i++){
    if (r>=0 && r<size && c>=0 && c<size && !gridVisited[r][c]) {
      gridVisited[r][c] = true;
      // We'll prefer taking cells from the outer border inward: but this naive spiral from (0,0) suffices
      result.push({r,c});
    } else {
      // shouldn't happen
    }
    // try move
    let nr = r + dirs[dir][0], nc = c + dirs[dir][1];
    if (!(nr>=0 && nr<size && nc>=0 && nc<size && !gridVisited[nr][nc])) {
      dir = (dir+1)%4;
      nr = r + dirs[dir][0];
      nc = c + dirs[dir][1];
    }
    r = nr; c = nc;
  }
  // The above gives a spiral starting at top-left going right across top row, then down, etc.
  // But user wanted "ぐるぐる回って、ど真ん中にゴール" — we can reverse the array so path goes from outer to center.
  return result.slice(0,steps).reverse();
}

// Render board grid and path cells
function renderBoard() {
  boardEl.innerHTML = "";
  cells = Array.from({length:BOARD_SIZE}, ()=>Array(BOARD_SIZE).fill(null));
  // create 7x7 cells
  for (let r=0;r<BOARD_SIZE;r++){
    for (let c=0;c<BOARD_SIZE;c++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r; cell.dataset.c = c;
      boardEl.appendChild(cell);
      cells[r][c] = cell;
    }
  }
  // compute positions
  positions = generateSpiralCoords(BOARD_SIZE, PATH_LENGTH);
  // mark path
  positions.forEach((pos, idx)=>{
    const el = cells[pos.r][pos.c];
    el.classList.add("path");
    el.dataset.pathIndex = idx;
    // label numbers on path (optional)
    const num = document.createElement("div");
    num.className = "cell-num";
    if (idx === START_INDEX) num.textContent = "Start";
    else if (idx === GOAL_INDEX) num.textContent = "Goal";
    else num.textContent = idx;
    el.appendChild(num);
    if (idx === GOAL_INDEX) el.classList.add("goal");
    if (idx === START_INDEX) el.classList.add("start");
    // add pawn stack container
    const stack = document.createElement("div");
    stack.className = "pawnStack";
    el.appendChild(stack);
  });
}

// プレイヤーオブジェクトテンプレート
function makePlayers(n) {
  const arr = [];
  for (let i=0;i<n;i++){
    arr.push({
      id:i,
      name: document.querySelector(`input[data-idx="${i}"]`).value || `P${i+1}`,
      color: COLORS[i % COLORS.length],
      pos: START_INDEX,
      money: 1000,
      experience: 0,
      reputation: 50,
      stress: 10,
      finished: false
    });
  }
  return arr;
}

function renderPlayersInfo(){
  playersInfo.innerHTML = "";
  players.forEach((p, idx)=>{
    const div = document.createElement("div");
    div.className = "playerCard";
    div.innerHTML = `
      <div class="playerColor" style="background:${p.color}"></div>
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${p.name}</strong> <span class="turn-indicator">${currentTurn===idx ? "(→)" : ""}</span></div>
          <div style="font-size:12px;color:#999">#${p.id+1}</div>
        </div>
        <div class="playerAttr">
          所持金: ¥${p.money}　経験: ${p.experience}　評判: ${p.reputation}　ストレス: ${p.stress}
        </div>
      </div>
    `;
    playersInfo.appendChild(div);
  });
  renderPawns();
}

function renderPawns(){
  // clear all pawnStacks
  positions.forEach((pos, idx)=>{
    const cell = cells[pos.r][pos.c];
    const stack = cell.querySelector(".pawnStack");
    stack.innerHTML = "";
  });
  players.forEach(p=>{
    const pos = positions[p.pos];
    const cell = cells[pos.r][pos.c];
    const stack = cell.querySelector(".pawnStack");
    const pawn = document.createElement("span");
    pawn.className = "pawn";
    pawn.style.background = p.color;
    pawn.title = p.name;
    stack.appendChild(pawn);
  });
}

// ターン表示更新
function updateTurnText(){
  const p = players[currentTurn];
  if (p.finished) {
    turnText.textContent = `${p.name} はゴール済み。次のプレイヤーへ。`;
    rollBtn.disabled = true;
  } else {
    turnText.textContent = `ターン: ${p.name} の番です`;
    rollBtn.disabled = !gameActive;
  }
}

// サイコロを振る
function rollDice(){
  const n = Math.floor(Math.random()*6)+1;
  diceResult.textContent = `出目: ${n}`;
  return n;
}

// 移動処理
function movePlayer(pIdx, steps){
  const p = players[pIdx];
  p.pos = Math.min(p.pos + steps, GOAL_INDEX);
  // simple effects on moving: slight stress increase per step
  p.stress += Math.max(0, Math.floor(steps/2));
  if (p.pos === GOAL_INDEX) {
    p.finished = true;
    p.reputation += 10;
    p.experience += 50;
    p.money += 500;
  }
  renderPlayersInfo();
}

// イベントトリガー判定（マス特性）
// ここでは、StartとGoal以外は全てイベントマスとして扱う
function isEventSpace(index){
  return index !== START_INDEX && index !== GOAL_INDEX;
}

// イベント生成：プレイヤーの属性に合わせた文章と効果を返す
function generateEventFor(player){
  // 概要: プレイヤーの money, experience, reputation, stress に基づいて
  // 良いこと・悪いことを出す。メッセージと適用関数を返す。
  const msgs = [];
  // 高ストレスなら「バーンアウトの危険」系
  if (player.stress >= 25) {
    msgs.push({
      title: "高ストレス警報",
      text: `${player.name} のストレスが高く、体調不良で1ターン休む必要があるかも。休めば経験は減るが回復します。`,
      apply: (p) => {
        p.stress = Math.max(5, p.stress - 10);
        p.experience = Math.max(0, p.experience - 5);
      }
    });
  }
  // 低経験だと「若手プロジェクト補助」のチャンス
  if (player.experience <= 20) {
    msgs.push({
      title: "若手サポート案件",
      text: `小規模プロジェクトのサポート依頼。経験は得られるが報酬は控えめ。経験+8, 所持金+200`,
      apply: (p) => {
        p.experience += 8;
        p.money += 200;
        p.stress += 3;
        p.reputation += 2;
      }
    });
  }
  // 高評判なら「紹介で大型案件」
  if (player.reputation >= 70) {
    msgs.push({
      title: "紹介で大型案件",
      text: `評判が高く大案件の話が来た！経験+20, 所持金+800, ストレス+8`,
      apply: (p) => {
        p.experience += 20;
        p.money += 800;
        p.stress += 8;
      }
    });
  }
  // 低所持金なら「急な出費」
  if (player.money < 300) {
    msgs.push({
      title: "急な出費",
      text: `出張費や資料費の急な出費。-¥250、ストレス+4`,
      apply: (p) => {
        p.money = Math.max(0, p.money - 250);
        p.stress += 4;
      }
    });
  }
  // デフォルトのランダムイベント
  const generic = [
    {
      title: "ランダムな学び",
      text: "役立つ勉強会に参加。経験+5, 所持金-50, ストレス-2",
      apply: (p)=>{ p.experience+=5; p.money=Math.max(0,p.money-50); p.stress=Math.max(0,p.stress-2); }
    },
    {
      title: "クライアントからの感謝",
      text: "小さな好評。評判+4, 所持金+150",
      apply: (p)=>{ p.reputation+=4; p.money+=150; }
    },
    {
      title: "炎上トラブル",
      text: "想定外のトラブルに巻き込まれる。評判-8, ストレス+6",
      apply: (p)=>{ p.reputation=Math.max(0,p.reputation-8); p.stress+=6; }
    }
  ];
  // 組み合わせロジック: 条件により最適なものを選ぶ（優先表示）
  if (msgs.length>0){
    // pick most severe (highest stress or low money priority)
    // simple: pick first for now
    const chosen = msgs[0];
    return chosen;
  } else {
    // pick random generic
    return generic[Math.floor(Math.random()*generic.length)];
  }
}

// イベント表示
function showEventForPlayer(playerIdx){
  const p = players[playerIdx];
  if (!isEventSpace(p.pos)) return; // no event
  const ev = generateEventFor(p);
  eventTitle.textContent = ev.title;
  eventBody.innerHTML = `<p>${ev.text}</p>`;
  eventOverlay.classList.remove("hidden");
  eventOverlay.setAttribute("aria-hidden", "false");
  // on OK apply
  eventOkBtn.onclick = ()=>{
    ev.apply(p);
    // small bounds
    p.stress = Math.max(0, p.stress);
    p.reputation = Math.min(100, p.reputation);
    renderPlayersInfo();
    eventOverlay.classList.add("hidden");
    eventOverlay.setAttribute("aria-hidden", "true");
    // next turn
    nextTurn();
  };
}

// 次のターンへ
function nextTurn(){
  // if all finished -> end game
  if (players.every(p=>p.finished)){
    turnText.textContent = "全員ゴールしました！ゲーム終了。";
    rollBtn.disabled = true;
    gameActive = false;
    return;
  }
  // advance to next not-finished player
  let next = currentTurn;
  for (let i=1;i<=players.length;i++){
    const cand = (currentTurn + i) % players.length;
    if (!players[cand].finished) { next = cand; break; }
  }
  currentTurn = next;
  updateTurnText();
}

// ゲーム開始
startBtn.addEventListener("click", ()=>{
  const n = parseInt(playerCountSel.value,10);
  players = makePlayers(n);
  renderBoard();
  renderPlayersInfo();
  setupSection.classList.add("hidden");
  gameSection.classList.remove("hidden");
  gameActive = true;
  currentTurn = 0;
  updateTurnText();
  diceResult.textContent = "";
});

// サイコロボタン
rollBtn.addEventListener("click", ()=>{
  if (!gameActive) return;
  const pIdx = currentTurn;
  const p = players[pIdx];
  if (p.finished) {
    nextTurn();
    return;
  }
  rollBtn.disabled = true;
  const n = rollDice();
  setTimeout(()=>{
    movePlayer(pIdx, n);
    // after moving, if landed on event space → show event; otherwise directly nextTurn
    if (isEventSpace(players[pIdx].pos) && !players[pIdx].finished) {
      showEventForPlayer(pIdx);
    } else {
      // no event (start or goal), proceed to next turn after small delay
      setTimeout(()=>{
        rollBtn.disabled = false;
        nextTurn();
      }, 500);
    }
  }, 500);
});

// 初期ボード描画
renderBoard();

// window controls
eventOverlay.addEventListener("click", (e)=>{
  if (e.target === eventOverlay) {
    // 透過部分をクリックしたら閉じる（確認なし）
    eventOverlay.classList.add("hidden");
    eventOverlay.setAttribute("aria-hidden","true");
    nextTurn();
  }
});
