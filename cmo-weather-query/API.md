# 中央气象台 API 接口说明

## 接口列表

### 1. 全国天气数据接口
```
GET https://www.nmc.cn/dataservice/weather/map/ALL/day1.json
```

**返回数据结构**（每个城市数组）：
| 索引 | 字段 | 示例 |
|------|------|------|
| 0 | 城市名 | "北京" |
| 1 | 级别 | "0"/"1"/"2"/"3" |
| 2 | 经度 | 116.47 |
| 3 | 纬度 | 39.81 |
| 4 | 日期 | "2026-04-01" |
| 5 | 时间 | "2026-04-01 12:00" |
| 6 | 白天天气 | "多云" |
| 7 | 天气代码 | "0" |
| 8 | 温度 | "18" |
| 9 | 风向 | "南风" |
| 10 | 风力 | "微风" |
| 11 | 夜间天气 | "晴" |
| 12 | 夜间天气代码 | "0" |
| 13 | 夜间温度 | "4" |
| 14 | 夜间风向 | "南风" |
| 15 | 夜间风力 | "微风" |
| 16 | **省份代码** | "ABJ" |
| 17 | **城市代码** | "Wqsps" |
| 18 | URL | "/publish/forecast/ABJ/beijing.html" |

### 2. 省份城市列表接口
```
GET https://www.nmc.cn/rest/province/{省份代码}
```

**示例**：
- 上海（ASH）：`https://www.nmc.cn/rest/province/ASH`
- 湖北（AHB）：`https://www.nmc.cn/rest/province/AHB`
- 广东（AGD）：`https://www.nmc.cn/rest/province/AGD`

**返回数据结构**：
```json
[
  {
    "code": "WwcJd",      // 城市混淆码
    "province": "上海市",
    "city": "上海",
    "url": "/publish/forecast/ASH/shanghai.html"
  }
]
```

## 代码规律分析

### 省份代码（3位大写字母）
| 代码 | 省份 | 推测规律 |
|------|------|----------|
| ABJ | 北京 | A + BJ (Beijing) |
| ASH | 上海 | A + SH (Shanghai) |
| AGD | 广东 | A + GD (Guangdong) |
| AHB | 湖北 | A + HB (Hubei) |
| AHE | 河北 | A + HE (Hebei) |
| AJX | 江西 | A + JX (Jiangxi) |
| AZJ | 浙江 | A + ZJ (Zhejiang) |

**规律**: `A` + 省份拼音首字母/缩写

### 城市代码（5位混合大小写字母）
| 城市 | 代码 |
|------|------|
| 北京 | Wqsps |
| 上海 | WwcJd |
| 广州 | DwzZf |
| 徐家汇 | bwUMl |

**规律**: 无明显规律，疑似：
- 随机生成的混淆码（防止爬虫）
- 数据库主键的 Base62 编码
- 哈希值截取

## 使用建议

### 查询单个城市
使用 ALL 接口即可，无需城市代码：
```bash
curl 'https://www.nmc.cn/dataservice/weather/map/ALL/day1.json'
```

### 查询省份下所有城市
1. 先从 ALL 接口获取省份代码
2. 再调用省份接口：
```bash
curl 'https://www.nmc.cn/rest/province/ASH'
```

### 代码获取
- **省份代码**: 从 ALL 接口的索引 16 获取
- **城市代码**: 从 ALL 接口的索引 17 获取

## 省份代码列表（部分）

| 代码 | 省份 | 代码 | 省份 |
|------|------|------|------|
| ABJ | 北京 | ASH | 上海 |
| AGD | 广东 | AHB | 湖北 |
| AHE | 河北 | AHU | 河南 |
| AJX | 江西 | AQH | 青海 |
| ASC | 四川 | ASD | 山东 |
| ASF | 福建 | ASX | 山西 |
| AXZ | 西藏 | AYZ | 重庆 |

## 天气代码对照

| 代码 | 天气 | 代码 | 天气 |
|------|------|------|------|
| 0 | 晴 | 1 | 多云 |
| 2 | 阴 | 3 | 雨 |
| 7 | 小雨 | 14 | 小雪 |
| 6 | 雨夹雪 | - | - |

## 注意事项

1. **无需 Cookie**: 接口可直接访问，不需要 Cookie
2. **无需特殊 Header**: 使用默认 UA 即可
3. **更新频率**: 数据每小时更新一次
4. **城市数量**: ALL 接口包含约 2500+ 个城市
