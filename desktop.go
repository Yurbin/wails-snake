package main

import (
	_ "embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

//go:embed build/appicon.png
var appIconPNG []byte

const appID = "wails-snake"

// ---------- 路径 ----------

func applicationsDir(home string) string {
	return filepath.Join(home, ".local", "share", "applications")
}
func gameDesktopPath(home string) string {
	return filepath.Join(applicationsDir(home), appID+".desktop")
}
func uninstallDesktopPath(home string) string {
	return filepath.Join(applicationsDir(home), appID+"-uninstall.desktop")
}
func iconInstallPath(home string) string {
	return filepath.Join(home, ".local", "share", "icons", "hicolor", "512x512", "apps", appID+".png")
}

// ---------- .desktop 内容(freedesktop 规范,UKUI 开始菜单兼容) ----------

func gameDesktopEntry(execPath string) string {
	return fmt.Sprintf(`[Desktop Entry]
Type=Application
Name=贪吃蛇
Name[en]=Snake
GenericName=贪吃蛇桌面游戏
Comment=Go + Wails 贪吃蛇 · 麒麟 V10 SP1 便携版
Exec="%s"
Icon=%s
Terminal=false
Categories=Game;ArcadeGame;
StartupNotify=true
StartupWMClass=%s
`, execPath, appID, appID)
}

func uninstallDesktopEntry(execPath string) string {
	return fmt.Sprintf(`[Desktop Entry]
Type=Application
Name=卸载贪吃蛇
Name[en]=Uninstall Snake
Comment=从开始菜单移除贪吃蛇
Exec="%s" --uninstall
Icon=%s
Terminal=true
Categories=Utility;
StartupNotify=false
`, execPath, appID)
}

// ---------- 安装 / 卸载 ----------

// installMenuEntries 把图标与两个菜单项写入用户级目录(幂等,可重复执行)
func installMenuEntries(home, execPath string, iconPNG []byte) error {
	if err := os.MkdirAll(applicationsDir(home), 0o755); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(iconInstallPath(home)), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(iconInstallPath(home), iconPNG, 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(gameDesktopPath(home), []byte(gameDesktopEntry(execPath)), 0o644); err != nil {
		return err
	}
	return os.WriteFile(uninstallDesktopPath(home), []byte(uninstallDesktopEntry(execPath)), 0o644)
}

// removeMenuEntries 删除菜单项与图标,返回实际删除的路径(幂等)
func removeMenuEntries(home string) []string {
	var removed []string
	for _, p := range []string{gameDesktopPath(home), uninstallDesktopPath(home), iconInstallPath(home)} {
		if err := os.Remove(p); err == nil {
			removed = append(removed, p)
		}
	}
	return removed
}

// refreshDesktopCaches 通知桌面环境重建菜单/图标缓存,工具缺失时静默跳过
func refreshDesktopCaches(home string) {
	_ = exec.Command("update-desktop-database", applicationsDir(home)).Run()
	hicolor := filepath.Join(home, ".local", "share", "icons", "hicolor")
	_ = exec.Command("gtk-update-icon-cache", "-f", "-t", hicolor).Run()
}

// executablePath 返回当前二进制的绝对真实路径(供菜单 Exec 指向)
func executablePath() string {
	p, err := os.Executable()
	if err != nil {
		return os.Args[0]
	}
	if resolved, err := filepath.EvalSymlinks(p); err == nil {
		p = resolved
	}
	if abs, err := filepath.Abs(p); err == nil {
		return abs
	}
	return p
}

// runMenuInstall 在 Linux 桌面上把本程序集成进开始菜单(每次启动执行,
// Exec 指向当前目录,程序目录移动后可自愈;失败不影响游戏运行)
func runMenuInstall() {
	if runtime.GOOS != "linux" {
		return
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return
	}
	if err := installMenuEntries(home, executablePath(), appIconPNG); err != nil {
		fmt.Fprintln(os.Stderr, "开始菜单集成失败(不影响游戏运行):", err)
		return
	}
	refreshDesktopCaches(home)
}

// runMenuUninstall 卸载开始菜单集成,返回进程退出码
func runMenuUninstall() int {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Println("无法确定用户目录:", err)
		return 1
	}
	removed := removeMenuEntries(home)
	refreshDesktopCaches(home)

	fmt.Println("== 贪吃蛇 卸载 ==")
	if len(removed) == 0 {
		fmt.Println("未发现开始菜单项,无需清理。")
	} else {
		for _, p := range removed {
			fmt.Println("已移除:", p)
		}
	}
	fmt.Println("如需彻底删除程序,请手动删除程序目录:", filepath.Dir(executablePath()))
	fmt.Println("如需清空最高分记录,请手动删除目录:", filepath.Join(home, ".config", appID))
	return 0
}

func printUsage() {
	fmt.Printf("贪吃蛇 %s\n\n", version)
	fmt.Println("用法:")
	fmt.Println("  snake-game              启动游戏")
	fmt.Println("  snake-game --uninstall  卸载:从开始菜单移除本程序")
}
