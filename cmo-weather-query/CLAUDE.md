# CMO Weather Query - AI 开发指引

## 项目概述

中央气象台天气信息查询工具，通过官方数据接口获取天气信息。

## 技术架构

### 数据来源
- 中央气象台官方 XML 接口
- 全国天气数据：http://flash.weather.com.cn/wmaps/xml/china.xml

### 核心功能模块

1. **数据获取模块**
   - XML 数据解析
   - 城市/省份映射
   - 接口请求处理

2. **命令行接口**
   - 城市天气查询
   - 天气预报显示
   - 预警信息查询

3. **数据展示**
   - 格式化输出
   - 表格展示
   - 颜色高亮

## 开发规范

### 文件结构
- `run.js` - 源代码入口
- `skill.js` - 打包后的独立文件
- `build.js` - 构建脚本
- `package.json` - 依赖配置

### 构建流程
1. 使用 esbuild 打包所有依赖
2. 自动生成时间戳版本号（YYMMDD.HHmmSS）
3. 更新 SKILL.md 中的版本号

### 代码规范
- 使用 Node.js 原生 fetch API（如果需要 HTTP 请求）
- 错误处理要友好
- 输出格式要清晰易读

## 接口说明

### 中央气象台 XML 接口

**全国天气根节点**
```
http://flash.weather.com.cn/wmaps/xml/china.xml
```

**省/直辖市天气**
- 北京: beijing.xml
- 上海: shanghai.xml
- 格式: http://flash.weather.com.cn/wmaps/xml/{city}.xml

### XML 数据结构

```xml
<china dn="中国" top="北京">
  <city dn="北京" pyname="beijing" ...>
    <weather temperature="25" ... />
  </city>
</china>
```

## 开发任务

### 待实现功能

- [ ] 解析 XML 数据
- [ ] 城市搜索功能
- [ ] 实时天气显示
- [ ] 天气预报展示
- [ ] 预警信息查询
- [ ] 错误处理优化
- [ ] 输出格式美化

### 扩展功能

- [ ] 台风路径查询
- [ ] 空气质量指数
- [ ] 历史天气查询
- [ ] 多城市批量查询

## 测试

```bash
# 测试基本功能
node skill.js 北京
node skill.js 上海 --forecast
node skill.js --alert
```
