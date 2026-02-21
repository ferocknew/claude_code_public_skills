#!/usr/bin/env node
/**
 * HTTP MCP 工具 - 跨平台 HTTP 请求客户端
 *
 * 用法:
 *   node skill.js <method> <url> [options]
 *
 * 作者: Claude Code
 * 版本: 1.0.0
 */

// 版本号（打包时会通过 __VERSION 注入）
const SKILL_VERSION = typeof __VERSION !== "undefined" ? __VERSION : "1.0.0-dev";

// 解析命令行参数
function parseArgs(args) {
  const result = {
    method: null,
    url: null,
    headers: {},
    body: null,
    output: null,
    include: false,
    verbose: false,
    isForm: false,
    file: null,
    timeout: 30,
    showCurl: false,
    mcpTools: false,  // 新增：获取 MCP 工具列表
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '-H':
      case '--header':
        const headerArg = args[++i];
        // 支持 "key: value" 或 "key=value" 格式
        if (headerArg.includes(': ')) {
          const [key, value] = headerArg.split(': ', 2);
          result.headers[key] = value;
        } else if (headerArg.includes(':')) {
          const [key, value] = headerArg.split(':', 2);
          result.headers[key] = value;
        } else if (headerArg.includes('=')) {
          const [key, value] = headerArg.split('=', 2);
          result.headers[key] = value;
        } else {
          // 如果没有分隔符，尝试将下一个参数作为值
          result.headers[headerArg] = args[++i] || '';
        }
        break;
      case '-u':
      case '--user':
        const [user, pass] = args[++i].split(':');
        const auth = Buffer.from(`${user}:${pass || ''}`).toString('base64');
        result.headers['Authorization'] = `Basic ${auth}`;
        break;
      case '-b':
      case '--bearer':
        result.headers['Authorization'] = `Bearer ${args[++i]}`;
        break;
      case '-o':
      case '--output':
        result.output = args[++i];
        break;
      case '-i':
      case '--include':
        result.include = true;
        break;
      case '-v':
      case '--verbose':
        result.verbose = true;
        break;
      case '-f':
      case '--form':
        result.isForm = true;
        result.body = args[++i];
        break;
      case '--file':
        result.file = args[++i];
        break;
      case '--timeout':
        result.timeout = parseInt(args[++i], 10);
        break;
      case '--curl':
        result.showCurl = true;
        break;
      case '--mcp-tools':
        result.mcpTools = true;
        break;
      case 'get':
      case 'post':
      case 'put':
      case 'delete':
      case 'patch':
      case 'head':
      case 'options':
        result.method = arg.toUpperCase();
        break;
      default:
        if (!result.method) {
          // 第一个非选项参数是 method
          if (!arg.startsWith('-')) {
            result.method = arg.toUpperCase();
          }
        } else if (!result.url) {
          // 第二个非选项参数是 url
          result.url = arg;
        } else if (!result.body && !result.isForm) {
          // 第三个非选项参数是 body
          result.body = arg;
        }
        break;
    }
    i++;
  }

  return result;
}

// 显示帮助
function showHelp() {
  console.log(`
HTTP MCP 工具 v${SKILL_VERSION}

用法:
  node skill.js <method> <url> [options]

方法:
  get, post, put, delete, patch, head, options

参数:
  url                    目标 URL
  body                   请求体（JSON 字符串或使用 @filename 从文件读取）

选项:
  -H, --header <key> <value>   添加请求头
  -u, --user <user:pass>       Basic Auth
  -b, --bearer <token>         Bearer Token
  -o, --output <file>          保存响应到文件
  -i, --include                显示响应头
  -v, --verbose                完整调试模式
  -f, --form <data>            表单数据
  --file <path>                上传文件
  --timeout <seconds>          请求超时（默认 30 秒）
  --curl                       显示 curl 等价命令
  --mcp-tools                  获取 MCP 服务器工具列表

示例:
  # GET 请求
  node skill.js get https://api.example.com/users

  # POST JSON
  node skill.js post https://api.example.com/users '{"name": "张三"}'

  # 带认证
  node skill.js get https://api.example.com/protected -u admin:123456
  node skill.js get https://api.example.com/protected -b your-token

  # 带请求头
  node skill.js get https://api.example.com/data -H "Accept: application/json"

  # 保存响应
  node skill.js get https://api.example.com/data -o output.json

  # 显示 curl 命令
  node skill.js get https://api.example.com/users --curl

  # 获取 MCP 工具列表
  node skill.js get https://mcp-server.com/api/mcp --mcp-tools
  node skill.js get https://mcp-server.com -b token --mcp-tools
`);
}

