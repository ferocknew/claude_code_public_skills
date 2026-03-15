---
name: x_release_by_agent_browser
description: Publish tweets on X/Twitter using agent-browser automation. Requires Chrome 146+ with remote debugging, X.com account already logged in.
---

# X/Twitter 推文发布自动化

## 前置要求

### Chrome 浏览器配置
- **版本要求**: Chrome 146 或更高版本
- **启动调试模式**: Chrome 必须以远程调试模式启动

```bash
# macOS 启动 Chrome 调试模式
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# 或使用 Chromium
/Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222
```

### agent-browser 工具
- **安装方式**: 通过 pnpm 全局安装
- **验证安装**: 确保 `agent-browser` 命令可用

```bash
# 查看 agent-browser 路径
pnpm bin agent-browser

# 验证版本
agent-browser --version
```

### X.com 账号
- **状态**: 必须在 Chrome 中已登录 X.com (Twitter)
- **验证**: 访问 https://x.com/home 确认登录状态

## 核心工作流

### 1. 连接到已运行的 Chrome

使用 `--auto-connect` 参数连接到调试模式的 Chrome：

```bash
# 列出所有标签页
agent-browser --auto-connect tab list

# 切换到 X 页面（假设在 tab 1）
agent-browser --auto-connect tab 1
```

### 2. 导航到 X 发帖页面

```bash
# 打开 X 主页
agent-browser --auto-connect open https://x.com/home
```

### 3. 获取页面交互元素

使用 `snapshot -i` 获取可交互元素及其引用（ref）：

```bash
agent-browser --auto-connect snapshot -i
```

**关键元素定位**：
- **发帖输入框**: `textbox "帖子文本" [ref=eXXX]`
  - 查找包含 "帖子文本" 的 textbox 元素
  - 引用格式：`@eXXX`（XXX 是动态数字）
- **发帖按钮**: `button "发帖" [ref=eXXX]`
  - 查找 name 为 "发帖" 的 button 元素
  - 通常在输入框下方

### 4. 填写推文内容

```bash
# 使用 fill 命令清空并输入内容
agent-browser --auto-connect fill @eXXX "你的推文内容"

# 或使用 type 命令追加内容（不清空）
agent-browser --auto-connect type @eXXX "追加的内容"
```

### 5. 发布推文

```bash
# 点击发帖按钮
agent-browser --auto-connect click @eYYY

# 等待发布完成（可选）
agent-browser --auto-connect wait --text "你的帖子已发送"
```

### 6. 验证发布结果

```bash
# 截图验证
agent-browser --auto-connect screenshot

# 或获取当前页面标题验证
agent-browser --auto-connect get title
```

## 完整示例

### 场景：发布天气推文

```bash
# 1. 连接到 Chrome 并切换到 X 标签页
agent-browser --auto-connect tab 1

# 2. 获取页面快照，找到输入框和按钮引用
agent-browser --auto-connect snapshot -i
# 输出示例：
# - textbox "帖子文本" [ref=e159]
# - button "发帖" [ref=e53]

# 3. 填写推文内容
agent-browser --auto-connect fill @e159 "🌤️ 上海今天天气：晴转多云，气温9-17°C，东南风3级。适合外出，记得适当增减衣物哦！#上海天气"

# 4. 点击发帖按钮
agent-browser --auto-connect click @e53

# 5. 等待并验证
agent-browser --auto-connect wait 2000
agent-browser --auto-connect screenshot
```

## 元素引用说明

### 动态引用注意事项
- **ref 是动态的**: 每次快照后 ref（如 @e159）可能变化
- **必须重新获取**: 在执行操作前务必重新运行 `snapshot -i`
- **使用最新引用**: 始终使用最近一次快照中的 ref

### 关键元素特征
| 元素 | 角色(role) | 名称(name) | 类型 |
|------|-----------|-----------|------|
| 发帖输入框 | textbox | "帖子文本" | 文本输入 |
| 发帖按钮 | button | "发帖" | 提交按钮 |
| 添加媒体 | button | "添加照片或视频" | 附件按钮 |
| 表情符号 | button | "添加表情符号" | 表情按钮 |

## 调试技巧

### 查看 Chrome 标签页状态
```bash
agent-browser --auto-connect tab list
```

### 查看控制台错误
```bash
agent-browser --auto-connect console
agent-browser --auto-connect errors
```

### 有头模式调试（显示浏览器窗口）
```bash
# 关闭当前连接，重新以有头模式打开
agent-browser close
agent-browser open https://x.com/home --headed
```

### 等待特定元素
```bash
# 等待文本出现
agent-browser --auto-connect wait --text "你的帖子已发送"

# 等待元素可点击
agent-browser --auto-connect wait @e53

# 等待网络空闲
agent-browser --auto-connect wait --load networkidle
```

## 常见问题

### 问题：无法连接到 Chrome
**原因**: Chrome 未以调试模式启动
**解决**: 关闭所有 Chrome 窗口，使用 `--remote-debugging-port=9222` 参数重启

### 问题：找不到"发帖"按钮
**原因**: ref 引用过期，页面元素已变化
**解决**: 重新运行 `snapshot -i` 获取最新引用

### 问题：提示未登录
**原因**: Chrome 中 X.com 会话过期
**解决**: 手动在 Chrome 中登录 X.com，然后重新连接

### 问题：输入框内容未提交
**原因**: 填写后页面未更新，ref 失效
**解决**: 在填写前和填写后分别获取快照，确保引用正确

## 注意事项

1. **ref 的时效性**: 页面 DOM 变化后 ref 会改变，每次操作前重新快照
2. **异步加载**: X.com 是单页应用，操作后可能需要等待加载
3. **字符限制**: 推文内容不能超过 280 个字符（中文计入）
4. **速率限制**: 避免频繁发布，防止触发 X 的反垃圾机制
5. **会话保持**: 保持 Chrome 调试端口开启，避免重复登录

## 进阶用法

### 发布带图片的推文
```bash
# 1. 点击添加照片按钮
agent-browser --auto-connect click @e80  # "添加照片或视频"

# 2. 等待文件选择对话框（需手动选择或使用系统工具）
# 注意：agent-browser 无法直接操作系统文件对话框

# 3. 确认上传后填写文本
agent-browser --auto-connect fill @eXXX "配图推文内容"

# 4. 发布
agent-browser --auto-connect click @eYYY  # "发帖"按钮
```

### 使用语义定位器（替代 ref）
```bash
# 通过角色和名称定位（不依赖 ref）
agent-browser --auto-connect find role textbox fill --name "帖子文本" "推文内容"
agent-browser --auto-connect find role button click --name "发帖"
```

### 多标签页操作
```bash
# 创建独立会话
agent-browser --session x_poster open https://x.com/home

# 在会话中操作
agent-browser --session x_poster snapshot -i
agent-browser --session x_poster fill @e159 "内容"
agent-browser --session x_poster click @e53

# 列出所有会话
agent-browser session list
```

## 相关命令参考

详见 [agent-browser 技能文档](../agent-browser/SKILL.md) 了解完整的浏览器自动化命令。
