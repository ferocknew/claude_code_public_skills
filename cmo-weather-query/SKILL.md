---
name: cmo-weather-query
description: 当用户需要"查询天气"、"天气预报"、"中央气象台"、"天气实况"、"气象信息"时使用此 skill。支持查询全国各城市的实时天气、天气预报、气象预警等信息。
version: 1.0.0
skill_version: 260526
---

# CMO Weather Query

中央气象台天气信息查询工具。

## 使用场景

当用户需要以下信息时使用此 skill：
- 查询实时天气
- 获取天气预报
- 查看气象预警信息
- 查询城市天气信息
- 台风路径、雨雪实况等气象数据

## 使用方法

```bash
# 查询城市实时天气
node skill.js <城市名称>

# 查询天气预报
node skill.js <城市名称> --forecast

# 查询天气预警
node skill.js --alert

# 更多功能
node skill.js --help
```

## 功能特性

- 支持全国城市天气查询
- 实时天气数据
- 天气预报
- 气象预警信息
- 台风、暴雨等特殊天气

## 数据来源

中央气象台官方数据接口