// 显示版本
function showVersion() {
  console.log(`HTTP MCP 工具 v${SKILL_VERSION}`);
  console.log("基于 Node.js 原生 fetch API");
}

// 生成 curl 等价命令
function generateCurlCommand(options) {
  let cmd = `curl -X ${options.method}`;

  // 添加请求头
  for (const [key, value] of Object.entries(options.headers)) {
    cmd += ` -H "${key}: ${value}"`;
  }

  // 添加请求体
  if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    cmd += ` -d '${options.body}'`;
  }

  cmd += ` "${options.url}"`;
  return cmd;
}

// 获取 MCP 工具列表
async function getMcpTools(options) {
  const baseUrl = options.url.replace(/\/api\/mcp$/, '').replace(/\/mcp$/, '');
  const headers = {
    ...options.headers,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  console.log("\n" + "=".repeat(70));
  console.log("🔍 MCP 服务器工具列表");
  console.log("=".repeat(70));
  console.log(`\n服务器: ${baseUrl}\n`);

  try {
    // 方法 1: 尝试 GET /api/mcp (SearXNG 风格)
    let response = await fetch(`${baseUrl}/api/mcp`, {
      headers,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✓ 通过 /api/mcp 获取工具列表\n");
      displayMcpTools(data);
      return;
    }

    // 方法 2: 尝试 MCP JSON-RPC 协议
    console.log("尝试通过 MCP 协议初始化...\n");

    // Initialize
    const initPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "use-http-mcp",
          version: SKILL_VERSION,
        },
      },
    };

    response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(initPayload),
    });

    if (response.ok) {
      const initResult = await response.json();

      // 调用 tools/list
      const toolsPayload = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      };

      response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers,
        body: JSON.stringify(toolsPayload),
      });

      if (response.ok) {
        const toolsResult = await response.json();
        console.log("✓ 通过 MCP JSON-RPC 协议获取工具列表\n");
        displayMcpRpcTools(toolsResult, initResult);
        return;
      }
    }

    // 方法 3: 尝试从 OpenAPI.json 推断
    console.log("尝试从 OpenAPI 规范获取工具列表...\n");
    response = await fetch(`${baseUrl}/openapi.json`, { headers });

    if (response.ok) {
      const openapi = await response.json();
      console.log("✓ 从 OpenAPI 规范推断工具列表\n");
      displayOpenApiTools(openapi);
      return;
    }

    console.error("✗ 无法获取 MCP 工具列表");
    console.error("\n提示:");
    console.error("  - 确认服务器 URL 是否正确");
    console.error("  - 确认认证信息是否正确");
    console.error("  - 该服务器可能不是 MCP 服务器");

  } catch (err) {
    console.error(`✗ 请求失败: ${err.message}`);
  }
}

