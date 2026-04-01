# Get My IP

查询本机公网 IP 地址及详细信息的命令行工具。

## 功能特点

- 查询公网 IP 地址
- 获取地理位置（省/市）
- 显示 ISP 运营商信息
- 多种输出格式（默认表格、JSON、简洁）
- 无需安装依赖，开箱即用
- 基于 [cip.cc](http://www.cip.cc) 免费服务

## 安装与使用

### 开发环境

```bash
# 安装依赖
pnpm install

# 运行
node run.js

# 构建独立脚本
npm run build
```

### 使用打包后的脚本

```bash
# 基本查询（表格格式）
node skill.js

# JSON 格式
node skill.js --json

# 仅显示 IP
node skill.js --simple

# 显示原始数据
node skill.js --raw
```

## 输出示例

### 默认格式

```
IP      : 203.0.113.1
地址    : 中国 上海 上海
运营商  : 电信

数据二  : 中国上海上海 | 电信
数据三  : 中国上海上海市 | 电信

URL     : http://www.cip.cc/203.0.113.1
```

### JSON 格式

```json
{
  "ip": "203.0.113.1",
  "address": "中国 上海 上海",
  "isp": "电信",
  "data2": "中国上海上海 | 电信",
  "data3": "中国上海上海市 | 电信",
  "url": "http://www.cip.cc/203.0.113.1"
}
```

### 简洁格式

```
203.0.113.1
```

## 命令行选项

| 选项 | 说明 |
|------|------|
| `--json` | 以 JSON 格式输出 |
| `--simple` | 仅输出 IP 地址 |
| `--raw` | 显示原始响应内容 |

## 环境要求

- Node.js 18 或更高版本
- 需要访问互联网

## 使用场景

- 查询当前公网 IP
- 获取 IP 地理位置
- 确认网络运营商
- 调试网络连接
- 验证代理/VPN 效果

## 项目结构

```
get_my_ip/
├── SKILL.md      # 技能定义（LLM 使用）
├── CLAUDE.md     # AI 开发助手指引
├── README.md     # 本文件
├── package.json  # 依赖配置
├── build.js      # 打包脚本
├── run.js        # 主入口文件
└── skill.js      # 打包后的独立文件
```

## 技术实现

- 使用 Node.js 18+ 内置的 `fetch` API
- 无需额外运行时依赖
- 支持 ANSI 颜色输出
- 使用 esbuild 打包为独立文件

## 常见问题

**Q: 为什么显示的 IP 和路由器配置不同？**
A: 本工具查询的是公网 IP，路由器显示的是内网 IP（如 192.168.x.x）

**Q: 如何在脚本中使用？**
A: 使用 `--json` 或 `--simple` 选项便于解析

**Q: 数据准确性如何？**
A: 数据来自 cip.cc，一般用于参考，精确位置需要专业服务
