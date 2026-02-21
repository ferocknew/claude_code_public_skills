# Sessions 目录

本目录用于存储 MCP (Model Context Protocol) 服务器的会话配置信息。

## 目录用途

每个 `.json` 文件代表一个 MCP 服务器的配置，包含：
- 服务器基本信息（名称、版本、URL）
- 认证方式（Bearer Token、API Key 等）
- 传输协议（HTTP REST API、SSE 等）
- 可用工具列表及其参数说明

## 文件格式

```json
{
  "server": "服务器名称",
  "version": "版本号",
  "url": "https://server-url",
  "auth": {
    "type": "Bearer",
    "token": "your-token-here"
  },
  "transport": "HTTP REST API",
  "tools": [
    {
      "name": "工具名称",
      "endpoint": "API 端点",
      "description": "工具描述",
      "method": "HTTP 方法",
      "params": {
        "param1": "参数说明"
      }
    }
  ]
}
```

## 使用方式

### 1. 获取 MCP 工具列表

使用 `--mcp-tools` 选项自动获取工具列表：

```bash
# 从 mcp_list 配置获取
node ../skill.js get $(jq -r '.url' mcp_list/search.json) \
  -H "Authorization: Bearer $(jq -r '.headers.Authorization' mcp_list/search.json | awk '{print $2}')" \
  --mcp-tools

# 或直接指定 URL
node ../skill.js get https://mcp-server.com -b token --mcp-tools
```

### 2. 查看 MCP 服务器配置

```bash
cat sessions/searxng-mcp.json
cat sessions/memory-mcp.json
```

### 3. 调用 MCP 工具

```bash
# 根据配置文件中的信息调用工具
node ../skill.js post <endpoint> -H "Authorization: Bearer <token>" '<params>'

# 示例：Memory MCP - 创建实体
node ../skill.js post https://localhost:8086/tools/entities/create \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  '{"entities": [{"name": "测试", "entityType": "person", "observations": ["观察1"]}]}'
```

### 4. 添加新的 MCP 服务器

```bash
# 1. 创建配置文件
cat > mcp_list/new-server.json << EOF
{
  "headers": {
    "Authorization": "Bearer your-token"
  },
  "type": "http",
  "url": "https://mcp-server.com/mcp"
}
EOF

# 2. 获取服务器信息
node ../skill.js get https://mcp-server.com -H "Authorization: Bearer your-token" --mcp-tools

# 3. 创建 session 配置文件
# 将获取到的工具列表保存到 sessions/new-server.json
```

## 安全提示

- **不要**将包含真实 Token 的配置文件提交到 Git
- 建议使用环境变量存储敏感信息
- 可将 `mcp_list/*.json` 添加到 `.gitignore`
- session 文件中的 token 可以使用占位符（如 `YOUR_TOKEN_HERE`）
