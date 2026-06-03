#!/usr/bin/env node
// Gitea API Client v260603.100057
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var GITEA_URL = process.env.GITEA_URL || "";
    var GITEA_TOKEN = process.env.GITEA_TOKEN || "";
    async function api2(endpoint, options = {}) {
      const baseUrl = (process.env.GITEA_URL || GITEA_URL).replace(/\/+$/, "");
      const token = process.env.GITEA_TOKEN || GITEA_TOKEN;
      if (!baseUrl) {
        throw new Error('GITEA_URL not set. Use: export GITEA_URL="https://your-gitea.example.com"');
      }
      const url = `${baseUrl}${endpoint}`;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `token ${token}`;
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
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
        owner: null,
        type: null,
        format: null,
        limit: null,
        help: false,
        _: []
      };
      for (let i = 0; i < argv2.length; i++) {
        const arg = argv2[i];
        if (arg === "--help" || arg === "-h") {
          result.help = true;
        } else if (arg === "--owner" && argv2[i + 1]) {
          result.owner = argv2[++i];
        } else if (arg === "--type" && argv2[i + 1]) {
          result.type = argv2[++i];
        } else if (arg === "--format" && argv2[i + 1]) {
          result.format = argv2[++i];
        } else if (arg === "--limit" && argv2[i + 1]) {
          result.limit = parseInt(argv2[++i], 10);
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
      if (data === null || data === void 0) return;
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

// lib/cmd/packages.js
var require_packages = __commonJS({
  "lib/cmd/packages.js"(exports2, module2) {
    async function packages(parsed2, api2) {
      const sub = parsed2.subcommand || "list";
      switch (sub) {
        case "list":
          return await listPackages(parsed2, api2);
        default:
          throw new Error(`Unknown packages subcommand: ${sub}`);
      }
    }
    async function listPackages(parsed2, api2) {
      const type = parsed2.type || "";
      const limit = parsed2.limit || 50;
      if (parsed2.owner) {
        return await getPackagesForOwner(api2, parsed2.owner, type, limit);
      }
      const owners = await getAllOwners(api2);
      const results = [];
      for (const owner of owners) {
        try {
          const pkgs = await getPackagesForOwner(api2, owner, type, limit);
          if (Array.isArray(pkgs) && pkgs.length > 0) {
            results.push(...pkgs);
          }
        } catch (_) {
        }
      }
      return results;
    }
    async function getAllOwners(api2) {
      const [users, orgs] = await Promise.all([
        api2("/api/v1/admin/users?limit=50").catch(() => []),
        api2("/api/v1/admin/orgs?limit=50").catch(() => [])
      ]);
      const names = /* @__PURE__ */ new Set();
      for (const u of users) if (u.login) names.add(u.login);
      for (const o of orgs) if (o.username) names.add(o.username);
      return [...names];
    }
    async function getPackagesForOwner(api2, owner, type, limit) {
      let endpoint = `/api/v1/packages/${encodeURIComponent(owner)}?limit=${limit}`;
      if (type) endpoint += `&type=${encodeURIComponent(type)}`;
      const raw = await api2(endpoint);
      if (!Array.isArray(raw)) return [];
      return raw.map((pkg) => ({
        _columns: ["owner", "type", "name", "version", "created"],
        owner: pkg.owner?.login || owner,
        type: pkg.type || "",
        name: pkg.name || "",
        version: pkg.version || "",
        created: (pkg.created_at || "").slice(0, 10),
        id: pkg.id,
        html_url: pkg.html_url || "",
        repository: pkg.repository?.full_name || "",
        creator: pkg.creator?.login || ""
      }));
    }
    module2.exports = packages;
  }
});

// lib/cmd/system.js
var require_system = __commonJS({
  "lib/cmd/system.js"(exports2, module2) {
    async function system(parsed2, api2) {
      const sub = parsed2.subcommand;
      switch (sub) {
        case "version": {
          return await api2("/api/v1/version");
        }
        default:
          throw new Error(`Unknown system subcommand: ${sub}`);
      }
    }
    module2.exports = system;
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var packagesCmd = require_packages();
    var systemCmd = require_system();
    module2.exports = {
      packages: packagesCmd,
      system: systemCmd
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
  console.log("Gitea REST API Client");
  console.log("");
  console.log("Usage: node skill.js <command> [subcommand] [options]");
  console.log("");
  console.log("Commands:");
  console.log("  packages list [--owner <name>] [--type <type>]  List packages");
  console.log("  system version                                   Get Gitea version");
  console.log("");
  console.log("Options:");
  console.log("  --format <type>   Output format: json, yaml, table, default (default: table)");
  console.log("  --limit <n>       Max results per owner (default: 50)");
  console.log("  --help, -h        Show this help");
  process.exit(0);
}
var fmt = parsed.format || "table";
async function main() {
  const command = parsed.command;
  const sub = parsed.subcommand;
  switch (command) {
    case "packages": {
      const result = await cmd.packages(parsed, api);
      output(result, fmt);
      break;
    }
    case "system": {
      const result = await cmd.system(parsed, api);
      output(result, fmt);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      console.error("Run with --help for usage.");
      process.exit(1);
  }
}
main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
