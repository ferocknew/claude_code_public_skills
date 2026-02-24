---
name: sendmail
description: 当用户要求"发送邮件"或需要在 JavaScript/Node.js 环境中通过 SMTP 发送邮件时使用此 skill。支持纯文本、HTML、Markdown 格式邮件，以及多收件人和附件功能。
version: 260224.222700
---

# 使用 Nodemailer 发送邮件

本 skill 提供使用 Nodemailer 通过 SMTP 发送邮件的完整功能。支持纯文本、HTML、Markdown 格式邮件，以及多收件人和附件功能。

## 可用工具

### 1. send_email - 发送邮件

发送邮件的主要工具，支持多收件人和附件。

**参数：**
- `to_emails` (必需): 收件人邮箱列表，数组格式，如 `["user@example.com"]`
- `subject` (必需): 邮件主题
- `body` (必需): 邮件正文
- `cc_emails` (可选): 抄送邮箱列表
- `bcc_emails` (可选): 密送邮箱列表
- `attachments` (可选): 附件文件路径列表
- `sender_email` (可选): 发件人邮箱
- `sender_name` (可选): 发件人姓名
- `html_body` (可选): 是否为 HTML 格式邮件，默认 false
- `markdown_body` (可选): 邮件正文是否为 Markdown 格式，将自动转换为 HTML，默认 false

**使用示例：**

发送纯文本邮件：
```json
{
  "to_emails": ["recipient@example.com"],
  "subject": "测试邮件",
  "body": "这是一封测试邮件"
}
```

发送 Markdown 格式邮件：
```json
{
  "to_emails": ["recipient@example.com"],
  "subject": "项目进展报告",
  "body": "# 项目进展报告\n\n## 主要成就\n\n- 完成了用户认证功能\n- 优化了数据库性能\n\n## 代码示例\n\n```python\ndef greet():\n    return \"Hello World!\"\n```\n\n详细内容请查看附件。",
  "markdown_body": true,
  "attachments": ["/path/to/report.pdf"]
}
```

发送带附件和多收件人的邮件：
```json
{
  "to_emails": ["user1@example.com", "user2@example.com"],
  "subject": "月度报告",
  "body": "请查收附件中的月度报告。",
  "cc_emails": ["manager@example.com"],
  "attachments": ["/path/to/report.pdf", "/path/to/data.xlsx"]
}
```

### 2. get_config - 获取配置信息

获取当前 SMTP 和邮件配置信息（密码会隐藏显示）。

**参数：** 无

### 3. test_smtp_connection - 测试 SMTP 连接

测试 SMTP 服务器连接和认证是否正常。

**参数：** 无

---

## 配置

在使用发送邮件功能之前，需要配置 SMTP 服务器信息。这些敏感信息存储在 `.env` 文件中，**不会提交到 git 仓库**。

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# SMTP 服务器配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# 默认发件人（可选）
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Your Name
```

### 获取配置示例

运行以下命令获取环境变量示例：

```bash
node skill.js --config-example
```

## 常用邮箱 SMTP 配置

### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

**注意：** Gmail 需要使用应用专用密码（App Password），不是登录密码。

获取应用专用密码：
1. 访问 https://myaccount.google.com/apppasswords
2. 选择"邮件"和"设备"（选择"其他"）
3. 生成密码并复制到 `SMTP_PASSWORD`

### Outlook/Hotmail

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

### QQ 邮箱

```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
```

**注意：** 需要在 QQ 邮箱设置中开启 SMTP 服务，并获取授权码。

### 163 邮箱

```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
```

---

## 运行方式

**重要：运行命令前需要先进入 sendmail 目录**

```bash
cd sendmail
```

### 使用命令发送邮件

```bash
# 基本邮件
node skill.js send_email --to recipient@example.com --subject "测试" --body "内容"

# HTML 邮件
node skill.js send_email --to recipient@example.com --subject "测试" --html "<h1>HTML</h1>"

# Markdown 邮件（自动转换为 HTML）
node skill.js send_email --to recipient@example.com --subject "报告" --body "# 标题\n内容" --markdown

# 多收件人
node skill.js send_email --to user1@example.com,user2@example.com --subject "报告" --body "内容"

# 带附件
node skill.js send_email --to recipient@example.com --subject "报告" --body "请查收" --attach /path/to/file.pdf
```

### 使用 JSON 配置文件发送邮件

```bash
node skill.js send_email send.json
```

其中 `send.json` 包含邮件信息：

```json
{
  "to_emails": ["recipient@example.com"],
  "subject": "测试邮件",
  "body": "这是一封测试邮件",
  "attachments": [
    "/path/to/report.pdf"
  ]
}
```

### 获取配置信息

```bash
node skill.js get_config
```

### 测试 SMTP 连接

```bash
node skill.js test_smtp_connection
```

---

## 命令行参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--to` | 收件人邮箱（多个用逗号分隔） | `user@example.com` |
| `--cc` | 抄送邮箱（多个用逗号分隔） | `cc@example.com` |
| `--bcc` | 密送邮箱（多个用逗号分隔） | `bcc@example.com` |
| `--subject` | 邮件主题 | `测试邮件` |
| `--body` | 邮件正文 | `邮件正文` |
| `--html` | HTML 内容 | `<h1>标题</h1>` |
| `--attach` | 附件路径（可多次指定） | `/path/to/file.pdf` |
| `--from` | 发件人（覆盖默认） | `sender@example.com` |
| `--test` | 测试 SMTP 连接 | - |
| `--config` | 显示当前配置 | - |
| `--config-example` | 显示配置示例 | - |

---

## 快速开始

### 1. 创建 `.env` 文件

```bash
cd sendmail
cp .env.example .env
```

### 2. 编辑 `.env` 文件

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. 测试 SMTP 连接

```bash
node skill.js test_smtp_connection
```

### 4. 发送测试邮件

```bash
node skill.js send_email --to recipient@example.com --subject "测试" --body "测试邮件内容"
```

---

## 支持的附件类型

- 文件附件：指定文件路径
- 多个附件：指定多个文件路径

### 附件示例

```bash
node skill.js --to user@example.com --subject "报告" \
  --body "请查收附件" \
  --attach report.pdf \
  --attach data.xlsx
```

---

## 常见问题

### Q: 如何获取 Gmail 应用专用密码？

1. 访问 https://myaccount.google.com/apppasswords
2. 登录 Google 账户
3. 选择"邮件"和"设备"（选择"其他"）
4. 生成密码并复制到 `.env` 文件中的 `SMTP_PASSWORD`

### Q: 邮件发送失败怎么办？

检查以下几点：
- SMTP 服务器地址和端口是否正确
- 用户名和密码是否正确
- 网络连接是否正常
- 邮箱是否开启了 SMTP 服务

### Q: 支持 Markdown 格式吗？

支持。在 send_email 工具中设置 `markdown_body: true`，正文会自动转换为 HTML 格式。

### Q: 如何测试 SMTP 连接？

运行 `node skill.js --test` 命令即可测试 SMTP 连接和认证。

---

## 安全注意事项

- ⚠️ **永远不要提交 `.env` 文件到版本控制系统**
- ⚠️ 使用应用专用密码，不要使用登录密码
- ⚠️ 不要在公共代码中硬编码敏感信息
