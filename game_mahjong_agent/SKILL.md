---
name: game_mahjong_agent
description: 麻将游戏 AI Agent 助手。当用户要求"打麻将"、"麻将游戏"、"麻将 AI"、"四川麻将"、"上海麻将"、"扬州麻将"时，或者需要模拟多人麻将游戏对局时使用此 skill。AI 将扮演 2-3 个 agent 与用户对战。
version: 260319.134235
---

# 麻将游戏 AI Agent

本 skill 提供多人麻将游戏模拟功能，AI 扮演 2-3 个 agent 玩家与用户对战。支持多种麻将规则。

## 概述

麻将 AI Agent 是一个麻将游戏模拟器，特点：
- **多 Agent 模式**：AI 扮演 2-3 个虚拟玩家
- **多规则支持**：上海麻将、四川麻将、扬州麻将
- **游戏记录**：自动保存每局游戏到 JSON 文件
- **规则引擎**：AI 每次操作前自动读取规则文件

## 运行方式

```bash
# 创建新游戏
node skill.js new --rule shanghai --players 4

# 查看游戏状态
node skill.js status <game-id>

# 查看游戏状态（显示所有玩家手牌，用于AI分析）
node skill.js status <game-id> --show-hands

# 执行玩家操作
node skill.js play <game-id> <player-id> --action draw
node skill.js play <game-id> <player-id> --action discard --tile 三万
node skill.js play <game-id> <player-id> --action win

# 查看所有游戏
node skill.js list

# 结束游戏
node skill.js stop <game-id>
```

---

## AI 工作流程

### 重要：每次操作前必须读取规则文件

AI 在执行任何游戏操作前，**必须先读取对应的规则文件**：

1. 读取 `mahjong_route/<规则名>.md` 文件
2. 根据规则验证操作是否合法
3. 计算番数和分数
4. 执行操作并记录

### 规则文件位置

所有规则文件存放在 `mahjong_route/` 目录：

- `mahjong_route/shanghai.md` - 上海麻将
- `mahjong_route/sichuan.md` - 四川麻将
- `mahjong_route/yangzhou.md` - 扬州麻将

用户可以在此目录添加自定义规则文件，文件格式与现有规则相同。

### 规则文件格式

规则文件使用 Markdown 格式，包含以下内容：
- 基本信息（牌数、玩家数）
- 牌组构成
- 胡牌条件和牌型
- 操作规则（碰/杠/吃）
- 计分规则
- 特殊规则

---

## 回合制询问机制（重要）

### 强制要求：每次打牌后必须询问

**每次任何玩家（用户或 AI）打出一张牌后，AI 必须立即询问其他玩家是否要胡/杠/吃/碰。**

这是麻将游戏的核心机制，**不可跳过此步骤**。

### 询问流程

1. **玩家打牌** → 使用 `node skill.js play <game-id> <player-id> --action discard --tile <牌名>`

2. **AI 立即执行以下步骤**：
   - 读取当前游戏状态：`node skill.js status <game-id>`
   - 检查 `tile_pool` 中刚打出的牌
   - 询问所有其他玩家（按逆时针顺序）

3. **询问格式**：
   ```
   【询问】<玩家名> 打出了 【<牌名>】

   可操作的玩家：<玩家1>、<玩家2>、<玩家3>

   优先级：胡 > 杠 > 吃 > 碰

   请回复操作：
   - 胡: "胡" 或 "win"
   - 杠: "杠 <牌名>" 或 "gang <牌名>"
   - 吃: "吃 <牌名> <手牌1> <手牌2>" 或 "chi <tile> --with <tile1>,<tile2>"
     示例: "吃 三万 四万 五万" 或 "chi 3m --with 4m,5m"
   - 碰: "碰 <牌名>" 或 "peng <牌名>"
   - 过: "过" 或 "pass"
   ```

### 操作优先级

当多个玩家同时响应时，按以下优先级处理：

1. **胡（win）** - 最高优先级
2. **杠（gang）** - 次高优先级
3. **吃（chi）** - 第三优先级
4. **碰（peng）** - 第四优先级

如果同一优先级有多个玩家响应，按出牌顺序（逆时针）处理。

---

## 多人游戏支持（群聊环境）

### 多人类玩家场景

当多个人类玩家在群聊中一起玩麻将时：

1. **AI 发出询问**：每次有人打牌后，AI 询问所有其他玩家

