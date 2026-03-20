# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 文档说明

本项目包含 3 个核心文档：

| 文件 | 功能定位 | 目标读者 |
|------|----------|----------|
| **SKILL.md** | 告诉 LLM 如何使用这个 skill | Claude AI (LLM) |
| **CLAUDE.md** | AI 开发工具指引 | Claude Code (开发助手) |
| **README.md** | skill 的完整使用说明 | 用户 |

---

## 项目概述

麻将游戏 AI Agent 模拟器，AI 扮演 2-3 个虚拟玩家与用户对战。支持上海麻将、四川麻将、扬州麻将规则。

### 核心功能

- 多 Agent 玩家模拟
- 多种麻将规则支持
- 游戏记录持久化（YAML）
- AI 决策引擎

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发运行
node run.js new --rule shanghai

# 打包
npm run build

# 运行打包后的文件
node skill.js new --rule shanghai
```

---

## 核心架构

### 文件结构

```
game_mahjong_agent/
├── run.js          # 主入口
├── skill.js        # 打包后的文件
├── build.js        # 打包脚本
├── package.json    # 依赖配置
├── session/        # 游戏记录存储
│   └── *.yaml
└── lib/            # 核心模块（可选）
    ├── game.js     # 游戏状态管理
    ├── rules/      # 各规则实现
    │   ├── shanghai.js
    │   ├── sichuan.js
    │   └── yangzhou.js
    ├── ai.js       # AI 决策引擎
    └── tiles.js    # 牌组工具
```

### 模块设计

#### 1. 游戏状态管理 (game.js)

```javascript
class MahjongGame {
  constructor(rule, playerCount) {}

  // 游戏流程
  start() {}
  nextTurn() {}

  // 玩家操作
  draw(playerId) {}
  discard(playerId, tile) {}
  peng(playerId, tile) {}
  gang(playerId, tile) {}
  win(playerId) {}

  // 状态
  getState() {}
  save() {}
  load(gameId) {}
}
```

#### 2. 规则引擎 (rules/*.js)

```javascript
class RuleEngine {
  // 牌组验证
  static canWin(hand, melds) {}
  static canPeng(hand, tile) {}
  static canGang(hand, tile) {}

  // 计分
  static calculateScore(hand, melds, winTile) {}

  // 特殊规则
  static getValidTiles(hand) {}
}
```

#### 3. AI 决策 (ai.js)

```javascript
class AIPlayer {
  constructor(difficulty) {}

  // 决策接口
  chooseDiscard(hand) {}
  shouldPeng(tile) {}
  shouldGang(tile) {}
  shouldWin(hand) {}
}
```

#### 4. 牌组工具 (tiles.js)

```javascript
// 牌的表示: "3m" = 三万, "5p" = 五筒, "7s" = 七条
// 风牌: "1z"-"4z" (东南西北)
// 三元: "5z"-"7z" (白发生)
// 花牌: "1h"-"8h"

class TileUtils {
  static parse(tile) {}
  static toChinese(tile) {}
  static sort(hand) {}
  static canMeld(tiles) {}
}
```

---

## 游戏记录格式

### 文件命名

```
<timestamp>_<status>.yaml
```

- timestamp: `YYYYMMDD_HHmmSS`
- status: `playing` | `stopped`

### YAML Schema

```yaml
game_id: string
status: enum[playing, stopped]
rule: enum[shanghai, sichuan, yangzhou]
created_at: ISO8601
updated_at: ISO8601

players:
  - id: string
    name: string
    is_ai: boolean
    seat: number(0-3)
    score: number

current_turn:
  player: number
  action: enum[draw, discard, peng, gang, win, pass]

table:
  wall: string[]        # 牌墙（剩余牌）
  discards: string[][]  # 各家弃牌
  melds: string[][][]   # 各家明牌

hands:
  - player: number
    tiles: string[]
    concealed: boolean  # 是否暗牌

rounds:
  - number: number
    dealer: number
    winner: number | null
    actions:
      - player: number
        action: string
        tile: string | null
        timestamp: ISO8601
```

---

## 开发规范

### 牌的编码

统一使用字符串表示：
- `0m-9m`: 万子（0=赤五万，可选）
- `0p-9p`: 筒子
- `0s-9s`: 条子
- `1z-7z`: 字牌
- `1h-8h`: 花牌

### 版本号规则

打包版本号格式：`YYMMDD.HHmmSS`

### 错误处理

```javascript
try {
  game.discard(playerId, tile);
} catch (e) {
  if (e instanceof InvalidActionError) {
    // 无效操作
  } else if (e instanceof NotYourTurnError) {
    // 不是该玩家回合
  }
}
```

---

## 规则差异对比

| 特性 | 上海 | 四川 | 扬州 |
|------|------|------|------|
| 总牌数 | 144 | 108 | 144 |
| 字牌 | 有 | 无 | 有 |
| 花牌 | 有 | 无 | 有 |
| 必胡 | 否 | 否 | 是 |
| 血流 | 否 | 是 | 否 |
| 定缺 | 否 | 是 | 否 |

---

## TODO

- [ ] 完善三种规则的胡牌判断
- [ ] 实现 AI 决策算法
- [ ] 添加番数计算
- [ ] 支持流局判定
- [ ] 添加游戏回放功能
