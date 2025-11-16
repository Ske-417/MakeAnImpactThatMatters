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
  
  // マス目のタイプ定義
  const CELL_TYPES = {
    NORMAL: 'normal',
    PROJECT: 'project',
    SKILL_UP: 'skillup',
    CLIENT: 'client',
    REST: 'rest',
    CHALLENGE: 'challenge'
  };
  
  // セルタイプの配置（24マス）
  const cellTypeMap = [
    CELL_TYPES.NORMAL,    // 1: スタート
    CELL_TYPES.SKILL_UP,  // 2
    CELL_TYPES.NORMAL,    // 3
    CELL_TYPES.PROJECT,   // 4
    CELL_TYPES.NORMAL,    // 5
    CELL_TYPES.CLIENT,    // 6
    CELL_TYPES.NORMAL,    // 7
    CELL_TYPES.CHALLENGE, // 8
    CELL_TYPES.NORMAL,    // 9
    CELL_TYPES.REST,      // 10
    CELL_TYPES.NORMAL,    // 11
    CELL_TYPES.PROJECT,   // 12
    CELL_TYPES.NORMAL,    // 13
    CELL_TYPES.SKILL_UP,  // 14
    CELL_TYPES.NORMAL,    // 15
    CELL_TYPES.CLIENT,    // 16
    CELL_TYPES.NORMAL,    // 17
    CELL_TYPES.CHALLENGE, // 18
    CELL_TYPES.NORMAL,    // 19
    CELL_TYPES.PROJECT,   // 20
    CELL_TYPES.NORMAL,    // 21
    CELL_TYPES.REST,      // 22
    CELL_TYPES.NORMAL,    // 23
    CELL_TYPES.NORMAL     // 24: ゴール
  ];

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
      
      // セルタイプを追加
      const cellType = cellTypeMap[pos];
      cell.classList.add(cellType);
      
      const num = document.createElement('div');
      num.className = 'cell-num';
      num.textContent = (pos+1);
      cell.appendChild(num);
      
      // セルタイプのアイコンを追加
      const typeLabel = document.createElement('div');
      typeLabel.className = 'cell-type';
      switch(cellType) {
        case CELL_TYPES.PROJECT:
          typeLabel.textContent = '📊';
          typeLabel.title = 'プロジェクト';
          break;
        case CELL_TYPES.SKILL_UP:
          typeLabel.textContent = '📚';
          typeLabel.title = 'スキルアップ';
          break;
        case CELL_TYPES.CLIENT:
          typeLabel.textContent = '🤝';
          typeLabel.title = 'クライアント対応';
          break;
        case CELL_TYPES.REST:
          typeLabel.textContent = '☕';
          typeLabel.title = '休暇';
          break;
        case CELL_TYPES.CHALLENGE:
          typeLabel.textContent = '⚡';
          typeLabel.title = 'チャレンジ';
          break;
      }
      if (typeLabel.textContent) {
        cell.appendChild(typeLabel);
      }
      
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
        pos: 0, // path 上の位置（0 = start）
        experience: 0, // 経験値
        skills: {
          strategy: 0,    // 戦略スキル
          communication: 0, // コミュニケーション
          analytics: 0    // 分析力
        }
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
      name.innerHTML = `<strong>${p.name}</strong>
        <div class="playerAttr">位置: ${p.pos+1}</div>
        <div class="playerAttr">経験値: ${p.experience}</div>
        <div class="playerAttr skills">
          戦略:${p.skills.strategy} | 
          対話:${p.skills.communication} | 
          分析:${p.skills.analytics}
        </div>`;
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
    const player = players[currentPlayerIndex];
    
    // ボーナス歩数を追加
    const bonusSteps = player.bonusSteps || 0;
    const totalSteps = roll + bonusSteps;
    player.bonusSteps = 0; // ボーナスをリセット
    
    diceResult.textContent = `出目: ${roll}${bonusSteps > 0 ? ' + ボーナス' + bonusSteps + ' = ' + totalSteps : ''}`;
    
    let steps = totalSteps;
    const stepInterval = 180;
    function step() {
      if (steps <= 0) {
        // 着地処理
        const landedPos = player.pos % pathIndices.length;
        showEventIfAny(player, landedPos);
        return;
      }
      player.pos = Math.min(player.pos + 1, pathIndices.length - 1);
      drawPawns();
      steps--;
      setTimeout(step, stepInterval);
    }
    setTimeout(step, stepInterval);
  }
  
  // ゲーム終了判定
  function checkGameEnd() {
    // 全プレイヤーがゴールしたか、または最初にゴールしたプレイヤーでゲーム終了
    const goaled = players.filter(p => p.pos >= pathIndices.length - 1);
    
    if (goaled.length > 0) {
      // 経験値順にソート
      const sorted = [...players].sort((a, b) => b.experience - a.experience);
      
      eventTitle.textContent = '🎉 ゲーム終了！';
      let resultHTML = '<h3>最終結果</h3><div class="results">';
      sorted.forEach((p, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}位`;
        resultHTML += `
          <div class="result-item">
            <span class="result-rank">${medal}</span>
            <strong>${p.name}</strong><br>
            <small>経験値: ${p.experience} | 
            戦略:${p.skills.strategy} 対話:${p.skills.communication} 分析:${p.skills.analytics}</small>
          </div>
        `;
      });
      resultHTML += '</div><button id="restartBtn" style="margin-top:12px;padding:10px 20px;border:0;background:#2b8aef;color:#fff;border-radius:6px;cursor:pointer">もう一度プレイ</button>';
      
      eventBody.innerHTML = resultHTML;
      showOverlay();
      eventOkBtn.style.display = 'none';
      
      // リスタートボタン
      document.getElementById('restartBtn').addEventListener('click', () => {
        location.reload();
      });
      
      return true;
    }
    
    nextTurn();
    return false;
  }

  function showEventIfAny(player, landedPos) {
    const cellType = cellTypeMap[landedPos];
    let eventData = null;
    
    switch(cellType) {
      case CELL_TYPES.PROJECT:
        eventData = getProjectEvent(player);
        break;
      case CELL_TYPES.SKILL_UP:
        eventData = getSkillUpEvent(player);
        break;
      case CELL_TYPES.CLIENT:
        eventData = getClientEvent(player);
        break;
      case CELL_TYPES.REST:
        eventData = getRestEvent(player);
        break;
      case CELL_TYPES.CHALLENGE:
        eventData = getChallengeEvent(player);
        break;
      default:
        // 通常マスはイベントなし
        nextTurn();
        return;
    }
    
    if (eventData) {
      eventTitle.textContent = eventData.title;
      eventBody.innerHTML = eventData.description;
      showOverlay();
      // イベント効果を保存
      window.currentEventEffect = eventData.effect;
    } else {
      nextTurn();
    }
  }
  
  // プロジェクトイベント
  function getProjectEvent(player) {
    const projects = [
      {
        title: '🏢 大型M&Aプロジェクト',
        description: 'クライアントの企業買収案件に参加。デューデリジェンスを担当します。<br><strong>経験値+15、戦略スキル+2</strong>',
        effect: (p) => { p.experience += 15; p.skills.strategy += 2; }
      },
      {
        title: '💼 デジタル変革プロジェクト',
        description: '大手企業のDX推進を支援。最新技術の導入を提案します。<br><strong>経験値+12、分析スキル+2</strong>',
        effect: (p) => { p.experience += 12; p.skills.analytics += 2; }
      },
      {
        title: '📈 業務改善プロジェクト',
        description: 'クライアントの業務プロセスを最適化。効率化を実現します。<br><strong>経験値+10、戦略スキル+1、分析スキル+1</strong>',
        effect: (p) => { p.experience += 10; p.skills.strategy += 1; p.skills.analytics += 1; }
      }
    ];
    return projects[Math.floor(Math.random() * projects.length)];
  }
  
  // スキルアップイベント
  function getSkillUpEvent(player) {
    const trainings = [
      {
        title: '📚 リーダーシップ研修',
        description: 'チームマネジメントとリーダーシップを学びます。<br><strong>経験値+5、コミュニケーションスキル+3</strong>',
        effect: (p) => { p.experience += 5; p.skills.communication += 3; }
      },
      {
        title: '🎓 データ分析講座',
        description: '最新のデータサイエンス手法を習得します。<br><strong>経験値+5、分析スキル+3</strong>',
        effect: (p) => { p.experience += 5; p.skills.analytics += 3; }
      },
      {
        title: '💡 戦略立案ワークショップ',
        description: '経営戦略の策定方法を深く学びます。<br><strong>経験値+5、戦略スキル+3</strong>',
        effect: (p) => { p.experience += 5; p.skills.strategy += 3; }
      }
    ];
    return trainings[Math.floor(Math.random() * trainings.length)];
  }
  
  // クライアント対応イベント
  function getClientEvent(player) {
    const clients = [
      {
        title: '🤝 重要顧客との会議',
        description: 'CEOへのプレゼンテーションが成功！信頼を獲得しました。<br><strong>経験値+8、コミュニケーションスキル+2</strong>',
        effect: (p) => { p.experience += 8; p.skills.communication += 2; }
      },
      {
        title: '📞 緊急クライアント対応',
        description: 'トラブルを迅速に解決し、クライアントから感謝されました。<br><strong>経験値+10、全スキル+1</strong>',
        effect: (p) => { p.experience += 10; p.skills.strategy += 1; p.skills.communication += 1; p.skills.analytics += 1; }
      },
      {
        title: '🎯 提案コンペ勝利',
        description: '競合に勝ち、新規プロジェクトを受注しました！<br><strong>経験値+20、戦略スキル+2、コミュニケーションスキル+1</strong>',
        effect: (p) => { p.experience += 20; p.skills.strategy += 2; p.skills.communication += 1; }
      }
    ];
    return clients[Math.floor(Math.random() * clients.length)];
  }
  
  // 休暇イベント
  function getRestEvent(player) {
    const rests = [
      {
        title: '☕ リフレッシュ休暇',
        description: 'しっかり休息を取り、英気を養いました。<br><strong>経験値+3、次のターン2歩進める</strong>',
        effect: (p) => { p.experience += 3; p.bonusSteps = 2; }
      },
      {
        title: '🌴 ワーケーション',
        description: 'リゾート地で仕事と休暇を両立。新しいアイデアが浮かびました。<br><strong>経験値+5、全スキル+1</strong>',
        effect: (p) => { p.experience += 5; p.skills.strategy += 1; p.skills.communication += 1; p.skills.analytics += 1; }
      }
    ];
    return rests[Math.floor(Math.random() * rests.length)];
  }
  
  // チャレンジイベント
  function getChallengeEvent(player) {
    const challenges = [
      {
        title: '⚡ 厳しい納期',
        description: 'タイトなスケジュールでプロジェクトを完遂。成長の機会となりました。<br><strong>経験値+18、戦略スキル+1、分析スキル+2</strong>',
        effect: (p) => { p.experience += 18; p.skills.strategy += 1; p.skills.analytics += 2; }
      },
      {
        title: '🔥 困難な交渉',
        description: '難しいクライアント交渉を乗り越えました。<br><strong>経験値+15、コミュニケーションスキル+3</strong>',
        effect: (p) => { p.experience += 15; p.skills.communication += 3; }
      },
      {
        title: '💪 チーム危機管理',
        description: 'プロジェクトの危機をリーダーシップで乗り切りました。<br><strong>経験値+20、全スキル+2</strong>',
        effect: (p) => { p.experience += 20; p.skills.strategy += 2; p.skills.communication += 2; p.skills.analytics += 2; }
      }
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
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
      const player = players[currentPlayerIndex];
      // イベント効果を適用
      if (window.currentEventEffect) {
        window.currentEventEffect(player);
        window.currentEventEffect = null;
      }
      drawPawns(); // プレイヤー情報を更新
      hideOverlay();
      
      // ゴール判定
      if (player.pos >= pathIndices.length - 1) {
        checkGameEnd();
      } else {
        nextTurn();
      }
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
