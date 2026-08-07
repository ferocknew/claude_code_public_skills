---
name: nexus3-skill
description: 当用户要求"查询 Nexus3"、"操作 Nexus 私服"、"列出仓库组件"、"删除 docker 镜像指定 tag"、"删除 npm/pypi/maven 组件"、"清理 Nexus3 仓库组件"、"批量删除旧版本"时使用此 skill。通过 REST API（Basic Auth）操作 Nexus3，所有删除默认预览、--yes 才真正执行。
skill_version: 260807.214209
---

# Nexus3 REST API 工具

用 Node.js `fetch` 通过 Nexus3 REST API（`/service/rest/v1/`，Basic Auth）操作私服：
**查询**仓库/组件/资产，**删除**指定 docker 镜像 tag，或删除 npm / pypi / maven / raw 等格式的组件。

> 所有删除命令默认「预览模式（dry-run）」，先列出将删除的内容；确认无误后加 `--yes` 才真正执行，避免误删。

---

## 配置

支持环境变量或本 skill 同目录下的 `.env` 文件（参考 `.env.example`，`.env` 已被 gitignore 不会提交）：

```bash
export NEXUS_URL="https://your-nexus.example.com"
export NEXUS_USERNAME="admin"
export NEXUS_PASSWORD="your-password"
```

```
NEXUS_URL=https://your-nexus.example.com
NEXUS_USERNAME=admin
NEXUS_PASSWORD=your-password
# 自签名证书跳过 TLS 校验（默认严格校验）：
# NEXUS_REJECT_UNAUTHORIZED=false
```

---

## 三大核心场景

### 1️⃣ 删除 docker 镜像指定 tag

```bash
# 先列出该镜像的所有 tag，确认 tag 名
node skill.js docker tags --repo docker-hosted --image nginx

# 预览将删除的内容（默认 dry-run）
node skill.js docker rm --repo docker-hosted --image nginx --tag 1.21

# 确认无误，加 --yes 真正删除
node skill.js docker rm --repo docker-hosted --image nginx --tag 1.21 --yes

# 一次删除多个 tag（逗号分隔）
node skill.js docker rm --repo docker-hosted --image nginx --tag 1.21,1.20 --yes

# 删除该镜像的全部 tag
node skill.js docker rm --repo docker-hosted --image nginx --all-tags --yes
```

### 2️⃣ 删除 npm 组件

```bash
# 删除指定版本的 npm 包（@scope 用 --group）
node skill.js components delete --repo npm-hosted --name lodash --version 4.17.21 --yes
node skill.js components delete --repo npm-hosted --group @myorg --name core --version 1.0.0 --yes

# 不指定 --version 会命中所有版本 → 先预览，确认后 --yes 批量删
node skill.js components delete --repo npm-hosted --name lodash
node skill.js components delete --repo npm-hosted --name lodash --yes
```

### 3️⃣ 删除 pypi / maven / raw 组件

```bash
# pypi
node skill.js components delete --repo pypi-hosted --name requests --version 2.28.0 --yes

# maven2（group=groupId, name=artifactId, version=版本）
node skill.js components delete --repo maven-releases --group com.example --name common --version 1.2.3 --yes

# raw
node skill.js components delete --repo raw-hosted --name myfile --version 1.0 --yes
```

---

## 主要 API 查询

```bash
# 服务器状态 / 健康检查
node skill.js status
node skill.js status check

# 列出所有仓库（可按格式过滤）
node skill.js repos list
node skill.js repos list --format docker

# 列出仓库组件（分页，--limit 控制上限）
node skill.js components list --repo docker-hosted --limit 20

# 搜索组件（name/version/group 组合过滤）
node skill.js components search --repo npm-hosted --name lodash
node skill.js components search --repo docker-hosted --name nginx --version 1.21

# 组件详情（含 assets 列表，需先拿到 id）
node skill.js components get --id <component-id>

# 列出资产
node skill.js assets list --repo npm-hosted --limit 20
```

