#!/usr/bin/env node
// 思源笔记 API 工具 v260529.103831 - 包含所有依赖，无需安装

var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/parser.js
var require_parser = __commonJS({
  "lib/parser.js"(exports2, module2) {
    function parseArgs2(args) {
      const options = {};
      const positional = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
          const key = args[i].slice(2);
          const value = args[i + 1];
          if (value && !value.startsWith("--")) {
            options[key] = value;
            i++;
          } else {
            options[key] = true;
          }
        } else if (args[i].startsWith("-")) {
          options[args[i].slice(1)] = true;
        } else {
          positional.push(args[i]);
        }
      }
      return { positional, options };
    }
    module2.exports = {
      parseArgs: parseArgs2
    };
  }
});

// lib/errors.js
var require_errors = __commonJS({
  "lib/errors.js"(exports2, module2) {
    function handleError2(error, context = "") {
      console.error(`\u274C \u9519\u8BEF: ${context}`);
      if (error) {
        console.error(error.message);
      }
      const msg = error ? error.message : "";
      if (msg.includes("401") || msg.includes("403")) {
        console.error("\n\u{1F4A1} \u63D0\u793A: \u8BF7\u68C0\u67E5 API Token \u662F\u5426\u6B63\u786E");
        console.error("   \u601D\u6E90\u7B14\u8BB0 Token \u83B7\u53D6: \u8BBE\u7F6E > \u5173\u4E8E > API Token");
      } else if (msg.includes("404")) {
        console.error("\n\u{1F4A1} \u63D0\u793A: \u8BF7\u68C0\u67E5\u601D\u6E90\u7B14\u8BB0\u670D\u52A1\u5730\u5740\u662F\u5426\u6B63\u786E");
      } else if (msg.includes("ECONNREFUSED")) {
        console.error("\n\u{1F4A1} \u63D0\u793A: \u65E0\u6CD5\u8FDE\u63A5\u5230\u601D\u6E90\u7B14\u8BB0\u670D\u52A1\u5668\uFF0C\u8BF7\u786E\u8BA4\u670D\u52A1\u5DF2\u542F\u52A8");
        console.error("   \u9ED8\u8BA4\u5730\u5740: http://127.0.0.1:6806");
      } else if (msg.includes("code: -1") || error && error.isSiyuanError) {
        console.error("\n\u{1F4A1} \u63D0\u793A: \u601D\u6E90\u7B14\u8BB0 API \u8FD4\u56DE\u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5\u8BF7\u6C42\u53C2\u6570");
      }
      process.exit(1);
    }
    module2.exports = {
      handleError: handleError2
    };
  }
});

// lib/env.js
var require_env = __commonJS({
  "lib/env.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    function loadEnvFile(envPath2) {
      if (!fs.existsSync(envPath2)) return;
      const envContent = fs.readFileSync(envPath2, "utf-8");
      envContent.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 1) return;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      });
    }
    var envPath = fs.existsSync(path.join(__dirname, ".env")) ? path.join(__dirname, ".env") : path.join(__dirname, "..", ".env");
    loadEnvFile(envPath);
    function resolve(positional) {
      let url = process.env.SIYUAN_URL || "";
      let token = process.env.SIYUAN_API_TOKEN || process.env.SIYUAN_TOKEN || "";
      const args = [...positional];
      if (args.length > 0 && /^https?:\/\//i.test(args[0])) {
        url = args.shift();
      }
      if (args.length > 0 && /^[A-Za-z0-9]{10,}$/.test(args[0])) {
        token = args.shift();
      }
      return { url, token, args };
    }
    module2.exports = { resolve };
  }
});

