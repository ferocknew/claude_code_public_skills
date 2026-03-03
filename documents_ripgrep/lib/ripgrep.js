/**
 * ripgrep 搜索模块
 */

const { execSync } = require("child_process");
const { TEXT_EXTENSIONS } = require("./config");

/**
 * 使用 ripgrep 搜索文本文件
 * @param {string} targetPath - 搜索目录或文件路径
 * @param {string} searchKeyword - 搜索关键词
 * @param {object} options - 搜索选项
 * @param {Array} results - 结果数组
 * @returns {number} 找到的匹配数量
 */
function searchWithRipgrep(targetPath, searchKeyword, options, results) {
  console.log("📄 搜索文本文件...");

  try {
    // 构建 ripgrep 命令参数
    const rgArgs = [
      "--json",           // JSON 输出格式
      "--max-count", String(options.maxResults),
    ];

    if (!options.caseSensitive) {
      rgArgs.push("--ignore-case");
    }

    if (options.wholeWord) {
      rgArgs.push("--word-regexp");
    }

    if (!options.regex) {
      rgArgs.push("--fixed-strings");
    }

    // 添加文件类型过滤
    rgArgs.push("--type-add", "text:*{txt,md,json,js,ts,jsx,tsx,py,java,c,cpp,h,hpp,css,scss,html,xml,yaml,yml,sh,bash,zsh,csv,log,ini,conf,cfg,go,rs,rb,php,lua,sql,vue,svelte,astro}");
    rgArgs.push("-t", "text");

    // 排除 node_modules 和打包文件
    rgArgs.push("--glob", "!node_modules/**");
    rgArgs.push("--glob", "!**/skill.js");
    rgArgs.push("--glob", "!**/skill-analyze.js");
    rgArgs.push("--glob", "!**/*.min.js");

    rgArgs.push(searchKeyword);
    rgArgs.push(targetPath);

    // 查找 ripgrep 可执行文件
    let rgPath;
    try {
      // 优先使用 @vscode/ripgrep
      const rgModule = require("@vscode/ripgrep");
      rgPath = rgModule.rgPath;
      const fs = require("fs");
      // 检查文件是否存在
      if (!fs.existsSync(rgPath)) {
        rgPath = null;
      }
    } catch {
      rgPath = null;
    }

    // 回退到系统 ripgrep
    if (!rgPath) {
      rgPath = "rg";
    }

    const output = execSync(`"${rgPath}" ${rgArgs.map(a => `"${a}"`).join(" ")}`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    }).toString();

    // 解析 JSON 输出
    const lines = output.split("\n").filter(Boolean);
    let count = 0;

    for (const line of lines) {
      if (count >= options.maxResults) break;

      try {
        const data = JSON.parse(line);
        if (data.type === "match") {
          const match = data.data;
          const submatch = match.submatches[0];
          results.push({
            file: match.path.text,
            line: match.line_number,
            column: submatch?.start || 0,
            content: match.lines.text,  // 保留原始内容，不 trim
            matchStart: submatch?.start || 0,
            matchEnd: submatch?.end || 0,
            type: "text",
          });
          count++;
        }
      } catch {
        // 忽略解析错误
      }
    }

    console.log(`  ✓ 找到 ${count} 个文本文件匹配`);
    return count;
  } catch (err) {
    if (err.status === 1) {
      // ripgrep 返回 1 表示没有匹配
      console.log("  ✓ 未找到文本文件匹配");
    } else {
      console.log(`  ⚠ 文本文件搜索出错: ${err.message}`);
    }
    return 0;
  }
}

exports.searchWithRipgrep = searchWithRipgrep;