2. **玩家响应**：玩家通过 @ 回复来响应

3. **优先级处理**：
   - 第一个 @ 回复的玩家获得操作权
   - 如果同时有多个玩家 @ 回复，按优先级（胡 > 杠 > 吃 > 碰）处理
   - 相同优先级时，按出牌顺序（逆时针）处理

4. **执行操作**：
   ```bash
   # 例如：玩家_2 响应碰
   node skill.js play <game-id> player_2 --action peng --tile <牌名>
   ```

5. **继续游戏**：操作完成后，继续下一位玩家

### 示例对话

```
玩家_1: 打出 【三万】

AI: 【询问】玩家_1 打出了 【三万】

    可操作的玩家：玩家_2、玩家_3、玩家_4

    优先级：胡 > 杠 > 吃 > 碰

玩家_3: @AI 碰

AI: 玩家_3 碰 【三万】

    执行操作：
    node skill.js play <game-id> player_3 --action peng --tile 三万
```

### 处理多人响应

如果多个玩家同时响应：

```
AI: 【询问】玩家_1 打出了 【三万】

玩家_2: @AI 胡
玩家_3: @AI 碰
玩家_4: @AI 吃

AI: 玩家_2 胡牌！（胡优先级最高）

    执行操作：
    node skill.js play <game-id> player_2 --action win
```

---

## 游戏状态返回值

### 重要字段

每次调用 `node skill.js status <game-id>` 返回以下重要信息：

```json
{
  "gameId": "20260319_111525",
  "status": "playing",
  "currentPlayer": 1,
  "currentPlayerName": "AI-小王",
  "wallCount": 91,
  "players": [
    {
      "id": "player_0",
      "name": "用户",
      "handCount": 13,
      "meldCount": 0,
      "discards": "【白】"  // 该玩家打出的所有牌
    }
  ],
  "melds": [
    {
      "player": "用户",
      "playerId": "player_0",
      "melds": ["【三万】【三万】【三万】"]  // 碰/杠的牌
    }
  ],
  "tile_pool": [
    {
      "tile": "5z",
      "player": 0,
      "timestamp": "2026-03-19T03:16:29.468Z"
    }
  ]
}
```

### AI 使用返回值

AI 必须使用返回值中的信息来：
1. **检查牌池** (`tile_pool`)：知道哪些牌已经被打出
2. **查看弃牌** (`discards`)：每个玩家打出了哪些牌
3. **查看明牌** (`melds`)：哪些玩家碰/杠了什么牌
4. **判断当前玩家** (`currentPlayer`)：轮到谁了

---

## 麻将牌表示

### 内部编码
- 数牌：`1m`-`9m`（万）、`1p`-`9p`（筒）、`1s`-`9s`（条）
- 风牌：`1z`(东)、`2z`(南)、`3z`(西)、`4z`(北)
- 三元牌：`5z`(白)、`6z`(发)、`7z`(中)
- 花牌：`1h`-`8h`

### 显示格式
输出使用中括号格式，牌之间无空格：
- 数牌：【三万】【五筒】【七条】
- 字牌：【东】【南】【西】【北】【白】【发】【中】
- 花牌：【春】【夏】【秋】【冬】【梅】【兰】【竹】【菊】

示例：
```
手牌: 【一万】【三万】【五万】【二筒】【二筒】【二筒】【四条】【五条】【六条】【东】【东】【发】【发】
```

### 用户输入格式
用户可以使用中文牌名：
```bash
node skill.js play <game-id> player_0 --action discard --tile 三万
node skill.js play <game-id> player_0 --action discard --tile 东
```

---

## 支持的麻将规则

### 上海麻将

| 特性 | 说明 |
|------|------|
| 牌数 | 144 张（含花牌） |
| 玩家 | 4 人 |
| 花牌 | 春夏秋冬、梅兰竹菊 |
| 特殊规则 | 必须缺门、清一色加番 |
| 规则文件 | `mahjong_route/shanghai.md` |

### 四川麻将

| 特性 | 说明 |
|------|------|
| 牌数 | 108 张（无字牌） |
| 玩家 | 4 人 |
| 花牌 | 无 |
| 特殊规则 | 定缺、血流成河、查大叫 |
| 规则文件 | `mahjong_route/sichuan.md` |

### 扬州麻将