// lib/api.js
var require_api = __commonJS({
  "lib/api.js"(exports2, module2) {
    var fetch2 = globalThis.fetch;
    async function siyuanPost(url, token, apiPath, params = {}) {
      const endpoint = url.replace(/\/$/, "") + apiPath;
      const response = await fetch2(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${token}`
        },
        body: JSON.stringify(params)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      const result = await response.json();
      if (result.code !== 0) {
        const err = new Error(`\u601D\u6E90 API \u9519\u8BEF (code: ${result.code}): ${result.msg}`);
        err.isSiyuanError = true;
        err.code = result.code;
        throw err;
      }
      return result.data;
    }
    module2.exports = {
      siyuanPost
    };
  }
});

// lib/sync_entity.js
var require_sync_entity = __commonJS({
  "lib/sync_entity.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    function generateObsTitle(content) {
      let text = content.replace(/^\d{4}-\d{2}-\d{2}:\s*/, "").trim();
      const match = text.match(/^(.{2,20}?)[，。、；：,\.;:\s]/);
      if (match) return match[1].trim();
      return text.length <= 20 ? text : text.substring(0, 15);
    }
    async function findDoc(url, token, notebookId, hpath) {
      try {
        const data = await siyuanPost(url, token, "/api/query/sql", {
          stmt: `SELECT id FROM blocks WHERE box='${notebookId}' AND type='d' AND hpath='${hpath}' LIMIT 1`
        });
        return Array.isArray(data) && data.length > 0 ? data[0].id : null;
      } catch {
        return null;
      }
    }
    function buildEntityMd({ name, entityType, date, tags, obsList, relations }) {
      const tagStr = (tags || [entityType]).join(", ");
      let md = "";
      md += "| \u5C5E\u6027 | \u503C |\n|------|-----|\n";
      md += "| category | MAIN_ENTITY |\n";
      md += `| type | \u5B9E\u4F53 |
`;
      md += `| entity_class | ${entityType} |
`;
      md += `| entity_label | ${name} |
`;
      md += `| created | ${date} |
`;
      md += `| tags | ${tagStr} |

`;
      md += `**\u5B9E\u4F53\u7C7B\u578B**: ${entityType}

`;
      md += "## \u57FA\u672C\u4FE1\u606F\n";
      md += `- **\u521B\u5EFA\u65F6\u95F4**: ${date}
`;
      md += `- **\u89C2\u5BDF\u6570\u91CF**: ${obsList.length}

`;
      md += "## \u5173\u8054\u5173\u7CFB\n";
      if (relations && relations.length > 0) {
        relations.forEach((r) => {
          md += `- ${r.relationType}: ${r.toEntity}
`;
        });
      } else {
        md += "<!-- \u6682\u65E0\u5173\u8054\u5173\u7CFB -->\n";
      }
      md += "\n";
      md += "### \u89C2\u5BDF\n";
      obsList.forEach((obs) => {
        md += `- ((${obs.id} '${obs.title}'))
`;
      });
      return md;
    }
    function buildObsMd(content, parentName, parentId, date) {
      let md = "";
      md += "| \u5C5E\u6027 | \u503C |\n|------|-----|\n";
      md += "| category | OBSERVATION |\n";
      md += "| type | \u89C2\u5BDF |\n";
      md += `| parent | ${parentName} |
`;
      md += `| created | ${date} |

`;
      md += `${date}: ${content}

`;
      md += "## \u5173\u8054\u5173\u7CFB\n";
      md += `- \u5C5E\u4E8E: ((${parentId} '${parentName}'))
`;
      return md;
    }
    async function syncEntity2(url, token, notebookId, entityData) {
      const {
        name,
        entityType,
        observations = [],
        tags,
        relations,
        createdAt
      } = entityData;
      const date = createdAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const basePath = `/${name}`;
      let entityId = await findDoc(url, token, notebookId, basePath);
      if (!entityId) {
        const result = await siyuanPost(url, token, "/api/filetree/createDocWithMd", {
          notebook: notebookId,
          path: basePath,
          markdown: ""
        });
        entityId = typeof result === "string" ? result : result.id || result;
      }
      const obsList = [];
      for (const obs of observations) {
        const content = typeof obs === "string" ? obs : obs.content;
        const title = generateObsTitle(content);
        const obsPath = `${basePath}/${title}`;
        const obsMd = buildObsMd(content, name, entityId, date);
        let obsId = await findDoc(url, token, notebookId, obsPath);
        if (obsId) {
          await siyuanPost(url, token, "/api/block/updateBlock", {
            dataType: "markdown",
            data: obsMd,
            id: obsId
          });
        } else {
          const result = await siyuanPost(url, token, "/api/filetree/createDocWithMd", {
            notebook: notebookId,
            path: obsPath,
            markdown: obsMd
          });
          obsId = typeof result === "string" ? result : result.id || result;
        }
        obsList.push({ id: obsId, title });
      }
      const entityMd = buildEntityMd({ name, entityType, date, tags, obsList, relations });
      await siyuanPost(url, token, "/api/block/updateBlock", {
        dataType: "markdown",
        data: entityMd,
        id: entityId
      });
      return { entityId, observations: obsList };
    }
    module2.exports = { syncEntity: syncEntity2, generateObsTitle };
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/common.js
var require_common = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/common.js"(exports2, module2) {
    "use strict";
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;
      else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = "", cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/exception.js
var require_exception = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/exception.js"(exports2, module2) {
    "use strict";
    function formatError(exception, compact) {
      var where = "", message = exception.reason || "(unknown reason)";
      if (!exception.mark) return message;
      if (exception.mark.name) {
        where += 'in "' + exception.mark.name + '" ';
      }
      where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
      if (!compact && exception.mark.snippet) {
        where += "\n\n" + exception.mark.snippet;
      }
      return message + " " + where;
    }
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = formatError(this, false);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      return this.name + ": " + formatError(this, compact);
    };
    module2.exports = YAMLException;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/snippet.js
var require_snippet = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/snippet.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
      var head = "";
      var tail = "";
      var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
      if (position - lineStart > maxHalfLength) {
        head = " ... ";
        lineStart = position - maxHalfLength + head.length;
      }
      if (lineEnd - position > maxHalfLength) {
        tail = " ...";
        lineEnd = position + maxHalfLength - tail.length;
      }
      return {
        str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
        pos: position - lineStart + head.length
        // relative position
      };
    }
    function padStart(string, max) {
      return common.repeat(" ", max - string.length) + string;
    }
    function makeSnippet(mark, options) {
      options = Object.create(options || null);
      if (!mark.buffer) return null;
      if (!options.maxLength) options.maxLength = 79;
      if (typeof options.indent !== "number") options.indent = 1;
      if (typeof options.linesBefore !== "number") options.linesBefore = 3;
      if (typeof options.linesAfter !== "number") options.linesAfter = 2;
      var re = /\r?\n|\r|\0/g;
      var lineStarts = [0];
      var lineEnds = [];
      var match;
      var foundLineNo = -1;
      while (match = re.exec(mark.buffer)) {
        lineEnds.push(match.index);
        lineStarts.push(match.index + match[0].length);
        if (mark.position <= match.index && foundLineNo < 0) {
          foundLineNo = lineStarts.length - 2;
        }
      }
      if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
      var result = "", i, line;
      var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
      var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
      for (i = 1; i <= options.linesBefore; i++) {
        if (foundLineNo - i < 0) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo - i],
          lineEnds[foundLineNo - i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
          maxLineLength
        );
        result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
      }
      line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
      for (i = 1; i <= options.linesAfter; i++) {
        if (foundLineNo + i >= lineEnds.length) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo + i],
          lineEnds[foundLineNo + i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
          maxLineLength
        );
        result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      }
      return result.replace(/\n$/, "");
    }
    module2.exports = makeSnippet;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type.js
var require_type = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "multi",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "representName",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.options = options;
      this.tag = tag;
      this.kind = options["kind"] || null;
      this.resolve = options["resolve"] || function() {
        return true;
      };
      this.construct = options["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options["instanceOf"] || null;
      this.predicate = options["predicate"] || null;
      this.represent = options["represent"] || null;
      this.representName = options["representName"] || null;
      this.defaultStyle = options["defaultStyle"] || null;
      this.multi = options["multi"] || false;
      this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema.js
var require_schema = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name) {
      var result = [];
      schema[name].forEach(function(currentType) {
        var newIndex = result.length;
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
            newIndex = previousIndex;
          }
        });
        result[newIndex] = currentType;
      });
      return result;
    }
    function compileMap() {
      var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: []
        }
      }, index, length;
      function collectType(type) {
        if (type.multi) {
          result.multi[type.kind].push(type);
          result.multi["fallback"].push(type);
        } else {
          result[type.kind][type.tag] = result["fallback"][type.tag] = type;
        }
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      return this.extend(definition);
    }
    Schema.prototype.extend = function extend(definition) {
      var implicit = [];
      var explicit = [];
      if (definition instanceof Type) {
        explicit.push(definition);
      } else if (Array.isArray(definition)) {
        explicit = explicit.concat(definition);
      } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
        if (definition.implicit) implicit = implicit.concat(definition.implicit);
        if (definition.explicit) explicit = explicit.concat(definition.explicit);
      } else {
        throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
      }
      implicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
        if (type.multi) {
          throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
        }
      });
      explicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
      });
      var result = Object.create(Schema.prototype);
      result.implicit = (this.implicit || []).concat(implicit);
      result.explicit = (this.explicit || []).concat(explicit);
      result.compiledImplicit = compileList(result, "implicit");
      result.compiledExplicit = compileList(result, "explicit");
      result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
      return result;
    };
    module2.exports = Schema;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/str.js
var require_str = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/str.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/seq.js
var require_seq = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/seq.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/map.js
var require_map = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/map.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/failsafe.js
var require_failsafe = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/failsafe.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/null.js
var require_null = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/null.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null) return true;
      var max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        },
        empty: function() {
          return "";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/bool.js
var require_bool = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/bool.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null) return false;
      var max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/int.js
var require_int = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/int.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    function isHexCode(c) {
      return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
    }
    function isOctCode(c) {
      return 48 <= c && c <= 55;
    }
    function isDecCode(c) {
      return 48 <= c && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null) return false;
      var max = data.length, index = 0, hasDigits = false, ch;
      if (!max) return false;
      ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (ch !== "0" && ch !== "1") return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "o") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isOctCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
      }
      if (ch === "_") return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits || ch === "_") return false;
      return true;
    }
    function constructYamlInteger(data) {
      var value = data, sign = 1, ch;
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") return 0;
      if (ch === "0") {
        if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
        if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/float.js
var require_float = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/float.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_") {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign;
      value = data.replace(/_/g, "").toLowerCase();
      sign = value[0] === "-" ? -1 : 1;
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/json.js
var require_json = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/json.js"(exports2, module2) {
    "use strict";
    module2.exports = require_failsafe().extend({
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/core.js
var require_core = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/core.js"(exports2, module2) {
    "use strict";
    module2.exports = require_json();
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/timestamp.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error("Date resolve error");
      year = +match[1];
      month = +match[2] - 1;
      day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 6e4;
        if (match[9] === "-") delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/merge.js
var require_merge = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/merge.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/binary.js
var require_binary = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/binary.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null) return false;
      var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64) continue;
        if (code < 0) return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      return new Uint8Array(result);
    }
    function representYamlBinary(object) {
      var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      return Object.prototype.toString.call(obj) === "[object Uint8Array]";
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/omap.js
var require_omap = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/omap.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;
            else return false;
          }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
        else return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/pairs.js
var require_pairs = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/pairs.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString.call(pair) !== "[object Object]") return false;
        keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/set.js
var require_set = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/set.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      var key, object = data;
      for (key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/default.js
var require_default = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/default.js"(exports2, module2) {
    "use strict";
    module2.exports = require_core().extend({
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/loader.js
var require_loader = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/loader.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var makeSnippet = require_snippet();
    var DEFAULT_SCHEMA = require_default();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 10 || c === 13;
    }
    function is_WHITE_SPACE(c) {
      return c === 9 || c === 32;
    }
    function is_WS_OR_EOL(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function is_FLOW_INDICATOR(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      var lc;
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      lc = c | 32;
      if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    function setProperty(object, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(object, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value
        });
      } else {
        object[key] = value;
      }
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    var i;
    function State(input, options) {
      this.input = input;
      this.filename = options["filename"] || null;
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.onWarning = options["onWarning"] || null;
      this.legacy = options["legacy"] || false;
      this.json = options["json"] || false;
      this.listener = options["listener"] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.firstTabInLine = -1;
      this.documents = [];
    }
    function generateError(state, message) {
      var mark = {
        name: state.filename,
        buffer: state.input.slice(0, -1),
        // omit trailing \0
        position: state.position,
        line: state.line,
        column: state.position - state.lineStart
      };
      mark.snippet = makeSnippet(mark);
      return new YAMLException(message, mark);
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        try {
          prefix = decodeURIComponent(prefix);
        } catch (err) {
          throwError(state, "tag prefix is malformed: " + prefix);
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty.call(destination, key)) {
          setProperty(destination, key, source[key]);
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
      var index, quantity;
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.lineStart = startLineStart || state.lineStart;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        setProperty(_result, keyNode, valueNode);
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
      state.firstTabInLine = -1;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          if (ch === 9 && state.firstTabInLine === -1) {
            state.firstTabInLine = state.position;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position, ch;
      ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 35) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        } else if (ch === 44) {
          throwError(state, "expected the node content, but found ','");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        _lineStart = state.lineStart;
        _pos = state.position;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (ch !== 45) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (!atExplicitKey && state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line;
        if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
          if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            break;
          }
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (atExplicitKey) {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
          }
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 33) return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      try {
        tagName = decodeURIComponent(tagName);
      } catch (err) {
        throwError(state, "tag name is malformed: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 38) return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 42) return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag === null) {
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      } else if (state.tag === "?") {
        if (state.result !== null && state.kind !== "scalar") {
          throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
        }
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (state.tag !== "!") {
        if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
        } else {
          type = null;
          typeList = state.typeMap.multi[state.kind || "fallback"];
          for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
            if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
              type = typeList[typeIndex];
              break;
            }
          }
        }
        if (!type) {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result, state.tag)) {
          throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
        } else {
          state.result = type.construct(state.result, state.tag);
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = /* @__PURE__ */ Object.create(null);
      state.anchorMap = /* @__PURE__ */ Object.create(null);
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch)) break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      var state = new State(input, options);
      var nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options) {
      if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
        options = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options) {
      var documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/dumper.js
var require_dumper = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/dumper.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var DEFAULT_SCHEMA = require_default();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_BOM = 65279;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null) return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    var QUOTING_TYPE_SINGLE = 1;
    var QUOTING_TYPE_DOUBLE = 2;
    function State(options) {
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.indent = Math.max(1, options["indent"] || 2);
      this.noArrayIndent = options["noArrayIndent"] || false;
      this.skipInvalid = options["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
      this.sortKeys = options["sortKeys"] || false;
      this.lineWidth = options["lineWidth"] || 80;
      this.noRefs = options["noRefs"] || false;
      this.noCompatMode = options["noCompatMode"] || false;
      this.condenseFlow = options["condenseFlow"] || false;
      this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
      this.forceQuotes = options["forceQuotes"] || false;
      this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
    }
    function isNsCharOrWhitespace(c) {
      return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev, inblock) {
      var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
      var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
      return (
        // ns-plain-safe
        (inblock ? (
          // c = flow-in
          cIsNsCharOrWhitespace
        ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
      );
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function isPlainSafeLast(c) {
      return !isWhitespace(c) && c !== CHAR_COLON;
    }
    function codePointAt(string, pos) {
      var first = string.charCodeAt(pos), second;
      if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
        second = string.charCodeAt(pos + 1);
        if (second >= 56320 && second <= 57343) {
          return (first - 55296) * 1024 + second - 56320 + 65536;
        }
      }
      return first;
    }
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
      var i;
      var char = 0;
      var prevChar = null;
      var hasLineBreak = false;
      var hasFoldableLine = false;
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1;
      var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
      if (singleLineOnly || forceQuotes) {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
      } else {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        if (plain && !forceQuotes && !testAmbiguousType(string)) {
          return STYLE_PLAIN;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      if (!forceQuotes) {
        return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    function writeScalar(state, string, level, iskey, inblock) {
      state.dump = function() {
        if (string.length === 0) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
        }
        if (!state.noCompatMode) {
          if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
          }
        }
        var indent = state.indent * Math.max(1, level);
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock
        )) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      }();
    }
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      var clip = string[string.length - 1] === "\n";
      var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      var chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      var lineRe = /(\n+)([^\n]*)/g;
      var result = function() {
        var nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      }();
      var prevMoreIndented = string[0] === "\n" || string[0] === " ";
      var moreIndented;
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") return line;
      var breakRe = / [^ ]/g;
      var match;
      var start = 0, end, curr = 0, next = 0;
      var result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      var result = "";
      var char = 0;
      var escapeSeq;
      for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        escapeSeq = ESCAPE_SEQUENCES[char];
        if (!escapeSeq && isPrintable(char)) {
          result += string[i];
          if (char >= 65536) result += string[i + 1];
        } else {
          result += escapeSeq || encodeHex(char);
        }
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
          if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
          if (!compact || _result !== "") {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (_result !== "") pairBuffer += ", ";
        if (state.condenseFlow) pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || _result !== "") {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          if (explicit) {
            if (type.multi && type.representName) {
              state.tag = type.representName(object);
            } else {
              state.tag = type.tag;
            }
          } else {
            state.tag = "?";
          }
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey, isblockseq) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      var inblock = block;
      var tagStr;
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          if (block && state.dump.length !== 0) {
            if (state.noArrayIndent && !isblockseq && level > 0) {
              writeBlockSequence(state, level - 1, state.dump, compact);
            } else {
              writeBlockSequence(state, level, state.dump, compact);
            }
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey, inblock);
          }
        } else if (type === "[object Undefined]") {
          return false;
        } else {
          if (state.skipInvalid) return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          tagStr = encodeURI(
            state.tag[0] === "!" ? state.tag.slice(1) : state.tag
          ).replace(/!/g, "%21");
          if (state.tag[0] === "!") {
            tagStr = "!" + tagStr;
          } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
            tagStr = "!!" + tagStr.slice(18);
          } else {
            tagStr = "!<" + tagStr + ">";
          }
          state.dump = tagStr + " " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [], duplicatesIndexes = [], index, length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === "object") {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options) {
      options = options || {};
      var state = new State(options);
      if (!state.noRefs) getDuplicateReferences(input, state);
      var value = input;
      if (state.replacer) {
        value = state.replacer.call({ "": value }, "", value);
      }
      if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
      return "";
    }
    module2.exports.dump = dump;
  }
});

// node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/index.js
var require_js_yaml = __commonJS({
  "node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/index.js"(exports2, module2) {
    "use strict";
    var loader = require_loader();
    var dumper = require_dumper();
    function renamed(from, to) {
      return function() {
        throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SCHEMA = require_default();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.YAMLException = require_exception();
    module2.exports.types = {
      binary: require_binary(),
      float: require_float(),
      map: require_map(),
      null: require_null(),
      pairs: require_pairs(),
      set: require_set(),
      timestamp: require_timestamp(),
      bool: require_bool(),
      int: require_int(),
      merge: require_merge(),
      omap: require_omap(),
      seq: require_seq(),
      str: require_str()
    };
    module2.exports.safeLoad = renamed("safeLoad", "load");
    module2.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
    module2.exports.safeDump = renamed("safeDump", "dump");
  }
});

// lib/output.js
var require_output = __commonJS({
  "lib/output.js"(exports2, module2) {
    var yaml = require_js_yaml();
    function formatOutput(data, format = "json") {
      if (format === "json") {
        console.log(JSON.stringify(data, null, 2));
      } else if (format === "yaml") {
        console.log(yaml.dump(data, { lineWidth: -1, noRefs: true }));
      } else if (format === "table") {
        console.table(data);
      } else {
        console.log(data);
      }
    }
    function showSuccess(message, details = {}) {
      console.log(`\u2705 ${message}`);
      Object.entries(details).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    function showError(message, details = {}) {
      console.error(`\u274C ${message}`);
      Object.entries(details).forEach(([key, value]) => {
        console.error(`   ${key}: ${value}`);
      });
    }
    module2.exports = {
      formatOutput,
      showSuccess,
      showError
    };
  }
});

// lib/cmd/notebook.js
var require_notebook = __commonJS({
  "lib/cmd/notebook.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    var yaml = require_js_yaml();
    async function cmdNotebookLs(url, token, options) {
      try {
        const data = await siyuanPost(url, token, "/api/notebook/lsNotebooks");
        const notebooks = data.notebooks || data || [];
        const opened = notebooks.filter((n) => !n.closed);
        const closed = notebooks.filter((n) => n.closed);
        if (options.format === "json") {
          formatOutput(notebooks, "json");
        } else if (options.format === "yaml") {
          console.log(yaml.dump(notebooks, { lineWidth: -1, noRefs: true }));
        } else {
          console.log(`
\u7B14\u8BB0\u672C\u5217\u8868 (\u5171 ${notebooks.length} \u4E2A\uFF0C\u5DF2\u6253\u5F00 ${opened.length} \u4E2A):
`);
          if (opened.length > 0) {
            console.log("\u{1F4C2} \u5DF2\u6253\u5F00:");
            opened.forEach((nb) => {
              console.log(`   ${nb.name}`);
              console.log(`      ID: ${nb.id}`);
            });
          }
          if (closed.length > 0) {
            console.log("\n\u{1F4C1} \u5DF2\u5173\u95ED:");
            closed.forEach((nb) => {
              console.log(`   ${nb.name}`);
              console.log(`      ID: ${nb.id}`);
            });
          }
        }
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u7B14\u8BB0\u672C\u5217\u8868\u5931\u8D25");
      }
    }
    async function cmdNotebookOpen(url, token, notebookId, options) {
      try {
        await siyuanPost(url, token, "/api/notebook/openNotebook", { notebook: notebookId });
        console.log(`\u2705 \u7B14\u8BB0\u672C ${notebookId} \u5DF2\u6253\u5F00`);
      } catch (error) {
        handleError2(error, `\u6253\u5F00\u7B14\u8BB0\u672C ${notebookId} \u5931\u8D25`);
      }
    }
    async function cmdNotebookClose(url, token, notebookId, options) {
      try {
        await siyuanPost(url, token, "/api/notebook/closeNotebook", { notebook: notebookId });
        console.log(`\u2705 \u7B14\u8BB0\u672C ${notebookId} \u5DF2\u5173\u95ED`);
      } catch (error) {
        handleError2(error, `\u5173\u95ED\u7B14\u8BB0\u672C ${notebookId} \u5931\u8D25`);
      }
    }
    async function cmdNotebookConf(url, token, notebookId, options) {
      try {
        const data = await siyuanPost(url, token, "/api/notebook/getNotebookConf", { notebook: notebookId });
        formatOutput(data, options.format || "yaml");
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u7B14\u8BB0\u672C ${notebookId} \u914D\u7F6E\u5931\u8D25`);
      }
    }
    async function cmdNotebookCreate(url, token, name, options) {
      if (!name) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7B14\u8BB0\u672C\u540D\u79F0");
        console.error("\u7528\u6CD5: node skill.js notebook create <name>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/notebook/createNotebook", { name });
        console.log(`\u2705 \u7B14\u8BB0\u672C\u5DF2\u521B\u5EFA: ${name}`);
        console.log(`   ID: ${data.id || data}`);
      } catch (error) {
        handleError2(error, `\u521B\u5EFA\u7B14\u8BB0\u672C ${name} \u5931\u8D25`);
      }
    }
    async function cmdNotebook2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "ls":
        case "list":
          await cmdNotebookLs(url, token, options);
          break;
        case "create":
          await cmdNotebookCreate(url, token, args[0], options);
          break;
        case "open":
          if (!args[0]) {
            console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7B14\u8BB0\u672C ID");
            console.error("\u7528\u6CD5: node skill.js notebook open <notebook-id>");
            process.exit(1);
          }
          await cmdNotebookOpen(url, token, args[0], options);
          break;
        case "close":
          if (!args[0]) {
            console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7B14\u8BB0\u672C ID");
            console.error("\u7528\u6CD5: node skill.js notebook close <notebook-id>");
            process.exit(1);
          }
          await cmdNotebookClose(url, token, args[0], options);
          break;
        case "conf":
          if (!args[0]) {
            console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7B14\u8BB0\u672C ID");
            console.error("\u7528\u6CD5: node skill.js notebook conf <notebook-id>");
            process.exit(1);
          }
          await cmdNotebookConf(url, token, args[0], options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u7B14\u8BB0\u672C\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: ls, create, open, close, conf");
          process.exit(1);
      }
    }
    module2.exports = { cmdNotebook: cmdNotebook2 };
  }
});

