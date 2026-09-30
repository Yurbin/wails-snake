#!/usr/bin/env bash
# ============================================================
# 贪吃蛇(便携版)运行依赖检测 — 银河麒麟 V10 SP1 x64
# 用法: ./check-deps.sh
# 退出码: 0 = 依赖齐备;1 = 有缺失(按提示从内网软件源安装)
# ============================================================
set -u

MISSING=0

check_lib() { # $1 = 库 SONAME, $2 = 缺失时建议安装的包名
  if ldconfig -p 2>/dev/null | grep -q "$1"; then
    echo "  [OK] $1"
  else
    echo "  [缺失] $1  ← 请从内网软件源安装: sudo apt install $2"
    MISSING=1
  fi
}

echo "== 贪吃蛇 依赖检测 =="

# Wails v2 运行所需的图形栈(麒麟 V10 SP1 桌面版默认源内均有)
check_lib "libwebkit2gtk-4.0.so.37" "libwebkit2gtk-4.0-37"
check_lib "libgtk-3.so.0"           "libgtk-3-0"
check_lib "libgobject-2.0.so.0"     "libglib2.0-0"

# 图形会话检测
if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
  echo "  [OK] 图形会话已就绪"
else
  echo "  [警告] 未检测到 DISPLAY / WAYLAND_DISPLAY,请在桌面环境的终端中运行本程序"
fi

if [ "$MISSING" -eq 0 ]; then
  echo "== 依赖齐备,直接运行: ./snake-game =="
else
  echo "== 存在缺失依赖,请先按上方提示安装(需内网软件源可用) =="
fi
exit "$MISSING"
