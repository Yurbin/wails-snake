/* UI 胶水:菜单/HUD/输入 + Wails 后端绑定(浏览器开发时降级 localStorage) */
(function () {
  function $(id) { return document.getElementById(id); }

  /* ---------- 后端绑定(Wails 运行时有 window.go;纯浏览器时降级) ---------- */
  var backend = (window.go && window.go.app && window.go.app.App) || null;
  var LS_KEY = 'snake.scores';

  function loadScores() {
    if (backend) {
      return backend.LoadScores().catch(function () { return readLS(); });
    }
    return Promise.resolve(readLS());
  }
  function readLS() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function persistScores(board) {
    if (backend) {
      return backend.SaveScores(board).catch(function () { writeLS(board); });
    }
    writeLS(board);
    return Promise.resolve();
  }
  function writeLS(board) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(board)); } catch (e) { /* 忽略 */ }
  }

  /* ---------- 状态 ---------- */
  var settings = { difficulty: 'normal', wrap: 'wall' };
  var bestBoard = {};
  var state = 'menu'; // menu | playing | paused | over
  var game = null;

  var DIFF = window.SnakeGame.DIFFICULTIES;
  var WRAP_LABEL = { wall: '撞墙', wrap: '穿墙' };

  function scoreKey() { return settings.difficulty + '-' + settings.wrap; }
  function bestOf(key) { return bestBoard[key] || 0; }

  /* ---------- HUD ---------- */
  function updateHUD() {
    $('hud-score').textContent = game ? game.score : 0;
    $('hud-speed').textContent = game ? game.speedLevel : 1;
    $('hud-best').textContent = bestOf(scoreKey());
    $('hud-difficulty').textContent = DIFF[settings.difficulty].label + ' · ' + WRAP_LABEL[settings.wrap];
  }

  /* ---------- 覆盖层 ---------- */
  function showOverlay(name) { // name: menu | pause | over | none
    $('overlay').classList.toggle('hidden', name === 'none');
    $('panel-menu').classList.toggle('hidden', name !== 'menu');
    $('panel-pause').classList.toggle('hidden', name !== 'pause');
    $('panel-over').classList.toggle('hidden', name !== 'over');
  }

  /* ---------- 游戏生命周期 ---------- */
  function startGame() {
    if (!game) return;
    game.reset(settings.difficulty, settings.wrap === 'wrap');
    state = 'playing';
    showOverlay('none');
    updateHUD();
    window.SnakeAudio.play('start');
    game.start();
  }

  function pauseGame(auto) {
    if (state !== 'playing' || !game.pause()) return;
    state = 'paused';
    $('pause-score').textContent = game.score;
    showOverlay('pause');
    if (!auto) window.SnakeAudio.play('click');
  }

  function resumeGame() {
    if (state !== 'paused' || !game.resume()) return;
    state = 'playing';
    showOverlay('none');
  }

  function backToMenu() {
    if (game) game.stop();
    state = 'menu';
    game.reset(settings.difficulty, settings.wrap === 'wrap');
    game.render();
    showOverlay('menu');
    updateHUD();
  }

  function onDie(g) {
    state = 'over';
    var key = scoreKey();
    var isRecord = g.score > bestOf(key);
    if (isRecord) {
      bestBoard[key] = g.score;
      persistScores(bestBoard);
    }
    $('over-detail').textContent = '本局 ' + g.score + ' 分 · 最高 ' + bestOf(key) + ' 分';
    $('over-record').classList.toggle('hidden', !isRecord);
    showOverlay('over');
    updateHUD();
    window.SnakeAudio.play('die');
    if (game) setTimeout(function () { game.stop(); }, 600); // 留一帧死亡画面
  }

  /* ---------- 分段选择器 ---------- */
  function bindSeg(id, onChange) {
    var seg = $(id);
    seg.addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn) return;
      var buttons = seg.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) buttons[i].classList.remove('active');
      btn.classList.add('active');
      window.SnakeAudio.play('click');
      onChange(btn.getAttribute('data-value'));
    });
  }

  bindSeg('seg-difficulty', function (v) { settings.difficulty = v; updateHUD(); });
  bindSeg('seg-wrap', function (v) { settings.wrap = v; updateHUD(); });

  /* ---------- 按钮 ---------- */
  $('btn-start').addEventListener('click', startGame);
  $('btn-resume').addEventListener('click', resumeGame);
  $('btn-quit').addEventListener('click', backToMenu);
  $('btn-retry').addEventListener('click', startGame);
  $('btn-menu').addEventListener('click', backToMenu);

  $('btn-theme').addEventListener('click', function () {
    var t = window.SnakeTheme.cycle();
    $('theme-name').textContent = t.label;
    window.SnakeAudio.play('click');
  });
  $('btn-sound').addEventListener('click', function () {
    var muted = window.SnakeAudio.toggle();
    $('btn-sound').textContent = muted ? '🔇 音效 · 关' : '🔊 音效 · 开';
  });

  /* ---------- 键盘 ---------- */
  var KEYS = {
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  document.addEventListener('keydown', function (ev) {
    var dir = KEYS[ev.code];
    if (dir) {
      ev.preventDefault();
      if (state === 'playing') game.turn(dir[0], dir[1]);
      return;
    }
    if (ev.code === 'Space' || ev.code === 'KeyP') {
      ev.preventDefault();
      if (state === 'playing') pauseGame(false);
      else if (state === 'paused') resumeGame();
      return;
    }
    if (ev.code === 'Enter') {
      if (state === 'menu' || state === 'over') startGame();
      else if (state === 'paused') resumeGame();
      return;
    }
    if (ev.code === 'Escape') {
      if (state === 'playing') pauseGame(false);
    }
  });

  // 失焦自动暂停(切窗口/最小化)
  window.addEventListener('blur', function () {
    if (state === 'playing') pauseGame(true);
  });

  /* ---------- 启动 ---------- */
  game = new window.SnakeGame.Game($('board'), {
    onScore: updateHUD,
    onSpeedUp: function () {
      updateHUD();
      window.SnakeAudio.play('speedUp');
    },
    onDie: onDie
  });

  $('theme-name').textContent = window.SnakeTheme.get().label;
  if (window.SnakeAudio.muted()) $('btn-sound').textContent = '🔇 音效 · 关';

  loadScores().then(function (board) {
    bestBoard = board || {};
    updateHUD();
  });

  if (backend && backend.GetVersion) {
    var v = 'dev';
    try { v = backend.GetVersion(); } catch (e) { /* 忽略 */ }
    Promise.resolve(v).then(function (val) {
      if (val && val !== 'dev') $('ver').textContent = 'v' + val;
    });
  }
})();