// lib/cmd/doc.js
var require_doc = __commonJS({
  "lib/cmd/doc.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdDocHPath(url, token, options) {
      const notebook = options.notebook;
      const docPath = options.path;
      if (!notebook || !docPath) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B --notebook \u548C --path \u53C2\u6570");
        console.error("\u7528\u6CD5: node skill.js doc hpath --notebook <id> --path <path>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/filetree/getHPathByPath", {
          notebook,
          path: docPath
        });
        formatOutput(data, options.format || "default");
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u6587\u6863 HPath \u5931\u8D25");
      }
    }
    async function cmdDocHPathById(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js doc hpath-by-id <block-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/filetree/getHPathByID", { id: blockId });
        formatOutput(data, options.format || "default");
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u5757 ${blockId} \u7684 HPath \u5931\u8D25`);
      }
    }
    async function cmdDocPathById(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js doc path-by-id <block-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/filetree/getPathByID", { id: blockId });
        formatOutput(data, options.format || "default");
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u5757 ${blockId} \u7684\u8DEF\u5F84\u5931\u8D25`);
      }
    }
    async function cmdDocIdsByHPath(url, token, options) {
      const notebook = options.notebook;
      const hPath = options.path;
      if (!notebook || !hPath) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B --notebook \u548C --path \u53C2\u6570");
        console.error("\u7528\u6CD5: node skill.js doc ids-by-hpath --notebook <id> --path <hpath>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/filetree/getIDsByHPath", {
          notebook,
          path: hPath
        });
        formatOutput(data, options.format || "json");
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u6587\u6863 ID \u5931\u8D25");
      }
    }
    async function cmdDocCreate(url, token, markdown, options) {
      const notebook = options.notebook;
      const docPath = options.path;
      const title = options.title;
      if (!notebook) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B --notebook \u53C2\u6570");
        console.error("\u7528\u6CD5: node skill.js doc create --notebook <id> --path <path> [--title <title>] <markdown>");
        process.exit(1);
      }
      if (!docPath) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B --path \u53C2\u6570");
        console.error("\u7528\u6CD5: node skill.js doc create --notebook <id> --path <path> [--title <title>] <markdown>");
        process.exit(1);
      }
      const md = markdown || "";
      try {
        const fullPath = docPath.startsWith("/") ? docPath : "/" + docPath;
        const params = { notebook, path: fullPath, markdown: md };
        const data = await siyuanPost(url, token, "/api/filetree/createDocWithMd", params);
        console.log(`\u2705 \u6587\u6863\u5DF2\u521B\u5EFA`);
        console.log(`   \u7B14\u8BB0\u672C: ${notebook}`);
        console.log(`   \u8DEF\u5F84: ${fullPath}`);
        if (data) {
          console.log(`   ID: ${typeof data === "string" ? data : data.id || JSON.stringify(data)}`);
        }
      } catch (error) {
        handleError2(error, `\u521B\u5EFA\u6587\u6863\u5931\u8D25`);
      }
    }
    async function cmdDocRemove(url, token, docId, options) {
      if (!docId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u6863 ID");
        console.error("\u7528\u6CD5: node skill.js doc remove <id>");
        process.exit(1);
      }
      try {
        await siyuanPost(url, token, "/api/filetree/removeDocByID", { id: docId });
        console.log(`\u2705 \u6587\u6863\u5DF2\u5220\u9664: ${docId}`);
      } catch (error) {
        handleError2(error, `\u5220\u9664\u6587\u6863 ${docId} \u5931\u8D25`);
      }
    }
    async function cmdDocRename(url, token, docId, options) {
      if (!docId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u6863 ID");
        console.error("\u7528\u6CD5: node skill.js doc rename <id> --title <new-title>");
        process.exit(1);
      }
      const title = options.title;
      if (!title) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B --title \u53C2\u6570");
        console.error("\u7528\u6CD5: node skill.js doc rename <id> --title <new-title>");
        process.exit(1);
      }
      try {
        await siyuanPost(url, token, "/api/filetree/renameDocByID", { id: docId, title });
        console.log(`\u2705 \u6587\u6863\u5DF2\u91CD\u547D\u540D: ${docId} \u2192 ${title}`);
      } catch (error) {
        handleError2(error, `\u91CD\u547D\u540D\u6587\u6863 ${docId} \u5931\u8D25`);
      }
    }
    async function cmdDoc2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "create":
          await cmdDocCreate(url, token, args[0], options);
          break;
        case "remove":
        case "rm":
        case "delete":
          await cmdDocRemove(url, token, args[0], options);
          break;
        case "rename":
          await cmdDocRename(url, token, args[0], options);
          break;
        case "hpath":
          await cmdDocHPath(url, token, options);
          break;
        case "hpath-by-id":
          await cmdDocHPathById(url, token, args[0], options);
          break;
        case "path-by-id":
          await cmdDocPathById(url, token, args[0], options);
          break;
        case "ids-by-hpath":
          await cmdDocIdsByHPath(url, token, options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u6587\u6863\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: create, remove, rename, hpath, hpath-by-id, path-by-id, ids-by-hpath");
          process.exit(1);
      }
    }
    module2.exports = { cmdDoc: cmdDoc2 };
  }
});

