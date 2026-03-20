#!/usr/bin/env node
/**
 * 麻将游戏 AI Agent 模拟器
 *
 * 用法:
 *   node skill.js new --rule <rule> [--players <count>]
 *   node skill.js status <game-id>
 *   node skill.js play <game-id> <player-id> --action <action> [--tile <tile>]
 *   node skill.js list [--status <status>]
 *   node skill.js stop <game-id>
 *
 * 规则: shanghai, sichuan, yangzhou
 */

const fs = require("fs");
const path = require("path");

// 版本号（打包时注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// ==================== Session 存储（JSON 格式）====================

function saveSession(gameId, data) {
  const status = data.status || 'playing';
  const filename = `${gameId}_${status}.json`;
  const filepath = path.join(__dirname, 'session', filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  return filepath;
}

function loadSession(gameId) {
  // 尝试加载 playing 状态
  let filepath = path.join(__dirname, 'session', `${gameId}_playing.json`);
  if (!fs.existsSync(filepath)) {
    // 尝试加载 stopped 状态
    filepath = path.join(__dirname, 'session', `${gameId}_stopped.json`);
  }
  if (!fs.existsSync(filepath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function listSessions() {
  const sessionDir = path.join(__dirname, 'session');
  if (!fs.existsSync(sessionDir)) {
    return [];
  }
  const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(sessionDir, f), 'utf8'));
    return { file: f, data };
  });
}

// ==================== 常量定义 ====================

const SUITS = ['m', 'p', 's']; // 万、筒、条
const HONORS = ['1z', '2z', '3z', '4z', '5z', '6z', '7z']; // 东南西北白发中
const FLOWERS = ['1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h']; // 花牌

// 牌名映射（内部编码 -> 中文显示）
const TILE_NAMES = {
  'm': '万', 'p': '筒', 's': '条',
  '1z': '东', '2z': '南', '3z': '西', '4z': '北',
  '5z': '白', '6z': '发', '7z': '中',
  '1h': '春', '2h': '夏', '3h': '秋', '4h': '冬',
  '5h': '梅', '6h': '兰', '7h': '竹', '8h': '菊'
};

// 中文牌名 -> 内部编码
const CHINESE_TO_CODE = {};
// 数牌
for (let i = 1; i <= 9; i++) {
  CHINESE_TO_CODE[`${i}万`] = `${i}m`;
  CHINESE_TO_CODE[`${i}筒`] = `${i}p`;
  CHINESE_TO_CODE[`${i}条`] = `${i}s`;
}
// 字牌
CHINESE_TO_CODE['东'] = '1z';
CHINESE_TO_CODE['南'] = '2z';
CHINESE_TO_CODE['西'] = '3z';
CHINESE_TO_CODE['北'] = '4z';
CHINESE_TO_CODE['白'] = '5z';
CHINESE_TO_CODE['发'] = '6z';
CHINESE_TO_CODE['中'] = '7z';
// 花牌
CHINESE_TO_CODE['春'] = '1h';
CHINESE_TO_CODE['夏'] = '2h';
CHINESE_TO_CODE['秋'] = '3h';
CHINESE_TO_CODE['冬'] = '4h';
CHINESE_TO_CODE['梅'] = '5h';
CHINESE_TO_CODE['兰'] = '6h';
CHINESE_TO_CODE['竹'] = '7h';
CHINESE_TO_CODE['菊'] = '8h';

const AI_NAMES = ['AI-小王', 'AI-小李', 'AI-小张', 'AI-小刘'];

const RULES = {
  shanghai: {
    name: '上海麻将',
    tiles: 144,
    hasHonors: true,
    hasFlowers: true,
    flowersCount: 8,
    description: '必须缺门、清一色加番'
  },
  sichuan: {
    name: '四川麻将',
    tiles: 108,
    hasHonors: false,
    hasFlowers: false,
    flowersCount: 0,
    description: '定缺、血流成河、查大叫'
  },
  yangzhou: {
    name: '扬州麻将',
    tiles: 144,
    hasHonors: true,
    hasFlowers: true,
    flowersCount: 8,
    description: '必胡、抢杠胡、杠开'
  }
};

