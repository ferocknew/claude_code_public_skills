---
name: ssh2-node
description: 当用户要求"SSH 连接远程主机"、"远程执行命令"、"上传下载文件到服务器"、"SFTP 传输"、"建立 SSH 隧道"、"端口转发"、"跳板机访问内网数据库"、"生成 SSH 密钥"时使用此 skill。基于 ssh2 实现，零依赖打包（node skill.js 直接可用，无需 npm install）。
version: 261005.101507
---

# SSH 客户端工具（ssh2-node）

基于 `ssh2` 的 SSH/SFTP/隧道客户端，**已打包为单文件，无需 npm install**。

## 快速开始

```bash
# 执行单条远程命令
node skill.js exec "uname -a" --ssh host:1.2.3.4,user:root,password:xxx

# 上传目录（递归）
node skill.js sftp put ./dist /var/www/html --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

# 建立隧道（跳板机访问内网 MySQL）
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 --ssh host:1.2.3.4,user:root,password:xxx
```

## 命令总表

| 命令 | 用途 | 关键参数 |
|------|------|----------|
| `exec <命令>` | 执行单条远程命令 | `--cwd` `--pty` `--timeout` |
| `shell <cmd1> [cmd2]` | 同一连接执行多条命令 | `--keep-going` `--cwd` `--pty` |
| `sftp put <本地> <远程>` | 上传文件或目录（递归） | 无 |
| `sftp get <远程> <本地>` | 下载文件或目录（递归） | 无 |
| `sftp ls <目录>` | 列出目录 | 无 |
| `sftp mkdir <目录>` | 递归创建远程目录 | 无 |
| `sftp rm <路径>` | 删除远程文件 | 无 |
| `sftp stat <路径>` | 查看远程文件属性 | 无 |
| `tunnel` | 端口转发 | `--local` `--remote-host` `--remote-port` `--run` |
| `keygen` | 生成本地密钥对 | `--type` `--out` `--bits` `--passphrase` `--force` |

## SSH 连接参数（`--ssh`，所有命令通用）

格式为逗号分隔的 `key:value`：

| 字段 | 说明 | 必需 |
|------|------|------|
| `host` | 主机地址 | 是 |
| `user` | 用户名 | 是 |
| `port` | SSH 端口（默认 22） | 否 |
| `password` | 密码认证 | 二选一 |
| `key` | 私钥文件路径 | 二选一 |
| `passphrase` | 私钥口令（加密私钥必需） | 否 |
| `timeout` | 连接超时毫秒（默认 20000） | 否 |
| `trykeyboardinteractive` | 启用 keyboard-interactive 认证 | 否 |

```bash
# 密码认证
--ssh host:1.2.3.4,user:root,password:mypass

# 私钥认证
--ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

# 加密私钥（必须带 passphrase，否则报认证失败）
--ssh host:1.2.3.4,user:root,key:~/.ssh/deploy_key,passphrase:keypass

# 非标准端口
--ssh host:1.2.3.4,port:2222,user:root,password:mypass
```

也支持环境变量作为默认值：`SSH_HOST`、`SSH_USER`、`SSH_PORT`、`SSH_PASSWORD`、`SSH_KEY`、`SSH_PASSPHRASE`、`SSH_TIMEOUT`。

## 输出格式

**所有命令输出 JSON 到 stdout，错误输出 JSON 到 stderr**，便于程序与 LLM 解析。

```bash
# exec 输出
{
  "command": "uname -a",
  "host": "1.2.3.4",
  "stdout": "Linux host 5.15.0\n",
  "stderr": "",
  "code": 0,
  "signal": null
}

# 错误输出（stderr）
{"error": "执行远程命令失败", "message": "All configured authentication methods failed", "hint": "认证失败：确认用户名/密码正确；..."}
```

**退出码**：远程命令返回非零时，本工具也以该退出码退出（`0` 成功）。所以可以用 `&&` 串联。

## 典型用法

### 1. 执行命令并按工作目录

```bash
# 在 /var/log 下执行
node skill.js exec "ls -la" --cwd /var/log --ssh host:1.2.3.4,user:root,password:xxx
```

### 2. 需要伪终端的命令（sudo / screen / tmux）

```bash
node skill.js exec "sudo systemctl restart nginx" --pty --ssh host:1.2.3.4,user:root,password:xxx
```

不加 `--pty` 时，`sudo` 可能因无 TTY 而拒绝或卡住。

### 3. 部署流程（多条命令，遇错即停）

```bash
node skill.js shell \
  "cd /app && git pull origin main" \
  "npm install --production" \
  "pm2 reload app --update-env" \
  --ssh host:1.2.3.4,user:deploy,key:~/.ssh/deploy
```

默认遇错即停；加 `--keep-going` 则继续执行剩余命令。

### 4. 上传构建产物

```bash
node skill.js sftp put ./dist /var/www/html --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519
```

目标是目录时会递归上传；目录不存在会自动创建。