// lib/cmd/block.js
var require_block = __commonJS({
  "lib/cmd/block.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdBlockKramdown(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js block kramdown <block-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/block/getBlockKramdown", { id: blockId });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else {
          if (typeof data === "object" && data.kramdown) {
            console.log(data.kramdown);
          } else {
            formatOutput(data, "yaml");
          }
        }
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u5757 ${blockId} \u7684 Kramdown \u5931\u8D25`);
      }
    }
    async function cmdBlockChildren(url, token, parentId, options) {
      if (!parentId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7236\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js block children <parent-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/block/getChildBlocks", { id: parentId });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else if (options.format === "yaml") {
          formatOutput(data, "yaml");
        } else {
          const blocks = Array.isArray(data) ? data : [];
          console.log(`
\u5B50\u5757\u5217\u8868 (\u5171 ${blocks.length} \u4E2A):
`);
          blocks.forEach((block, idx) => {
            const type = block.type || "unknown";
            const content = block.content || block.markdown || "";
            const preview = content.substring(0, 80) + (content.length > 80 ? "..." : "");
            console.log(`${idx + 1}. [${type}] ${preview}`);
            console.log(`   ID: ${block.id}`);
          });
        }
      } catch (error) {
        handleError2(error, `\u83B7\u53D6 ${parentId} \u7684\u5B50\u5757\u5931\u8D25`);
      }
    }
    async function cmdBlockInsert(url, token, data, options) {
      if (!data) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B\u5757\u5185\u5BB9");
        console.error("\u7528\u6CD5: node skill.js block insert <markdown> --parentID <id> [--nextID <id>]");
        process.exit(1);
      }
      const hasAnchor = options.parentid || options.nextid || options.previousid;
      if (!hasAnchor) {
        console.error("\u9519\u8BEF: \u9700\u8981\u6307\u5B9A\u63D2\u5165\u4F4D\u7F6E\uFF08--parentID, --nextID \u6216 --previousID \u81F3\u5C11\u4E00\u4E2A\uFF09");
        process.exit(1);
      }
      try {
        const params = { dataType: "markdown", data };
        if (options.nextid) params.nextID = options.nextid;
        if (options.previousid) params.previousID = options.previousid;
        if (options.parentid) params.parentID = options.parentid;
        const result = await siyuanPost(url, token, "/api/block/insertBlock", params);
        console.log(`\u2705 \u5757\u5DF2\u63D2\u5165`);
        if (result) formatOutput(result, options.format || "json");
      } catch (error) {
        handleError2(error, "\u63D2\u5165\u5757\u5931\u8D25");
      }
    }
    async function cmdBlockPrepend(url, token, data, options) {
      if (!data || !options.parentid) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B\u5185\u5BB9\u548C --parentID");
        console.error("\u7528\u6CD5: node skill.js block prepend <markdown> --parentID <id>");
        process.exit(1);
      }
      try {
        const result = await siyuanPost(url, token, "/api/block/prependBlock", {
          dataType: "markdown",
          data,
          parentID: options.parentid
        });
        console.log(`\u2705 \u5B50\u5757\u5DF2\u524D\u7F6E\u63D2\u5165`);
        if (result) formatOutput(result, options.format || "json");
      } catch (error) {
        handleError2(error, "\u524D\u7F6E\u63D2\u5165\u5B50\u5757\u5931\u8D25");
      }
    }
    async function cmdBlockAppend(url, token, data, options) {
      if (!data || !options.parentid) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B\u5185\u5BB9\u548C --parentID");
        console.error("\u7528\u6CD5: node skill.js block append <markdown> --parentID <id>");
        process.exit(1);
      }
      try {
        const result = await siyuanPost(url, token, "/api/block/appendBlock", {
          dataType: "markdown",
          data,
          parentID: options.parentid
        });
        console.log(`\u2705 \u5B50\u5757\u5DF2\u540E\u7F6E\u63D2\u5165`);
        if (result) formatOutput(result, options.format || "json");
      } catch (error) {
        handleError2(error, "\u540E\u7F6E\u63D2\u5165\u5B50\u5757\u5931\u8D25");
      }
    }
    async function cmdBlockUpdate(url, token, blockId, data, options) {
      if (!blockId || !data) {
        console.error("\u9519\u8BEF: \u9700\u8981\u63D0\u4F9B\u5757 ID \u548C\u65B0\u5185\u5BB9");
        console.error("\u7528\u6CD5: node skill.js block update <id> <markdown>");
        process.exit(1);
      }
      try {
        const result = await siyuanPost(url, token, "/api/block/updateBlock", {
          dataType: "markdown",
          data,
          id: blockId
        });
        console.log(`\u2705 \u5757\u5DF2\u66F4\u65B0: ${blockId}`);
        if (result) formatOutput(result, options.format || "json");
      } catch (error) {
        handleError2(error, `\u66F4\u65B0\u5757 ${blockId} \u5931\u8D25`);
      }
    }
    async function cmdBlockDelete(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js block delete <id>");
        process.exit(1);
      }
      try {
        await siyuanPost(url, token, "/api/block/deleteBlock", { id: blockId });
        console.log(`\u2705 \u5757\u5DF2\u5220\u9664: ${blockId}`);
      } catch (error) {
        handleError2(error, `\u5220\u9664\u5757 ${blockId} \u5931\u8D25`);
      }
    }
    async function cmdBlockMove(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js block move <id> --previousID <id> \u6216 --parentID <id>");
        process.exit(1);
      }
      if (!options.previousid && !options.parentid) {
        console.error("\u9519\u8BEF: \u9700\u8981\u6307\u5B9A\u76EE\u6807\u4F4D\u7F6E\uFF08--previousID \u6216 --parentID\uFF09");
        process.exit(1);
      }
      try {
        const params = { id: blockId };
        if (options.previousid) params.previousID = options.previousid;
        if (options.parentid) params.parentID = options.parentid;
        await siyuanPost(url, token, "/api/block/moveBlock", params);
        console.log(`\u2705 \u5757\u5DF2\u79FB\u52A8: ${blockId}`);
      } catch (error) {
        handleError2(error, `\u79FB\u52A8\u5757 ${blockId} \u5931\u8D25`);
      }
    }
    async function cmdBlock2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "kramdown":
          await cmdBlockKramdown(url, token, args[0], options);
          break;
        case "children":
          await cmdBlockChildren(url, token, args[0], options);
          break;
        case "insert":
          await cmdBlockInsert(url, token, args[0], options);
          break;
        case "prepend":
          await cmdBlockPrepend(url, token, args[0], options);
          break;
        case "append":
          await cmdBlockAppend(url, token, args[0], options);
          break;
        case "update":
          await cmdBlockUpdate(url, token, args[0], args[1], options);
          break;
        case "delete":
        case "rm":
          await cmdBlockDelete(url, token, args[0], options);
          break;
        case "move":
          await cmdBlockMove(url, token, args[0], options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u5757\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: kramdown, children, insert, prepend, append, update, delete, move");
          process.exit(1);
      }
    }
    module2.exports = { cmdBlock: cmdBlock2 };
  }
});

// lib/cmd/attr.js
var require_attr = __commonJS({
  "lib/cmd/attr.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdAttrGet(url, token, blockId, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js attr get <block-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/attr/getBlockAttrs", { id: blockId });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else {
          console.log(`
\u5757 ${blockId} \u7684\u5C5E\u6027:
`);
          if (typeof data === "object" && data !== null) {
            Object.entries(data).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });
          } else {
            formatOutput(data, "yaml");
          }
        }
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u5757 ${blockId} \u7684\u5C5E\u6027\u5931\u8D25`);
      }
    }
    async function cmdAttrSet(url, token, blockId, attrsJson, options) {
      if (!blockId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757 ID");
        console.error("\u7528\u6CD5: node skill.js attr set <id> '<json-attrs>'");
        process.exit(1);
      }
      let attrs;
      if (attrsJson) {
        try {
          attrs = JSON.parse(attrsJson);
        } catch (e) {
          console.error("\u9519\u8BEF: \u5C5E\u6027\u5FC5\u987B\u662F\u6709\u6548\u7684 JSON \u683C\u5F0F");
          console.error(`\u793A\u4F8B: node skill.js attr set <id> '{"custom-tag":"\u91CD\u8981"}'`);
          process.exit(1);
        }
      } else if (options.attrs) {
        try {
          attrs = JSON.parse(options.attrs);
        } catch (e) {
          console.error("\u9519\u8BEF: --attrs \u53C2\u6570\u5FC5\u987B\u662F\u6709\u6548\u7684 JSON \u683C\u5F0F");
          process.exit(1);
        }
      } else {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B\u5C5E\u6027 JSON");
        console.error(`\u7528\u6CD5: node skill.js attr set <id> '{"custom-tag":"\u91CD\u8981"}'`);
        process.exit(1);
      }
      try {
        await siyuanPost(url, token, "/api/attr/setBlockAttrs", { id: blockId, attrs });
        console.log(`\u2705 \u5757\u5C5E\u6027\u5DF2\u66F4\u65B0: ${blockId}`);
        console.log(`   \u5C5E\u6027: ${JSON.stringify(attrs)}`);
      } catch (error) {
        handleError2(error, `\u8BBE\u7F6E\u5757 ${blockId} \u7684\u5C5E\u6027\u5931\u8D25`);
      }
    }
    async function cmdAttr2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "get":
          await cmdAttrGet(url, token, args[0], options);
          break;
        case "set":
          await cmdAttrSet(url, token, args[0], args[1], options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u5C5E\u6027\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: get, set");
          process.exit(1);
      }
    }
    module2.exports = { cmdAttr: cmdAttr2 };
  }
});