| 特性 | 说明 |
|------|------|
| 牌数 | 144 张（含花牌） |
| 玩家 | 4 人 |
| 花牌 | 春夏秋冬、梅兰竹菊 |
| 特殊规则 | 必胡、抢杠胡、杠开 |
| 规则文件 | `mahjong_route/yangzhou.md` |

---

## 游戏流程

```
1. 创建游戏 -> 分配座位 -> 发牌
2. 玩家轮次：摸牌 -> 打牌 -> (碰/杠/胡)
3. AI 自动决策
4. 游戏结束 -> 记录结算
```

### 命令详解

#### 创建新游戏

```bash
node skill.js new --rule <rule> --players <count>
```

参数：
- `--rule`：规则类型，可选 `shanghai`、`sichuan`、`yangzhou`
- `--players`：玩家数量，默认 4

#### 查看游戏状态

```bash
node skill.js status <game-id>

# 显示所有玩家手牌（用于AI分析）
node skill.js status <game-id> --show-hands
```

显示：
- 当前玩家
- 各家手牌数（使用 `--show-hands` 显示具体手牌）
- 桌面上的明牌
- 最近的操作记录

**注意**：`--show-hands` 参数用于AI分析牌局，会显示所有玩家的具体手牌，而不仅仅是数量。

#### 玩家操作

```bash
# 摸牌
node skill.js play <game-id> <player-id> --action draw

# 打牌
node skill.js play <game-id> <player-id> --action discard --tile <tile>

# 碰牌
node skill.js play <game-id> <player-id> --action peng --tile <tile>

# 杠牌
node skill.js play <game-id> <player-id> --action gang --tile <tile>

# 吃牌（需要指定两张手牌组成顺子）
node skill.js play <game-id> <player-id> --action chi --tile <tile> --with <tile1>,<tile2>
# 示例：用四万、五万吃三万
node skill.js play game123 player_1 --action chi --tile 3m --with 4m,5m

# 胡牌
node skill.js play <game-id> <player-id> --action win

# 过（放弃碰/杠/胡）
node skill.js play <game-id> <player-id> --action pass
```

牌的表示法：
- 万子：`1m`-`9m`
- 筒子：`1p`-`9p`
- 条子：`1s`-`9s`
- 风牌：`1z`(东)、`2z`(南)、`3z`(西)、`4z`(北)
- 三元牌：`5z`(白)、`6z`(发)、`7z`(中)
- 花牌：`1h`-`8h`

---

## 游戏记录

### 文件结构

```
session/
├── 20260319_143052_playing.json  # 进行中的游戏
├── 20260319_150328_stopped.json  # 已结束的游戏
└── ...
```

### JSON 格式

```json
{
  "game_id": "20260319_143052",
  "status": "playing",
  "rule": "shanghai",
rule: "shanghai"
created_at: "2026-03-19T14:30:52"
updated_at: "2026-03-19T14:45:12"

players:
  - id: "player_0"
    name: "用户"
    is_ai: false
    seat: 0
    score: 0
  - id: "agent_1"
    name: "AI-小王"
    is_ai: true
    seat: 1
    score: 0
  - id: "agent_2"
    name: "AI-小李"
    is_ai: true
    seat: 2
    score: 0
  - id: "agent_3"
    name: "AI-小张"
    is_ai: true
    seat: 3
    score: 0

rounds:
  - number: 1
    dealer: 0
    winner: null
    actions:
      - player: 0
        action: "draw"
        tile: "3m"
        timestamp: "2026-03-19T14:31:05"
      - player: 0
        action: "discard"
        tile: "9s"
        timestamp: "2026-03-19T14:31:15"
```

---

## AI 玩家行为

### 决策逻辑

AI 玩家会根据以下因素做出决策：
1. **手牌分析**：计算向听数、有效牌
2. **风险判断**：评估打牌安全性
3. **策略选择**：进攻/防守/听牌

### AI 难度

默认使用中等难度 AI：
- 基础牌效计算
- 简单防守策略
- 听牌判断

---

## 快速开始

```bash
# 进入目录
cd game_mahjong_agent

# 安装依赖
pnpm install

# 构建
npm run build

# 创建新游戏（上海麻将）
node skill.js new --rule shanghai

# 查看游戏状态
node skill.js status <显示的game-id>
```

---

## 注意事项

1. **游戏存档**：每步操作自动保存
2. **AI 自动运行**：AI 玩家会在轮到时自动行动
3. **规则差异**：不同规则的胡牌条件不同
4. **调试模式**：添加 `--debug` 查看详细信息
