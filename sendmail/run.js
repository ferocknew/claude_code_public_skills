#!/usr/bin/env node
/**
 * 邮件发送工具
 *
 * 用法:
 *   node skill.js <command> [options]
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

const fs = require("fs");
const path = require("path");

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 加载 nodemailer
const nodemailer = require("nodemailer");

// 加载环境变量
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const env = {};
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key) {
        env[key.trim()] = valueParts.join("=").trim();
      }
    }
  }

  // 兼容不同的环境变量名称
  if (env.SMTP_USERNAME && !env.SMTP_USER) {
    env.SMTP_USER = env.SMTP_USERNAME;
  }
  if (env.SMTP_USE_TLS !== undefined && env.SMTP_SECURE === undefined) {
    env.SMTP_SECURE = env.SMTP_USE_TLS;
  }
  if (env.DEFAULT_SENDER_EMAIL && !env.SMTP_FROM) {
    env.SMTP_FROM = env.DEFAULT_SENDER_EMAIL;
  }
  if (env.DEFAULT_SENDER_NAME && !env.SMTP_FROM_NAME) {
    env.SMTP_FROM_NAME = env.DEFAULT_SENDER_NAME;
  }

  return env;
}

const env = loadEnv();

// Markdown 转 HTML（简单实现）
function markdownToHtml(markdown) {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>");

  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // 斜体
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
    return `<pre><code>${code}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // 链接
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // 无序列表
  html = html.replace(/^\- (.*$)/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
    return `<ul>${match}</ul>`;
  });

  // 段落
  html = html.replace(/\n\n/g, "</p><p>");
  html = `<p>${html}</p>`;

  // 清理空段落
  html = html.replace(/<p><\/p>/g, "");
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

// 隐藏密码
function hidePassword(password) {
  if (!password) return "未设置";
  return password.substring(0, 2) + "****" + password.substring(password.length - 2);
}

// 显示帮助
function showHelp() {
  console.log(`
邮件发送工具 v${SKILL_VERSION}

用法:
  node skill.js <command> [options]

命令:
  send_email          发送邮件
  get_config          获取配置信息
  test_smtp_connection 测试 SMTP 连接

send_email 命令参数:
  --to <emails>       收件人邮箱列表（多个用逗号分隔，JSON 模式为 to_emails）
  --cc <emails>       抄送邮箱列表
  --bcc <emails>      密送邮箱列表
  --subject <text>    邮件主题
  --body <text>       邮件正文
  --html <text>       HTML 内容
  --markdown          正文为 Markdown 格式（自动转换为 HTML）
  --attach <path>     附件路径（可多次指定）
  --from <email>      发件人（覆盖默认）
  --from-name <name>  发件人名称

  或者使用 JSON 文件:
  node skill.js send_email config.json

send_email JSON 格式:
  {
    "to_emails": ["user1@example.com", "user2@example.com"],
    "subject": "邮件主题",
    "body": "邮件正文",
    "cc_emails": ["cc@example.com"],
    "bcc_emails": ["bcc@example.com"],
    "attachments": ["/path/to/file.pdf"],
    "sender_email": "sender@example.com",
    "sender_name": "发件人名称",
    "html_body": true,
    "markdown_body": true
  }

get_config 命令:
  node skill.js get_config

test_smtp_connection 命令:
  node skill.js test_smtp_connection

全局参数:
  --config-example    显示 .env 配置示例
  -h, --help         显示此帮助信息
  -v, --version      显示版本信息

示例:
  # 发送纯文本邮件
  node skill.js send_email --to user@example.com --subject "测试" --body "测试内容"

  # 发送 Markdown 邮件
  node skill.js send_email --to user@example.com --subject "报告" --body "# 标题\\n内容" --markdown

  # 发送带附件的邮件
  node skill.js send_email --to user@example.com --subject "报告" --body "请查收" --attach report.pdf

  # 获取配置
  node skill.js get_config

  # 测试连接
  node skill.js test_smtp_connection
`);
}

// 显示版本
function showVersion() {
  console.log(`邮件发送工具 v${SKILL_VERSION}`);
  console.log("基于 Nodemailer");
}

// 显示配置示例
function showConfigExample() {
  console.log(`
# .env 文件配置示例

# SMTP 服务器地址
SMTP_HOST=smtp.gmail.com

# SMTP 服务器端口 (587 = STARTTLS, 465 = SSL/TLS)
SMTP_PORT=587

# 是否使用 SSL/TLS (端口 465 使用 true, 587 使用 false)
SMTP_SECURE=false

# SMTP 用户名（通常是邮箱地址）
SMTP_USER=your-email@gmail.com

# SMTP 密码或应用专用密码
# Gmail 用户需要在 https://myaccount.google.com/apppasswords 生成
SMTP_PASSWORD=your-app-password

# 默认发件人（可选）
SMTP_FROM=your-email@gmail.com

# 默认发件人名称（可选）
SMTP_FROM_NAME=Your Name

---

# 常用邮箱 SMTP 配置

# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Outlook/Hotmail
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false

# QQ 邮箱
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false

# 163 邮箱
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
`);
}

// 创建邮件传输器
function createTransporter() {
  const port = parseInt(env.SMTP_PORT, 10);

  // 端口 465 使用 SSL/TLS (secure: true)
  // 端口 587 或 25 使用 STARTTLS (secure: false)
  const secure = port === 465;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: port,
    secure: secure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });
}

// 获取配置信息
function getConfig() {
  console.log("\n" + "=".repeat(70));
  console.log("📋 SMTP 配置信息");
  console.log("=".repeat(70));

  if (!env.SMTP_HOST) {
    console.log("\n⚠️ 未配置 .env 文件");
    console.log("运行 'node skill.js --config-example' 查看配置示例");
    return;
  }

  console.log(`\nSMTP_HOST: ${env.SMTP_HOST}`);
  console.log(`SMTP_PORT: ${env.SMTP_PORT}`);
  console.log(`SMTP_SECURE: ${env.SMTP_SECURE}`);
  console.log(`SMTP_USER: ${env.SMTP_USER || "未设置"}`);
  console.log(`SMTP_PASSWORD: ${hidePassword(env.SMTP_PASSWORD)}`);
  console.log(`SMTP_FROM: ${env.SMTP_FROM || "未设置"}`);
  console.log(`SMTP_FROM_NAME: ${env.SMTP_FROM_NAME || "未设置"}`);

  console.log("\n" + "=".repeat(70) + "\n");
}

// 测试 SMTP 连接
async function testSmtpConnection() {
  console.log("\n" + "=".repeat(70));
  console.log("🔌 测试 SMTP 连接");
  console.log("=".repeat(70));

  const requiredKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];
  const missingKeys = requiredKeys.filter(key => !env[key]);

  if (missingKeys.length > 0) {
    console.error("\n❌ 缺少必需的环境变量:");
    missingKeys.forEach(key => console.error(`  - ${key}`));
    console.error("\n请创建 .env 文件并配置 SMTP 信息");
    return false;
  }

  console.log(`\n服务器: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  console.log(`用户: ${env.SMTP_USER}`);
  console.log("\n正在连接...");

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ SMTP 连接成功！\n");
    console.log("=".repeat(70) + "\n");
    return true;
  } catch (error) {
    console.error(`\n❌ SMTP 连接失败: ${error.message}\n`);

    if (error.message.includes("authentication failed")) {
      console.error("💡 提示: 认证失败，请检查:");
      console.error("  - 用户名和密码是否正确");
      console.error("  - Gmail 用户请使用应用专用密码（非登录密码）");
      console.error("  - 邮箱是否开启了 SMTP 服务");
    } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      console.error("💡 提示: 连接超时，请检查:");
      console.error("  - 网络连接是否正常");
      console.error("  - SMTP 服务器地址和端口是否正确");
    }

    console.log("\n" + "=".repeat(70) + "\n");
    return false;
  }
}

// 发送邮件
async function sendEmail(args) {
  const requiredKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];
  const missingKeys = requiredKeys.filter(key => !env[key]);

  if (missingKeys.length > 0) {
    console.error("\n❌ 缺少必需的环境变量:");
    missingKeys.forEach(key => console.error(`  - ${key}`));
    console.error("\n请创建 .env 文件并配置 SMTP 信息");
    console.error("运行 'node skill.js --config-example' 查看配置示例");
    return false;
  }

  // 解析命令行参数
  function parseArgs(args) {
    const result = {};
    const attachments = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const next = args[i + 1];

      if (arg === "--to" && next) {
        result.to = next.split(",").map(e => e.trim());
        i++;
      } else if (arg === "--cc" && next) {
        result.cc = next.split(",").map(e => e.trim());
        i++;
      } else if (arg === "--bcc" && next) {
        result.bcc = next.split(",").map(e => e.trim());
        i++;
      } else if (arg === "--subject" && next) {
        result.subject = next;
        i++;
      } else if (arg === "--body" && next) {
        result.body = next;
        i++;
      } else if (arg === "--html" && next) {
        result.html = next;
        i++;
      } else if (arg === "--from" && next) {
        result.from = next;
        i++;
      } else if (arg === "--from-name" && next) {
        result.fromName = next;
        i++;
      } else if (arg === "--attach" && next) {
        attachments.push(next);
        i++;
      } else if (arg === "--markdown") {
        result.markdown = true;
      }
    }

    if (attachments.length > 0) {
      result.attachments = attachments;
    }

    return result;
  }

  // 读取 JSON 配置文件
  function readJsonConfig(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`配置文件不存在: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  }

  // 解析邮件配置
  let mailConfig;

  // 检查是否是 JSON 文件
  if (args.length > 0 && !args[0].startsWith("--")) {
    mailConfig = readJsonConfig(args[0]);
  } else {
    mailConfig = parseArgs(args);
  }

  // 验证收件人
  const toEmails = mailConfig.to_emails || mailConfig.to || [];
  if (toEmails.length === 0) {
    console.error("\n❌ 必须指定收件人");
    return false;
  }

  // 转换邮件配置格式
  const config = {
    to_emails: Array.isArray(toEmails) ? toEmails : [toEmails],
    cc_emails: mailConfig.cc_emails || mailConfig.cc || [],
    bcc_emails: mailConfig.bcc_emails || mailConfig.bcc || [],
    subject: mailConfig.subject || "无主题",
    body: mailConfig.body || "",
    attachments: mailConfig.attachments || [],
    sender_email: mailConfig.sender_email || mailConfig.from || env.SMTP_FROM || env.SMTP_USER,
    sender_name: mailConfig.sender_name || mailConfig.fromName || env.SMTP_FROM_NAME,
    html_body: mailConfig.html_body || !!mailConfig.html,
    markdown_body: mailConfig.markdown_body || mailConfig.markdown || false
  };

  // 如果指定了 HTML 内容
  if (mailConfig.html) {
    config.body = mailConfig.html;
    config.html_body = true;
  }

  console.log("\n" + "=".repeat(70));
  console.log("📧 发送邮件");
  console.log("=".repeat(70));
  console.log(`\n服务器: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  console.log(`发件人: ${config.sender_email}`);
  console.log(`收件人: ${config.to_emails.join(", ")}`);
  if (config.cc_emails.length > 0) {
    console.log(`抄送: ${config.cc_emails.join(", ")}`);
  }
  if (config.bcc_emails.length > 0) {
    console.log(`密送: ${config.bcc_emails.join(", ")}`);
  }
  console.log(`主题: ${config.subject}`);
  if (config.attachments.length > 0) {
    console.log(`附件: ${config.attachments.length} 个文件`);
  }
  console.log("=".repeat(70) + "\n");

  // 创建传输器
  const transporter = createTransporter();

  // 构建邮件选项
  const mailOptions = {
    from: config.sender_name ? `"${config.sender_name}" <${config.sender_email}>` : config.sender_email,
    to: config.to_emails.join(", "),
    cc: config.cc_emails.length > 0 ? config.cc_emails.join(", ") : undefined,
    bcc: config.bcc_emails.length > 0 ? config.bcc_emails.join(", ") : undefined,
    subject: config.subject,
    attachments: config.attachments.map(p => ({ path: p }))
  };

  // 设置内容
  if (config.markdown_body) {
    mailOptions.html = markdownToHtml(config.body);
  } else if (config.html_body) {
    mailOptions.html = config.body;
  } else {
    mailOptions.text = config.body;
  }

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ 发送成功！");
    console.log(`\n消息 ID: ${info.messageId}`);
    console.log(`响应: ${info.response}`);

    console.log("\n" + "=".repeat(70) + "\n");
    return true;
  } catch (error) {
    console.error("\n❌ 发送失败:");
    console.error(error.message);

    if (error.message.includes("authentication failed")) {
      console.error("\n💡 提示: 认证失败，请检查:");
      console.error("  - 用户名和密码是否正确");
      console.error("  - Gmail 用户请使用应用专用密码（非登录密码）");
      console.error("  - 邮箱是否开启了 SMTP 服务");
    } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      console.error("\n💡 提示: 连接超时，请检查:");
      console.error("  - 网络连接是否正常");
      console.error("  - SMTP 服务器地址和端口是否正确");
    }

    console.log("\n" + "=".repeat(70) + "\n");
    return false;
  }
}

// 主程序
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  showHelp();
  process.exit(0);
}

if (args[0] === "-v" || args[0] === "--version") {
  showVersion();
  process.exit(0);
}

if (args[0] === "--config-example") {
  showConfigExample();
  process.exit(0);
}

// 执行命令
const command = args[0];
const commandArgs = args.slice(1);

switch (command) {
  case "send_email":
    sendEmail(commandArgs).then(() => process.exit(0));
    break;

  case "get_config":
    getConfig();
    break;

  case "test_smtp_connection":
    testSmtpConnection().then(() => process.exit(0));
    break;

  default:
    console.error(`未知命令: ${command}`);
    console.error("运行 'node skill.js --help' 查看帮助");
    process.exit(1);
}