// ==================== 牌组工具 ====================

class TileUtils {
  // 生成完整牌组
  static generateFullDeck(rule) {
    const deck = [];
    const config = RULES[rule];

    // 数牌（万筒条各4张）
    for (const suit of SUITS) {
      for (let num = 1; num <= 9; num++) {
        for (let i = 0; i < 4; i++) {
          deck.push(`${num}${suit}`);
        }
      }
    }

    // 字牌
    if (config.hasHonors) {
      for (const honor of HONORS) {
        for (let i = 0; i < 4; i++) {
          deck.push(honor);
        }
      }
    }

    // 花牌
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
    if (!tile) return '';

    // 字牌和花牌
    if (TILE_NAMES[tile]) {
      return `【${TILE_NAMES[tile]}】`;
    }

    // 数牌（如 3m -> 【三万】）
    const num = parseInt(tile[0]);
    const suit = tile[1];
    const chineseNums = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const suitName = TILE_NAMES[suit] || suit;
    return `【${chineseNums[num]}${suitName}】`;
  }

  // 中文名转内部编码（【三万】 -> 3m）
  static fromChinese(str) {
    // 移除【】符号
    const content = str.replace(/[【】]/g, '');
    return CHINESE_TO_CODE[content] || str;
  }

  // 排序手牌
  static sort(hand) {
    const order = { 'm': 0, 'p': 1, 's': 2, 'z': 3, 'h': 4 };
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
    const count = hand.filter(t => t === tile).length;
    return count >= 2;
  }

  // 检查是否可以杠
  static canGang(hand, tile) {
    const count = hand.filter(t => t === tile).length;
    return count >= 3;
  }

  // 检查是否可以吃
  static canChi(hand, tile) {
    const suit = tile[1];
    const num = parseInt(tile[0]);

    // 字牌和花牌不能吃
    if (suit === 'z' || suit === 'h') return false;

    // 检查是否能组成顺子 (x, x+1, x+2)
    const next1 = `${num + 1}${suit}`;
    const next2 = `${num + 2}${suit}`;
    if (hand.includes(next1) && hand.includes(next2)) return true;

    // 检查 (x-1, x, x+1)
    const prev1 = `${num - 1}${suit}`;
    if (num > 1 && hand.includes(prev1) && hand.includes(next1)) return true;

    // 检查 (x-2, x-1, x)
    const prev2 = `${num - 2}${suit}`;
    if (num > 2 && hand.includes(prev2) && hand.includes(prev1)) return true;

    return false;
  }

  // 检查是否可以胡（简化版：检查基本胡牌形状）
  static canWin(hand, melds = []) {
    // 简化实现：检查手牌数是否正确（14张或10张+1个明杠）
    const handCount = hand.length;
    const meldCount = melds.reduce((sum, m) => sum + m.length, 0);

    // 胡牌时应该有 14 张牌（含胡的那张）
    if (handCount + meldCount < 14) return false;

    // 简化：随机返回（实际需要完整的胡牌判断算法）
    return Math.random() > 0.7;
  }
}

// ==================== 游戏状态管理 ====================

