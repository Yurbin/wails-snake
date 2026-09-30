/* 主题管理:3 套配色(UI 用 CSS 变量,画布用 palette 对象) */
(function () {
  var THEMES = {
    classic: {
      label: '经典',
      canvas: {
        bg: '#10141c',
        grid: 'rgba(255,255,255,0.045)',
        border: 'rgba(255,255,255,0.08)',
        snakeHead: '#8ce89b',
        snakeBody: '#3fa55a',
        snakeDim: '#2f7d45',
        food: '#ff6b6b',
        foodGlow: 'rgba(255,107,107,0.30)',
        eye: '#0d2818'
      }
    },
    night: {
      label: '暗夜',
      canvas: {
        bg: '#14161d',
        grid: 'rgba(255,255,255,0.035)',
        border: 'rgba(255,255,255,0.07)',
        snakeHead: '#aab6ff',
        snakeBody: '#6c7bff',
        snakeDim: '#5156c9',
        food: '#ff7a90',
        foodGlow: 'rgba(255,122,144,0.28)',
        eye: '#1a1d33'
      }
    },
    neon: {
      label: '霓虹',
      canvas: {
        bg: '#0b0e14',
        grid: 'rgba(0,245,212,0.05)',
        border: 'rgba(0,245,212,0.18)',
        snakeHead: '#7dffe9',
        snakeBody: '#00c9a7',
        snakeDim: '#008e77',
        food: '#f72585',
        foodGlow: 'rgba(247,37,133,0.35)',
        eye: '#04211c'
      }
    }
  };

  var ORDER = ['classic', 'night', 'neon'];
  var current;
  try { current = localStorage.getItem('snake.theme') || 'classic'; } catch (e) { current = 'classic'; }
  if (!THEMES[current]) current = 'classic';

  function apply(name) {
    if (!THEMES[name]) name = 'classic';
    current = name;
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('snake.theme', name); } catch (e) { /* 忽略 */ }
  }

  apply(current);

  window.SnakeTheme = {
    apply: apply,
    get: function () { return THEMES[current]; },
    name: function () { return current; },
    cycle: function () {
      var next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
      apply(next);
      return THEMES[next];
    }
  };
})();
