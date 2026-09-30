package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGameDesktopEntry(t *testing.T) {
	e := gameDesktopEntry("/opt/apps/snake-game")
	for _, want := range []string{
		`Exec="/opt/apps/snake-game"`,
		"Icon=" + appID,
		"StartupWMClass=" + appID,
		"Name=贪吃蛇",
		"Terminal=false",
	} {
		if !strings.Contains(e, want) {
			t.Errorf("desktop 项缺少 %q:\n%s", want, e)
		}
	}
}

func TestUninstallDesktopEntry(t *testing.T) {
	e := uninstallDesktopEntry(`/opt/my apps/snake-game`) // 路径含空格也要正确
	if !strings.Contains(e, `Exec="/opt/my apps/snake-game" --uninstall`) {
		t.Errorf("卸载项 Exec 引号/参数错误:\n%s", e)
	}
	if !strings.Contains(e, "Terminal=true") {
		t.Errorf("卸载项应为 Terminal=true(需要终端反馈):\n%s", e)
	}
}

func TestSystemDesktopFile(t *testing.T) {
	if got := systemDesktopFile(); got != "/usr/share/applications/"+appID+".desktop" {
		t.Errorf("系统级菜单项路径 = %q", got)
	}
	// 开发机/CI 干净环境下不应误判为 deb 安装
	if systemInstalled() {
		t.Log("注意: 检测到系统级安装(本机若装过 deb 包则正常)")
	}
}

func TestInstallAndRemoveMenuEntries(t *testing.T) {
	home := t.TempDir()
	execPath := filepath.Join(home, "apps", "snake-game")

	icon := []byte("fake-png-bytes")
	if err := installMenuEntries(home, execPath, icon); err != nil {
		t.Fatalf("安装失败: %v", err)
	}

	// 幂等:重复安装不报错
	if err := installMenuEntries(home, execPath, icon); err != nil {
		t.Fatalf("重复安装失败: %v", err)
	}

	got, err := os.ReadFile(iconInstallPath(home))
	if err != nil || string(got) != string(icon) {
		t.Fatalf("图标未正确写入: %v", err)
	}

	entry, err := os.ReadFile(gameDesktopPath(home))
	if err != nil || !strings.Contains(string(entry), execPath) {
		t.Fatalf("游戏菜单项未正确写入: %v", err)
	}

	removed := removeMenuEntries(home)
	if len(removed) != 3 {
		t.Fatalf("应移除 3 个文件,实际 %d: %v", len(removed), removed)
	}
	if _, err := os.Stat(gameDesktopPath(home)); !os.IsNotExist(err) {
		t.Error("菜单项未删除")
	}
	// 幂等:再删一次不 panic
	if again := removeMenuEntries(home); len(again) != 0 {
		t.Errorf("重复卸载应无删除,实际 %v", again)
	}
}
