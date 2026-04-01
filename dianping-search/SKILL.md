---
name: dianping-search
description: 当用户需要"搜索大众点评"、"查附近商户"、"找餐厅"、"查美食"、"搜酒店"、"搜KTV"、"搜景点"、"大众点评搜索"时使用此 skill。支持按城市、分类搜索大众点评商户信息，返回店名、评分、评价数、人均价格、分类、区域等信息。
version: 260401.173428
---

# 大众点评搜索

通过大众点评搜索商户信息，返回结构化数据。

## 可用工具

### search - 搜索商户

**参数：**
- `keyword` (必需): 搜索关键词
- `dper` (首次必需): 大众点评 dper cookie 值，首次传入后自动保存，后续无需再传
- `city` (可选): 城市，默认"上海"
- `category` (可选): 分类，默认"全部"

**分类选项：**

| 名称 | ID | 说明 |
|------|----|------|
| 全部 | 0 | 所有分类 |
| 美食 | 10 | 餐饮美食 |
| 电影演出赛事 | 25 | 电影、演出、赛事 |
| 休闲娱乐 | 30 | 休闲娱乐场所 |
| 酒店 | 60 | 酒店住宿 |
| K歌 | 15 | KTV |
| 丽人 | 50 | 美容美发 |
| 运动健身 | 45 | 健身运动 |
| 景点 | 35 | 旅游景点 |

**使用示例：**

搜索五角场附近商户（首次使用，dper 自动保存）：
```bash
node skill.js "五角场" --dper YOUR_DPER_TOKEN
```

后续搜索无需再传 dper：
```bash
node skill.js "火锅" --city 成都 --category 美食
node skill.js "星巴克"
```

更新 dper（cookie 过期后重新传入即可）：
```bash
node skill.js "五角场" --dper NEW_DPER_TOKEN
```

## 返回字段

| 字段 | 说明 |
|------|------|
| name | 商户名称 |
| rating | 评分（0-5.0） |
| reviewNum | 评价数量 |
| avgPrice | 人均消费 |
| category | 商户分类 |
| region | 所在区域 |
| hasBranch | 是否连锁店 |
| shopId | 商户ID |
| href | 商户链接 |

## 注意事项

1. **dper cookie**：用户需自行从浏览器获取，cookie 可能会过期
2. **频率限制**：搜索间隔不低于 5 秒
3. **城市支持**：上海、北京、广州、深圳、杭州、成都、重庆、南京、武汉、天津、西安、长沙、苏州、郑州、青岛、大连、厦门、合肥、昆明、福州等

## 获取 dper cookie

1. 打开网页版大众点评 https://www.dianping.com/
2. 登录账户
3. 从任意页面的浏览器 Cookie 中获取 `dper` 的值：
   - Chrome: F12 → Application → Cookies → www.dianping.com → dper
   - 或 F12 → Network → 任意请求 → Headers → Cookie 中找 dper=xxx

**注意：** 当搜索失败（返回 HTTP 302 或无结果）时，通常是 dper 已过期，请提醒使用者重新获取并提供新的 dper 值。
