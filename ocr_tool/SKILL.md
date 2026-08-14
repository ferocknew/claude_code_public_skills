---
name: ocr_tool
description: 当用户需要"识别图片文字"、"OCR"、"图片转文本"、"提取图片/截图中的文字"、"图片翻译"时使用此 skill。按优先级决策：优先 LLM 直接读图，LLM 无法识别时才调用系统 OCR；macOS 用系统自带 Vision 框架（零安装），Windows 用 tesseract.js。对话中的图片必须先落盘到临时目录再识别。
---

# OCR 工具（ocr_tool）

对图片做文字识别，**按优先级决策**：LLM 能直接读图时就用 LLM，读不了才走系统 OCR 引擎。

| 引擎 | 系统 | 依赖 |
|------|------|------|
| LLM 视觉（Claude） | 任意 | 无，模型自带 |
| Apple Vision（Swift） | macOS | Xcode CLT（swift 可用） |
| 快捷指令 | macOS（无 CLT） | 一次性建 1 条快捷指令 |
| tesseract.js（node） | Windows | 首次 `npm install` |

## 决策流程（按优先级从上到下）

拿到图片后按下述顺序判断，命中即执行、不再继续：

1. **LLM 直接识别**：当前模型有视觉能力，先直接读图，提取图片中的文字/内容返回。
   - 能识别 → 直接用 LLM 结果，**不调用任何 OCR 命令**
   - 不能识别（模型读图失败、图片未被加载、或用户明确要求纯文本文件产物）→ 进入第 2 步
2. **判断操作系统**：`uname -s`
   - `Darwin` → macOS，进入第 3 步
   - `MINGW*` / `MSYS*` → Windows，走 tesseract.js 分支
3. **macOS 检查 Xcode CLT**（决定主方案还是兜底）：

   ```bash
   command -v swift >/dev/null 2>&1 && swift --version >/dev/null 2>&1 && echo CLT_OK
   ```

   - 输出 `CLT_OK` → Apple Vision 主方案
   - 无输出 → 快捷指令兜底，或提示 `xcode-select --install`

## 图片落盘（走 OCR 前必须）

对话中的图片必须**先落盘到临时目录，再对文件执行识别**，不可直接对内存图片操作。

```bash
cp <对话中的图片路径> /tmp/ocr_input.png   # 保留原扩展名
ls -l /tmp/ocr_input.png                   # 确认存在后再识别
```

## macOS 分支

### 主方案：Apple Vision（推荐）

```bash
swift <skill目录>/bin/ocr_vision.swift /tmp/ocr_input.png
swift <skill目录>/bin/ocr_vision.swift /tmp/ocr_input.png --langs zh-Hans,en-US --json
```

- 输出按阅读顺序（自顶向下、从左到右），默认纯文本，`--json` 含置信度。
- 支持 PNG/JPEG/HEIC/TIFF 等 ImageIO 可解码格式。
- 首次运行编译约 1 秒，之后走系统缓存。

### 兜底方案：快捷指令（无 CLT 时）

1. 一次性手动设置（约 30 秒）：打开"快捷指令"App → 新建 → 添加动作 **"提取图像中的文本"**（Extract Text from Image）→ 保存，命名为 `OCR`。
2. 之后用命令行调用：

```bash
shortcuts run "OCR" --input /tmp/ocr_input.png
```

## Windows 分支

```bash
node <skill目录>/run.js /tmp/ocr_input.png --langs chi_sim+eng
```

- 首次使用需安装依赖：`cd <skill目录> && npm install`
- 首次识别自动下载语言包（chi_sim 约 22MB），之后复用
- 默认中文 + 英文同时识别

## 命令总表

| 命令 | 说明 |
|------|------|
| `swift bin/ocr_vision.swift <图片>` | macOS：识别纯文本 |
| `swift bin/ocr_vision.swift <图片> --json` | macOS：识别并输出 JSON（含置信度） |
| `swift bin/ocr_vision.swift <图片> --level fast` | macOS：快速模式（更快、精度略低） |
| `swift bin/ocr_vision.swift <图片> --langs en-US` | macOS：指定识别语言 |
| `swift bin/ocr_vision.swift <图片> --conf 0.5` | macOS：过滤低置信度结果 |
| `shortcuts run "OCR" --input <图片>` | macOS 无 CLT 兜底：识别 |
| `node run.js <图片>` | Windows：识别纯文本（默认 chi_sim+eng） |

## 选项说明

- `--level`：`accurate`（默认，更准）| `fast`（更快）
- `--langs`：逗号分隔语言列表。macOS 默认 `zh-Hans,en-US`；Windows 默认 `chi_sim+eng`
- `--json`：仅 macOS。输出含文本、坐标、置信度的结构化结果
- `--conf`：仅 macOS。只保留置信度 ≥ 该值的文本行

## 常见问题

**什么时候用 LLM 直接识别，什么时候用 OCR？** 模型能直接看到图片时优先 LLM（最快、无依赖）；仅当模型读不到图片、图片无法加载、或用户要求把文字落成纯文本文件时，才走 OCR。

**识别结果顺序乱？** macOS 主方案已按阅读顺序重排；Windows（tesseract.js）按引擎原始顺序返回。

**macOS 提示 swift/xcrun 不可用？** 说明未装 Xcode CLT，走兜底方案，或执行 `xcode-select --install`（Apple 官方，一次性）。

**Windows 提示 tesseract.js 未找到？** 先 `cd <skill目录> && npm install`。

**图片识别为空？** 确认图片已落盘且非空图；手写体/艺术字识别率低于印刷体，建议清晰大图。
