---
name: gaode-map
description: 高德地图个人查询工具。封装了高德开放平台的Web服务API，提供地理编码、POI搜索、路径规划、周边搜索等能力，最终生成可在高德地图App中打开的个人地图小程序二维码。当用户提到以下任意场景时，都应主动使用本技能：查找附近的餐厅/景点/商场等POI、规划从A到B的路线（步行/驾车/公交/骑行）、生成旅游行程/出行计划/打卡地图、在地图上标记多个地点、分享地图给他人、查询某地天气、将地址转换为坐标或反向解析、制作个人专属地图、行程规划、路线规划、地图分享。即使用户没有明确说"生成地图"，只要涉及地理位置、出行、导航、打卡、行程等话题，都应考虑使用本技能。
skill_version: 260517.134302
---

# 高德地图个人查询工具

## 概述

本工具封装了高德开放平台 Web 服务 API，提供地理编码、POI 搜索、路径规划等核心能力，并支持生成个人专属地图二维码（可在高德地图 App 中扫码查看）。

**运行方式（无需安装依赖）：**

```bash
node skill.js <command> [args] [options]
```

## 使用前提

1. 申请高德地图开发者 API Key：https://lbs.amap.com/
2. 设置环境变量：`export AMAP_API_KEY='your_api_key_here'`
3. 确保网络连接正常

---

## 命令参考

### 1. search — 关键词搜索 POI

```bash
node skill.js search "关键词" --city 城市 --limit 数量
```

| 参数 | 说明 |
|------|------|
| `<关键词>` | 搜索关键词（必需） |
| `--city` | 城市名称（可选） |
| `--limit` | 结果数量，默认20，最大100（可选） |

**示例：**
```bash
node skill.js search "烤鸭" --city 北京 --limit 5
node skill.js search "星巴克" --city 上海
```

### 2. around — 周边搜索 POI

```bash
node skill.js around "关键词" --location "经度,纬度" --radius 半径
```

| 参数 | 说明 |
|------|------|
| `<关键词>` | 搜索关键词（必需） |
| `--location` | 中心点坐标，格式"经度,纬度"（必需） |
| `--radius` | 搜索半径，单位米，默认1000（可选） |
| `--types` | POI类型（可选） |
| `--limit` | 结果数量（可选） |

**示例：**
```bash
node skill.js around "餐厅" --location "116.397,39.909" --radius 1000
node skill.js around "酒店" --location "121.473,31.230" --radius 2000
```

### 3. geo — 地址转坐标

```bash
node skill.js geo "地址" --city 城市
```

| 参数 | 说明 |
|------|------|
| `<地址>` | 详细地址（必需） |
| `--city` | 城市名称（可选） |

**示例：**
```bash
node skill.js geo "北京市朝阳区三里屯"
node skill.js geo "南京路步行街" --city 上海
```

### 4. regeo — 坐标转地址

```bash
node skill.js regeo <经度> <纬度>
```

**示例：**
```bash
node skill.js regeo 116.397 39.909
```

### 5. ip — IP 定位

```bash
node skill.js ip <IP地址>
```

**示例：**
```bash
node skill.js ip 114.114.114.114
```

### 6. walk — 步行路线规划

```bash
node skill.js walk "起点坐标" "终点坐标"
```

坐标格式：`"经度,纬度"`

**示例：**
```bash
node skill.js walk "116.397,39.909" "116.398,39.918"
```

### 7. drive — 驾车路线规划

```bash
node skill.js drive "起点坐标" "终点坐标"
```

**示例：**
```bash
node skill.js drive "116.397,39.909" "116.460,39.920"
```

### 8. transit — 公交路线规划

```bash
node skill.js transit "起点坐标" "终点坐标" --city 城市
```

| 参数 | 说明 |
|------|------|
| `--city` | 城市名称，默认"北京"（可选） |

**示例：**
```bash
node skill.js transit "116.397,39.909" "116.460,39.920" --city 北京
```

### 9. map — 生成个人地图二维码

```bash
node skill.js map "地图名称" --points '<JSON>' --scene <1|2|3>
```

| 参数 | 说明 |
|------|------|
| `<地图名称>` | 个人地图的标题（必需） |
| `--points` | 行程点列表，JSON 格式（必需） |
| `--scene` | 场景类型，默认1（可选） |

**sceneType 选择指引：**

| 值 | 含义 | 适用场景 |
|----|------|----------|
| `1` | 创建资源点且创建路线 | 通用场景，或不确定时 |
| `2` | 仅创建资源点 | 搜索类数据（找餐厅、找景点等） |
| `3` | 仅创建路线 | 路径规划类数据（从A到B、换乘等） |

**--points JSON 格式：**
```json
[
  {
    "title": "路线标题",
    "pointInfoList": [
      { "name": "地点名", "lon": 116.397, "lat": 39.909, "poiId": "POI_ID" }
    ]
  }
]
```

每条路线最多 16 个点。

**示例：**
```bash
node skill.js map "北京一日游" --points '[{"title":"北京一日游","pointInfoList":[{"name":"天安门广场","lon":116.397,"lat":39.909,"poiId":"B000A8URXB"},{"name":"故宫博物院","lon":116.397,"lat":39.918,"poiId":"B000A8URXC"}]}]' --scene 2
```

**返回结果：**
- `qr_code_url` — 二维码图片链接（用高德地图App扫码打开）
- `schema_url` — 原始高德地图链接
- `lineList` — 输入的行程数据

---

## 典型工作流

1. 用 `search` 或 `around` 查找 POI，获取坐标和 poiId
2. 用 `geo`/`regeo` 进行地址和坐标的互相转换
3. 用 `walk`/`drive`/`transit` 规划路线
4. 用 `map` 将所有点位和路线汇总生成个人地图二维码

---

## 输出格式

所有命令输出 JSON 到 stdout，格式化缩进。

**成功示例：**
```json
{
  "longitude": 116.397451,
  "latitude": 39.909221,
  "formatted_address": "北京市东城区天安门广场"
}
```

**错误示例：**
```json
{
  "error": "API Key 缺失",
  "message": "未检测到高德地图 API Key ..."
}
```

---

## 常见问题

### Q: 首次使用需要做什么？

**A:** 只需设置环境变量 `AMAP_API_KEY`，然后直接运行 `node skill.js <command>` 即可，无需安装任何依赖。

### Q: 如何获取高德地图 API Key？

**A:** 访问 https://lbs.amap.com/ → 注册/登录 → 控制台 → 创建应用 → 获取 **Web服务** API Key。

### Q: 支持哪些路线规划方式？

**A:** 支持步行（walk）、驾车（drive）、公交（transit）三种方式。

### Q: 个人地图二维码如何使用？

**A:** 使用高德地图 App 扫描 `qr_code_url` 对应的二维码即可打开个人地图小程序。
