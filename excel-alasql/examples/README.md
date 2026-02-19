# 跨平台运行指南 - 无需 node_modules

## 推荐方式：npm scripts（Windows/macOS/Linux 通用）

```bash
cd .claude/skills/excel-alasql/examples

# 运行测试
npm test

# 快速开始
npm run quick

# 中文文件名测试
npm run chinese

# 读取各种格式
npm run read
```

**优点:**
- ✅ **全平台兼容**（Windows, macOS, Linux）
- ✅ **不产生 node_modules 目录**
- ✅ **无需手动安装依赖**
- ✅ **首次运行自动下载，之后使用 npm 缓存**
- ✅ **工作目录完全干净**

---

## 直接使用 npx（跨平台）

```bash
# 完整参数（推荐）
npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node script.js

# 简写（仅在支持 -p 的平台）
npx -y -p alasql@1.7.3 -p xlsx@0.18.5 node script.js
```

---

## 各平台使用方式

### Windows

```bash
# 方式 1: npm scripts（推荐）
npm test

# 方式 2: 直接 npx
npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node run.js
```

### Linux/macOS

```bash
# 方式 1: npm scripts（推荐）
npm test

# 方式 2: 直接 npx
npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node run.js

# 方式 3: Shebang（如果脚本有 #! 开头）
chmod +x script.js
./script.js
```

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm test` | 测试完整参数 npx 方式 |
| `npm run quick` | 快速开始示例 |
| `npm run chinese` | 中文文件名测试 |
| `npm run read` | 读取各种格式 |
| `npm run shebang` | Shebang 示例 |

---

## 工作原理

### npm scripts 方式

package.json 中定义：
```json
{
  "scripts": {
    "test": "npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node run.js"
  }
}
```

运行 `npm test` 时，npm 会：
1. 检查全局缓存是否有 alasql@1.7.3 和 xlsx@0.18.5
2. 如果没有，自动下载到 npm 缓存
3. 使用缓存中的包运行脚本

### 首次运行

首运行会看到下载信息：
```
npm warn exec The following packages were not found and will be installed: ...
```

之后运行会直接使用缓存，非常快！

---

## 对比总结

| 方式 | Windows | Linux/macOS | node_modules | 速度 |
|------|---------|-------------|-------------|------|
| **npm scripts** | ✅ | ✅ | ❌ 无 | 快（缓存） |
| **npx 完整参数** | ✅ | ✅ | ❌ 无 | 快（缓存） |
| **Shebang** | ❌ | ✅ | ❌ 无 | 快 |
| **本地安装** | ✅ | ✅ | ✅ 有 | 最快 |

**推荐:** npm scripts（最通用，全平台兼容）