### 5. 通过跳板机访问内网服务

```bash
# 前台运行，Ctrl+C 退出
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \
  --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

# 另开终端即可连接
mysql -h 127.0.0.1 -P 13306 -u dbuser -p
```

配合 `--run` 可让隧道随本地命令生命周期自动关闭：

```bash
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \
  --run "mysql -h 127.0.0.1 -P 13306 -u dbuser -psecret -e 'show databases'" \
  --ssh host:1.2.3.4,user:root,password:xxx
```

### 6. 生成密钥并部署公钥

```bash
node skill.js keygen --type ed25519 --out ~/.ssh/deploy_key --comment "deploy"
node skill.js exec "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" \
  --ssh host:1.2.3.4,user:root,password:xxx
# 再把 ~/.ssh/deploy_key.pub 内容追加进 authorized_keys
```

## 选项

| 选项 | 适用命令 | 说明 |
|------|----------|------|
| `--ssh <参数>` | 全部（keygen 除外） | SSH 连接参数 |
| `--cwd <目录>` | exec / shell | 执行前切换到该远程目录 |
| `--pty` | exec / shell | 分配伪终端 |
| `--timeout <毫秒>` | exec / shell | 单条命令执行超时 |
| `--keep-going` | shell | 某条命令失败后继续执行剩余命令 |
| `--local <端口>` | tunnel | 本地监听端口 |
| `--remote-host <主机>` | tunnel | 目标主机（从 SSH 服务器视角） |
| `--remote-port <端口>` | tunnel | 目标端口 |
| `--run <命令>` | tunnel | 隧道就绪后执行本地命令，结束后关闭隧道 |
| `--type <类型>` | keygen | ed25519 / ecdsa / rsa（默认 ed25519） |
| `--out <路径>` | keygen | 私钥输出路径（默认 ~/.ssh/id_<type>） |
| `--bits <位数>` | keygen | RSA 位数（默认 4096） |
| `--passphrase <口令>` | keygen | 为私钥设置口令 |
| `--force` | keygen | 覆盖已存在的私钥 |
| `-h, --help` | 全部 | 显示帮助 |
| `-v, --version` | 全部 | 显示版本 |

## 环境变量

除上表的 SSH 变量外，还可用环境变量简化长命令：

```bash
export SSH_HOST=1.2.3.4
export SSH_USER=root
export SSH_PASSWORD=mypass
node skill.js exec "uname -a"
```

## FAQ

**Q: 报 `All configured authentication methods failed`？**
按顺序排查：1) 用户名/密码是否正确；2) 私钥是否加密——加密私钥必须传 `passphrase`；3) 部分服务器只允许 keyboard-interactive，加 `trykeyboardinteractive`，或改用密码认证。

**Q: `sudo` 命令卡住或报 "no tty present"？**
加 `--pty`。

**Q: 上传时报 `No such file`？**
先 `node skill.js sftp ls <目录>` 确认远程路径存在；`sftp put` 会自动创建目标目录，但如果目标路径被当成文件（已有同名文件）会失败。

**Q: Windows 上传路径报 `ENOENT: C:\tmp\...`？**
Git Bash 会把 `/tmp/xxx` 转换成 `C:\tmp\xxx`。本地路径请用 `./` 相对路径或完整 Windows 路径。

**Q: 隧道建好后连不上目标？**
`--remote-host` 是**从 SSH 服务器视角**解析的地址。若目标是服务器本机服务，用 `--remote-host 127.0.0.1`；若是内网其他机器，填其内网 IP。另外确认服务器允许 TCP 转发（`AllowTcpForwarding`）。

**Q: `exec` 和 `shell` 有什么区别？**
`exec` 执行单条命令；`shell` 在**同一次连接**内按顺序执行多条命令，省去反复建连的开销，并支持 `--keep-going`。

**Q: 需要交互式 Shell 或 X11 转发怎么办？**
本工具未实现交互式 shell（`invoke_shell`）和 X11 转发。交互式场景请直接用系统 `ssh`；如需用 `ssh2` 实现，可参考 `ssh2` 的 `shell()` 与 `x11()` API。

## 开发

```bash
pnpm install && pnpm run build   # run.js -> skill.js
node skill.js --help             # 验证
```

### 打包注意事项

`ssh2` 内含原生模块，`build.js` 中已配置以下 external（**缺一不可**，否则报 `No loader is configured for ".node" files`）：

```js
external: [
  "cpu-features",
  "./crypto/build/Release/sshcrypto.node",
  "./build/Release/sshcrypto.node",
  "../crypto/build/Release/sshcrypto.node",
  "../../crypto/build/Release/sshcrypto.node",
]
```

外部化后运行时 require 会失败，这是**预期行为**：`ssh2` 会自动回退到纯 JS 实现，功能不受影响（连接、exec、SFTP、密钥生成均已验证）。产物约 740 KB，零依赖可运行。
