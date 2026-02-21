#!/usr/bin/env node
// HTTP MCP 工具 v260221.140208 - 基于 Node.js 原生 fetch API


// run.js
var SKILL_VERSION = true ? "260221.140208" : "1.0.0-dev";
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
    mcpTools: false
    // 新增：获取 MCP 工具列表
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "-H":
      case "--header":
        const headerArg = args[++i];
        if (headerArg.includes(": ")) {
          const [key, value] = headerArg.split(": ", 2);
          result.headers[key] = value;
        } else if (headerArg.includes(":")) {
          const [key, value] = headerArg.split(":", 2);
          result.headers[key] = value;
        } else if (headerArg.includes("=")) {
          const [key, value] = headerArg.split("=", 2);
          result.headers[key] = value;
        } else {
          result.headers[headerArg] = args[++i] || "";
        }
        break;
      case "-u":
      case "--user":
        const [user, pass] = args[++i].split(":");
        const auth = Buffer.from(`${user}:${pass || ""}`).toString("base64");
        result.headers["Authorization"] = `Basic ${auth}`;
        break;
      case "-b":
      case "--bearer":
        result.headers["Authorization"] = `Bearer ${args[++i]}`;
        break;
      case "-o":
      case "--output":
        result.output = args[++i];
        break;
      case "-i":
      case "--include":
        result.include = true;
        break;
      case "-v":
      case "--verbose":
        result.verbose = true;
        break;
      case "-f":
      case "--form":
        result.isForm = true;
        result.body = args[++i];
        break;
      case "--file":
        result.file = args[++i];
        break;
      case "--timeout":
        result.timeout = parseInt(args[++i], 10);
        break;
      case "--curl":
        result.showCurl = true;
        break;
      case "--mcp-tools":
        result.mcpTools = true;
        break;
      case "get":
      case "post":
      case "put":
      case "delete":
      case "patch":
      case "head":
      case "options":
        result.method = arg.toUpperCase();
        break;
      default:
        if (!result.method) {
          if (!arg.startsWith("-")) {
            result.method = arg.toUpperCase();
          }
        } else if (!result.url) {
          result.url = arg;
        } else if (!result.body && !result.isForm) {
          result.body = arg;
        }
        break;
    }
    i++;
  }
  return result;
}
function showHelp() {
  console.log(`
HTTP MCP \u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <method> <url> [options]

\u65B9\u6CD5:
  get, post, put, delete, patch, head, options

\u53C2\u6570:
  url                    \u76EE\u6807 URL
  body                   \u8BF7\u6C42\u4F53\uFF08JSON \u5B57\u7B26\u4E32\u6216\u4F7F\u7528 @filename \u4ECE\u6587\u4EF6\u8BFB\u53D6\uFF09

\u9009\u9879:
  -H, --header <key> <value>   \u6DFB\u52A0\u8BF7\u6C42\u5934
  -u, --user <user:pass>       Basic Auth
  -b, --bearer <token>         Bearer Token
  -o, --output <file>          \u4FDD\u5B58\u54CD\u5E94\u5230\u6587\u4EF6
  -i, --include                \u663E\u793A\u54CD\u5E94\u5934
  -v, --verbose                \u5B8C\u6574\u8C03\u8BD5\u6A21\u5F0F
  -f, --form <data>            \u8868\u5355\u6570\u636E
  --file <path>                \u4E0A\u4F20\u6587\u4EF6
  --timeout <seconds>          \u8BF7\u6C42\u8D85\u65F6\uFF08\u9ED8\u8BA4 30 \u79D2\uFF09
  --curl                       \u663E\u793A curl \u7B49\u4EF7\u547D\u4EE4
  --mcp-tools                  \u83B7\u53D6 MCP \u670D\u52A1\u5668\u5DE5\u5177\u5217\u8868

\u793A\u4F8B:
  # GET \u8BF7\u6C42
  node skill.js get https://api.example.com/users

  # POST JSON
  node skill.js post https://api.example.com/users '{"name": "\u5F20\u4E09"}'

  # \u5E26\u8BA4\u8BC1
  node skill.js get https://api.example.com/protected -u admin:123456
  node skill.js get https://api.example.com/protected -b your-token

  # \u5E26\u8BF7\u6C42\u5934
  node skill.js get https://api.example.com/data -H "Accept: application/json"

  # \u4FDD\u5B58\u54CD\u5E94
  node skill.js get https://api.example.com/data -o output.json

  # \u663E\u793A curl \u547D\u4EE4
  node skill.js get https://api.example.com/users --curl

  # \u83B7\u53D6 MCP \u5DE5\u5177\u5217\u8868
  node skill.js get https://mcp-server.com/api/mcp --mcp-tools
  node skill.js get https://mcp-server.com -b token --mcp-tools
`);
}
function showVersion() {
  console.log(`HTTP MCP \u5DE5\u5177 v${SKILL_VERSION}`);
  console.log("\u57FA\u4E8E Node.js \u539F\u751F fetch API");
}
function generateCurlCommand(options) {
  let cmd = `curl -X ${options.method}`;
  for (const [key, value] of Object.entries(options.headers)) {
    cmd += ` -H "${key}: ${value}"`;
  }
  if (options.body && ["POST", "PUT", "PATCH"].includes(options.method)) {
    cmd += ` -d '${options.body}'`;
  }
  cmd += ` "${options.url}"`;
  return cmd;
}
async function getMcpTools(options) {
  const baseUrl = options.url.replace(/\/api\/mcp$/, "").replace(/\/mcp$/, "");
  const headers = {
    ...options.headers,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  console.log("\n" + "=".repeat(70));
  console.log("\u{1F50D} MCP \u670D\u52A1\u5668\u5DE5\u5177\u5217\u8868");
  console.log("=".repeat(70));
  console.log(`
\u670D\u52A1\u5668: ${baseUrl}
`);
  try {
    let response = await fetch(`${baseUrl}/api/mcp`, {
      headers
    });
    if (response.ok) {
      const data = await response.json();
      console.log("\u2713 \u901A\u8FC7 /api/mcp \u83B7\u53D6\u5DE5\u5177\u5217\u8868\n");
      displayMcpTools(data);
      return;
    }
    console.log("\u5C1D\u8BD5\u901A\u8FC7 MCP \u534F\u8BAE\u521D\u59CB\u5316...\n");
    const initPayload = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: "use-http-mcp",
          version: SKILL_VERSION
        }
      }
    };
    response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify(initPayload)
    });
    if (response.ok) {
      const initResult = await response.json();
      const toolsPayload = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
      };
      response = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers,
        body: JSON.stringify(toolsPayload)
      });
      if (response.ok) {
        const toolsResult = await response.json();
        console.log("\u2713 \u901A\u8FC7 MCP JSON-RPC \u534F\u8BAE\u83B7\u53D6\u5DE5\u5177\u5217\u8868\n");
        displayMcpRpcTools(toolsResult, initResult);
        return;
      }
    }
    console.log("\u5C1D\u8BD5\u4ECE OpenAPI \u89C4\u8303\u83B7\u53D6\u5DE5\u5177\u5217\u8868...\n");
    response = await fetch(`${baseUrl}/openapi.json`, { headers });
    if (response.ok) {
      const openapi = await response.json();
      console.log("\u2713 \u4ECE OpenAPI \u89C4\u8303\u63A8\u65AD\u5DE5\u5177\u5217\u8868\n");
      displayOpenApiTools(openapi);
      return;
    }
    console.error("\u2717 \u65E0\u6CD5\u83B7\u53D6 MCP \u5DE5\u5177\u5217\u8868");
    console.error("\n\u63D0\u793A:");
    console.error("  - \u786E\u8BA4\u670D\u52A1\u5668 URL \u662F\u5426\u6B63\u786E");
    console.error("  - \u786E\u8BA4\u8BA4\u8BC1\u4FE1\u606F\u662F\u5426\u6B63\u786E");
    console.error("  - \u8BE5\u670D\u52A1\u5668\u53EF\u80FD\u4E0D\u662F MCP \u670D\u52A1\u5668");
  } catch (err) {
    console.error(`\u2717 \u8BF7\u6C42\u5931\u8D25: ${err.message}`);
  }
}
function displayMcpTools(data) {
  console.log(`\u540D\u79F0: ${data.name}`);
  console.log(`\u63CF\u8FF0: ${data.description}`);
  console.log(`\u7248\u672C: ${data.version}`);
  console.log(`\u8BA4\u8BC1: ${data.authentication}`);
  console.log(`\u4F20\u8F93: ${data.transport}
`);
  if (data.tools && data.tools.length > 0) {
    console.log("\u{1F4CB} \u53EF\u7528\u5DE5\u5177:");
    console.log("");
    data.tools.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool}`);
    });
  }
  console.log("\n" + "=".repeat(70));
}
function displayMcpRpcTools(toolsResult, initResult) {
  if (initResult && initResult.result && initResult.result.serverInfo) {
    const info = initResult.result.serverInfo;
    console.log(`\u540D\u79F0: ${info.name}`);
    console.log(`\u7248\u672C: ${info.version}
`);
  }
  const tools = toolsResult.result?.tools;
  if (tools && tools.length > 0) {
    console.log("\u{1F4CB} \u53EF\u7528\u5DE5\u5177:");
    console.log("");
    tools.forEach((tool, i) => {
      console.log(`  ${i + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`     ${tool.description}`);
      }
      if (tool.inputSchema) {
        console.log(`     \u53C2\u6570: ${JSON.stringify(tool.inputSchema)}`);
      }
      console.log("");
    });
  } else {
    console.log("\u6682\u65E0\u5DE5\u5177");
  }
  console.log("\n" + "=".repeat(70));
}
function displayOpenApiTools(openapi) {
  const info = openapi.info || {};
  console.log(`\u540D\u79F0: ${info.title || "Unknown"}`);
  console.log(`\u63CF\u8FF0: ${info.description || "N/A"}`);
  console.log(`\u7248\u672C: ${info.version || "N/A"}
`);
  const toolPaths = Object.keys(openapi.paths || {}).filter((p) => p.startsWith("/tools/") && p !== "/tools/");
  if (toolPaths.length > 0) {
    console.log("\u{1F4CB} \u53EF\u7528\u5DE5\u5177 (\u4ECE OpenAPI \u63A8\u65AD):");
    console.log("");
    toolPaths.forEach((path, i) => {
      const pathSpec = openapi.paths[path];
      const method = Object.keys(pathSpec)[0] || "POST";
      const spec = pathSpec[method];
      console.log(`  ${i + 1}. ${spec.operationId || path}`);
      console.log(`     \u7AEF\u70B9: ${method.toUpperCase()} ${path}`);
      if (spec.summary) {
        console.log(`     \u63CF\u8FF0: ${spec.summary}`);
      }
      console.log("");
    });
  } else {
    console.log("\u672A\u627E\u5230\u5DE5\u5177\u7AEF\u70B9");
  }
  console.log("\n" + "=".repeat(70));
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    showHelp();
    process.exit(0);
  }
  if (args[0] === "--version") {
    showVersion();
    process.exit(0);
  }
  const options = parseArgs(args);
  if (!options.method || !options.url) {
    console.error("\u9519\u8BEF: \u7F3A\u5C11\u5FC5\u9700\u53C2\u6570");
    console.log("\n\u4F7F\u7528 'node skill.js --help' \u67E5\u770B\u5E2E\u52A9");
    process.exit(1);
  }
  if (options.showCurl) {
    console.log(generateCurlCommand(options));
    process.exit(0);
  }
  if (options.mcpTools) {
    await getMcpTools(options);
    process.exit(0);
  }
  const fetchOptions = {
    method: options.method,
    headers: { ...options.headers }
  };
  if (["POST", "PUT", "PATCH"].includes(options.method) && options.body) {
    if (options.body.startsWith("@")) {
      const fs = require("fs");
      const filePath = options.body.slice(1);
      try {
        options.body = fs.readFileSync(filePath, "utf8");
      } catch (err) {
        console.error(`\u9519\u8BEF: \u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6 ${filePath} - ${err.message}`);
        process.exit(1);
      }
    }
    if (options.isForm) {
      fetchOptions.headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchOptions.body = options.body;
    } else if (options.file) {
      const fs = require("fs");
      try {
        const fileBuffer = fs.readFileSync(options.file);
        const formData = new FormData();
        formData.append("file", new Blob([fileBuffer]), options.file);
        fetchOptions.body = formData;
      } catch (err) {
        console.error(`\u9519\u8BEF: \u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6 ${options.file} - ${err.message}`);
        process.exit(1);
      }
    } else {
      if (!fetchOptions.headers["Content-Type"]) {
        fetchOptions.headers["Content-Type"] = "application/json";
      }
      fetchOptions.body = options.body;
    }
  }
  if (options.verbose) {
    console.log("\n" + "=".repeat(70));
    console.log("\u{1F4E4} \u8BF7\u6C42\u8BE6\u60C5");
    console.log("=".repeat(70));
    console.log(`
\u65B9\u6CD5: ${options.method}`);
    console.log(`URL: ${options.url}`);
    console.log("\n\u8BF7\u6C42\u5934:");
    for (const [key, value] of Object.entries(fetchOptions.headers)) {
      console.log(`  ${key}: ${value}`);
    }
    if (fetchOptions.body) {
      console.log(`
\u8BF7\u6C42\u4F53:
${fetchOptions.body}`);
    }
    console.log("\n" + "=".repeat(70) + "\n");
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout * 1e3);
  try {
    const startTime = Date.now();
    const response = await fetch(options.url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const contentType = response.headers.get("content-type") || "";
    let responseBody;
    if (contentType.includes("application/json")) {
      responseBody = await response.text();
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
      }
    } else {
      responseBody = await response.text();
    }
    console.log(`
HTTP/${response.httpVersion || "1.1"} ${response.status} ${response.statusText}`);
    if (options.include || options.verbose) {
      console.log("\n\u54CD\u5E94\u5934:");
      for (const [key, value] of Object.entries(responseHeaders)) {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log(`
\u8017\u65F6: ${elapsed}ms
`);
    if (typeof responseBody === "object") {
      console.log(JSON.stringify(responseBody, null, 2));
    } else {
      console.log(responseBody);
    }
    if (options.output) {
      const fs = require("fs");
      const outputData = typeof responseBody === "object" ? JSON.stringify(responseBody, null, 2) : responseBody;
      fs.writeFileSync(options.output, outputData);
      console.log(`
\u2713 \u54CD\u5E94\u5DF2\u4FDD\u5B58\u5230: ${options.output}`);
    }
    if (!response.ok) {
      process.exit(1);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.error(`
\u2717 \u8BF7\u6C42\u8D85\u65F6\uFF08${options.timeout}\u79D2\uFF09`);
    } else {
      console.error(`
\u2717 \u8BF7\u6C42\u5931\u8D25: ${err.message}`);
    }
    process.exit(1);
  }
  console.log("\n" + "=".repeat(70));
  console.log("\u2705 \u5B8C\u6210\uFF01");
  console.log("=".repeat(70) + "\n");
}
main();