// 显示 /api/mcp 格式的工具
function displayMcpTools(data) {
  console.log(`名称: ${data.name}`);
  console.log(`描述: ${data.description}`);
  console.log(`版本: ${data.version}`);
  console.log(`认证: ${data.authentication}`);
  console.log(`传输: ${data.transport}\n`);

  if (data.tools && data.tools.length > 0) {
    console.log("📋 可用工具:");
    console.log("");
    data.tools.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool}`);
    });
  }
  console.log("\n" + "=".repeat(70));
}

// 显示 MCP JSON-RPC 格式的工具
function displayMcpRpcTools(toolsResult, initResult) {
  if (initResult && initResult.result && initResult.result.serverInfo) {
    const info = initResult.result.serverInfo;
    console.log(`名称: ${info.name}`);
    console.log(`版本: ${info.version}\n`);
  }

  const tools = toolsResult.result?.tools;
  if (tools && tools.length > 0) {
    console.log("📋 可用工具:");
    console.log("");
    tools.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`     ${tool.description}`);
      }
      if (tool.inputSchema) {
        console.log(`     参数: ${JSON.stringify(tool.inputSchema)}`);
      }
      console.log("");
    });
  } else {
    console.log("暂无工具");
  }
  console.log("\n" + "=".repeat(70));
}

// 显示从 OpenAPI 推断的工具
function displayOpenApiTools(openapi) {
  const info = openapi.info || {};
  console.log(`名称: ${info.title || 'Unknown'}`);
  console.log(`描述: ${info.description || 'N/A'}`);
  console.log(`版本: ${info.version || 'N/A'}\n`);

  // 查找 /tools/* 路径
  const toolPaths = Object.keys(openapi.paths || {}).filter(p => p.startsWith('/tools/') && p !== '/tools/');

  if (toolPaths.length > 0) {
    console.log("📋 可用工具 (从 OpenAPI 推断):");
    console.log("");
    toolPaths.forEach((path, i) => {
      const pathSpec = openapi.paths[path];
      const method = Object.keys(pathSpec)[0] || 'POST';
      const spec = pathSpec[method];
      console.log(`  ${i + 1}. ${spec.operationId || path}`);
      console.log(`     端点: ${method.toUpperCase()} ${path}`);
      if (spec.summary) {
        console.log(`     描述: ${spec.summary}`);
      }
      console.log("");
    });
  } else {
    console.log("未找到工具端点");
  }
  console.log("\n" + "=".repeat(70));
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    showHelp();
    process.exit(0);
  }

  // --version 需要完整输入，避免和 -v verbose 冲突
  if (args[0] === '--version') {
    showVersion();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.method || !options.url) {
    console.error("错误: 缺少必需参数");
    console.log("\n使用 'node skill.js --help' 查看帮助");
    process.exit(1);
  }

  // 显示 curl 命令
  if (options.showCurl) {
    console.log(generateCurlCommand(options));
    process.exit(0);
  }

  // 获取 MCP 工具列表
  if (options.mcpTools) {
    await getMcpTools(options);
    process.exit(0);
  }

  // 构建请求选项
  const fetchOptions = {
    method: options.method,
    headers: { ...options.headers },
  };

  // 处理请求体
  if (['POST', 'PUT', 'PATCH'].includes(options.method) && options.body) {
    // 从文件读取
    if (options.body.startsWith('@')) {
      const fs = require('fs');
      const filePath = options.body.slice(1);
      try {
        options.body = fs.readFileSync(filePath, 'utf8');
      } catch (err) {
        console.error(`错误: 无法读取文件 ${filePath} - ${err.message}`);
        process.exit(1);
      }
    }

    // 表单数据
    if (options.isForm) {
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      fetchOptions.body = options.body;
    } else if (options.file) {
      // 文件上传
      const fs = require('fs');
      try {
        const fileBuffer = fs.readFileSync(options.file);
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), options.file);
        fetchOptions.body = formData;
      } catch (err) {
        console.error(`错误: 无法读取文件 ${options.file} - ${err.message}`);
        process.exit(1);
      }
    } else {
      // JSON 数据
      if (!fetchOptions.headers['Content-Type']) {
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
      fetchOptions.body = options.body;
    }
  }

  // 详细模式
  if (options.verbose) {
    console.log("\n" + "=".repeat(70));
    console.log("📤 请求详情");
    console.log("=".repeat(70));
    console.log(`\n方法: ${options.method}`);
    console.log(`URL: ${options.url}`);
    console.log("\n请求头:");
    for (const [key, value] of Object.entries(fetchOptions.headers)) {
      console.log(`  ${key}: ${value}`);
    }
    if (fetchOptions.body) {
      console.log(`\n请求体:\n${fetchOptions.body}`);
    }
    console.log("\n" + "=".repeat(70) + "\n");
  }

  // 发送请求
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout * 1000);

  try {
    const startTime = Date.now();

    const response = await fetch(options.url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    // 获取响应头
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // 获取响应体
    const contentType = response.headers.get('content-type') || '';
    let responseBody;

    if (contentType.includes('application/json')) {
      responseBody = await response.text();
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
        // 保持原始文本
      }
    } else {
      responseBody = await response.text();
    }

    // 显示响应
    console.log(`\nHTTP/${response.httpVersion || '1.1'} ${response.status} ${response.statusText}`);

    if (options.include || options.verbose) {
      console.log("\n响应头:");
      for (const [key, value] of Object.entries(responseHeaders)) {
        console.log(`  ${key}: ${value}`);
      }
    }

    console.log(`\n耗时: ${elapsed}ms\n`);

    if (typeof responseBody === 'object') {
      console.log(JSON.stringify(responseBody, null, 2));
    } else {
      console.log(responseBody);
    }

    // ��式保存到文件
    if (options.output) {
      const fs = require('fs');
      const outputData = typeof responseBody === 'object'
        ? JSON.stringify(responseBody, null, 2)
        : responseBody;
      fs.writeFileSync(options.output, outputData);
      console.log(`\n✓ 响应已保存到: ${options.output}`);
    }

    // 非成功状态码
    if (!response.ok) {
      process.exit(1);
    }

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error(`\n✗ 请求超时（${options.timeout}秒）`);
    } else {
      console.error(`\n✗ 请求失败: ${err.message}`);
    }
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ 完成！");
  console.log("=".repeat(70) + "\n");
}

// 运行
main();
