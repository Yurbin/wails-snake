package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
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
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