---

## 命令总表

| 命令 | 说明 |
|------|------|
| `status [info\|check]` | 服务器状态 / 健康检查 |
| `repos list [--format <fmt>]` | 列出所有仓库 |
| `components list --repo <r> [--limit n]` | 列出仓库组件 |
| `components search --repo <r> --name <n> [-v ver] [-g g]` | 搜索组件 |
| `components get --id <id>` | 组件详情 |
| `components delete --repo <r> --name <n> [-v ver] [-g g]` | **删除组件**（npm/pypi/maven/raw/docker 通用） |
| `components delete --id <id>` | 按 id 删除组件 |
| `docker rm --repo <r> --image <m> --tag <t>` | **删除 docker 镜像指定 tag** |
| `docker rm --repo <r> --image <m> --all-tags` | 删除 docker 镜像全部 tag |
| `docker tags --repo <r> --image <m>` | 列出镜像所有 tag |
| `assets list --repo <r> [--limit n]` | 列出资产 |
| `assets delete --id <id>` | 删除资产 |

---

## 选项

| 选项 | 说明 |
|------|------|
| `--repo, -r <name>` | 仓库名 |
| `--name, -n <name>` | 组件/镜像/包名 |
| `--image <name>` | docker 镜像名（等同 `--name`） |
| `--tag <t>` | docker tag（逗号分隔可多个） |
| `--version, -v <ver>` | 版本（npm/pypi 版本 / docker tag / maven 版本） |
| `--group, -g <g>` | 分组（npm scope / maven groupId） |
| `--id <id>` | 直接指定 component/asset id |
| `--format <fmt>` | 仓库格式过滤：docker/npm/pypi/maven2/raw/nuget...（`repos list`） |
| `--limit <n>` | 分页上限（默认 50） |
| `--yes, -y` | **真正执行删除**（默认预览） |
| `--all-tags, --all` | 删除 docker 镜像全部 tag |
| `--raw` | 输出原始完整 JSON（不做字段精简） |

---

## ⚠️ 删除注意事项（重要）

**删除机制**：Nexus3 中每个「组件（component）」由若干「资产（asset）」组成。所有格式的删除统一走
`DELETE /service/rest/v1/components/{id}`，会连同关联资产一并删除。本 skill 的删除流程：
`search（按 repo+name+version 定位）→ 拿到 component id → DELETE`。

**docker 删除前提**：
- docker（hosted）仓库需在 Nexus 管理界面开启 **Blob Store 的「Delete Enabled」**，否则 blob 物理文件不会被回收（组件记录会被删除，但磁盘空间不释放）。
- 大批量清理建议配合 Nexus 的 **Cleanup Policies + Compact Task**，而非逐个删。

**已知坑（sonatype/nexus-public #549）**：删除 docker tag 后，Web UI 偶尔会残留一个空文件夹（tag 名），
但 `docker pull` 已不可用（tag 实际已删）。该空文件夹会在**下一次删除操作时自动清理**，不影响功能。

---

## FAQ

**Q: 删除命令没加 `--yes` 会怎样？**
A: 进入预览模式，只列出将要删除的组件（含 id/name/version），不执行任何删除。确认后补 `--yes` 再跑。

**Q: 为什么 docker rm 找不到镜像？**
A: ①确认 `--repo` 是 docker（hosted）仓库名而非 group 仓库；②`--image` 是镜像名（不含 registry 域名和 tag）；
③先用 `docker tags --repo <r> --image <m>` 看实际存在的 tag。

**Q: pypi/npm 删除报 403？**
A: 账号需有对应仓库的删除权限（管理员或分配了 delete 权限的角色）。

**Q: 自签名证书连不上？**
A: `.env` 设 `NEXUS_REJECT_UNAUTHORIZED=false`（作用于整个进程，仅调试用）。
