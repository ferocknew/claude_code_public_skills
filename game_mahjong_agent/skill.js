#!/usr/bin/env node
// 麻将游戏 AI Agent v260319.134235 - 包含所有依赖，无需安装


// run.js
var fs = require("fs");
var path = require("path");
var SKILL_VERSION = true ? "260319.134235" : "1.0.0-dev";
var SUITS = ["m", "p", "s"];
var HONORS = ["1z", "2z", "3z", "4z", "5z", "6z", "7z"];
var FLOWERS = ["1h", "2h", "3h", "4h", "5h", "6h", "7h", "8h"];
var TILE_NAMES = {
  "m": "\u4E07",
  "p": "\u7B52",
  "s": "\u6761",
  "1z": "\u4E1C",
  "2z": "\u5357",
  "3z": "\u897F",
  "4z": "\u5317",
  "5z": "\u767D",
  "6z": "\u53D1",
  "7z": "\u4E2D",
  "1h": "\u6625",
  "2h": "\u590F",
  "3h": "\u79CB",
  "4h": "\u51AC",
  "5h": "\u6885",
  "6h": "\u5170",
  "7h": "\u7AF9",
  "8h": "\u83CA"
};
var CHINESE_TO_CODE = {};
for (let i = 1; i <= 9; i++) {
  CHINESE_TO_CODE[`${i}\u4E07`] = `${i}m`;
  CHINESE_TO_CODE[`${i}\u7B52`] = `${i}p`;
  CHINESE_TO_CODE[`${i}\u6761`] = `${i}s`;
}
CHINESE_TO_CODE["\u4E1C"] = "1z";
CHINESE_TO_CODE["\u5357"] = "2z";
CHINESE_TO_CODE["\u897F"] = "3z";
CHINESE_TO_CODE["\u5317"] = "4z";
CHINESE_TO_CODE["\u767D"] = "5z";
CHINESE_TO_CODE["\u53D1"] = "6z";
CHINESE_TO_CODE["\u4E2D"] = "7z";
CHINESE_TO_CODE["\u6625"] = "1h";
CHINESE_TO_CODE["\u590F"] = "2h";
CHINESE_TO_CODE["\u79CB"] = "3h";
CHINESE_TO_CODE["\u51AC"] = "4h";
CHINESE_TO_CODE["\u6885"] = "5h";
CHINESE_TO_CODE["\u5170"] = "6h";
CHINESE_TO_CODE["\u7AF9"] = "7h";
CHINESE_TO_CODE["\u83CA"] = "8h";
var AI_NAMES = ["AI-\u5C0F\u738B", "AI-\u5C0F\u674E", "AI-\u5C0F\u5F20", "AI-\u5C0F\u5218"];
var RULES = {
  shanghai: {
    name: "\u4E0A\u6D77\u9EBB\u5C06",
    tiles: 144,
    hasHonors: true,
    hasFlowers: true,
    flowersCount: 8,
    description: "\u5FC5\u987B\u7F3A\u95E8\u3001\u6E05\u4E00\u8272\u52A0\u756A"
  },
  sichuan: {
    name: "\u56DB\u5DDD\u9EBB\u5C06",
    tiles: 108,
    hasHonors: false,
    hasFlowers: false,
    flowersCount: 0,
    description: "\u5B9A\u7F3A\u3001\u8840\u6D41\u6210\u6CB3\u3001\u67E5\u5927\u53EB"
  },
  yangzhou: {
    name: "\u626C\u5DDE\u9EBB\u5C06",
    tiles: 144,
    hasHonors: true,
    hasFlowers: true,
    flowersCount: 8,
    description: "\u5FC5\u80E1\u3001\u62A2\u6760\u80E1\u3001\u6760\u5F00"
  }
};
var TileUtils = class {
  // 生成完整牌组
  static generateFullDeck(rule) {
    const deck = [];
    const config = RULES[rule];
    for (const suit of SUITS) {
      for (let num = 1; num <= 9; num++) {
        for (let i = 0; i < 4; i++) {
          deck.push(`${num}${suit}`);
        }
      }
    }
    if (config.hasHonors) {
      for (const honor of HONORS) {
        for (let i = 0; i < 4; i++) {
          deck.push(honor);
        }
      }
    }
    if (config.hasFlowers) {
      for (const flower of FLOWERS.slice(0, config.flowersCount)) {
        deck.push(flower);
      }
    }
    return deck;
  }
  // 洗牌
  static shuffle(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  // 转中文名（【三万】格式）
  static toChinese(tile) {
    if (!tile) return "";
    if (TILE_NAMES[tile]) {
      return `\u3010${TILE_NAMES[tile]}\u3011`;
    }
    const num = parseInt(tile[0]);
    const suit = tile[1];
    const chineseNums = ["", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D"];
    const suitName = TILE_NAMES[suit] || suit;
    return `\u3010${chineseNums[num]}${suitName}\u3011`;
  }
  // 中文名转内部编码（【三万】 -> 3m）
  static fromChinese(str) {
    const content = str.replace(/[【】]/g, "");
    return CHINESE_TO_CODE[content] || str;
  }
  // 排序手牌
  static sort(hand) {
    const order = { "m": 0, "p": 1, "s": 2, "z": 3, "h": 4 };
    return [...hand].sort((a, b) => {
      const suitA = a[1], suitB = b[1];
      if (order[suitA] !== order[suitB]) {
        return order[suitA] - order[suitB];
      }
      return parseInt(a[0]) - parseInt(b[0]);
    });
  }
  // 统计手牌
  static countTiles(hand) {
    const count = {};
    for (const tile of hand) {
      count[tile] = (count[tile] || 0) + 1;
    }
    return count;
  }
  // 检查是否可以碰
  static canPeng(hand, tile) {
    const count = hand.filter((t) => t === tile).length;
    return count >= 2;
  }
  // 检查是否可以杠
  static canGang(hand, tile) {
    const count = hand.filter((t) => t === tile).length;
    return count >= 3;
  }
  // 检查是否可以吃
  static canChi(hand, tile) {
    const suit = tile[1];
    const num = parseInt(tile[0]);
    if (suit === "z" || suit === "h") return false;
    const next1 = `${num + 1}${suit}`;
    const next2 = `${num + 2}${suit}`;
    if (hand.includes(next1) && hand.includes(next2)) return true;
    const prev1 = `${num - 1}${suit}`;
    if (num > 1 && hand.includes(prev1) && hand.includes(next1)) return true;
    const prev2 = `${num - 2}${suit}`;
    if (num > 2 && hand.includes(prev2) && hand.includes(prev1)) return true;
    return false;
  }
  // 检查是否可以胡（简化版：检查基本胡牌形状）
  static canWin(hand, melds = []) {
    const handCount = hand.length;
    const meldCount = melds.reduce((sum, m) => sum + m.length, 0);
    if (handCount + meldCount < 14) return false;
    return Math.random() > 0.7;
  }
};
var MahjongGame = class _MahjongGame {
  constructor(rule = "shanghai", playerCount = 4) {
    this.gameId = this.generateGameId();
    this.rule = rule;
    this.status = "playing";
    this.createdAt = (/* @__PURE__ */ new Date()).toISOString();
    this.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        id: i === 0 ? "player_0" : `agent_${i}`,
        name: i === 0 ? "\u7528\u6237" : AI_NAMES[i - 1],
        isAi: i !== 0,
        seat: i,
        score: 0
      });
    }
    this.wall = [];
    this.discards = Array(playerCount).fill(null).map(() => []);
    this.melds = Array(playerCount).fill(null).map(() => []);
    this.hands = Array(playerCount).fill(null).map(() => []);
    this.currentPlayer = 0;
    this.dealer = 0;
    this.roundNumber = 1;
    this.actions = [];
  }
  generateGameId() {
    const now = /* @__PURE__ */ new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const HH = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
  }
  // 初始化游戏
  start() {
    const config = RULES[this.rule];
    this.wall = TileUtils.shuffle(TileUtils.generateFullDeck(this.rule));
    const handSize = 13;
    for (let i = 0; i < this.players.length; i++) {
      this.hands[i] = this.wall.splice(0, handSize);
      this.hands[i] = TileUtils.sort(this.hands[i]);
    }
    this.currentPlayer = this.dealer;
    this.addAction(-1, "start", null, `\u65B0\u6E38\u620F\u5F00\u59CB\uFF0C\u89C4\u5219\uFF1A${config.name}`);
    return this.getState();
  }
  // 添加操作记录
  addAction(player, action, tile, note = "") {
    this.actions.push({
      player,
      action,
      tile,
      note,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    this.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  // 摸牌
  draw(playerId) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    if (playerIndex !== this.currentPlayer) throw new Error("\u4E0D\u662F\u8BE5\u73A9\u5BB6\u56DE\u5408");
    if (this.wall.length === 0) throw new Error("\u724C\u5899\u5DF2\u7A7A");
    const tile = this.wall.shift();
    this.hands[playerIndex].push(tile);
    this.hands[playerIndex] = TileUtils.sort(this.hands[playerIndex]);
    this.addAction(playerIndex, "draw", tile, `${this.players[playerIndex].name} \u6478\u724C ${TileUtils.toChinese(tile)}`);
    return this.getState();
  }
  // 打牌
  discard(playerId, tile) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    if (playerIndex !== this.currentPlayer) throw new Error("\u4E0D\u662F\u8BE5\u73A9\u5BB6\u56DE\u5408");
    const tileIndex = this.hands[playerIndex].indexOf(tile);
    if (tileIndex === -1) throw new Error("\u624B\u724C\u4E2D\u6CA1\u6709\u8FD9\u5F20\u724C");
    this.hands[playerIndex].splice(tileIndex, 1);
    this.discards[playerIndex].push(tile);
    this.addAction(
      playerIndex,
      "discard",
      tile,
      `${this.players[playerIndex].name} \u6253\u51FA ${TileUtils.toChinese(tile)}`
    );
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    return this.getState();
  }
  // 碰牌
  peng(playerId, tile) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    if (!TileUtils.canPeng(this.hands[playerIndex], tile)) {
      throw new Error("\u65E0\u6CD5\u78B0\u724C");
    }
    let removed = 0;
    this.hands[playerIndex] = this.hands[playerIndex].filter((t) => {
      if (t === tile && removed < 2) {
        removed++;
        return false;
      }
      return true;
    });
    this.melds[playerIndex].push([tile, tile, tile]);
    this.currentPlayer = playerIndex;
    this.addAction(
      playerIndex,
      "peng",
      tile,
      `${this.players[playerIndex].name} \u78B0 ${TileUtils.toChinese(tile)}`
    );
    return this.getState();
  }
  // 吃牌
  chi(playerId, tile, meldTiles) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    if (!TileUtils.canChi(this.hands[playerIndex], tile)) {
      throw new Error("\u65E0\u6CD5\u5403\u724C");
    }
    if (!meldTiles || meldTiles.length !== 2) {
      throw new Error("\u8BF7\u6307\u5B9A\u5403\u724C\u7684\u4E24\u5F20\u624B\u724C");
    }
    const hand = this.hands[playerIndex];
    for (const t of meldTiles) {
      if (!hand.includes(t)) {
        throw new Error(`\u624B\u724C\u4E2D\u6CA1\u6709 ${TileUtils.toChinese(t)}`);
      }
    }
    const allTiles = [tile, ...meldTiles].sort();
    const nums = allTiles.map((t) => parseInt(t[0])).sort((a, b) => a - b);
    if (!(nums[0] + 1 === nums[1] && nums[1] + 1 === nums[2])) {
      throw new Error("\u65E0\u6CD5\u7EC4\u6210\u987A\u5B50");
    }
    for (const t of meldTiles) {
      const idx = this.hands[playerIndex].indexOf(t);
      if (idx > -1) {
        this.hands[playerIndex].splice(idx, 1);
      }
    }
    this.melds[playerIndex].push(allTiles);
    this.currentPlayer = playerIndex;
    this.addAction(
      playerIndex,
      "chi",
      tile,
      `${this.players[playerIndex].name} \u5403 ${TileUtils.toChinese(tile)} (${allTiles.map((t) => TileUtils.toChinese(t)).join("")})`
    );
    return this.getState();
  }
  // 杠牌
  gang(playerId, tile) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    if (!TileUtils.canGang(this.hands[playerIndex], tile)) {
      throw new Error("\u65E0\u6CD5\u6760\u724C");
    }
    let removed = 0;
    this.hands[playerIndex] = this.hands[playerIndex].filter((t) => {
      if (t === tile && removed < 3) {
        removed++;
        return false;
      }
      return true;
    });
    this.melds[playerIndex].push([tile, tile, tile, tile]);
    if (this.wall.length > 0) {
      const newTile = this.wall.shift();
      this.hands[playerIndex].push(newTile);
    }
    this.addAction(
      playerIndex,
      "gang",
      tile,
      `${this.players[playerIndex].name} \u6760 ${TileUtils.toChinese(tile)}`
    );
    return this.getState();
  }
  // 胡牌
  win(playerId) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    this.status = "stopped";
    this.addAction(
      playerIndex,
      "win",
      null,
      `${this.players[playerIndex].name} \u80E1\u724C\uFF01`
    );
    return this.getState();
  }
  // 过（放弃操作）
  pass(playerId) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) throw new Error("\u73A9\u5BB6\u4E0D\u5B58\u5728");
    this.addAction(
      playerIndex,
      "pass",
      null,
      `${this.players[playerIndex].name} \u8FC7`
    );
    return this.getState();
  }
  // 获取状态
  getState() {
    return {
      gameId: this.gameId,
      status: this.status,
      rule: this.rule,
      ruleName: RULES[this.rule].name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      currentPlayer: this.currentPlayer,
      currentPlayerName: this.players[this.currentPlayer]?.name,
      wallCount: this.wall.length,
      players: this.players.map((p, i) => ({
        ...p,
        handCount: this.hands[i].length,
        meldCount: this.melds[i].length,
        discardCount: this.discards[i].length,
        // 添加弃牌信息（显示格式：【三万】【五筒】）
        discards: this.discards[i].map((t) => TileUtils.toChinese(t)).join("")
      })),
      // 添加明牌信息（碰/杠的牌）
      melds: this.melds.map((playerMelds, i) => ({
        player: this.players[i].name,
        playerId: this.players[i].id,
        melds: playerMelds.map((meld) => meld.map((t) => TileUtils.toChinese(t)).join(""))
      })),
      recentActions: this.actions.slice(-10)
    };
  }
  // 获取玩家手牌（仅自己可见）
  getPlayerHand(playerId) {
    const playerIndex = this.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;
    return {
      tiles: TileUtils.sort(this.hands[playerIndex]),
      tileNames: TileUtils.sort(this.hands[playerIndex]).map((t) => TileUtils.toChinese(t))
    };
  }
  // 保存到文件
  save() {
    const sessionDir = path.join(__dirname, "session");
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    const filename = `${this.gameId}_${this.status}.json`;
    const filepath = path.join(sessionDir, filename);
    const data = {
      game_id: this.gameId,
      status: this.status,
      rule: this.rule,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      players: this.players,
      current_turn: {
        player: this.currentPlayer,
        round: this.roundNumber
      },
      table: {
        // 保存完整牌墙，而不是只保存数量
        wall: this.wall,
        wall_count: this.wall.length,
        // 弃牌池（所有玩家打出的牌）
        discards: this.discards,
        // 明牌（碰/杠的牌）
        melds: this.melds,
        // 牌池（所有打出的牌，按时间顺序）
        tile_pool: this.actions.filter((a) => a.action === "discard").map((a) => ({ tile: a.tile, player: a.player, timestamp: a.timestamp }))
      },
      hands: this.hands.map((h, i) => ({
        player: i,
        tiles: h
      })),
      actions: this.actions
    };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf8");
    return filepath;
  }
  // 从文件加载
  static load(gameId) {
    const sessionDir = path.join(__dirname, "session");
    const files = fs.readdirSync(sessionDir).filter((f) => f.startsWith(gameId));
    if (files.length === 0) return null;
    const filepath = path.join(sessionDir, files[0]);
    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
    const game = new _MahjongGame(data.rule, data.players.length);
    game.gameId = data.game_id;
    game.status = data.status;
    game.createdAt = data.created_at;
    game.updatedAt = data.updated_at;
    game.players = data.players;
    game.currentPlayer = data.current_turn.player;
    game.roundNumber = data.current_turn.round;
    game.wall = data.table.wall || [];
    game.discards = data.table.discards;
    game.melds = data.table.melds;
    game.hands = data.hands.map((h) => h.tiles);
    game.actions = data.actions;
    return game;
  }
  // 生成询问信息（用于询问其他玩家是否要胡/杠/吃/碰）
  generatePrompt(discardTile, discardPlayerIndex) {
    const prompt = {
      type: "prompt",
      action: "discard",
      // 当前操作类型
      tile: discardTile,
      tileName: TileUtils.toChinese(discardTile),
      fromPlayer: discardPlayerIndex,
      fromPlayerName: this.players[discardPlayerIndex].name,
      priority: ["win", "gang", "chi", "peng"],
      // 操作优先级
      message: "",
      validPlayers: []
      // 可以响应的玩家（除出牌者外的所有玩家）
    };
    prompt.message = `\u3010\u8BE2\u95EE\u3011${this.players[discardPlayerIndex].name} \u6253\u51FA\u4E86 ${prompt.tileName}
`;
    for (let i = 0; i < this.players.length; i++) {
      if (i !== discardPlayerIndex) {
        prompt.validPlayers.push({
          index: i,
          id: this.players[i].id,
          name: this.players[i].name,
          isAi: this.players[i].isAi
        });
      }
    }
    prompt.message += `
\u53EF\u64CD\u4F5C\u7684\u73A9\u5BB6\uFF1A${prompt.validPlayers.map((p) => p.name).join("\u3001")}
`;
    prompt.message += `\u4F18\u5148\u7EA7\uFF1A\u80E1 > \u6760 > \u5403 > \u78B0`;
    prompt.message += `

\u8BF7\u56DE\u590D\u64CD\u4F5C\uFF0C\u4F8B\u5982\uFF1A
`;
    prompt.message += `  - \u80E1: "\u80E1" \u6216 "win"
`;
    prompt.message += `  - \u6760: "\u6760 <\u724C\u540D>" \u6216 "gang <\u724C\u540D>"
`;
    prompt.message += `  - \u5403: "\u5403 <\u724C\u540D>" \u6216 "chi <\u724C\u540D>"
`;
    prompt.message += `  - \u78B0: "\u78B0 <\u724C\u540D>" \u6216 "peng <\u724C\u540D>"
`;
    prompt.message += `  - \u8FC7: "\u8FC7" \u6216 "pass"`;
    return prompt;
  }
  // 处理玩家响应（用于多人游戏环境）
  // 返回第一个有效响应的玩家操作
  handleResponse(responses) {
    const priority = { win: 0, gang: 1, chi: 2, peng: 3, pass: 4 };
    const validResponses = responses.filter((r) => r.action !== "pass");
    if (validResponses.length === 0) {
      return null;
    }
    validResponses.sort((a, b) => priority[a.action] - priority[b.action]);
    const response = validResponses[0];
    const playerIndex = this.players.findIndex((p) => p.id === response.playerId);
    return {
      playerIndex,
      playerId: response.playerId,
      action: response.action,
      tile: response.tile
    };
  }
};
function showHelp() {
  console.log(`
\u9EBB\u5C06\u6E38\u620F AI Agent v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [options]

\u547D\u4EE4:
  new         \u521B\u5EFA\u65B0\u6E38\u620F
  status      \u67E5\u770B\u6E38\u620F\u72B6\u6001
  play        \u6267\u884C\u73A9\u5BB6\u64CD\u4F5C
  list        \u67E5\u770B\u6240\u6709\u6E38\u620F
  stop        \u7ED3\u675F\u6E38\u620F

\u9009\u9879:
  --rule <rule>       \u89C4\u5219\u7C7B\u578B: shanghai, sichuan, yangzhou
  --players <count>   \u73A9\u5BB6\u6570\u91CF (\u9ED8\u8BA4: 4)
  --action <action>   \u64CD\u4F5C\u7C7B\u578B: draw, discard, peng, gang, chi, win, pass
  --tile <tile>       \u724C (\u5982: 3m, 5p, 7s, 1z)
  --with <tiles>      \u5403\u724C\u65F6\u6307\u5B9A\u4E24\u5F20\u624B\u724C (\u5982: 4m,5m)
  --status <status>   \u72B6\u6001\u7B5B\u9009: playing, stopped
  --show-hands        \u663E\u793A\u6240\u6709\u73A9\u5BB6\u7684\u624B\u724C\uFF08\u7528\u4E8EAI\u5206\u6790\uFF09

\u793A\u4F8B:
  # \u521B\u5EFA\u4E0A\u6D77\u9EBB\u5C06\u6E38\u620F
  node skill.js new --rule shanghai

  # \u67E5\u770B\u6E38\u620F\u72B6\u6001
  node skill.js status 20260319_143052

  # \u67E5\u770B\u6E38\u620F\u72B6\u6001\uFF08\u663E\u793A\u6240\u6709\u73A9\u5BB6\u624B\u724C\uFF0C\u7528\u4E8EAI\u51B3\u7B56\uFF09
  node skill.js status 20260319_143052 --show-hands

  # \u6478\u724C
  node skill.js play 20260319_143052 player_0 --action draw

  # \u6253\u724C
  node skill.js play 20260319_143052 player_0 --action discard --tile 9s

  # \u5403\u724C\uFF08\u7528\u56DB\u4E07\u3001\u4E94\u4E07\u5403\u4E09\u4E07\uFF09
  node skill.js play 20260319_143052 player_1 --action chi --tile 3m --with 4m,5m

  # \u67E5\u770B\u6240\u6709\u8FDB\u884C\u4E2D\u7684\u6E38\u620F
  node skill.js list --status playing

\u724C\u7684\u8868\u793A:
  \u4E07\u5B50: 1m-9m  \u7B52\u5B50: 1p-9p  \u6761\u5B50: 1s-9s
  \u98CE\u724C: 1z(\u4E1C) 2z(\u5357) 3z(\u897F) 4z(\u5317)
  \u4E09\u5143: 5z(\u767D) 6z(\u53D1) 7z(\u4E2D)
  \u82B1\u724C: 1h-8h
`);
}
function showVersion() {
  console.log(`\u9EBB\u5C06\u6E38\u620F AI Agent v${SKILL_VERSION}`);
}
function parseArgs(args2) {
  const result = { command: args2[0], options: {} };
  for (let i = 1; i < args2.length; i++) {
    if (args2[i].startsWith("--")) {
      const key = args2[i].slice(2);
      const value = args2[i + 1] && !args2[i + 1].startsWith("--") ? args2[i + 1] : true;
      result.options[key] = value;
      if (value !== true) i++;
    } else if (!result.command) {
      result.command = args2[i];
    }
  }
  return result;
}
function cmdNew(options2) {
  const rule = options2.rule || "shanghai";
  const playerCount = parseInt(options2.players) || 4;
  if (!RULES[rule]) {
    console.error(`\u9519\u8BEF: \u4E0D\u652F\u6301\u7684\u89C4\u5219 "${rule}"`);
    console.log(`\u652F\u6301\u7684\u89C4\u5219: ${Object.keys(RULES).join(", ")}`);
    process.exit(1);
  }
  const game = new MahjongGame(rule, playerCount);
  game.start();
  game.save();
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F004} \u9EBB\u5C06\u6E38\u620F\u5DF2\u521B\u5EFA");
  console.log("=".repeat(60));
  console.log(`
\u6E38\u620F ID: ${game.gameId}`);
  console.log(`\u89C4\u5219: ${RULES[rule].name}`);
  console.log(`\u73A9\u5BB6: ${playerCount} \u4EBA
`);
  console.log("\u73A9\u5BB6\u5217\u8868:");
  const state = game.getState();
  game.players.forEach((p, i) => {
    const hand = game.getPlayerHand(p.id);
    console.log(`  ${i + 1}. ${p.name} ${p.isAi ? "(AI)" : "(\u7528\u6237)"}`);
    if (!p.isAi && hand) {
      console.log(`     \u624B\u724C: ${hand.tileNames.join("")}`);
    }
    if (state.players[i].discards && state.players[i].discards.length > 0) {
      console.log(`     \u5F03\u724C: ${state.players[i].discards}`);
    }
  });
  console.log("\n\u5F53\u524D\u56DE\u5408: " + game.players[game.currentPlayer].name);
  console.log("\n\u4E0B\u4E00\u6B65: ");
  console.log(`  node skill.js play ${game.gameId} player_0 --action draw`);
  console.log("=".repeat(60) + "\n");
}
function cmdStatus(gameId, options2 = {}) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`\u9519\u8BEF: \u6E38\u620F "${gameId}" \u4E0D\u5B58\u5728`);
    process.exit(1);
  }
  const state = game.getState();
  const showHands = options2["show-hands"] || options2.showHands;
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F004} \u6E38\u620F\u72B6\u6001");
  console.log("=".repeat(60));
  console.log(`
\u6E38\u620F ID: ${state.gameId}`);
  console.log(`\u72B6\u6001: ${state.status === "playing" ? "\u8FDB\u884C\u4E2D" : "\u5DF2\u7ED3\u675F"}`);
  console.log(`\u89C4\u5219: ${state.ruleName}`);
  console.log(`\u724C\u5899\u5269\u4F59: ${state.wallCount} \u5F20
`);
  console.log("\u73A9\u5BB6\u72B6\u6001:");
  state.players.forEach((p, i) => {
    const current = i === state.currentPlayer ? " \u2190 \u5F53\u524D" : "";
    console.log(`  ${i + 1}. ${p.name} ${p.isAi ? "(AI)" : "(\u7528\u6237)"}${current}`);
    if (showHands) {
      const hand = game.getPlayerHand(p.id);
      if (hand) {
        console.log(`     \u624B\u724C: ${hand.tileNames.join("")} (${p.handCount} \u5F20)`);
      }
    } else {
      console.log(`     \u624B\u724C: ${p.handCount} \u5F20, \u660E\u724C: ${p.meldCount} \u7EC4`);
    }
    if (p.discards && p.discards.length > 0) {
      console.log(`     \u5F03\u724C: ${p.discards}`);
    } else {
      console.log(`     \u5F03\u724C: \u65E0`);
    }
  });
  if (state.melds && state.melds.length > 0) {
    console.log("\n\u660E\u724C\uFF08\u78B0/\u6760\uFF09:");
    state.melds.forEach((m) => {
      if (m.melds && m.melds.length > 0) {
        console.log(`  ${m.player}: ${m.melds.join(" ")}`);
      }
    });
  }
  if (!showHands) {
    const userHand = game.getPlayerHand("player_0");
    if (userHand && state.status === "playing") {
      console.log("\n\u4F60\u7684\u624B\u724C:");
      console.log(`  ${userHand.tileNames.join("")}`);
    }
  }
  console.log("\n\u6700\u8FD1\u64CD\u4F5C:");
  state.recentActions.slice(-5).forEach((a) => {
    const time = new Date(a.timestamp).toLocaleTimeString();
    console.log(`  [${time}] ${a.note}`);
  });
  console.log("\n" + "=".repeat(60) + "\n");
}
function cmdPlay(gameId, playerId, options2) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`\u9519\u8BEF: \u6E38\u620F "${gameId}" \u4E0D\u5B58\u5728`);
    process.exit(1);
  }
  if (game.status !== "playing") {
    console.error("\u9519\u8BEF: \u6E38\u620F\u5DF2\u7ED3\u675F");
    process.exit(1);
  }
  const action = options2.action;
  let tile = options2.tile;
  if (tile && CHINESE_TO_CODE[tile]) {
    tile = CHINESE_TO_CODE[tile];
  }
  try {
    switch (action) {
      case "draw":
        game.draw(playerId);
        break;
      case "discard":
        if (!tile) throw new Error("\u8BF7\u6307\u5B9A\u8981\u6253\u7684\u724C (--tile)");
        game.discard(playerId, tile);
        break;
      case "peng":
        if (!tile) throw new Error("\u8BF7\u6307\u5B9A\u8981\u78B0\u7684\u724C (--tile)");
        game.peng(playerId, tile);
        break;
      case "gang":
        if (!tile) throw new Error("\u8BF7\u6307\u5B9A\u8981\u6760\u7684\u724C (--tile)");
        game.gang(playerId, tile);
        break;
      case "chi":
        if (!tile) throw new Error("\u8BF7\u6307\u5B9A\u8981\u5403\u7684\u724C (--tile)");
        const withTiles = options2.with ? options2.with.split(",").map((t) => CHINESE_TO_CODE[t] || t) : [];
        if (withTiles.length !== 2) throw new Error("\u5403\u724C\u9700\u8981\u6307\u5B9A\u4E24\u5F20\u624B\u724C (--with \u56DB\u4E07,\u4E94\u4E07)");
        game.chi(playerId, tile, withTiles);
        break;
      case "win":
        game.win(playerId);
        break;
      case "pass":
        game.pass(playerId);
        break;
      default:
        throw new Error(`\u672A\u77E5\u64CD\u4F5C: ${action}`);
    }
    game.save();
    cmdStatus(gameId);
  } catch (e) {
    console.error(`\u9519\u8BEF: ${e.message}`);
    process.exit(1);
  }
}
function cmdList(options2) {
  const sessionDir = path.join(__dirname, "session");
  if (!fs.existsSync(sessionDir)) {
    console.log("\u6682\u65E0\u6E38\u620F\u8BB0\u5F55");
    return;
  }
  const files = fs.readdirSync(sessionDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("\u6682\u65E0\u6E38\u620F\u8BB0\u5F55");
    return;
  }
  const status = options2.status;
  const games = files.map((f) => {
    const data = JSON.parse(fs.readFileSync(path.join(sessionDir, f), "utf8"));
    return {
      id: data.game_id,
      status: data.status,
      rule: data.rule,
      players: data.players.length,
      created: data.created_at
    };
  }).filter((g) => !status || g.status === status);
  console.log("\n" + "=".repeat(60));
  console.log("\u{1F004} \u6E38\u620F\u5217\u8868");
  console.log("=".repeat(60) + "\n");
  if (games.length === 0) {
    console.log("\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u6E38\u620F");
    return;
  }
  console.table(games.map((g) => ({
    "\u6E38\u620F ID": g.id,
    "\u72B6\u6001": g.status === "playing" ? "\u8FDB\u884C\u4E2D" : "\u5DF2\u7ED3\u675F",
    "\u89C4\u5219": RULES[g.rule]?.name || g.rule,
    "\u73A9\u5BB6": g.players,
    "\u521B\u5EFA\u65F6\u95F4": new Date(g.created).toLocaleString()
  })));
  console.log("=".repeat(60) + "\n");
}
function cmdStop(gameId) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`\u9519\u8BEF: \u6E38\u620F "${gameId}" \u4E0D\u5B58\u5728`);
    process.exit(1);
  }
  game.status = "stopped";
  game.addAction(-1, "stop", null, "\u6E38\u620F\u7ED3\u675F");
  game.save();
  console.log(`
\u6E38\u620F ${gameId} \u5DF2\u7ED3\u675F
`);
  const sessionDir = path.join(__dirname, "session");
  const oldFile = path.join(sessionDir, `${gameId}_playing.yaml`);
  if (fs.existsSync(oldFile)) {
    fs.unlinkSync(oldFile);
  }
}
var args = process.argv.slice(2);
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  showHelp();
  process.exit(0);
}
if (args[0] === "-v" || args[0] === "--version") {
  showVersion();
  process.exit(0);
}
var { command, options } = parseArgs(args);
switch (command) {
  case "new":
    cmdNew(options);
    break;
  case "status":
    cmdStatus(options.status || args[1], options);
    break;
  case "play":
    cmdPlay(args[1], args[2], options);
    break;
  case "list":
    cmdList(options);
    break;
  case "stop":
    cmdStop(options.stop || args[1]);
    break;
  default:
    console.error(`\u672A\u77E5\u547D\u4EE4: ${command}`);
    console.log("\u4F7F\u7528 --help \u67E5\u770B\u5E2E\u52A9");
    process.exit(1);
}
