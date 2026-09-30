#!/bin/sh
# ============================================================
# 组装并构建 deb 安装包(需在 Linux 环境执行,依赖 dpkg-deb)
# 用法: ./scripts/build-deb.sh <版本号>    例: ./scripts/build-deb.sh 0.3.0
# 前置: build/bin/snake-game(wails build 产物)与 build/appicon.png
# 产物: ./wails-snake_<版本号>_amd64.deb
# ============================================================
set -eu

VERSION="${1:?用法: build-deb.sh <版本号>}"
if [ ! -f build/bin/snake-game ]; then
  echo "缺少 build/bin/snake-game,请先执行 wails build" >&2
  exit 1
fi
if [ ! -f build/appicon.png ]; then
  echo "缺少 build/appicon.png" >&2
  exit 1
fi

PKGROOT="dist-deb/wails-snake"
OUT="wails-snake_${VERSION}_amd64.deb"
rm -rf "$PKGROOT"
mkdir -p "$PKGROOT/DEBIAN" \
         "$PKGROOT/opt/wails-snake" \
         "$PKGROOT/usr/share/applications" \
         "$PKGROOT/usr/share/icons/hicolor/512x512/apps" \
         "$PKGROOT/usr/share/doc/wails-snake"

# 程序与图标
install -m 755 build/bin/snake-game "$PKGROOT/opt/wails-snake/snake-game"
install -m 644 build/appicon.png "$PKGROOT/usr/share/icons/hicolor/512x512/apps/wails-snake.png"

# 系统级菜单项(注意:与 desktop.go 中 gameDesktopEntry 的字段保持一致)
install -m 644 packaging/deb/wails-snake.desktop "$PKGROOT/usr/share/applications/wails-snake.desktop"

# 控制信息与文档
sed "s/__VERSION__/${VERSION}/" packaging/deb/control.template > "$PKGROOT/DEBIAN/control"
install -m 755 packaging/deb/postinst "$PKGROOT/DEBIAN/postinst"
install -m 644 packaging/deb/copyright "$PKGROOT/usr/share/doc/wails-snake/copyright"

# --root-owner-group: 以 root:root 打包,无需 fakeroot
dpkg-deb --build --root-owner-group "$PKGROOT" "$OUT"
echo "已生成: $OUT"
