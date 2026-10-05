# ssh2-node

基于 [ssh2](https://github.com/mscdex/ssh2) 的 SSH 客户端工具，用于远程命令执行、SFTP 文件传输和端口转发。

**零依赖**：已打包为单个 `skill.js`，不需要 `npm install`，直接 `node skill.js` 即可使用。

## 为什么用它

相比系统 `ssh` / `scp` / `sshpass`：

| 能力 | ssh2-node | 系统 ssh 命令 |
|------|-----------|---------------|
| 密码认证免交互 | 原生支持 | 需 sshpass（Linux）或手工输密码 |
| 输出结构化 | JSON（便于程序处理） | 纯文本，需解析 |
| 端口转发 | 内置 `tunnel` 命令 | 需手写 `-L` 参数并管理进程 |
| 跨平台一致 | Windows / macOS / Linux 相同行为 | Windows 的 ssh 行为有差异 |
| 错误提示 | 中文可执行提示（`hint` 字段） | 英文原始报错 |

## 快速开始

```bash
# 1. 执行远程命令
node skill.js exec "uname -a" --ssh host:1.2.3.4,user:root,password:xxx

# 2. 上传文件
node skill.js sftp put ./dist /var/www/html --ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

# 3. 建立隧道
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \
  --ssh host:1.2.3.4,user:root,password:xxx
```

## 命令一览

| 命令 | 说明 |
|------|------|
| `exec <命令>` | 执行单条远程命令 |
| `shell <cmd1> [cmd2] ...` | 同一连接执行多条命令 |
| `sftp put/get/ls/mkdir/rm/stat` | 文件传输与远程文件操作 |
| `tunnel` | 端口转发（本地 → 远程可达目标） |
| `keygen` | 生成 SSH 密钥对 |

完整参数说明见 `SKILL.md` 或 `node skill.js --help`。

## 连接参数

统一通过 `--ssh` 传入，逗号分隔：

```bash
# 密码认证
--ssh host:1.2.3.4,user:root,password:mypass

# 私钥认证
--ssh host:1.2.3.4,user:root,key:~/.ssh/id_ed25519

# 加密私钥
--ssh host:1.2.3.4,user:root,key:~/.ssh/deploy,passphrase:keypass
```

也可用环境变量：`SSH_HOST`、`SSH_USER`、`SSH_PORT`、`SSH_PASSWORD`、`SSH_KEY`、`SSH_PASSPHRASE`。

## 输出与退出码

- 成功：JSON 到 stdout
- 失败：`{"error": "...", "message": "...", "hint": "..."}` 到 stderr
- 退出码：远程命令非零时沿用该退出码；参数错误为 2

```bash
node skill.js exec "test -f /etc/nginx/nginx.conf" --ssh ... && echo "文件存在"
```

## 常见场景

### 部署应用

```bash
node skill.js shell \
  "cd /app && git pull" \
  "npm install --production" \
  "pm2 reload app" \
  --ssh host:1.2.3.4,user:deploy,key:~/.ssh/deploy
```

### 通过跳板机连内网数据库

```bash
# 终端 1：建立隧道
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \
  --ssh host:1.2.3.4,user:root,password:xxx

# 终端 2：连接
mysql -h 127.0.0.1 -P 13306 -u dbuser -p
```

### 隧道随命令自动关闭

```bash
node skill.js tunnel --local 13306 --remote-host 192.0.2.10 --remote-port 3306 \
  --run "mysql -h 127.0.0.1 -P 13306 -u dbuser -psecret -e 'show databases'" \
  --ssh host:1.2.3.4,user:root,password:xxx
```

## 从源码构建

```bash
pnpm install
pnpm run build     # run.js -> skill.js
node skill.js --help
```

打包时 `ssh2` 的原生模块必须标记为 external，`build.js` 已配置好。产物约 740 KB，运行时自动回退到纯 JS 实现，功能不受影响。

## 已知限制

- 不支持交互式 shell 会话（请用系统 `ssh`）
- 不支持 X11 转发
- `sftp rm` 只删除文件，不递归删除目录
- 隧道仅支持本地转发，不支持远程转发

## 许可

MIT