class MahjongGame {
  constructor(rule = 'shanghai', playerCount = 4) {
    this.gameId = this.generateGameId();
    this.rule = rule;
    this.status = 'playing';
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    // 玩家
    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        id: i === 0 ? 'player_0' : `agent_${i}`,
        name: i === 0 ? '用户' : AI_NAMES[i - 1],
        isAi: i !== 0,
        seat: i,
        score: 0
      });
    }

    // 桌面状态
    this.wall = [];
    this.discards = Array(playerCount).fill(null).map(() => []);
    this.melds = Array(playerCount).fill(null).map(() => []);
    this.hands = Array(playerCount).fill(null).map(() => []);

    // 当前回合
    this.currentPlayer = 0;
    this.dealer = 0;
    this.roundNumber = 1;
    this.actions = [];
  }

  generateGameId() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
  }

  // 初始化游戏
  start() {
    const config = RULES[this.rule];

    // 生成并洗牌
    this.wall = TileUtils.shuffle(TileUtils.generateFullDeck(this.rule));

    // 发牌
    const handSize = 13;
    for (let i = 0; i < this.players.length; i++) {
      this.hands[i] = this.wall.splice(0, handSize);
      this.hands[i] = TileUtils.sort(this.hands[i]);
    }

    // 留一张作为庄家的起始牌
    this.currentPlayer = this.dealer;

    this.addAction(-1, 'start', null, `新游戏开始，规则：${config.name}`);

    return this.getState();
  }

  // 添加操作记录
  addAction(player, action, tile, note = '') {
    this.actions.push({
      player,
      action,
      tile,
      note,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  // 摸牌
  draw(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');
    if (playerIndex !== this.currentPlayer) throw new Error('不是该玩家回合');
    if (this.wall.length === 0) throw new Error('牌墙已空');

    const tile = this.wall.shift();
    this.hands[playerIndex].push(tile);
    this.hands[playerIndex] = TileUtils.sort(this.hands[playerIndex]);

    this.addAction(playerIndex, 'draw', tile, `${this.players[playerIndex].name} 摸牌 ${TileUtils.toChinese(tile)}`);

    return this.getState();
  }

  // 打牌
  discard(playerId, tile) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');
    if (playerIndex !== this.currentPlayer) throw new Error('不是该玩家回合');

    const tileIndex = this.hands[playerIndex].indexOf(tile);
    if (tileIndex === -1) throw new Error('手牌中没有这张牌');

    this.hands[playerIndex].splice(tileIndex, 1);
    this.discards[playerIndex].push(tile);

    this.addAction(playerIndex, 'discard', tile,
      `${this.players[playerIndex].name} 打出 ${TileUtils.toChinese(tile)}`);

    // 下一个玩家
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

    return this.getState();
  }

  // 碰牌
  peng(playerId, tile) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');

    if (!TileUtils.canPeng(this.hands[playerIndex], tile)) {
      throw new Error('无法碰牌');
    }

    // 移除手中的两张牌
    let removed = 0;
    this.hands[playerIndex] = this.hands[playerIndex].filter(t => {
      if (t === tile && removed < 2) {
        removed++;
        return false;
      }
      return true;
    });

    // 添加明牌
    this.melds[playerIndex].push([tile, tile, tile]);
    this.currentPlayer = playerIndex;

    this.addAction(playerIndex, 'peng', tile,
      `${this.players[playerIndex].name} 碰 ${TileUtils.toChinese(tile)}`);

    return this.getState();
  }

  // 吃牌
  chi(playerId, tile, meldTiles) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');

    if (!TileUtils.canChi(this.hands[playerIndex], tile)) {
      throw new Error('无法吃牌');
    }

    // meldTiles 应该包含吃的顺子中的另外两张牌
    if (!meldTiles || meldTiles.length !== 2) {
      throw new Error('请指定吃牌的两张手牌');
    }

    // 验证这两张牌是否在手牌中
    const hand = this.hands[playerIndex];
    for (const t of meldTiles) {
      if (!hand.includes(t)) {
        throw new Error(`手牌中没有 ${TileUtils.toChinese(t)}`);
      }
    }

    // 验证是否能组成顺子
    const allTiles = [tile, ...meldTiles].sort();
    const nums = allTiles.map(t => parseInt(t[0])).sort((a, b) => a - b);
    if (!(nums[0] + 1 === nums[1] && nums[1] + 1 === nums[2])) {
      throw new Error('无法组成顺子');
    }

    // 移除手中的两张牌
    for (const t of meldTiles) {
      const idx = this.hands[playerIndex].indexOf(t);
      if (idx > -1) {
        this.hands[playerIndex].splice(idx, 1);
      }
    }

    // 添加明牌（顺子）
    this.melds[playerIndex].push(allTiles);
    this.currentPlayer = playerIndex;

    this.addAction(playerIndex, 'chi', tile,
      `${this.players[playerIndex].name} 吃 ${TileUtils.toChinese(tile)} (${allTiles.map(t => TileUtils.toChinese(t)).join('')})`);

    return this.getState();
  }

  // 杠牌
  gang(playerId, tile) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');

    if (!TileUtils.canGang(this.hands[playerIndex], tile)) {
      throw new Error('无法杠牌');
    }

    // 移除手中的三张牌
    let removed = 0;
    this.hands[playerIndex] = this.hands[playerIndex].filter(t => {
      if (t === tile && removed < 3) {
        removed++;
        return false;
      }
      return true;
    });

    // 添加明牌
    this.melds[playerIndex].push([tile, tile, tile, tile]);

    // 杠后摸牌
    if (this.wall.length > 0) {
      const newTile = this.wall.shift();
      this.hands[playerIndex].push(newTile);
    }

    this.addAction(playerIndex, 'gang', tile,
      `${this.players[playerIndex].name} 杠 ${TileUtils.toChinese(tile)}`);

    return this.getState();
  }

  // 胡牌
  win(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');

    this.status = 'stopped';

    this.addAction(playerIndex, 'win', null,
      `${this.players[playerIndex].name} 胡牌！`);

    return this.getState();
  }

  // 过（放弃操作）
  pass(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) throw new Error('玩家不存在');

    this.addAction(playerIndex, 'pass', null,
      `${this.players[playerIndex].name} 过`);

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
        discards: this.discards[i].map(t => TileUtils.toChinese(t)).join('')
      })),
      // 添加明牌信息（碰/杠的牌）
      melds: this.melds.map((playerMelds, i) => ({
        player: this.players[i].name,
        playerId: this.players[i].id,
        melds: playerMelds.map(meld => meld.map(t => TileUtils.toChinese(t)).join(''))
      })),
      recentActions: this.actions.slice(-10)
    };
  }

  // 获取玩家手牌（仅自己可见）
  getPlayerHand(playerId) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;
    return {
      tiles: TileUtils.sort(this.hands[playerIndex]),
      tileNames: TileUtils.sort(this.hands[playerIndex]).map(t => TileUtils.toChinese(t))
    };
  }

  // 保存到文件
  save() {
    const sessionDir = path.join(__dirname, 'session');
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
        tile_pool: this.actions
          .filter(a => a.action === 'discard')
          .map(a => ({ tile: a.tile, player: a.player, timestamp: a.timestamp }))
      },
      hands: this.hands.map((h, i) => ({
        player: i,
        tiles: h
      })),
      actions: this.actions
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return filepath;
  }

  // 从文件加载
  static load(gameId) {
    const sessionDir = path.join(__dirname, 'session');
    const files = fs.readdirSync(sessionDir).filter(f => f.startsWith(gameId));

    if (files.length === 0) return null;

    const filepath = path.join(sessionDir, files[0]);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    const game = new MahjongGame(data.rule, data.players.length);
    game.gameId = data.game_id;
    game.status = data.status;
    game.createdAt = data.created_at;
    game.updatedAt = data.updated_at;
    game.players = data.players;
    game.currentPlayer = data.current_turn.player;
    game.roundNumber = data.current_turn.round;
    // 从 JSON 恢复完整牌墙
    game.wall = data.table.wall || [];
    game.discards = data.table.discards;
    game.melds = data.table.melds;
    game.hands = data.hands.map(h => h.tiles);
    game.actions = data.actions;

    return game;
  }

  // 生成询问信息（用于询问其他玩家是否要胡/杠/吃/碰）
  generatePrompt(discardTile, discardPlayerIndex) {
    const prompt = {
      type: 'prompt',
      action: 'discard', // 当前操作类型
      tile: discardTile,
      tileName: TileUtils.toChinese(discardTile),
      fromPlayer: discardPlayerIndex,
      fromPlayerName: this.players[discardPlayerIndex].name,
      priority: ['win', 'gang', 'chi', 'peng'], // 操作优先级
      message: '',
      validPlayers: [] // 可以响应的玩家（除出牌者外的所有玩家）
    };

    // 构建询问消息
    prompt.message = `【询问】${this.players[discardPlayerIndex].name} 打出了 ${prompt.tileName}\n`;

    // 添加可响应的玩家
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

    prompt.message += `\n可操作的玩家：${prompt.validPlayers.map(p => p.name).join('、')}\n`;
    prompt.message += `优先级：胡 > 杠 > 吃 > 碰`;
    prompt.message += `\n\n请回复操作，例如：\n`;
    prompt.message += `  - 胡: "胡" 或 "win"\n`;
    prompt.message += `  - 杠: "杠 <牌名>" 或 "gang <牌名>"\n`;
    prompt.message += `  - 吃: "吃 <牌名>" 或 "chi <牌名>"\n`;
    prompt.message += `  - 碰: "碰 <牌名>" 或 "peng <牌名>"\n`;
    prompt.message += `  - 过: "过" 或 "pass"`;

    return prompt;
  }

  // 处理玩家响应（用于多人游戏环境）
  // 返回第一个有效响应的玩家操作
  handleResponse(responses) {
    // responses 格式: [{ playerId: 'player_0', action: 'peng', tile: '三万' }, ...]
    // 按优先级排序：胡 > 杠 > 吃 > 碰
    const priority = { win: 0, gang: 1, chi: 2, peng: 3, pass: 4 };

    // 过滤掉 pass 和无效响应
    const validResponses = responses.filter(r => r.action !== 'pass');

    if (validResponses.length === 0) {
      return null; // 所有人都 pass
    }

    // 按优先级排序
    validResponses.sort((a, b) => priority[a.action] - priority[b.action]);

    // 返回优先级最高的响应
    const response = validResponses[0];
    const playerIndex = this.players.findIndex(p => p.id === response.playerId);

    return {
      playerIndex,
      playerId: response.playerId,
      action: response.action,
      tile: response.tile
    };
  }
}

