---
name: brz-repair-manual-query
description: 搜索斯巴鲁 BRZ 维修手册（含电路图）。当用户需要查询汽车维修步骤、零件拆卸安装、电路系统、故障诊断等信息时使用此 skill。用户提供手册 URL 和关键词即可搜索。
version: 260603.160000
---

# BRZ 维修手册查询

通过 curl 搜索斯巴鲁 BRZ 静态维修手册，获取详细的维修步骤、电路图、故障诊断等信息。

## 参数

用户需提供 2 个参数：

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `url` | 是 | 维修手册的 `index.html` 完整 URL | `https://example.com/.../contents/index.html` |
| `keyword` | 是 | 搜索关键词（中文/英文均可，支持零件名、操作名、分类名） | `飞轮`、`制动`、`离合器` |

## 工作流程

### 第一步：从 URL 推导数据路径

从用户提供的 `url`（index.html）推导出 `contents/` 目录的基础路径：

```
url  = {用户提供的手册 index.html 完整 URL}
base = {去掉末尾 index.html，得到 contents/ 目录路径}
```

### 第二步：下载并解析搜索索引

索引文件位于 `{base}resources/lookupjson.js`，格式为：

```javascript
var lookupjson = [{...}, {...}, ...];
```

**解析命令**（去除 UTF-8 BOM 和 JS 赋值语句）：

```bash
curl -sL --max-time 60 "{base}resources/lookupjson.js" -o /tmp/lookupjson.js
tail -c +4 /tmp/lookupjson.js | sed 's/^var lookupjson = //' | sed 's/;$//'
```

处理后得到纯 JSON 数组，每条记录结构：

```json
{
  "id": "s504250a18",
  "si": "拆卸",
  "sicat": "离合器系统",
  "sigroup": "飞轮",
  "sisec": "变速器/驱动桥",
  "sigroupid": "s504250",
  "sicatid": "s504",
  "siid": "1921337"
}
```

### 第三步：按关键词搜索

使用 python3 过滤匹配的记录，在所有文本字段中搜索关键词：

```bash
tail -c +4 /tmp/lookupjson.js | sed 's/^var lookupjson = //' | sed 's/;$//' | \
  python3 -c "
import json, sys
data = json.loads(sys.stdin.read())
keyword = 'KEYWORD'  # 替换为用户的关键词
results = []
for item in data:
    text = json.dumps(item, ensure_ascii=False)
    if keyword in text:
        results.append(item)
# 按分类分组输出
groups = {}
for r in results:
    key = f\"{r['sicat']} > {r['sigroup']}\"
    groups.setdefault(key, []).append(r)
for g, items in groups.items():
    print(f'## {g}')
    for i in items:
        print(f\"  - {i['si']}  (id: {i['id']})\")
    print()
"
```

### 第四步：获取具体页面内容

搜索结果中的 `id` 字段用于构建内容页 URL。规则如下：

```
内容页 URL = {base}data/{id前4位}/{id}.html
```

例如 `id = s504250a18`：

```
{base}data/s504/s504250a18.html
```

获取并分析页面内容：

```bash
curl -sL --max-time 60 "{base}data/{prefix}/{id}.html"
```

内容页面为 HTML，包含：
- **标题路径**：`<div class="titlepath">离合器系统 > 飞轮</div>`
- **操作标题**：`<div class="title">拆卸</div>`
- **图标提示**：`<div class="pictogram">` （如：使用 SST、举升作业、请勿重复使用）
- **步骤内容**：`<div class="step1">` 每个步骤包含编号和说明文字
- **交叉引用**：`<a class="xref" href="#s504252a18">` 链接到相关操作
- **注意事项**：`<div class="attn">` 包含警告和注意说明
- **图片引用**：`<img src="...">` 步骤配图

### 第五步：整理输出

将获取到的内容整理为清晰的维修步骤，包括：

1. **概要**：分类 > 零件组 > 操作名称
2. **图标提示**：需要的工具和注意事项
3. **步骤列表**：按编号列出每个步骤的文字说明
4. **相关链接**：列出交叉引用的其他维修项目
5. **图片信息**：说明有哪些配图（无需下载图片）

## 搜索技巧

- 支持模糊搜索：`制动` 会匹配「制动系统」「制动缸」等
- 按分类精确搜索：`keyword=sicat:离合器系统` 仅匹配分类名
- 按大类搜索：`keyword=sisec:发动机` 仅匹配大类
- 按操作搜索：`keyword=拆卸` 或 `keyword=安装` 或 `keyword=检查`

## 数据统计

| 项目 | 数量 |
|------|------|
| 总条目 | ~3300 |
| 索引文件大小 | ~1.8MB |
| 维修大类 | ~10 个 |

### 维修大类一览

| 大类 | 说明 |
|------|------|
| 诊断 | 故障诊断流程 |
| 车身 & 电气/电路系统 | 电路、线束、电气元件 |
| 发动机 | 发动机机械、燃油、冷却 |
| 变速器/驱动桥 | 手动/自动变速箱、离合器 |
| 制动系统 | 制动器、ABS、制动液 |
| 加热器 & 空调/通风设备 | 空调系统 |
| 悬架系统 | 悬架、弹簧、减震器 |
| 动力传动系统/轴 | 传动轴、差速器 |
| 辅助约束系统 | 安全气囊、安全带 |
| 转向系统 | 转向机、方向盘 |

## 注意事项

- 索引文件有 UTF-8 BOM（`EF BB BF`），解析前需用 `tail -c +4` 去除
- 内容页面也有 BOM，解析时同样需要处理
- 所有数据为纯静态文件，无需认证，直接 curl 即可
- 搜索结果中的 `id` 字段长度为 10 个字符（如 `s504250a18`），前 4 位作为目录名
- 内容页中的图片路径为相对路径，如需查看需拼接完整 URL
