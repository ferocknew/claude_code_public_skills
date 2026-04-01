# CMO Weather Query

中央气象台天气信息查询工具

## 功能特性

- 支持全国城市天气查询
- 实时天气数据
- 天气预报
- 气象预警信息

## 安装

```bash
cd cmo-weather-query
pnpm install
npm run build
```

## 使用方法

```bash
# 查询城市实时天气
node skill.js <城市名称>

# 查询天气预报
node skill.js <城市名称> --forecast

# 查询天气预警
node skill.js --alert

# 显示帮助
node skill.js --help
```

## 示例

```bash
# 查询北京天气
node skill.js 北京

# 查询上海天气预报
node skill.js 上海 --forecast

# 查看天气预警
node skill.js --alert
```

## 数据来源

中央气象台官方数据接口

## 开发

```bash
# 安装依赖
pnpm install

# 构建独立脚本
npm run build

# 运行
node skill.js [参数]
```