// lib/cmd/sql.js
var require_sql = __commonJS({
  "lib/cmd/sql.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdSql2(url, token, stmt, options) {
      if (!stmt) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B SQL \u8BED\u53E5");
        console.error('\u7528\u6CD5: node skill.js sql "SELECT * FROM blocks LIMIT 10"');
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/query/sql", { stmt });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else if (options.format === "yaml") {
          formatOutput(data, "yaml");
        } else {
          const rows = Array.isArray(data) ? data : [];
          console.log(`
\u67E5\u8BE2\u7ED3\u679C: ${rows.length} \u884C
`);
          if (rows.length === 0) {
            console.log("(\u65E0\u6570\u636E)");
            return;
          }
          if (rows.length <= 50) {
            rows.forEach((row, idx) => {
              const preview = Object.entries(row).slice(0, 5).map(([k, v]) => {
                const val = String(v || "");
                return `${k}: ${val.substring(0, 50)}${val.length > 50 ? "..." : ""}`;
              }).join(" | ");
              console.log(`${idx + 1}. ${preview}`);
            });
          } else {
            console.table(rows.slice(0, 100));
            if (rows.length > 100) {
              console.log(`(\u4EC5\u663E\u793A\u524D 100 \u884C\uFF0C\u5171 ${rows.length} \u884C)`);
            }
          }
        }
      } catch (error) {
        handleError2(error, "SQL \u67E5\u8BE2\u5931\u8D25");
      }
    }
    module2.exports = { cmdSql: cmdSql2 };
  }
});

