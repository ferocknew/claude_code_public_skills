# CLAUDE.md

ssh2-node skill 开发指导。

## 概览

基于 `ssh2` 的 SSH 客户端 skill，Bundled 类型：`run.js`（开发）→ `skill.js`（产物，零依赖）。

## 目录结构

```
ssh2-node/
├── SKILL.md          # LLM 运行时参考（命令、选项、FAQ）
├── README.md         # 人类用户文档
├── CLAUDE.md         # 本文件
├── run.js            # 入口：命令分发 + help
├── build.js          # esbuild 打包（含 ssh2 external 配置）
├── package.json      # 依赖 ssh2，devDep esbuild
├── pnpm-workspace.yaml # allowBuilds：esbuild=true，cpu-features/ssh2=false
├── lib/
│   ├── parser.js     # 命令行参数解析
│   ├── errors.js     # 错误输出（JSON + hint）+ 退出码
│   ├── env.js        # --ssh 参数与环境变量 → ssh2 连接配置
│   ├── ssh.js        # ssh2 连接/exec/sftp 的 Promise 封装
│   └── cmd/
│       ├── index.js  # 统一导出
│       ├── exec.js   # exec 子命令
│       ├── shell.js  # shell 子命令（多命令共享连接）
│       ├── sftp.js   # sftp 子命令（put/get/ls/mkdir/rm/stat）
│       ├── tunnel.js # tunnel 子命令（forwardOut 端口转发）
│       └── keygen.js # keygen 子命令（本地生成密钥）
└── skill.js          # 打包产物（提交仓库）
```

## 关键实现点

### 1. ssh2 的回调式 API 需 Promise 化

`ssh2` 是事件回调式，`lib/ssh.js` 把所有操作包成 Promise：
- `connect()` → ready 事件 resolve
- `exec()` → close 事件 resolve，返回 `{stdout, stderr, code, signal}`
- `sftp()` → sftp 回调 resolve

### 2. 私钥读取时机

`resolveSshConfig` 只记录 `_privateKeyPath`，真正的 `fs.readFileSync` 在 `materializeConfig`（连接前）执行。这样参数校验阶段就能发现"缺认证信息"，而不会因为读文件失败干扰校验。

### 3. keyboard-interactive 处理

部分服务器只允许 keyboard-interactive。`connect()` 里监听该事件并用配置的密码回答第一个提示。注意 `tryKeyboard` 不是 ssh2 的配置项，真实机制是通过事件监听应答，`trykeyboardinteractive` 参数只是显式开启意图。

### 4. 输出协议

- 成功 → JSON 到 stdout
- 失败 → `{error, message, hint?}` JSON 到 stderr，退出码 1
- 参数错误 → 退出码 2
- 远程命令非零 → 沿用该退出码

`hint` 由 `lib/errors.js` 的 `buildHint()` 按错误消息正则匹配生成，是给 LLM 的排查线索，不要随意删除。

### 5. 打包的 external 配置（最重要）

`ssh2` 含原生模块，esbuild 必须 external，否则报 `No loader is configured for ".node" files`：

```js
external: [
  "cpu-features",
  "./crypto/build/Release/sshcrypto.node",
  "./build/Release/sshcrypto.node",
  "../crypto/build/Release/sshcrypto.node",
  "../../crypto/build/Release/sshcrypto.node",
]
```

**不要试图移除这些 external**。运行时 require 失败是设计内的：`ssh2/lib/protocol/crypto.js` 有 try/catch，失败即回退纯 JS 实现。已实测：打包产物在无 node_modules 目录下，exec / SFTP / keygen / 隧道监听全部正常。

### 6. pnpm allowBuilds

`pnpm-workspace.yaml` 中：
- `esbuild: true` —— 构建必需
- `cpu-features: false` / `ssh2: false` —— 禁止原生编译，避免依赖本机 C++ 工具链

本机曾缺 VC++ Redistributable，禁止这两个包的编译脚本可避免安装报错。

## 构建与验证

```bash
pnpm install
pnpm run build
node skill.js --version
node skill.js --help

# 零依赖验证：把 skill.js 拷到空目录
mkdir /tmp/verify && cp skill.js /tmp/verify/ && cd /tmp/verify && node skill.js --version
```

## 已知限制

- 未实现交互式 shell（`invoke_shell`）
- 未实现 X11 转发
- `sftp rm` 只删文件，不递归删目录
- `tunnel` 只支持本地转发（`forwardOut`），不支持远程转发（`forwardIn`）

## 隐私红线

仓库为公开仓库，SKILL.md / help / 代码中禁止硬编码真实 IP、密码、token、内网域名。示例统一用 `1.2.3.4`、`192.0.2.10`、`xxx`、`~/.ssh/id_ed25519` 占位。
