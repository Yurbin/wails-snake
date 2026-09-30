/* 音效:WebAudio 合成,无资源文件,可静音 */
(function () {
  var ctx = null;
  var muted = false;
  try { muted = localStorage.getItem('snake.muted') === '1'; } catch (e) { /* 忽略 */ }

  function ensure() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return ctx;
  }

  /* 单音:freq 起始频率,可滑向 slideTo;gain 包络避免爆音 */
  function tone(freq, dur, type, volume, delay, slideTo) {
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var SFX = {
    eat: function () {
      tone(660, 0.08, 'square', 0.14);
      tone(880, 0.07, 'square', 0.10, 0.05);
    },
    speedUp: function () {
      tone(523, 0.08, 'triangle', 0.14);
      tone(659, 0.08, 'triangle', 0.14, 0.07);
      tone(784, 0.10, 'triangle', 0.14, 0.14);
    },
    die: function () {
      tone(300, 0.32, 'sawtooth', 0.16, 0, 90);
      tone(150, 0.45, 'triangle', 0.12, 0.10, 55);
    },
    start: function () {
      tone(523, 0.09, 'triangle', 0.13);
      tone(784, 0.12, 'triangle', 0.13, 0.08);
    },
    click: function () {
      tone(440, 0.05, 'sine', 0.08);
    }
  };

  window.SnakeAudio = {
    play: function (name) {
      if (muted) return;
      if (SFX[name]) SFX[name]();
    },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem('snake.muted', muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
      return muted;
    },
    muted: function () { return muted; }
  };
})();