// ==================== 命令行接口 ====================

function showHelp() {
  console.log(`
麻将游戏 AI Agent v${SKILL_VERSION}

用法:
  node skill.js <command> [options]

命令:
  new         创建新游戏
  status      查看游戏状态
  play        执行玩家操作
  list        查看所有游戏
  stop        结束游戏

选项:
  --rule <rule>       规则类型: shanghai, sichuan, yangzhou
  --players <count>   玩家数量 (默认: 4)
  --action <action>   操作类型: draw, discard, peng, gang, chi, win, pass
  --tile <tile>       牌 (如: 3m, 5p, 7s, 1z)
  --with <tiles>      吃牌时指定两张手牌 (如: 4m,5m)
  --status <status>   状态筛选: playing, stopped
  --show-hands        显示所有玩家的手牌（用于AI分析）

示例:
  # 创建上海麻将游戏
  node skill.js new --rule shanghai

  # 查看游戏状态
  node skill.js status 20260319_143052

  # 查看游戏状态（显示所有玩家手牌，用于AI决策）
  node skill.js status 20260319_143052 --show-hands

  # 摸牌
  node skill.js play 20260319_143052 player_0 --action draw

  # 打牌
  node skill.js play 20260319_143052 player_0 --action discard --tile 9s

  # 吃牌（用四万、五万吃三万）
  node skill.js play 20260319_143052 player_1 --action chi --tile 3m --with 4m,5m

  # 查看所有进行中的游戏
  node skill.js list --status playing

牌的表示:
  万子: 1m-9m  筒子: 1p-9p  条子: 1s-9s
  风牌: 1z(东) 2z(南) 3z(西) 4z(北)
  三元: 5z(白) 6z(发) 7z(中)
  花牌: 1h-8h
`);
}

