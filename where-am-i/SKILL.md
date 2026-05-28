---
name: where-am-i
description: 当用户需要"查询公网 IP"、"查看本机公网地址"、"获取 IP 地理位置"、"查询 ISP 运营商"、"查看 IP 归属地"、"我在哪里"、"查询当前位置"时使用此 skill。
version: 1.0.0
skill_version: 260401.151719
---

# 查询当前位置和公网 IP 信息

本 skill 提供查询本机公网 IP 地址及详细信息的工具，基于 ipquery.io 服务，无需安装依赖。

## 概述

通过调用多个 API 获取：
- 公网 IP 地址（支持多服务自动故障转移）
- 地理位置（国家/地区/城市）
- ISP 运营商信息
- 时区和坐标信息
- ASN 信息

### API 服务

**IP 查询服务（按优先级自动轮换）：**
1. ifconfig.co
2. icanhazip.com
3. v4.ident.me
4. ipinfo.io/ip

**详细信息服务：**
- ipquery.io - 提供完整的地理位置和 ISP 信息

## 快速开始

```bash
# 基本查询
node skill.js

# JSON 格式输出
node skill.js --json

# 简洁格式（仅 IP）
node skill.js --simple

# 显示原始数据
node skill.js --raw
```

## 输出格式

### 默认格式（表格）

```
IP      : 203.0.113.1
地址    : 中国 Beijing Beijing
运营商  : China Telecom (Group)
国家    : China
城市    : Beijing
时区    : Asia/Shanghai
坐标    : 39.9042, 116.4074
ASN     : AS4812

URL     : https://api.ipquery.io/203.0.113.1
```

### JSON 格式

```json
{
  "ip": "203.0.113.1",
  "address": "中国 Beijing Beijing",
  "isp": "China Telecom (Group)",
  "country": "China",
  "region": "Beijing",
  "city": "Beijing",
  "timezone": "Asia/Shanghai",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "asn": "AS4812",
  "url": "https://api.ipquery.io/203.0.113.1"
}
```

### 简洁格式

```
203.0.113.1
```

## 选项说明

| 选项 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |
| `--simple` | 仅输出 IP 地址 |
| `--raw` | 显示原始响应内容 |

## 使用场景

- 查询当前公网 IP
- 获取 IP 地理位置
- 确认网络运营商
- 调试网络连接
- 验证代理/VPN 效果

## 数据来源

本工具使用多个免费 IP 查询服务：
- **ifconfig.co** - 主 IP 查询服务
- **icanhazip.com** - 备用 IP 查询服务
- **v4.ident.me** - 备用 IP 查询服务
- **ipinfo.io/ip** - 备用 IP 查询服务
- **ipquery.io** - 详细地理位置和 ISP 信息

## 环境要求

- Node.js 18 或更高版本
- 需要访问互联网

## 常见问题

**Q: 为什么显示的 IP 和路由器配置不同？**
A: 本工具查询的是公网 IP，路由器显示的是内网 IP（如 192.168.x.x）

**Q: 如何在脚本中使用？**
A: 使用 `--json` 或 `--simple` 选项便于解析

**Q: 数据准确性如何？**
A: 数据来自多个公共服务，一般用于参考，精确位置需要专业服务

**Q: 为什么一个服务失败后能自动切换？**
A: 工具内置了 4 个 IP 查询服务，会按优先级自动尝试，直到成功
