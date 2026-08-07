#!/usr/bin/env node
// Nexus3 API Client v260807.214209
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    if (process.env.NEXUS_REJECT_UNAUTHORIZED === "false") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
    async function api2(endpoint, options = {}) {
      const baseUrl = (process.env.NEXUS_URL || "").replace(/\/+$/, "");
      if (!baseUrl) {
        throw new Error(
          'NEXUS_URL \u672A\u8BBE\u7F6E\u3002\u8BF7 export NEXUS_URL="https://your-nexus.example.com" \u6216\u5728\u672C skill \u76EE\u5F55\u7684 .env \u4E2D\u914D\u7F6E'
        );
      }
      const url = `${baseUrl}${endpoint}`;
      const headers = { ...options.headers };
      const username = process.env.NEXUS_USERNAME || "";
      const password = process.env.NEXUS_PASSWORD || "";
      if (username) {
        const token = Buffer.from(`${username}:${password}`).toString("base64");
        headers["Authorization"] = `Basic ${token}`;
      }
      const timeoutMs = parseInt(process.env.NEXUS_TIMEOUT || "30000", 10);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(url, { ...options, headers, signal: controller.signal });
      } catch (e) {
        if (e.name === "AbortError") {
          throw new Error(
            `\u8BF7\u6C42\u8D85\u65F6\uFF08${timeoutMs}ms\uFF09\uFF1A${url}\uFF08\u53EF\u7ECF NEXUS_TIMEOUT \u8C03\u6574\uFF0C\u6216\u68C0\u67E5\u7F51\u7EDC/\u4EE3\u7406/\u8BC1\u4E66\uFF09`
          );
        }
        const hint = process.env.NEXUS_REJECT_UNAUTHORIZED === "false" ? "" : "\uFF08\u82E5\u4E3A\u81EA\u7B7E\u540D\u8BC1\u4E66\uFF0C\u53EF\u5728 .env \u8BBE NEXUS_REJECT_UNAUTHORIZED=false\uFF09";
        throw new Error(`\u8BF7\u6C42\u5931\u8D25\uFF1A${e.message}${hint}`);
      } finally {
        clearTimeout(timer);
      }
      if (res.status === 204) return null;
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = text;
        try {
          const j = JSON.parse(text);
          message = j.message || j.error || text;
        } catch (_) {
        }
        const err = new Error(`API error ${res.status}: ${message || res.statusText}`);
        err.status = res.status;
        err.url = url;
        throw err;
      }
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        return await res.json();
      }
      return await res.text();
    }
    module2.exports = api2;
  }
});