function showVersion() {
  console.log(`麻将游戏 AI Agent v${SKILL_VERSION}`);
}

function parseArgs(args) {
  const result = { command: args[0], options: {} };
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      result.options[key] = value;
      if (value !== true) i++;
    } else if (!result.command) {
      result.command = args[i];
    }
  }
  return result;
}

function cmdNew(options) {
  const rule = options.rule || 'shanghai';
  const playerCount = parseInt(options.players) || 4;

  if (!RULES[rule]) {
    console.error(`错误: 不支持的规则 "${rule}"`);
    console.log(`支持的规则: ${Object.keys(RULES).join(', ')}`);
    process.exit(1);
  }

  const game = new MahjongGame(rule, playerCount);
  game.start();
  game.save();

  console.log('\n' + '='.repeat(60));
  console.log('🀄 麻将游戏已创建');
  console.log('='.repeat(60));
  console.log(`\n游戏 ID: ${game.gameId}`);
  console.log(`规则: ${RULES[rule].name}`);
  console.log(`玩家: ${playerCount} 人\n`);

  console.log('玩家列表:');
  const state = game.getState();
  game.players.forEach((p, i) => {
    const hand = game.getPlayerHand(p.id);
    console.log(`  ${i + 1}. ${p.name} ${p.isAi ? '(AI)' : '(用户)'}`);
    if (!p.isAi && hand) {
      console.log(`     手牌: ${hand.tileNames.join('')}`);
    }
    // 显示弃牌（新游戏时为空）
    if (state.players[i].discards && state.players[i].discards.length > 0) {
      console.log(`     弃牌: ${state.players[i].discards}`);
    }
  });

  console.log('\n当前回合: ' + game.players[game.currentPlayer].name);
  console.log('\n下一步: ');
  console.log(`  node skill.js play ${game.gameId} player_0 --action draw`);
  console.log('='.repeat(60) + '\n');
}

