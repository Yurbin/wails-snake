package main

import (
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

// version 由构建时注入:-ldflags "-X main.version=x.y.z"
var version = "dev"

// 窗口固定尺寸:画布 400×400 + 顶栏/底栏留白
const (
	windowWidth  = 440
	windowHeight = 640
)

func main() {
	// 命令行模式:卸载 / 帮助(不开窗口)
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "--uninstall", "-u":
			os.Exit(runMenuUninstall())
		case "--help", "-h":
			printUsage()
			return
		}
	}

	app := NewApp()

	err := wails.Run(&options.App{
		Title:            "贪吃蛇",
		Width:            windowWidth,
		Height:           windowHeight,
		MinWidth:         windowWidth,
		MinHeight:        windowHeight,
		DisableResize:    true,
		BackgroundColour: &options.RGBA{R: 16, G: 20, B: 28, A: 255},
		AssetServer:      &assetserver.Options{Assets: assets},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		Linux: &linux.Options{
			Icon:        appIconPNG, // 窗口/任务栏图标
			ProgramName: appID,      // 与 .desktop 的 StartupWMClass 对应,保证任务栏分组正确
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