// lib/parser.js
var require_parser = __commonJS({
  "lib/parser.js"(exports2, module2) {
    function parseArgs2(argv2) {
      const result = {
        command: null,
        subcommand: null,
        repo: null,
        // 仓库名
        name: null,
        // 组件/包名
        version: null,
        // 版本（npm/pypi 包版本，也作通用版本过滤）
        tag: null,
        // docker tag
        image: null,
        // docker 镜像名（等价 name）
        group: null,
        // 分组（npm scope / maven groupId / docker 路径前缀）
        format: null,
        // 仓库格式过滤：docker/npm/pypi/maven2/raw/nuget...
        limit: null,
        // 分页上限
        id: null,
        // 直接指定 component/asset id
        yes: false,
        // 跳过删除确认（真正执行删除）
        allTags: false,
        // docker 删除所有 tag
        raw: false,
        // 输出原始完整 JSON（不做字段精简）
        help: false,
        _: []
      };
      for (let i = 0; i < argv2.length; i++) {
        const arg = argv2[i];
        const next = argv2[i + 1];
        if (arg === "--help" || arg === "-h") {
          result.help = true;
        } else if ((arg === "--repo" || arg === "-r") && next !== void 0 && !next.startsWith("-")) {
          result.repo = argv2[++i];
        } else if ((arg === "--name" || arg === "-n") && next !== void 0 && !next.startsWith("-")) {
          result.name = argv2[++i];
        } else if ((arg === "--version" || arg === "-v") && next !== void 0 && !next.startsWith("-")) {
          result.version = argv2[++i];
        } else if (arg === "--tag" && next !== void 0 && !next.startsWith("-")) {
          result.tag = argv2[++i];
        } else if (arg === "--image" && next !== void 0 && !next.startsWith("-")) {
          result.image = argv2[++i];
        } else if ((arg === "--group" || arg === "-g") && next !== void 0 && !next.startsWith("-")) {
          result.group = argv2[++i];
        } else if (arg === "--format" && next !== void 0 && !next.startsWith("-")) {
          result.format = argv2[++i];
        } else if (arg === "--limit" && next !== void 0) {
          const n = parseInt(next, 10);
          if (!Number.isNaN(n)) {
            result.limit = n;
            i++;
          }
        } else if (arg === "--id" && next !== void 0 && !next.startsWith("-")) {
          result.id = argv2[++i];
        } else if (arg === "--yes" || arg === "-y") {
          result.yes = true;
        } else if (arg === "--all-tags" || arg === "--all") {
          result.allTags = true;
        } else if (arg === "--raw") {
          result.raw = true;
        } else if (!result.command) {
          result.command = arg;
        } else if (!result.subcommand) {
          result.subcommand = arg;
        } else {
          result._.push(arg);
        }
      }
      return result;
    }
    module2.exports = { parseArgs: parseArgs2 };
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2, module2) {
    function output2(data, format = "table") {
      if (data === null || data === void 0) {
        console.log("(no content)");
        return;
      }
      if (format === "json") {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      if (format === "yaml") {
        console.log(toYaml(data));
        return;
      }
      if (typeof data === "string") {
        console.log(data);
        return;
      }
      if (Array.isArray(data)) {
        if (data.length === 0) {
          console.log("(no results)");
          return;
        }
        renderTable(data, format === "table");
        return;
      }
      if (typeof data === "object") {
        console.log(JSON.stringify(data, null, 2));
        return;
      }
      console.log(data);
    }
    function renderTable(items, isTable) {
      if (!items.length) return;
      if (items[0]._columns) {
        const columns = items[0]._columns;
        const rows = items.map((it) => columns.map((c) => String(it[c] ?? "")));
        if (isTable) {
          const widths = columns.map(
            (c, i) => Math.max(c.length, ...rows.map((r) => r[i].length))
          );
          const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
          const header = columns.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|");
          console.log(sep);
          console.log(header);
          console.log(sep);
          for (const row of rows) {
            console.log(row.map((c, i) => ` ${c.padEnd(widths[i])} `).join("|"));
          }
          console.log(sep);
        } else {
          for (const row of rows) {
            console.log(row.join("  "));
          }
        }
        return;
      }
      console.log(JSON.stringify(items, null, 2));
    }
    function toYaml(data, indent = 0) {
      const pad = "  ".repeat(indent);
      if (data === null || data === void 0) return `${pad}null
`;
      if (typeof data !== "object") return `${pad}${data}
`;
      if (Array.isArray(data)) {
        if (data.length === 0) return `${pad}[]
`;
        return data.map((item) => {
          if (typeof item !== "object" || item === null) return `${pad}- ${item}
`;
          const inner = toYaml(item, indent + 1);
          return `${pad}- ${inner.trimStart()}`;
        }).join("");
      }
      return Object.entries(data).map(([k, v]) => {
        if (typeof v === "object" && v !== null) {
          return `${pad}${k}:
${toYaml(v, indent + 1)}`;
        }
        return `${pad}${k}: ${v === null ? "null" : v}
`;
      }).join("");
    }
    module2.exports = output2;
  }
});

// lib/cmd/status.js
var require_status = __commonJS({
  "lib/cmd/status.js"(exports2, module2) {
    async function status(parsed2, api2) {
      const sub = parsed2.subcommand || "info";
      switch (sub) {
        case "info":
          return await api2("/service/rest/v1/status");
        case "check":
          return await api2("/service/rest/v1/status/check");
        default:
          throw new Error(`\u672A\u77E5 status \u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u652F\u6301 info / check\uFF09`);
      }
    }
    module2.exports = status;
  }
});

// lib/cmd/repos.js
var require_repos = __commonJS({
  "lib/cmd/repos.js"(exports2, module2) {
    async function repos(parsed2, api2) {
      const sub = parsed2.subcommand || "list";
      switch (sub) {
        case "list":
          return await listRepos(parsed2, api2);
        default:
          throw new Error(`\u672A\u77E5 repos \u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u5F53\u524D\u652F\u6301 list\uFF09`);
      }
    }
    async function listRepos(parsed2, api2) {
      let list = await api2("/service/rest/v1/repositories");
      if (!Array.isArray(list)) return [];
      if (parsed2.format) {
        list = list.filter((r) => (r.format || "").toLowerCase() === parsed2.format.toLowerCase());
      }
      return list.map((r) => ({
        _columns: ["name", "format", "type", "url"],
        name: r.name || "",
        format: r.format || "",
        type: r.type || "",
        url: r.url || ""
      }));
    }
    module2.exports = repos;
  }
});

// lib/cmd/components.js
var require_components = __commonJS({
  "lib/cmd/components.js"(exports2, module2) {
    var SEARCH_BASE = "/service/rest/v1/search";
    async function components(parsed2, api2) {
      const sub = parsed2.subcommand || "list";
      switch (sub) {
        case "list":
          return await listComponents(parsed2, api2);
        case "search":
          return await searchComponents(parsed2, api2);
        case "get":
          return await getComponent(parsed2, api2);
        case "delete":
        case "rm":
          return await deleteComponents(parsed2, api2);
        default:
          throw new Error(`\u672A\u77E5 components \u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u652F\u6301 list / search / get / delete\uFF09`);
      }
    }
    async function listComponents(parsed2, api2) {
      if (!parsed2.repo) throw new Error("\u7F3A\u5C11 --repo\uFF0C\u8BF7\u6307\u5B9A\u4ED3\u5E93\u540D");
      const limit = parsed2.limit || 50;
      const items = [];
      let token = null;
      let pages = 0;
      do {
        let ep = `/service/rest/v1/components?repository=${encodeURIComponent(parsed2.repo)}`;
        if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
        const data = await api2(ep);
        if (data && Array.isArray(data.items)) {
          for (const c of data.items) items.push(toRow(c));
        }
        token = data && data.continuationToken;
        pages++;
      } while (token && items.length < limit && pages < 50);
      return items.slice(0, limit);
    }
    async function searchComponents(parsed2, api2) {
      if (!parsed2.repo) throw new Error("\u7F3A\u5C11 --repo");
      if (!parsed2.name && !parsed2.group) {
        throw new Error("search \u81F3\u5C11\u9700\u8981 --name \u6216 --group \u4F5C\u4E3A\u8FC7\u6EE4\u6761\u4EF6");
      }
      const items = await search(parsed2, api2);
      return items.map(toRow);
    }
    async function getComponent(parsed2, api2) {
      if (!parsed2.id) throw new Error("\u7F3A\u5C11 --id");
      return await api2(`/service/rest/v1/components/${encodeURIComponent(parsed2.id)}`);
    }
    async function deleteComponents(parsed2, api2) {
      if (parsed2.id) {
        if (!parsed2.yes) {
          return { dryRun: true, count: 1, message: `\u5C06\u5220\u9664\u7EC4\u4EF6 id=${parsed2.id}\uFF0C\u52A0 --yes \u771F\u6B63\u6267\u884C` };
        }
        await api2(`/service/rest/v1/components/${encodeURIComponent(parsed2.id)}`, { method: "DELETE" });
        return { deleted: 1, total: 1, failed: [], message: `\u5DF2\u5220\u9664\u7EC4\u4EF6 id=${parsed2.id}` };
      }
      if (!parsed2.repo || !parsed2.name) {
        throw new Error("\u5220\u9664\u7EC4\u4EF6\u9700\u63D0\u4F9B --repo + --name\uFF08+ \u53EF\u9009 --version/--group\uFF09\uFF0C\u6216\u76F4\u63A5 --id");
      }
      const items = await search(parsed2, api2);
      if (items.length === 0) {
        return { deleted: 0, message: "\u672A\u627E\u5230\u5339\u914D\u7684\u7EC4\u4EF6" };
      }
      if (!parsed2.yes) {
        return previewDelete(items, parsed2.version ? "version" : "all-matches");
      }
      return await batchDelete(api2, items);
    }
    async function search(parsed2, api2) {
      const params = [`repository=${encodeURIComponent(parsed2.repo)}`];
      if (parsed2.name) params.push(`name=${encodeURIComponent(parsed2.name)}`);
      if (parsed2.version) params.push(`version=${encodeURIComponent(parsed2.version)}`);
      if (parsed2.group) params.push(`group=${encodeURIComponent(parsed2.group)}`);
      const all = [];
      let token = null;
      let pages = 0;
      do {
        let ep = `${SEARCH_BASE}?${params.join("&")}`;
        if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
        const data = await api2(ep);
        if (data && Array.isArray(data.items)) all.push(...data.items);
        token = data && data.continuationToken;
        pages++;
      } while (token && pages < 20);
      return all;
    }
    function toRow(c) {
      return {
        _columns: ["format", "group", "name", "version", "id"],
        format: c.format || "",
        group: c.group || "",
        name: c.name || "",
        version: c.version || "",
        id: c.id || "",
        repository: c.repository || ""
      };
    }
    function previewDelete(items, scope) {
      return {
        dryRun: true,
        scope,
        count: items.length,
        message: `\u5C06\u5220\u9664\u4EE5\u4E0B ${items.length} \u4E2A\u7EC4\u4EF6\uFF08\u5F53\u524D\u4E3A\u9884\u89C8\uFF0C\u52A0 --yes \u771F\u6B63\u6267\u884C\u5220\u9664\uFF09`,
        components: items.map((c) => ({ format: c.format, group: c.group, name: c.name, version: c.version, id: c.id }))
      };
    }
    async function batchDelete(api2, items) {
      let deleted = 0;
      const failed = [];
      for (const it of items) {
        try {
          await api2(`/service/rest/v1/components/${encodeURIComponent(it.id)}`, { method: "DELETE" });
          deleted++;
        } catch (e) {
          failed.push({ id: it.id, name: it.name, version: it.version, error: e.message });
        }
      }
      return { deleted, total: items.length, failed };
    }
    module2.exports = components;
    module2.exports.search = search;
    module2.exports.batchDelete = batchDelete;
  }
});

// lib/cmd/docker.js
var require_docker = __commonJS({
  "lib/cmd/docker.js"(exports2, module2) {
    var componentsApi = require_components();
    async function docker(parsed2, api2) {
      const sub = parsed2.subcommand;
      switch (sub) {
        case "rm":
        case "rmi":
        case "delete":
          return await removeTag(parsed2, api2);
        case "tags":
        case "list":
          return await listTags(parsed2, api2);
        default:
          throw new Error(`\u672A\u77E5 docker \u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u652F\u6301 rm / tags\uFF09`);
      }
    }
    async function removeTag(parsed2, api2) {
      const repo = parsed2.repo;
      const image = parsed2.image || parsed2.name;
      if (!repo || !image) {
        throw new Error("docker rm \u9700\u8981 --repo + --image\uFF08\u6216 --name \u6307\u5B9A\u955C\u50CF\u540D\uFF09");
      }
      if (parsed2.allTags) {
        const items = await componentsApi.search({ repo, name: image }, api2);
        if (items.length === 0) {
          return { deleted: 0, message: `\u955C\u50CF ${image} \u65E0\u4EFB\u4F55 tag` };
        }
        const result2 = await doDelete(parsed2, api2, items, `\u955C\u50CF ${image} \u7684\u5168\u90E8 ${items.length} \u4E2A tag`);
        return result2;
      }
      const tag = parsed2.tag || parsed2.version;
      if (!tag) {
        throw new Error("docker rm \u9700\u8981 --tag \u6307\u5B9A tag\uFF08\u6216 --all-tags \u5220\u9664\u5168\u90E8 tag\uFF09");
      }
      const tags = String(tag).split(",").map((t) => t.trim()).filter(Boolean);
      const found = [];
      const missing = [];
      for (const t of tags) {
        const items = await componentsApi.search({ repo, name: image, version: t }, api2);
        if (items.length > 0) found.push(...items);
        else missing.push(t);
      }
      if (found.length === 0) {
        return { deleted: 0, missing, message: `\u672A\u627E\u5230\u955C\u50CF ${image} \u7684 tag: ${tags.join(", ")}` };
      }
      const result = await doDelete(parsed2, api2, found, `\u955C\u50CF ${image} \u7684 tag ${tags.join(", ")}`);
      if (missing.length) result.missing = missing;
      return result;
    }
    async function listTags(parsed2, api2) {
      const repo = parsed2.repo;
      const image = parsed2.image || parsed2.name;
      if (!repo || !image) {
        throw new Error("docker tags \u9700\u8981 --repo + --image\uFF08\u6216 --name\uFF09");
      }
      const items = await componentsApi.search({ repo, name: image }, api2);
      return items.map((c) => ({
        _columns: ["name", "tag", "id"],
        name: c.name || "",
        tag: c.version || "",
        id: c.id || ""
      }));
    }
    async function doDelete(parsed2, api2, items, desc) {
      if (!parsed2.yes) {
        return {
          dryRun: true,
          description: desc,
          count: items.length,
          message: `\u5C06\u5220\u9664 ${desc}\uFF08\u5171 ${items.length} \u4E2A\u7EC4\u4EF6\uFF09\uFF0C\u52A0 --yes \u771F\u6B63\u6267\u884C`,
          components: items.map((c) => ({ name: c.name, tag: c.version, id: c.id }))
        };
      }
      const result = await componentsApi.batchDelete(api2, items);
      result.description = desc;
      return result;
    }
    module2.exports = docker;
  }
});

// lib/cmd/assets.js
var require_assets = __commonJS({
  "lib/cmd/assets.js"(exports2, module2) {
    async function assets(parsed2, api2) {
      const sub = parsed2.subcommand || "list";
      switch (sub) {
        case "list":
          return await listAssets(parsed2, api2);
        case "delete":
        case "rm":
          return await deleteAsset(parsed2, api2);
        default:
          throw new Error(`\u672A\u77E5 assets \u5B50\u547D\u4EE4\uFF1A${sub}\uFF08\u652F\u6301 list / delete\uFF09`);
      }
    }
    async function listAssets(parsed2, api2) {
      if (!parsed2.repo) throw new Error("\u7F3A\u5C11 --repo");
      const limit = parsed2.limit || 50;
      const items = [];
      let token = null;
      let pages = 0;
      do {
        let ep = `/service/rest/v1/assets?repository=${encodeURIComponent(parsed2.repo)}`;
        if (token) ep += `&continuationToken=${encodeURIComponent(token)}`;
        const data = await api2(ep);
        if (data && Array.isArray(data.items)) {
          for (const a of data.items) items.push(toRow(a));
        }
        token = data && data.continuationToken;
        pages++;
      } while (token && items.length < limit && pages < 50);
      return items.slice(0, limit);
    }
    async function deleteAsset(parsed2, api2) {
      if (!parsed2.id) throw new Error("\u7F3A\u5C11 --id");
      if (!parsed2.yes) {
        return { dryRun: true, message: `\u5C06\u5220\u9664\u8D44\u4EA7 id=${parsed2.id}\uFF0C\u52A0 --yes \u771F\u6B63\u6267\u884C` };
      }
      await api2(`/service/rest/v1/assets/${encodeURIComponent(parsed2.id)}`, { method: "DELETE" });
      return { deleted: 1, message: `\u5DF2\u5220\u9664\u8D44\u4EA7 id=${parsed2.id}` };
    }
    function toRow(a) {
      return {
        _columns: ["format", "path", "id"],
        format: a.format || "",
        path: a.path || "",
        id: a.id || "",
        downloadUrl: a.downloadUrl || "",
        repository: a.repository || ""
      };
    }
    module2.exports = assets;
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var statusCmd = require_status();
    var reposCmd = require_repos();
    var componentsCmd = require_components();
    var dockerCmd = require_docker();
    var assetsCmd = require_assets();
    module2.exports = {
      status: statusCmd,
      repos: reposCmd,
      components: componentsCmd,
      docker: dockerCmd,
      assets: assetsCmd
    };
  }
});

// run.js
var path = require("path");
var fs = require("fs");
var api = require_api();
var { parseArgs } = require_parser();
var output = require_output();
var cmd = require_cmd();
var envPath = path.join(__dirname, ".env");
try {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m) {
        const key = m[1];
        const val = m[2].replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (_) {
}
var argv = process.argv.slice(2);
var parsed = parseArgs(argv);
if (parsed.help || argv.length === 0) {
  console.log("Nexus3 REST API \u5BA2\u6237\u7AEF");
  console.log("");
  console.log("Usage: node skill.js <command> [subcommand] [options]");
  console.log("");
  console.log("\u547D\u4EE4\u603B\u89C8\uFF1A");
  console.log("  status [info|check]                       \u670D\u52A1\u5668\u72B6\u6001/\u5065\u5EB7\u68C0\u67E5");
  console.log("  repos list [--format <fmt>]               \u5217\u51FA\u6240\u6709\u4ED3\u5E93");
  console.log("");
  console.log("  components list   --repo <repo> [--limit n]                       \u5217\u51FA\u4ED3\u5E93\u7EC4\u4EF6");
  console.log("  components search --repo <repo> --name <n> [--version v] [-g g]  \u641C\u7D22\u7EC4\u4EF6");
  console.log("  components get    --id <id>                                      \u7EC4\u4EF6\u8BE6\u60C5");
  console.log("  components delete --repo <repo> --name <n> [--version v] [-g g]  \u5220\u9664\u7EC4\u4EF6\uFF08npm/pypi/maven/raw \u901A\u7528\uFF09");
  console.log("             \u4E5F\u53EF\u76F4\u63A5\uFF1Acomponents delete --id <id>");
  console.log("");
  console.log("  docker rm    --repo <repo> --image <img> --tag <t>   \u5220\u9664 docker \u955C\u50CF\u6307\u5B9A tag\uFF08\u9017\u53F7\u5206\u9694\u591A\u4E2A\uFF09");
  console.log("  docker rm    --repo <repo> --image <img> --all-tags  \u5220\u9664 docker \u955C\u50CF\u5168\u90E8 tag");
  console.log("  docker tags  --repo <repo> --image <img>             \u5217\u51FA\u955C\u50CF\u6240\u6709 tag");
  console.log("");
  console.log("  assets list   --repo <repo> [--limit n]   \u5217\u51FA\u8D44\u4EA7");
  console.log("  assets delete --id <id>                   \u5220\u9664\u8D44\u4EA7");
  console.log("");
  console.log("\u26A0\uFE0F  \u5220\u9664\u5B89\u5168\u673A\u5236\uFF1A\u6240\u6709\u5220\u9664\u547D\u4EE4\u9ED8\u8BA4\u300C\u9884\u89C8\u6A21\u5F0F\u300D\uFF08dry-run\uFF09\uFF0C\u52A0 --yes \u624D\u771F\u6B63\u6267\u884C\u3002");
  console.log("");
  console.log("\u9009\u9879\uFF1A");
  console.log("  --repo, -r <name>   \u4ED3\u5E93\u540D");
  console.log("  --name, -n <name>   \u7EC4\u4EF6/\u955C\u50CF/\u5305\u540D");
  console.log("  --image <name>      docker \u955C\u50CF\u540D\uFF08\u7B49\u540C --name\uFF09");
  console.log("  --tag <t>           docker tag\uFF08\u9017\u53F7\u5206\u9694\u53EF\u591A\u4E2A\uFF09");
  console.log("  --version, -v <ver> \u7248\u672C\uFF08npm/pypi \u5305\u7248\u672C / docker tag / maven \u7248\u672C\uFF09");
  console.log("  --group, -g <g>     \u5206\u7EC4\uFF08npm scope / maven groupId\uFF09");
  console.log("  --id <id>           \u76F4\u63A5\u6307\u5B9A component/asset id");
  console.log("  --format <fmt>      \u4ED3\u5E93\u683C\u5F0F\u8FC7\u6EE4\uFF1Adocker/npm/pypi/maven2/raw/nuget...\uFF08repos list\uFF09");
  console.log("  --limit <n>         \u5206\u9875\u4E0A\u9650\uFF08\u9ED8\u8BA4 50\uFF09");
  console.log("  --yes, -y           \u771F\u6B63\u6267\u884C\u5220\u9664\uFF08\u9ED8\u8BA4\u9884\u89C8\uFF09");
  console.log("  --all-tags, --all   \u5220\u9664 docker \u955C\u50CF\u5168\u90E8 tag");
  console.log("  --raw               \u8F93\u51FA\u539F\u59CB\u5B8C\u6574 JSON\uFF08\u4E0D\u505A\u5B57\u6BB5\u7CBE\u7B80\uFF09");
  console.log("  --help, -h          \u663E\u793A\u672C\u5E2E\u52A9");
  process.exit(0);
}
var fmt = parsed.raw ? "json" : "table";
async function main() {
  const command = parsed.command;
  switch (command) {
    case "status":
      return output(await cmd.status(parsed, api), fmt);
    case "repos":
    case "repositories":
      return output(await cmd.repos(parsed, api), fmt);
    case "components":
    case "component":
    case "comp":
      return output(await cmd.components(parsed, api), fmt);
    case "docker":
      return output(await cmd.docker(parsed, api), fmt);
    case "assets":
    case "asset":
      return output(await cmd.assets(parsed, api), fmt);
    default:
      console.error(`\u672A\u77E5\u547D\u4EE4\uFF1A${command}`);
      console.error("\u8FD0\u884C --help \u67E5\u770B\u7528\u6CD5\u3002");
      process.exit(1);
  }
}
main().then(() => process.exit(0)).catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
