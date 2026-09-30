package main

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

// ScoreBoard 按“难度-模式”组合键记录最高分,如 {"normal-wall": 320}
type ScoreBoard map[string]int

// App 暴露给前端的能力:高分持久化与版本信息
type App struct {
	ctx        context.Context
	scoresPath string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if dir, err := os.UserConfigDir(); err == nil {
		a.scoresPath = filepath.Join(dir, "wails-snake", "scores.json")
	}
	// 集成开始菜单(Linux;幂等,失败不影响游戏)
	runMenuInstall()
}

// LoadScores 读取历史最高分表;文件不存在或损坏时返回空表
func (a *App) LoadScores() (ScoreBoard, error) {
	if a.scoresPath == "" {
		return nil, errors.New("配置目录不可用")
	}
	data, err := os.ReadFile(a.scoresPath)
	if err != nil {
		if os.IsNotExist(err) {
			return ScoreBoard{}, nil
		}
		return nil, err
	}
	var board ScoreBoard
	if err := json.Unmarshal(data, &board); err != nil {
		return ScoreBoard{}, nil // 文件损坏则重置
	}
	return board, nil
}

// SaveScores 保存最高分表到 ~/.config/wails-snake/scores.json
func (a *App) SaveScores(board ScoreBoard) error {
	if a.scoresPath == "" {
		return errors.New("配置目录不可用")
	}
	if err := os.MkdirAll(filepath.Dir(a.scoresPath), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(board, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(a.scoresPath, data, 0o644)
}

// GetVersion 返回构建时注入的版本号
func (a *App) GetVersion() string {
	return version
}
