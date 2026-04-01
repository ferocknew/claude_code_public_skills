---
name: where-is-this
description: 当用户需要"根据经纬度查地址"、"逆地理编码"、"坐标转地址"、"这是哪里"、"经纬度定位"时使用此 skill。输入经纬度坐标，返回对应的详细地址信息。
version: 1.0.0
skill_version: 260401
---

# Where Is This

根据经纬度查询地址的逆地理编码工具。

## 使用方法

```bash
node skill.js <纬度> <经度>
```

## 示例

```bash
node skill.js 39.9072 116.3913
# 📍 坐标: 39.9072, 116.3913
# 🏠 地址: 北京市西城区西长安街街道天安门西
```

## 数据来源

map.jiqrxx.com 逆地理编码服务
