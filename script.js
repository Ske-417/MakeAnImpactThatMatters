// 簡易なゲームロジックと UI 制御
document.addEventListener('DOMContentLoaded', () => {
  const gridSize = 7;
  const board = document.getElementById('board');
  const playerCountSelect = document.getElementById('playerCount');
  const playerNamesContainer = document.getElementById('playerNames');
  const startBtn = document.getElementById('startBtn');
  const gameSection = document.getElementById('game');
  const playersInfo = document.getElementById('playersInfo');
  const turnText = document.getElementById('turnText');
  const rollBtn = document.getElementById('rollBtn');
  const diceResult = document.getElementById('diceResult');
  const eventOverlay = document.getElementById('eventOverlay');
  const eventTitle = document.getElementById('eventTitle');
  const eventBody = document.getElementById('eventBody');
  const eventOkBtn = document.getElementById('eventOkBtn');

  let players = [];
  let currentPlayerIndex = 0;
  let pathIndices = []; // 盤面の外周インデックス（順序つき）
  let cells = []; // DOM のセル配列
  const colors = ['#ff6b6b','#4dabf7','#ffd43b','#51cf66','#a084ff','#ff7eb6'];

  // プレイヤー名入力欄を生成
  function renderPlayerInputs() {
    playerNamesContainer.innerHTML = '';
    const count = Number(playerCountSelect.value);
    for (let i=0;i<count;i++){
      const div = document.createElement('div');
      div.className = 'playerNameInput';
      const label = document.createElement('label');
      label.textContent = `プレイヤー ${i+1}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Player ${i+1}`;
      input.value = `プレイヤー${i+1}`;
      input.dataset.index = i;
      div.appendChild(label);
      div.appendChild(input);
      playerNamesContainer.appendChild(div);
    }
  }

  playerCountSelect.addEventListener('change', renderPlayerInputs);
  renderPlayerInputs();

  // 盤面のセルを作る（7x7）
  function buildBoard() {
    board.innerHTML = '';
    cells = [];
    for (let r=0;r<gridSize;r++){
      for (let c=0;c<gridSize;c++){
        const idx = r*gridSize + c;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = idx;
        // pawnStack を作る
        const pawnStack = document.createElement('div');
        pawnStack.className = 'pawnStack';
        cell.appendChild(pawnStack);
        board.appendChild(cell);
        cells.push(cell);
      }
    }

    // 外周インデックスを時計回り（下段左→右、右列上→下、上段右→左、左列下→上)
    pathIndices = [];
    // bottom row col0..6
    for (let c=0;c<gridSize;c++){
      pathIndices.push((gridSize-1)*gridSize + c); // row6
    }
    // right column rows5..1 (col 6)
    for (let r=gridSize-2;r>=1;r--){
      pathIndices.push(r*gridSize + (gridSize-1));
    }
    // top row col6..0
    for (let c=gridSize-1;c>=0;c--){
      pathIndices.push(0*gridSize + c);
    }
    // left column rows1..5 (col 0)
    for (let r=1;r<=gridSize-2;r++){
      pathIndices.push(r*gridSize + 0);
    }

    // マスに path/ start/ goal クラスを付与 & 番号表示
    pathIndices.forEach((boardIdx, pos) => {
      const cell = cells[boardIdx];
      if (!cell) return;
      cell.classList.add('path');
      const num = document.createElement('div');
      num.className = 'cell-num';
      num.textContent = (pos+1);
      cell.appendChild(num);
      if (pos === 0) cell.classList.add('start');
      if (pos === pathIndices.length - 1) cell.classList.add('goal');
    });
  }

  function createPlayers() {
    players = [];
    const inputs = playerNamesContainer.querySelectorAll('input');
    inputs.forEach((input,i) => {
      players.push({
        name: input.value || `プレイヤー${i+1}`,
        color: colors[i % colors.length],
        pos: 0 // path 上の位置（0 = start）
      });
    });
    renderPlayersInfo();
    drawPawns();
  }

  function renderPlayersInfo() {
    playersInfo.innerHTML = '';
    players.forEach((p,i) => {
      const div = document.createElement('div');
      div.className = 'playerCard';
      const color = document.createElement('div');
      color.className = 'playerColor';
      color.style.background = p.color;
      const name = document.createElement('div');
      name.innerHTML = `<strong>${p.name}</strong><div class="playerAttr">位置: ${p.pos+1}</div>`;
      div.appendChild(color);
      div.appendChild(name);
      playersInfo.appendChild(div);
    });
    updateTurnText();
  }

  // 盤上の駒を描画
  function drawPawns() {
    // まずすべての pawnStack を空にする
    cells.forEach(cell => {
      const ps = cell.querySelector('.pawnStack');
      ps.innerHTML = '';
    });
    // 各プレイヤーの pos を使って配置
    players.forEach((p, i) => {
      const boardIndex = pathIndices[ p.pos % pathIndices.length ];
      const cell = cells[boardIndex];
      const ps = cell.querySelector('.pawnStack');
      const pawn = document.createElement('span');
      pawn.className = 'pawn';
      pawn.style.background = p.color;
      pawn.title = p.name;
      ps.appendChild(pawn);
    });
    renderPlayersInfo(); // 位置表示更新
  }

  function updateTurnText() {
    if (players.length === 0) {
      turnText.textContent = '';
      return;
    }
    const cur = players[currentPlayerIndex];
    turnText.innerHTML = `<span class="turn-indicator">${cur.name}</span> の番です`;
  }

  // サイコロを振って移動（アニメーション）
  function rollDiceAndMove() {
    rollBtn.disabled = true;
    const roll = Math.floor(Math.random()*6) + 1;
    diceResult.textContent = `出目: ${roll}`;
    const player = players[currentPlayerIndex];
    let steps = roll;
    const stepInterval = 180;
    function step() {
      if (steps <= 0) {
        // 着地処理
        const landedPos = player.pos % pathIndices.length;
        showEventIfAny(player, landedPos);
        return;
      }
      player.pos = (player.pos + 1) % pathIndices.length;
      drawPawns();
      steps--;
      setTimeout(step, stepInterval);
    }
    setTimeout(step, stepInterval);
  }

  function showEventIfAny(player, landedPos) {
    // 簡単なイベント: 3 の倍数マスにイベント表示する例
    if ((landedPos + 1) % 3 === 0) {
      eventTitle.textContent = 'イベント発生！';
      eventBody.textContent = `${player.name} が特別なマスに止まりました。効果：次のターン +1 歩進む（例）`;
      showOverlay();
      // OK ボタンで効果を適用して次のターンへ（OK のハンドラが行う）
    } else {
      // イベントなしなら次のターンへ
      nextTurn();
    }
  }

  function showOverlay() {
    eventOverlay.classList.remove('hidden');
    eventOverlay.setAttribute('aria-hidden','false');
  }
  function hideOverlay() {
    eventOverlay.classList.add('hidden');
    eventOverlay.setAttribute('aria-hidden','true');
  }

  // 次のプレイヤーにターンを移す
  function nextTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateTurnText();
    rollBtn.disabled = false;
    diceResult.textContent = '';
  }

  // OK ボタン処理（イベントの効果を適用して閉じる）
  let okHandlerAdded = false;
  function ensureOkHandler() {
    if (okHandlerAdded) return;
    eventOkBtn.addEventListener('click', () => {
      // 簡単な効果の例: 現在プレイヤー（表示中のプレイヤー）に +1 進める
      const player = players[currentPlayerIndex];
      // 効果を適用（任意）
      player.pos = (player.pos + 1) % pathIndices.length;
      drawPawns();
      hideOverlay();
      // 効果適用後、次のターンに移る
      nextTurn();
    });
    okHandlerAdded = true;
  }

  // ゲーム開始
  startBtn.addEventListener('click', () => {
    buildBoard();
    createPlayers();
    ensureOkHandler();
    gameSection.classList.remove('hidden');
    document.getElementById('setup').classList.add('hidden');
    currentPlayerIndex = 0;
    updateTurnText();
    rollBtn.disabled = false;
  });

  rollBtn.addEventListener('click', () => {
    if (players.length === 0) return;
    rollDiceAndMove();
  });

  // 初期構築（ページ読み込み時）
  buildBoard();
  // overlay は CSS 側で hidden を有効にしているため初期で非表示になっています。
});
