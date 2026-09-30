# 贪吃蛇 · Wails · 麒麟 V10 SP1 便携版

Go + [Wails v2](https://v2.wails.io) 制作的桌面端贪吃蛇游戏,面向**银河麒麟桌面操作系统 V10 SP1(x86_64)**,交付形态为**绿色免安装便携包**。由 GitHub Actions 在 `ubuntu:20.04` 容器内构建,保证产物与麒麟的 glibc 2.31 / webkit2gtk-4.0 ABI 兼容。

- 运行时**零联网**,适合内网环境
- 最高分持久化到 `~/.config/wails-snake/scores.json`
- 前端为原生 JS + Canvas(无 npm 构建链),游戏逻辑全部在页面内完成

## 功能

| 功能 | 说明 |
|---|---|
| 难度 | 初级 / 中级 / 高级(初始速度与加速曲线不同,分数倍率 1 / 1.5 / 2) |
| 模式 | 经典撞墙 / 穿墙环绕 |
| 计分 | 每 5 个食物提速一档,最高分按"难度 × 模式"分别记录 |
| 音效 | WebAudio 合成(吃食 / 提速 / 死亡),可静音 |
| 主题 | 经典 / 暗夜 / 霓虹 三套配色 |
| 操作 | 方向键 / WASD 移动,空格 / P 暂停,Enter 开始/重开;窗口失焦自动暂停 |

## 本地开发(macOS / Linux)

前置:Go ≥ 1.22、Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.16.0
wails dev     # 开发模式
wails build   # 构建当前平台产物到 build/bin/
```

Linux 本机构建需要 `libgtk-3-dev libwebkit2gtk-4.0-dev pkg-config`。

## CI / 发布(GitHub Actions)

| Workflow | 触发 | 内容 |
|---|---|---|
| [ci.yml](.github/workflows/ci.yml) | push / PR | ubuntu:20.04 容器内构建 linux/amd64 冒烟,校验 ldd 与 glibc 符号上限 |
| [release.yml](.github/workflows/release.yml) | 推 tag `v*` | 同一容器构建并注入版本号,组装便携 tar.gz + sha256,挂到 GitHub Release |

发一版新版本:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

## 麒麟 V10 SP1 部署(内网)

1. 外网下载 Release 中的 `wails-snake_<版本>_linux_amd64_portable.tar.gz` 与 `.sha256`,摆渡进内网
2. 目标机解压到任意目录,校验完整性:
   ```bash
   sha256sum -c wails-snake_<版本>_linux_amd64_portable.tar.gz.sha256
   ```
3. 运行依赖检测:
   ```bash
   ./check-deps.sh
   ```
4. 启动:`./snake-game`(或桌面双击)

依赖(麒麟 V10 SP1 桌面版软件源均有,缺失时从内网源安装):

```bash
sudo apt install libwebkit2gtk-4.0-37 libgtk-3-0
```

## 兼容性说明

- 构建基座 `ubuntu:20.04`(glibc 2.31)与麒麟 V10 SP1 桌面版(Ubuntu 20.04 基座)对齐;CI 中用 `objdump` 强制校验产物 GLIBC 符号 ≤ 2.31
- Wails v2 链接 `webkit2gtk-4.0` ABI,与目标机 `libwebkit2gtk-4.0-37 (2.38.6)` 完全匹配;**Wails v3 需要 webkit2gtk-4.1 / GTK4,麒麟 20.04 基座软件源没有,故本项目只能用 v2**
- 若目标为更老基座(如麒麟服务器版),把 workflow 中构建容器镜像从 `ubuntu:20.04` 改为 `ubuntu:18.04` 即可
- 需要 arm64(飞腾/鲲鹏)时,在 workflow 中增加 matrix 架构项

## 项目结构

```
main.go               # Wails 入口、窗口配置
app.go                # 最高分持久化(JSON)、版本信息(前端绑定)
frontend/dist/        # 原生 HTML/CSS/JS,直接嵌入二进制
  js/game.js          # 引擎:状态机、固定步长循环、碰撞、Canvas 渲染
  js/main.js          # UI 胶水:菜单/HUD/输入、Wails 绑定
scripts/check-deps.sh # 目标机依赖断言检测
.github/workflows/    # ci.yml / release.yml
```