// lib/cmd/file.js
var require_file = __commonJS({
  "lib/cmd/file.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdFileGet(url, token, filePath, options) {
      if (!filePath) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u4EF6\u8DEF\u5F84");
        console.error("\u7528\u6CD5: node skill.js file get <path>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/file/getFile", { path: filePath });
        if (typeof data === "string") {
          console.log(data);
        } else {
          formatOutput(data, options.format || "json");
        }
      } catch (error) {
        handleError2(error, `\u83B7\u53D6\u6587\u4EF6 ${filePath} \u5931\u8D25`);
      }
    }
    async function cmdFileLs(url, token, dirPath, options) {
      if (!dirPath) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u76EE\u5F55\u8DEF\u5F84");
        console.error("\u7528\u6CD5: node skill.js file ls <path>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/file/readDir", { path: dirPath });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else if (options.format === "yaml") {
          formatOutput(data, "yaml");
        } else {
          const items = Array.isArray(data) ? data : [];
          console.log(`
\u76EE\u5F55 ${dirPath} (\u5171 ${items.length} \u9879):
`);
          items.forEach((item) => {
            const isDir = item.isDir || item.isSymlink;
            const icon = isDir ? "\u{1F4C1}" : "\u{1F4C4}";
            const size = item.size ? ` (${formatSize(item.size)})` : "";
            console.log(`  ${icon} ${item.name}${size}`);
          });
        }
      } catch (error) {
        handleError2(error, `\u5217\u51FA\u76EE\u5F55 ${dirPath} \u5931\u8D25`);
      }
    }
    function formatSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    async function cmdFile2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "get":
          await cmdFileGet(url, token, args[0], options);
          break;
        case "ls":
          await cmdFileLs(url, token, args[0], options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u6587\u4EF6\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: get, ls");
          process.exit(1);
      }
    }
    module2.exports = { cmdFile: cmdFile2 };
  }
});

// lib/cmd/export.js
var require_export = __commonJS({
  "lib/cmd/export.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { formatOutput } = require_output();
    var { handleError: handleError2 } = require_errors();
    async function cmdExportMd(url, token, docId, options) {
      if (!docId) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u6863 ID");
        console.error("\u7528\u6CD5: node skill.js export md <doc-id>");
        process.exit(1);
      }
      try {
        const data = await siyuanPost(url, token, "/api/export/exportMdContent", { id: docId });
        if (options.format === "json") {
          formatOutput(data, "json");
        } else if (options.format === "yaml") {
          formatOutput(data, "yaml");
        } else {
          if (data && typeof data === "object") {
            const content = data.content || data.markdown || "";
            const hPath = data.hPath || "";
            if (hPath) {
              console.log(`
\u6587\u6863\u8DEF\u5F84: ${hPath}
`);
            }
            if (content) {
              console.log(content);
            } else {
              formatOutput(data, "yaml");
            }
          } else if (typeof data === "string") {
            console.log(data);
          } else {
            formatOutput(data, "yaml");
          }
        }
      } catch (error) {
        handleError2(error, `\u5BFC\u51FA\u6587\u6863 ${docId} \u5931\u8D25`);
      }
    }
    async function cmdExport2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "md":
          await cmdExportMd(url, token, args[0], options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u5BFC\u51FA\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: md");
          process.exit(1);
      }
    }
    module2.exports = { cmdExport: cmdExport2 };
  }
});

