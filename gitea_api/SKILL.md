---
name: gitea-api
description: 当用户要求"查询 Gitea"、"操作 Gitea"、"获取仓库信息"、"Gitea API"、"Gitea 包管理"、"查看容器镜像"时使用此 skill。
skill_version: 260603.100057
---

# Gitea REST API 工具

通过 REST API 与 Gitea 实例交互，支持系统信息、包管理等功能。

**官方 API 文档**：https://docs.gitea.com/api/
- 当前实例版本 1.26.x 的 API 参考：https://docs.gitea.com/api/1.26/
- 其他版本替换 URL 中的版本号即可，例如 1.22.x → https://docs.gitea.com/api/1.22/

---

## 配置

```bash
export GITEA_URL="https://your-gitea.example.com"
export GITEA_API_TOKEN="your-api-token"
```

也支持 skill 同目录下的 `.env` 文件：

```
GITEA_URL=https://your-gitea.example.com
GITEA_API_TOKEN=your-api-token
```

获取 Token：**Gitea > 设置 > 应用 > 管理 Access Token > 生成新令牌**

---

## 命令参考

### 系统信息

| 命令 | 说明 |
|------|------|
| `system version` | 获取 Gitea 版本 |

### 包管理（Packages）

| 命令 | 说明 |
|------|------|
| `packages list` | 列出所有用户的包（遍历所有 owner） |
| `packages list --owner <name>` | 列出指定 owner 的包 |
| `packages list --type container` | 按类型过滤（container / npm / maven / pypi / nuget / cargo / composer / conan / conda / cran / debian / rubygems / swift / vagrant / generic / helm / chef） |
| `packages list --limit <n>` | 每个 owner 最多返回 n 条（默认 50） |

---

## 选项

| 选项 | 说明 |
|------|------|
| `--format <type>` | 输出格式：json / yaml / table / default（默认 table） |
| `--help, -h` | 显示帮助 |

---

## 示例

```bash
# 查看版本
node skill.js system version

# 列出所有容器镜像
node skill.js packages list --type container

# 列出指定组织的包
node skill.js packages list --owner website

# JSON 格式输出
node skill.js packages list --type container --format json

# YAML 格式输出
node skill.js packages list --type container --format yaml --limit 5
```
