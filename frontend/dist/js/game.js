/* 贪吃蛇核心引擎:状态机 + 固定步长逻辑 + Canvas 渲染 */
(function () {
  var GRID = 20;   // 20×20 格
  var CELL = 20;   // 每格 20px → 画布 400×400

  var DIFFICULTIES = {
    easy:   { label: '初级', baseTick: 200, accel: 12, minTick: 95, scoreMul: 1 },
    normal: { label: '中级', baseTick: 160, accel: 14, minTick: 70, scoreMul: 1.5 },
    hard:   { label: '高级', baseTick: 120, accel: 16, minTick: 50, scoreMul: 2 }
  };
  var SPEEDUP_EVERY = 5; // 每 5 个食物提速一档

  function rand(n) { return Math.floor(Math.random() * n); }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function Game(canvas, hooks) {
    this.canvas = canvas;
    this.ctx2d = canvas.getContext('2d');
    this.hooks = hooks || {};
    this.running = false;
    this.reset('normal', false);
    this.render(); // 菜单背景帧
  }

  Game.prototype.reset = function (difficulty, wrap) {
    this.diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
    this.difficultyKey = difficulty;
    this.wrap = !!wrap;
    this.snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    this.dir = { x: 1, y: 0 };
    this.queue = []; // 输入缓冲,最多 2 步,快速连按不丢
    this.tick = this.diff.baseTick;
    this.speedLevel = 1;
    this.foodEaten = 0;
    this.score = 0;
    this.dead = false;
    this.paused = false;
    this.acc = 0;
    this.lastTs = 0;
    this.placeFood();
  };

  Game.prototype.start = function () {
    this.running = true;
    this.lastTs = 0;
    this.acc = 0;
    var self = this;
    if (!this._loopBound) this._loopBound = function (ts) { self._loop(ts); };
    requestAnimationFrame(this._loopBound);
  };

  Game.prototype.stop = function () {
    this.running = false;
  };

  /* 转向:禁止 180° 回头;与上一步同向则忽略 */
  Game.prototype.turn = function (nx, ny) {
    var last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (nx === -last.x && ny === -last.y) return;
    if (nx === last.x && ny === last.y) return;
    if (this.queue.length < 2) this.queue.push({ x: nx, y: ny });
  };

  Game.prototype.placeFood = function () {
    var p;
    do {
      p = { x: rand(GRID), y: rand(GRID) };
    } while (this.snake.some(function (s) { return s.x === p.x && s.y === p.y; }));
    this.food = p;
  };

  Game.prototype._loop = function (ts) {
    if (!this.running) return;
    if (!this.lastTs) this.lastTs = ts;
    var dt = ts - this.lastTs;
    this.lastTs = ts;
    if (!this.paused && !this.dead) {
      this.acc += dt;
      while (this.acc >= this.tick) {
        this.acc -= this.tick;
        this._step();
        if (this.dead) break;
      }
    }
    this.render();
    requestAnimationFrame(this._loopBound);
  };

  Game.prototype._step = function () {
    if (this.queue.length) this.dir = this.queue.shift();

    var head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    if (this.wrap) {
      head.x = (head.x + GRID) % GRID;
      head.y = (head.y + GRID) % GRID;
    } else if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      return this.die();
    }

    var eating = head.x === this.food.x && head.y === this.food.y;
    // 不吃食物时尾巴会腾出,允许进入原尾格
    var body = eating ? this.snake : this.snake.slice(0, -1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === head.x && body[i].y === head.y) return this.die();
    }

    this.snake.unshift(head);
    if (eating) {
      this.score += Math.round(10 * this.diff.scoreMul);
      this.foodEaten++;
      if (this.hooks.onScore) this.hooks.onScore(this);
      if (this.foodEaten % SPEEDUP_EVERY === 0 && this.tick - this.diff.accel >= this.diff.minTick) {
        this.tick -= this.diff.accel;
        this.speedLevel++;
        if (this.hooks.onSpeedUp) this.hooks.onSpeedUp(this);
      }
      this.placeFood();
    } else {
      this.snake.pop();
    }
  };

  Game.prototype.die = function () {
    this.dead = true;
    if (this.hooks.onDie) this.hooks.onDie(this);
  };

  Game.prototype.pause = function () {
    if (!this.running || this.dead || this.paused) return false;
    this.paused = true;
    return true;
  };

  Game.prototype.resume = function () {
    if (!this.running || this.dead) return false;
    this.paused = false;
    this.lastTs = 0;
    return true;
  };

  /* ---------- 渲染 ---------- */

  Game.prototype.render = function () {
    var ctx = this.ctx2d;
    var p = window.SnakeTheme.get().canvas;
    var W = GRID * CELL;

    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, W);

    // 网格
    ctx.strokeStyle = p.grid;
    ctx.lineWidth = 1;
    for (var g = 1; g < GRID; g++) {
      ctx.beginPath();
      ctx.moveTo(g * CELL + 0.5, 0);
      ctx.lineTo(g * CELL + 0.5, W);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g * CELL + 0.5);
      ctx.lineTo(W, g * CELL + 0.5);
      ctx.stroke();
    }

    // 食物:光晕 + 圆
    var fx = this.food.x * CELL + CELL / 2;
    var fy = this.food.y * CELL + CELL / 2;
    ctx.fillStyle = p.foodGlow;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.food;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // 蛇身(尾部渐暗)
    for (var i = this.snake.length - 1; i > 0; i--) {
      var s = this.snake[i];
      var k = this.snake.length > 1 ? i / (this.snake.length - 1) : 0;
      ctx.fillStyle = i === this.snake.length - 1 && this.snake.length > 4 ? p.snakeDim : p.snakeBody;
      roundedRect(ctx, s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, 5);
      ctx.fill();
    }

    // 蛇头(亮色 + 眼睛)
    var h = this.snake[0];
    ctx.fillStyle = p.snakeHead;
    roundedRect(ctx, h.x * CELL + 1, h.y * CELL + 1, CELL - 2, CELL - 2, 6);
    ctx.fill();
    ctx.fillStyle = p.eye;
    var cx = h.x * CELL + CELL / 2;
    var cy = h.y * CELL + CELL / 2;
    var eo = 4;                 // 眼睛沿行进方向的前移量
    var es = 3.5;               // 双眼垂直方向分列宽
    var e1, e2;
    if (this.dir.x !== 0) {
      e1 = { x: cx + this.dir.x * eo, y: cy - es };
      e2 = { x: cx + this.dir.x * eo, y: cy + es };
    } else {
      e1 = { x: cx - es, y: cy + this.dir.y * eo };
      e2 = { x: cx + es, y: cy + this.dir.y * eo };
    }
    [e1, e2].forEach(function (e) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // 死亡瞬间红框提示
    if (this.dead) {
      ctx.strokeStyle = p.food;
      ctx.lineWidth = 3;
      roundedRect(ctx, 2, 2, W - 4, W - 4, 9);
      ctx.stroke();
    }
  };

  window.SnakeGame = { Game: Game, GRID: GRID, CELL: CELL, DIFFICULTIES: DIFFICULTIES };
})();