// lib/cmd/system.js
var require_system = __commonJS({
  "lib/cmd/system.js"(exports2, module2) {
    var { siyuanPost } = require_api();
    var { handleError: handleError2 } = require_errors();
    async function cmdSystemVersion(url, token, options) {
      try {
        const data = await siyuanPost(url, token, "/api/system/version");
        console.log(`\u601D\u6E90\u7B14\u8BB0\u7248\u672C: ${data}`);
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u7CFB\u7EDF\u7248\u672C\u5931\u8D25");
      }
    }
    async function cmdSystemTime(url, token, options) {
      try {
        const data = await siyuanPost(url, token, "/api/system/currentTime");
        const ts = typeof data === "number" ? data : parseInt(data);
        if (!isNaN(ts)) {
          const date = new Date(ts);
          console.log(`\u670D\u52A1\u5668\u65F6\u95F4: ${date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);
          console.log(`\u65F6\u95F4\u6233: ${ts}`);
        } else {
          console.log(`\u670D\u52A1\u5668\u65F6\u95F4: ${data}`);
        }
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u670D\u52A1\u5668\u65F6\u95F4\u5931\u8D25");
      }
    }
    async function cmdSystemBoot(url, token, options) {
      try {
        const data = await siyuanPost(url, token, "/api/system/bootProgress");
        const progress = data.progress || data;
        const details = data.details || "";
        if (typeof progress === "number" && progress >= 100) {
          console.log(`\u542F\u52A8\u72B6\u6001: \u5DF2\u5C31\u7EEA (${progress}%)`);
        } else {
          console.log(`\u542F\u52A8\u8FDB\u5EA6: ${progress}%`);
          if (details) {
            console.log(`\u8BE6\u60C5: ${details}`);
          }
        }
      } catch (error) {
        handleError2(error, "\u83B7\u53D6\u542F\u52A8\u8FDB\u5EA6\u5931\u8D25");
      }
    }
    async function cmdSystem2(url, token, subCmd, args, options) {
      switch (subCmd) {
        case "version":
          await cmdSystemVersion(url, token, options);
          break;
        case "time":
          await cmdSystemTime(url, token, options);
          break;
        case "boot":
          await cmdSystemBoot(url, token, options);
          break;
        default:
          console.error(`\u9519\u8BEF: \u672A\u77E5\u7CFB\u7EDF\u5B50\u547D\u4EE4: ${subCmd}`);
          console.error("\u53EF\u7528\u5B50\u547D\u4EE4: version, time, boot");
          process.exit(1);
      }
    }
    module2.exports = { cmdSystem: cmdSystem2 };
  }
});

// lib/cmd/index.js
var require_cmd = __commonJS({
  "lib/cmd/index.js"(exports2, module2) {
    var { cmdNotebook: cmdNotebook2 } = require_notebook();
    var { cmdDoc: cmdDoc2 } = require_doc();
    var { cmdBlock: cmdBlock2 } = require_block();
    var { cmdAttr: cmdAttr2 } = require_attr();
    var { cmdSql: cmdSql2 } = require_sql();
    var { cmdFile: cmdFile2 } = require_file();
    var { cmdExport: cmdExport2 } = require_export();
    var { cmdSystem: cmdSystem2 } = require_system();
    module2.exports = {
      cmdNotebook: cmdNotebook2,
      cmdDoc: cmdDoc2,
      cmdBlock: cmdBlock2,
      cmdAttr: cmdAttr2,
      cmdSql: cmdSql2,
      cmdFile: cmdFile2,
      cmdExport: cmdExport2,
      cmdSystem: cmdSystem2
    };
  }
});

// run.js
var fetch = globalThis.fetch;
var SKILL_VERSION = true ? "260529.103831" : "0.0.1-dev";
var { parseArgs } = require_parser();
var { handleError } = require_errors();
var { resolve: resolveEnv } = require_env();
var { syncEntity } = require_sync_entity();
var {
  cmdNotebook,
  cmdDoc,
  cmdBlock,
  cmdAttr,
  cmdSql,
  cmdFile,
  cmdExport,
  cmdSystem
} = require_cmd();
function showHelp() {
  console.log(`
\u601D\u6E90\u7B14\u8BB0 REST API \u5DE5\u5177 v${SKILL_VERSION}

\u7528\u6CD5:
  node skill.js <command> [subcommand] [args...] [options]

\u547D\u4EE4:
  notebook <subcommand>          \u7B14\u8BB0\u672C\u64CD\u4F5C
  doc <subcommand>               \u6587\u6863\u8DEF\u5F84\u67E5\u8BE2
  block <subcommand>             \u5757\u67E5\u8BE2
  attr <subcommand>              \u5C5E\u6027\u67E5\u8BE2
  sql <stmt>                     SQL \u67E5\u8BE2
  file <subcommand>              \u6587\u4EF6\u64CD\u4F5C
  export <subcommand>            \u5BFC\u51FA
  system <subcommand>            \u7CFB\u7EDF\u4FE1\u606F
  sync <notebook-id> '<json>'    \u4ECE Memory MCP \u540C\u6B65\u5B9E\u4F53\u5230\u601D\u6E90

\u7B14\u8BB0\u672C\u5B50\u547D\u4EE4:
  ls                             \u5217\u51FA\u6240\u6709\u7B14\u8BB0\u672C
  create <name>                  \u521B\u5EFA\u7B14\u8BB0\u672C
  open <id>                      \u6253\u5F00\u7B14\u8BB0\u672C
  close <id>                     \u5173\u95ED\u7B14\u8BB0\u672C
  conf <id>                      \u83B7\u53D6\u7B14\u8BB0\u672C\u914D\u7F6E

\u6587\u6863\u5B50\u547D\u4EE4:
  create --notebook <id> --path <path> <markdown>  \u521B\u5EFA\u6587\u6863
  remove <id>                    \u5220\u9664\u6587\u6863
  rename <id> --title <title>    \u91CD\u547D\u540D\u6587\u6863
  hpath --notebook <id> --path <path>   \u901A\u8FC7\u5B58\u50A8\u8DEF\u5F84\u83B7\u53D6\u4EBA\u7C7B\u53EF\u8BFB\u8DEF\u5F84
  hpath-by-id <id>                      \u901A\u8FC7\u5757 ID \u83B7\u53D6\u4EBA\u7C7B\u53EF\u8BFB\u8DEF\u5F84
  path-by-id <id>                       \u901A\u8FC7\u5757 ID \u83B7\u53D6\u5B58\u50A8\u8DEF\u5F84
  ids-by-hpath --notebook <id> --path <hpath>  \u901A\u8FC7\u4EBA\u7C7B\u53EF\u8BFB\u8DEF\u5F84\u83B7\u53D6 ID

\u5757\u5B50\u547D\u4EE4:
  kramdown <id>                  \u83B7\u53D6\u5757\u7684 Kramdown \u5185\u5BB9
  children <id>                  \u83B7\u53D6\u5B50\u5757\u5217\u8868
  insert <md> --parentID <id>    \u63D2\u5165\u5757\uFF08\u4E5F\u53EF\u7528 --nextID / --previousID\uFF09
  prepend <md> --parentID <id>   \u524D\u7F6E\u63D2\u5165\u5B50\u5757
  append <md> --parentID <id>    \u540E\u7F6E\u63D2\u5165\u5B50\u5757
  update <id> <md>               \u66F4\u65B0\u5757\u5185\u5BB9
  delete <id>                    \u5220\u9664\u5757
  move <id> --previousID <id>    \u79FB\u52A8\u5757\uFF08\u6216 --parentID\uFF09

\u5C5E\u6027\u5B50\u547D\u4EE4:
  get <id>                       \u83B7\u53D6\u5757\u5C5E\u6027
  set <id> '<json-attrs>'        \u8BBE\u7F6E\u5757\u5C5E\u6027

\u6587\u4EF6\u5B50\u547D\u4EE4:
  get <path>                     \u83B7\u53D6\u6587\u4EF6\u5185\u5BB9
  ls <path>                      \u5217\u51FA\u76EE\u5F55\u5185\u5BB9

\u5BFC\u51FA\u5B50\u547D\u4EE4:
  md <id>                        \u5BFC\u51FA\u6587\u6863\u4E3A Markdown

\u7CFB\u7EDF\u5B50\u547D\u4EE4:
  version                        \u83B7\u53D6\u601D\u6E90\u7B14\u8BB0\u7248\u672C
  time                           \u83B7\u53D6\u670D\u52A1\u5668\u65F6\u95F4
  boot                           \u83B7\u53D6\u542F\u52A8\u8FDB\u5EA6

\u9009\u9879:
  --format <type>                \u8F93\u51FA\u683C\u5F0F\uFF08json/yaml/table/default\uFF09
  --notebook <id>                \u7B14\u8BB0\u672C ID
  --path <path>                  \u8DEF\u5F84

\u73AF\u5883\u53D8\u91CF:
  SIYUAN_URL                     \u601D\u6E90\u7B14\u8BB0\u5730\u5740\uFF08\u9ED8\u8BA4 http://127.0.0.1:6806\uFF09
  SIYUAN_API_TOKEN                API Token\uFF08\u8BBE\u7F6E > \u5173\u4E8E \u4E2D\u83B7\u53D6\uFF09

\u793A\u4F8B:
  # \u67E5\u770B\u7CFB\u7EDF\u7248\u672C
  node skill.js system version

  # \u5217\u51FA\u7B14\u8BB0\u672C
  node skill.js notebook ls

  # SQL \u67E5\u8BE2
  node skill.js sql "SELECT * FROM blocks WHERE type=\\'d\\' LIMIT 10"

  # \u5BFC\u51FA\u6587\u6863\u4E3A Markdown
  node skill.js export md 20231230123456-abcdef

  # \u83B7\u53D6\u5757\u5C5E\u6027
  node skill.js attr get 20231230123456-abcdef

  # \u83B7\u53D6\u5757\u7684 Kramdown \u5185\u5BB9
  node skill.js block kramdown 20231230123456-abcdef

  # \u4F7F\u7528\u73AF\u5883\u53D8\u91CF\u7B80\u5316\u547D\u4EE4
  export SIYUAN_URL="http://127.0.0.1:6806"
  export SIYUAN_API_TOKEN="your-token"
  node skill.js notebook ls
  node skill.js sql "SELECT * FROM blocks LIMIT 5"

\u5FEB\u6377\u9009\u9879:
  -h, --help     \u663E\u793A\u6B64\u5E2E\u52A9\u4FE1\u606F
  -v, --version  \u663E\u793A\u7248\u672C\u4FE1\u606F
`);
}
function showVersion() {
  console.log(`\u601D\u6E90\u7B14\u8BB0 REST API \u5DE5\u5177 v${SKILL_VERSION}`);
  console.log("\u9ED8\u8BA4\u7AEF\u70B9: http://127.0.0.1:6806");
}
function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  if (options.v || options.version) {
    showVersion();
    return;
  }
  if (!positional[0] || options.h || options.help) {
    showHelp();
    return;
  }
  const command = positional[0];
  const { url, token, args } = resolveEnv(positional.slice(1));
  if (!url) {
    console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B\u601D\u6E90\u7B14\u8BB0\u670D\u52A1\u5730\u5740");
    console.error("\u53EF\u4EE5\u901A\u8FC7\u4EE5\u4E0B\u65B9\u5F0F\u63D0\u4F9B:");
    console.error("  1. \u547D\u4EE4\u53C2\u6570: node skill.js notebook ls <url> <token>");
    console.error("  2. \u73AF\u5883\u53D8\u91CF: export SIYUAN_URL=http://127.0.0.1:6806");
    console.error("  3. \u540C\u76EE\u5F55 .env \u6587\u4EF6: SIYUAN_URL=http://127.0.0.1:6806");
    process.exit(1);
  }
  if (!token) {
    console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B API Token");
    console.error("\u53EF\u4EE5\u901A\u8FC7\u4EE5\u4E0B\u65B9\u5F0F\u63D0\u4F9B:");
    console.error("  1. \u547D\u4EE4\u53C2\u6570: node skill.js notebook ls <url> <token>");
    console.error("  2. \u73AF\u5883\u53D8\u91CF: export SIYUAN_API_TOKEN=your-token");
    console.error("  3. \u540C\u76EE\u5F55 .env \u6587\u4EF6: SIYUAN_API_TOKEN=your-token");
    console.error("\n\u{1F4A1} Token \u83B7\u53D6\u8DEF\u5F84: \u601D\u6E90\u7B14\u8BB0 > \u8BBE\u7F6E > \u5173\u4E8E > API Token");
    process.exit(1);
  }
  switch (command) {
    case "notebook":
    case "nb":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7B14\u8BB0\u672C\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js notebook <ls|create|open|close|conf> [args...]");
        process.exit(1);
      }
      cmdNotebook(url, token, args[0], args.slice(1), options);
      break;
    case "doc":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u6863\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js doc <create|remove|rename|hpath|hpath-by-id|path-by-id|ids-by-hpath> [args...]");
        process.exit(1);
      }
      cmdDoc(url, token, args[0], args.slice(1), options);
      break;
    case "block":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5757\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js block <kramdown|children|insert|prepend|append|update|delete|move> [args...]");
        process.exit(1);
      }
      cmdBlock(url, token, args[0], args.slice(1), options);
      break;
    case "attr":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5C5E\u6027\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js attr <get|set> <id> [args...]");
        process.exit(1);
      }
      cmdAttr(url, token, args[0], args.slice(1), options);
      break;
    case "sql":
    case "query":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u63D0\u4F9B SQL \u8BED\u53E5");
        console.error('\u7528\u6CD5: node skill.js sql "SELECT * FROM blocks LIMIT 10"');
        process.exit(1);
      }
      cmdSql(url, token, args[0], options);
      break;
    case "file":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u6587\u4EF6\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js file <get|ls> <path>");
        process.exit(1);
      }
      cmdFile(url, token, args[0], args.slice(1), options);
      break;
    case "export":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u5BFC\u51FA\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js export <md> <id>");
        process.exit(1);
      }
      cmdExport(url, token, args[0], args.slice(1), options);
      break;
    case "system":
    case "sys":
      if (!args[0]) {
        console.error("\u9519\u8BEF: \u8BF7\u6307\u5B9A\u7CFB\u7EDF\u5B50\u547D\u4EE4");
        console.error("\u7528\u6CD5: node skill.js system <version|time|boot>");
        process.exit(1);
      }
      cmdSystem(url, token, args[0], args.slice(1), options);
      break;
    case "sync":
      if (!args[0] || !args[1]) {
        console.error("\u9519\u8BEF: sync \u9700\u8981 <notebook-id> \u548C\u5B9E\u4F53 JSON");
        console.error(`\u7528\u6CD5: node skill.js sync <notebook-id> '{"name":"...","entityType":"...","observations":["..."]}'`);
        process.exit(1);
      }
      (async () => {
        try {
          const entityData = JSON.parse(args[1]);
          const result = await syncEntity(url, token, args[0], entityData);
          console.log(`\u2705 \u540C\u6B65\u5B8C\u6210`);
          console.log(`   \u5B9E\u4F53: ${entityData.name} (ID: ${result.entityId})`);
          console.log(`   \u89C2\u5BDF: ${result.observations.length} \u6761`);
          result.observations.forEach((obs) => {
            console.log(`     - ${obs.title} (${obs.id})`);
          });
        } catch (error) {
          handleError(error, "\u540C\u6B65\u5B9E\u4F53\u5931\u8D25");
        }
      })();
      break;
    default:
      console.error(`\u9519\u8BEF: \u672A\u77E5\u547D\u4EE4: ${command}`);
      console.error("\u4F7F\u7528 --help \u67E5\u770B\u53EF\u7528\u547D\u4EE4");
      process.exit(1);
  }
}
main();
