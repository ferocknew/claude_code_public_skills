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

## ⚠️ 容器包清理规则（极其重要）

**容器镜像的 tag 和 `sha256:...` manifest digest 是一一对应的关系，不可分离！**

- `sha256:...` 版本是容器的实际镜像 manifest digest，是镜像数据的本体
- tag（如 `latest`、`0.2.8`）只是指向 digest 的别名/引用
- 一个 tag 必然对应一个 sha256 digest，两者必须同时存在，镜像才能正常 pull

**查询 tag 与 digest 的对应关系：**
通过 Docker Registry v2 API 的 `Docker-Content-Digest` 响应头获取：
```bash
curl -s -D - -o /dev/null \
  -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  -H "Authorization: Bearer <token>" \
  "https://<gitea>/v2/<owner>/<name>/manifests/<tag>"
# 响应头: docker-content-digest: sha256:xxxx
```

**清理旧包的正确做法：**
1. 确认要删除的旧 tag（如 `0.2.3`）
2. 通过 v2 API 查询该 tag 对应的 sha256 digest
3. 删除 tag：`DELETE /api/v1/packages/{owner}/container/{name}/{tag}`
4. 删除对应的 digest：`DELETE /api/v1/packages/{owner}/container/{name}/sha256:{digest}`
5. **保留的 tag 及其对应的 sha256 digest 都不动**

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
