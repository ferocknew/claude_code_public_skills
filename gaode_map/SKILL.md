---
name: gaode-map
description: 高德地图个人查询工具。封装了高德开放平台的Web服务API，提供地理编码、POI搜索（v3+v5）、路径规划、交通态势、地址真实性验证等能力。当用户提到以下任意场景时，都应主动使用本技能：查找附近的餐厅/景点/商场等POI、规划从A到B的路线（步行/驾车/公交）、查询交通路况、验证地址是否存在、将地址转换为坐标或反向解析、行程规划、路线规划。即使用户没有明确说"查询地图"，只要涉及地理位置、出行、导航、行程等话题，都应考虑使用本技能。
skill_version: 260517.142426
---

# 高德地图个人查询工具

## 概述

本工具封装了高德开放平台 Web 服务 API（v3 + v5），提供地理编码、POI 搜索、路径规划、交通态势查询、地址真实性验证等核心能力。

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

### 1. search — 关键词搜索 POI（v3）

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
```

### 2. search2 — 关键词搜索 POI（v5）

```bash
node skill.js search2 --keywords "关键词" --region 区域 --limit 数量
```

| 参数 | 说明 |
|------|------|
| `--keywords` | 搜索关键词，多个用"\|"分隔（可选） |
| `--types` | POI类型编码，多个用"\|"分隔（可选） |
| `--region` | 搜索区划，citycode/adcode/cityname（可选） |
| `--city_limit` | 严格限制在 region 内：true/false（可选） |
| `--fields` | 返回字段筛选，逗号分隔（可选） |
| `--limit` | 每页数量，默认20，最大25（可选） |
| `--page` | 页码，1-100（可选） |

v5 版本相比 v3 增加了 `region` 区域限制、`city_limit` 严格召回、`types` 类型筛选，返回结果包含省/市/区、类型编码等更丰富字段。但每页最多 25 条（v3 为 100 条）。

**示例：**
```bash
node skill.js search2 --keywords "加油站" --region "上海市" --limit 5
node skill.js search2 --keywords "餐厅|咖啡" --region "110000" --city_limit true
```

### 3. around — 周边搜索 POI（v3）

```bash
node skill.js around "关键词" --location "经度,纬度" --radius 半径
```

| 参数 | 说明 |
|------|------|
| `<关键词>` | 搜索关键词（必需） |
| `--location` | 中心点坐标，格式"经度,纬度"（必需） |
| `--radius` | 搜索半径，单位米，默认1000（可选） |
| `--types` | POI类型（可选） |
| `--limit` | 结果数量，默认20，最大100（可选） |

**示例：**
```bash
node skill.js around "餐厅" --location "116.397,39.909" --radius 1000
```

### 4. around2 — 周边搜索 POI（v5）

```bash
node skill.js around2 --location "经度,纬度" --keywords "关键词" --radius 半径
```

| 参数 | 说明 |
|------|------|
| `--location` | 中心点坐标，格式"经度,纬度"（必需） |
| `--keywords` | 搜索关键词，多个用"\|"分隔（可选） |
| `--radius` | 搜索半径，单位米，最大50000，默认1000（可选） |
| `--types` | POI类型编码（可选） |
| `--sort` | 排序规则：distance（按距离）/ weight（综合排序）（可选） |
| `--region` | 搜索区划（可选） |
| `--fields` | 返回字段筛选（可选） |
| `--limit` | 每页数量，默认20，最大25（可选） |
| `--page` | 页码，1-100（可选） |

v5 版本支持按距离排序、更大搜索半径（最大 50km）、区域限制，返回结果包含省/市/区、类型编码、距离等。但每页最多 25 条。

**示例：**
```bash
node skill.js around2 --location "121.471,31.336" --keywords "加油站" --radius 3000
node skill.js around2 --location "116.397,39.909" --keywords "餐厅|咖啡" --sort distance --limit 10
```

### 5. geo — 地址转坐标

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

### 6. regeo — 坐标转地址

```bash
node skill.js regeo <经度> <纬度>
```

**示例：**
```bash
node skill.js regeo 116.397 39.909
```

### 7. ip — IP 定位

```bash
node skill.js ip <IP地址>
```

**示例：**
```bash
node skill.js ip 114.114.114.114
```

### 8. walk — 步行路线规划

```bash
node skill.js walk "起点坐标" "终点坐标"
```

坐标格式：`"经度,纬度"`

**示例：**
```bash
node skill.js walk "116.397,39.909" "116.398,39.918"
```

### 9. drive — 驾车路线规划

```bash
node skill.js drive "起点坐标" "终点坐标"
```

**示例：**
```bash
node skill.js drive "116.397,39.909" "116.460,39.920"
```

### 10. transit — 公交路线规划

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

### 11. locate — 验证地址真实性 + 生成 WAP URL

```bash
node skill.js locate "地址" --city 城市
```

| 参数 | 说明 |
|------|------|
| `<地址>` | 待验证的地址（必需） |
| `--city` | 城市名称（可选） |

验证地址是否存在于高德地图数据库，如果存在则返回坐标和高德地图 WAP URL，可在手机浏览器中打开并跳转到高德地图 App。

**示例：**
```bash
node skill.js locate "北京市朝阳区三里屯"
node skill.js locate "南京路步行街" --city 上海
```

**返回结果（地址真实）：**
```json
{
  "address": "北京市朝阳区三里屯",
  "verified": true,
  "longitude": 116.454118,
  "latitude": 39.935589,
  "formatted_address": "北京市朝阳区三里屯",
  "wap_url": "https://uri.amap.com/marker?position=116.454118,39.935589&name=..."
}
```

**返回结果（地址不真实）：**
```json
{
  "address": "不存在的地址",
  "verified": false,
  "message": "无法在高德地图中找到该地址，地址可能不存在或有误"
}
```

### 12. traffic — 圆形区域交通态势

```bash
node skill.js traffic "经度,纬度" --radius 半径 --level 等级 --extensions 模式
```

| 参数 | 说明 |
|------|------|
| `<经度,纬度>` | 中心点坐标（必需） |
| `--radius` | 搜索半径，单位米，最大5000，默认1500（可选） |
| `--level` | 道路等级1-6（可选） |
| `--extensions` | 返回模式：base（默认）或 all（含道路详情）（可选） |

**示例：**
```bash
node skill.js traffic "116.305,39.986" --radius 1500
node skill.js traffic "116.305,39.986" --radius 3000 --level 4 --extensions all
```

### 13. trect — 矩形区域交通态势

```bash
node skill.js trect "左下经度,左下纬度;右上经度,右上纬度" --level 等级 --extensions 模式
```

| 参数 | 说明 |
|------|------|
| `<矩形坐标>` | 左下和右上顶点坐标对，用";"分隔，对角线不超过10公里（必需） |
| `--level` | 道路等级1-6（可选） |
| `--extensions` | 返回模式：base（默认）或 all（含道路详情）（可选） |

**示例：**
```bash
node skill.js trect "116.351,39.966;116.357,39.969"
node skill.js trect "116.351,39.966;116.357,39.969" --extensions all
```

### 14. troad — 指定线路交通态势

```bash
node skill.js troad "道路名称" --city 城市 --level 等级 --extensions 模式
```

| 参数 | 说明 |
|------|------|
| `<道路名称>` | 道路名称（必需） |
| `--city` | 城市名称（可选，建议使用） |
| `--adcode` | 城市编码（可选，比city更准确） |
| `--level` | 道路等级1-6（可选） |
| `--extensions` | 返回模式：base（默认）或 all（含道路详情）（可选） |

**示例：**
```bash
node skill.js troad "北环大道" --city 深圳
node skill.js troad "长安街" --city 北京 --extensions all
```

**交通态势返回结果（traffic/trect/troad 通用）：**
- `description` — 路况综述
- `evaluation` — 路况评价（含畅通/拥堵/严重拥堵比例）
- `roads` — 道路详情（仅 `--extensions all` 时返回）

---

## v3 与 v5 POI 搜索对比

| 特性 | search/around (v3) | search2/around2 (v5) |
|------|-------------------|---------------------|
| 每页最大数量 | 100 | 25 |
| 区域严格限制 | 无 | `--city_limit` |
| 排序规则 | 无 | `--sort` distance/weight |
| 最大搜索半径 | 无限制 | 50000 米 |
| 返回省/市/区 | 无 | `pname`/`cityname`/`adname` |
| 类型编码 | 无 | `typecode` |
| 字段筛选 | 无 | `--fields` |

**选择建议：** 需要大批量数据用 v3，需要精确筛选/排序/区域限制用 v5。

---

## 典型工作流

1. 用 `search`/`search2` 关键词搜索 POI，或用 `around`/`around2` 周边搜索
2. 用 `geo`/`regeo` 进行地址和坐标的互相转换
3. 用 `locate` 验证地址真实性并获取 WAP URL
4. 用 `walk`/`drive`/`transit` 规划路线
5. 用 `traffic`/`trect`/`troad` 查询交通路况

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

### Q: search 和 search2 该用哪个？

**A:** 需要一次获取大量数据（最多 100 条）用 `search`；需要区域严格限制、类型筛选、字段控制用 `search2`。周边搜索同理。

### Q: 支持哪些路线规划方式？

**A:** 支持步行（walk）、驾车（drive）、公交（transit）三种方式。

### Q: locate 命令的 WAP URL 怎么用？

**A:** 在手机浏览器中打开 `wap_url`，会自动跳转到高德地图 App 并定位到该地址。
