---
name: smb-client
description: 当用户要求"连接 SMB"、"访问 Windows 共享"、"查看 NAS 共享文件夹"、"下载/上传 SMB 文件"、"读取远程局域网共享"、"CIFS 文件管理"、"列出服务器共享列表"时使用此 skill。内置双引擎（系统 smbclient + 纯 JS 回退），单文件 skill.js 即开即用。
skill_version: 261104.142839
---

# SMB / CIFS 客户端工具 (smb-client)

连接 SMB/CIFS 共享并完成浏览、读取、下载、上传、目录管理等操作。内置双引擎：

1. **smbclient 引擎**：检测到系统已安装 `smbclient` 时优先使用；
2. **纯 JS 引擎**：未安装 CLI 或 CLI 执行失败且已提供 `share` 时自动回退，依赖已打包进 `skill.js`，无需 `npm install`。

## 快速开始

```bash
# 1. 测试连通性与认证（推荐用 smb:// URL）
node skill.js test --url "smb://username:your_password@smb.example.com/myshare"

# 2. 列出远程目录（--json 便于程序解析，--recursive 递归）
node skill.js ls "movies" --host smb.example.com --share myshare --user username --password your_password --json

# 3. 读取远程文件内容
node skill.js cat "docs/readme.txt" --smb "host:smb.example.com,share:myshare,user:username,password:your_password"

# 4. 下载 / 上传
node skill.js get "movies/intro.mp4" ./intro.mp4 --url "smb://username:your_password@smb.example.com/myshare"
node skill.js put ./report.pdf "docs/report.pdf" --url "smb://username:your_password@smb.example.com/myshare"

# 5. 列出服务器公开共享（需要 smbclient）
node skill.js shares --host smb.example.com --user username --password your_password --json
```

## 命令总表

| 命令 | 用途 | 关键参数 |
|---|---|---|
| `test [path]` | 测试连接与鉴权 | `--host`, `--share` 或 `--url` |
| `ls [remoteDir]` | 列出远程目录文件与大小 | `--json`, `--recursive` |
| `stat <remotePath>` | 查看文件/目录属性与类型 | `--json` |
| `cat <remoteFile>` | 读取远程文件内容输出 | `--max-bytes`, `--encoding` |
| `get <remote> <local>` | 下载文件到本地工作区 | 目标路径自动创建父目录 |
| `put <local> <remote>` | 上传本地文件到 SMB 共享 | 自动创建远程父目录 |
| `mkdir <remoteDir>` | 创建远程目录 | 自动递归创建多级目录 |
| `rm <remoteFile>` | 删除远程文件 | 无 |
| `rmdir <remoteDir>` | 删除远程空目录 | 无 |
| `rename <old> <new>` | 重命名或移动远程文件 | 无 |
| `shares` / `list-shares` | 列出服务器公开共享 | 需安装 `smbclient` |

## 选项

| 选项 | 说明 |
|---|---|
| `--json` | 以标准 JSON 输出结果，便于 LLM 与程序解析 |
| `--recursive` | `ls` 时递归列出子目录中的全部文件 |
| `--max-bytes <n>` | `cat` 最大读取字节数，默认 10MB |
| `--encoding <enc>` | 文本编码，默认 `utf8` |
| `--timeout <ms>` | smbclient 引擎单次执行超时，默认 30000 |
| `-v, --version` | 显示版本号 |
| `-h, --help` | 显示帮助 |

## 连接参数提供方式

优先级：命令行独立选项 > `--smb` 串 > `smb://` URL > 环境变量。

### 1. smb:// URL（最推荐）

```bash
node skill.js ls "movies" --url "smb://username:your_password@smb.example.com/myshare"
```

### 2. 紧凑参数串 (`--smb`)

```bash
node skill.js ls --smb "host:smb.example.com,share:myshare,user:username,password:your_password,domain:WORKGROUP"
```

### 3. 独立参数

```bash
node skill.js ls --host smb.example.com --share myshare --user username --password your_password --domain WORKGROUP --port 445
```

### 4. 环境变量

| 变量 | 说明 | 默认值 |
|---|---|---|
| `SMB_HOST` | 服务器地址 | 空 |
| `SMB_SHARE` | 共享名称 | 空 |
| `SMB_USER` | 用户名 | `guest` |
| `SMB_PASSWORD` | 密码 | 空 |
| `SMB_DOMAIN` | 域或工作组 | `WORKGROUP` |
| `SMB_PORT` | 端口 | `445` |

```bash
export SMB_HOST=smb.example.com
export SMB_SHARE=myshare
export SMB_USER=username
export SMB_PASSWORD=your_password
node skill.js ls
```

## 引擎选择与输出

- 每条输出均带 `engine` 字段：`smbclient` 或 `js`。
- `shares` / `list-shares` 依赖 `smbclient`；纯 JS 引擎无法在未知 `share` 时枚举共享列表，会返回 `SMBCLIENT_REQUIRED` 错误并提示查看已挂载共享。
- 错误统一输出 `{ "success": false, "error": "...", "code": "..." }`，退出码 1。

```json
{
  "success": true,
  "engine": "js",
  "path": "/",
  "count": 2,
  "entries": [
    { "name": "movies", "path": "movies", "type": "directory", "size": null },
    { "name": "info.txt", "path": "info.txt", "type": "file", "size": 1024 }
  ]
}
```

## 常见问题

1. **连接超时 (ETIMEDOUT)**：确认目标主机与 445 端口可达（如 `nc -z -w 3 <host> 445`），检查防火墙与局域网路由。
2. **认证失败 (STATUS_LOGON_FAILURE)**：核对用户名密码；Windows 或 AD 域设备需带 `--domain`。
3. **共享不存在 (STATUS_BAD_NETWORK_NAME)**：`--share` 填共享名称（如 `video`），不是物理路径。
4. **`shares` 报 SMBCLIENT_REQUIRED**：安装 samba 客户端（如 `apt install smbclient`），或改用 `mount` / `net use` 查看已挂载共享。
5. **smbclient 引擎失败后自动回退**：stderr 会给出 `warning`，最终结果以 `engine: "js"` 标记。

## 第三方开源致谢

本工具内置打包了 [@marsaud/smb2](https://github.com/Node-SMB/marsaud-smb2) (MIT License)。