function cmdStatus(gameId, options = {}) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`错误: 游戏 "${gameId}" 不存在`);
    process.exit(1);
  }

  const state = game.getState();
  const showHands = options['show-hands'] || options.showHands;

  console.log('\n' + '='.repeat(60));
  console.log('🀄 游戏状态');
  console.log('='.repeat(60));
  console.log(`\n游戏 ID: ${state.gameId}`);
  console.log(`状态: ${state.status === 'playing' ? '进行中' : '已结束'}`);
  console.log(`规则: ${state.ruleName}`);
  console.log(`牌墙剩余: ${state.wallCount} 张\n`);

  console.log('玩家状态:');
  state.players.forEach((p, i) => {
    const current = i === state.currentPlayer ? ' ← 当前' : '';
    console.log(`  ${i + 1}. ${p.name} ${p.isAi ? '(AI)' : '(用户)'}${current}`);

    // 如果指定了 --show-hands，显示所有玩家的手牌详情
    if (showHands) {
      const hand = game.getPlayerHand(p.id);
      if (hand) {
        console.log(`     手牌: ${hand.tileNames.join('')} (${p.handCount} 张)`);
      }
    } else {
      console.log(`     手牌: ${p.handCount} 张, 明牌: ${p.meldCount} 组`);
    }

    // 显示弃牌
    if (p.discards && p.discards.length > 0) {
      console.log(`     弃牌: ${p.discards}`);
    } else {
      console.log(`     弃牌: 无`);
    }
  });

  // 显示明牌信息（碰/杠）
  if (state.melds && state.melds.length > 0) {
    console.log('\n明牌（碰/杠）:');
    state.melds.forEach(m => {
      if (m.melds && m.melds.length > 0) {
        console.log(`  ${m.player}: ${m.melds.join(' ')}`);
      }
    });
  }

  // 显示用户手牌（如果没有使用 --show-hands）
  if (!showHands) {
    const userHand = game.getPlayerHand('player_0');
    if (userHand && state.status === 'playing') {
      console.log('\n你的手牌:');
      console.log(`  ${userHand.tileNames.join('')}`);
    }
  }

  console.log('\n最近操作:');
  state.recentActions.slice(-5).forEach(a => {
    const time = new Date(a.timestamp).toLocaleTimeString();
    console.log(`  [${time}] ${a.note}`);
  });

  console.log('\n' + '='.repeat(60) + '\n');
}

function cmdPlay(gameId, playerId, options) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`错误: 游戏 "${gameId}" 不存在`);
    process.exit(1);
  }

  if (game.status !== 'playing') {
    console.error('错误: 游戏已结束');
    process.exit(1);
  }

  const action = options.action;
  let tile = options.tile;

  // 如果用户输入中文牌名，转换为内部编码
  if (tile && CHINESE_TO_CODE[tile]) {
    tile = CHINESE_TO_CODE[tile];
  }

  try {
    switch (action) {
      case 'draw':
        game.draw(playerId);
        break;
      case 'discard':
        if (!tile) throw new Error('请指定要打的牌 (--tile)');
        game.discard(playerId, tile);
        break;
      case 'peng':
        if (!tile) throw new Error('请指定要碰的牌 (--tile)');
        game.peng(playerId, tile);
        break;
      case 'gang':
        if (!tile) throw new Error('请指定要杠的牌 (--tile)');
        game.gang(playerId, tile);
        break;
      case 'chi':
        if (!tile) throw new Error('请指定要吃的牌 (--tile)');
        // 吃牌需要两张手牌，格式：--tile 四万 --with 五万,六万
        const withTiles = options.with ? options.with.split(',').map(t => CHINESE_TO_CODE[t] || t) : [];
        if (withTiles.length !== 2) throw new Error('吃牌需要指定两张手牌 (--with 四万,五万)');
        game.chi(playerId, tile, withTiles);
        break;
      case 'win':
        game.win(playerId);
        break;
      case 'pass':
        game.pass(playerId);
        break;
      default:
        throw new Error(`未知操作: ${action}`);
    }

    game.save();

    // 显示更新后的状态
    cmdStatus(gameId);

  } catch (e) {
    console.error(`错误: ${e.message}`);
    process.exit(1);
  }
}

function cmdList(options) {
  const sessionDir = path.join(__dirname, 'session');
  if (!fs.existsSync(sessionDir)) {
    console.log('暂无游戏记录');
    return;
  }

  const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('暂无游戏记录');
    return;
  }

  const status = options.status;
  const games = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(sessionDir, f), 'utf8'));
    return {
      id: data.game_id,
      status: data.status,
      rule: data.rule,
      players: data.players.length,
      created: data.created_at
    };
  }).filter(g => !status || g.status === status);

  console.log('\n' + '='.repeat(60));
  console.log('🀄 游戏列表');
  console.log('='.repeat(60) + '\n');

  if (games.length === 0) {
    console.log('没有符合条件的游戏');
    return;
  }

  console.table(games.map(g => ({
    '游戏 ID': g.id,
    '状态': g.status === 'playing' ? '进行中' : '已结束',
    '规则': RULES[g.rule]?.name || g.rule,
    '玩家': g.players,
    '创建时间': new Date(g.created).toLocaleString()
  })));

  console.log('='.repeat(60) + '\n');
}

function cmdStop(gameId) {
  const game = MahjongGame.load(gameId);
  if (!game) {
    console.error(`错误: 游戏 "${gameId}" 不存在`);
    process.exit(1);
  }

  game.status = 'stopped';
  game.addAction(-1, 'stop', null, '游戏结束');
  game.save();

  console.log(`\n游戏 ${gameId} 已结束\n`);

  // 删除旧的 playing 文件
  const sessionDir = path.join(__dirname, 'session');
  const oldFile = path.join(sessionDir, `${gameId}_playing.yaml`);
  if (fs.existsSync(oldFile)) {
    fs.unlinkSync(oldFile);
  }
}

// ==================== 主入口 ====================

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
  showHelp();
  process.exit(0);
}

if (args[0] === '-v' || args[0] === '--version') {
  showVersion();
  process.exit(0);
}

const { command, options } = parseArgs(args);

switch (command) {
  case 'new':
    cmdNew(options);
    break;
  case 'status':
    cmdStatus(options.status || args[1], options);
    break;
  case 'play':
    cmdPlay(args[1], args[2], options);
    break;
  case 'list':
    cmdList(options);
    break;
  case 'stop':
    cmdStop(options.stop || args[1]);
    break;
  default:
    console.error(`未知命令: ${command}`);
    console.log('使用 --help 查看帮助');
    process.exit(1);
}
