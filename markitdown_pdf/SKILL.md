---
name: markitdown-pdf
description: 当用户需要"读取 PDF"、"提取 PDF 文本"、"PDF 转 Markdown"、"搜索 PDF 内容"、"处理扫描件 PDF"、"PDF 转图片"时使用此 skill。自动识别 PDF 是文字型还是图片型（扫描件）：文字型先用微软 MarkItDown 转 Markdown 再用 grep 读取；图片型在当前目录生成同名 _img 文件夹导出每页图片，由具备视觉能力的模型按页码读取，不支持读图则放弃。
---

# PDF 读取工具（基于微软 MarkItDown）

本 skill 提供统一的 PDF 读取方案，针对两类 PDF 采用不同策略：

- **文字型 PDF**（有真实文本层，如 Word 导出的 PDF）→ 转成 Markdown 后用 `grep` 读取，高效省 Token。
- **图片型 PDF**（扫描件，文本层为空或极少）→ 导出每页为图片，交给具备视觉能力的模型按需读取。

核心转换工具为微软开源的 [MarkItDown](https://github.com/microsoft/markitdown)。

---

## 工作流程总览

```
PDF 文件
   │
   ▼
[步骤1] 环境检查（markitdown / pymupdf 是否可用）
   │
   ▼
[步骤2] 判断类型：统计文本层字符数
   │
   ├── 文字型 ──▶ [3a] markitdown 转 md ──▶ grep 读取
   │
   └── 图片型 ──▶ [3b] 生成 _img 文件夹导出图片
                       │
                       ├── 模型支持读图 ──▶ Read 指定页码图片
                       │
                       └── 模型不支持读图 ──▶ 放弃并告知用户
```

---

## 环境准备

### 0. 虚拟环境与工作目录（重要：不得越界）

安装或运行任何 Python 依赖前，必须遵循以下原则：

1. **使用独立虚拟环境 `.venv`**：所有依赖装在 `.venv` 中，不污染系统环境。

2. **确定工作目录**：

   - 用户已指定目录 → 在该目录下创建 `.venv`。
   - 用户未指定 → 在系统**临时目录**下新建临时文件夹，在其中创建 `.venv`。

   跨平台临时目录：

   | 平台 | 临时目录 |
   |------|----------|
   | macOS / Linux | `/tmp`（或 `$TMPDIR`） |
   | Windows | `%TEMP%`（通常 `C:\Users\<用户>\AppData\Local\Temp`） |

   示例（macOS / Linux）：

   ```bash
   WORKDIR=/tmp/markitdown_pdf_run
   mkdir -p "$WORKDIR" && cd "$WORKDIR"
   python3 -m venv .venv && source .venv/bin/activate
   pip install 'markitdown[pdf]' pymupdf
   ```

   示例（Windows PowerShell）：

   ```powershell
   $workdir = "$env:TEMP\markitdown_pdf_run"
   New-Item -ItemType Directory -Force -Path $workdir | Out-Null
   Set-Location $workdir
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install 'markitdown[pdf]' pymupdf
   ```

3. **Python 缺失时只提示，绝不主动安装**：

   - 先检测：`python3 --version`（macOS / Linux）或 `python --version`（Windows）。
   - 若系统**未安装 Python**，仅向用户提示：「未检测到 Python，请自行安装 Python 3.10 及以上版本：https://www.python.org/downloads/ 」
   - **严禁主动为用户安装 Python**——不得调用 `brew`、`apt`、`winget`、下载并运行安装包等任何安装操作。是否安装完全由用户自行决定，本 skill 绝不越界。

> 后续 `markitdown`、`pymupdf` 等命令均应在已激活的 `.venv` 中运行；执行前先在 `.venv` 内检查依赖是否可用，缺失则按下方命令安装。

### 1. MarkItDown（文字型转换）

```bash
# 推荐安装方式（含 PDF 支持）
pip install 'markitdown[pdf]'

# 或安装全部可选依赖
pip install 'markitdown[all]'
```

验证：`markitdown --help`

### 2. PyMuPDF（类型判断 + 图片导出）

用于快速探测 PDF 文本层、判定类型，并把每页渲染为 PNG。

```bash
pip install pymupdf
```

验证：`python3 -c "import fitz; print(fitz.__version__)"`

> **替代方案**：若环境已安装 poppler-utils（macOS: `brew install poppler`），可用 `pdftotext` 判断类型、`pdftoppm` 导出图片，效果等价。本 skill 默认采用 PyMuPDF（无需系统包、跨平台）。

---

## 步骤1：环境检查

执行 agent 先确认工具就绪：

```bash
which markitdown && python3 -c "import fitz" && echo "环境就绪" || echo "缺少依赖，请按上面命令安装"
```

若缺依赖，先向用户说明并安装后再继续。

---

## 步骤2：判断 PDF 类型（文字型 / 图片型）

**判断标准**：提取 PDF 文本层，统计字符数。

- 全文可提取字符数极少（接近 0）→ **图片型**（纯扫描件）
- 每页平均字符数 < 阈值（默认 100 字符/页）→ **图片型为主**
- 否则 → **文字型**

可直接运行以下 Python 探测脚本：

```bash
python3 -c "
import fitz, sys
doc = fitz.open(sys.argv[1])
total_chars = sum(len(p.get_text().strip()) for p in doc)
pages = doc.page_count
avg = total_chars / pages if pages else 0
print(f'pages={pages} total_chars={total_chars} avg_per_page={avg:.1f}')
print('TYPE=image' if (total_chars < 50 or avg < 100) else 'TYPE=text')
" /path/to/file.pdf
```

> 阈值可按实际语种微调：中文扫描件文本层通常为 0；含少量水印文字的扫描件 avg 也偏低。若结果介于边界（avg 在 100~200 之间），建议**同时**走文字型转换预览，若转出的 md 内容明显缺失，再改走图片型流程。

---

## 步骤3a：文字型 PDF —— 转 Markdown 后 grep 读取

```bash
# 转换：生成同名 .md 文件
markitdown /path/to/file.pdf -o /path/to/file.md

# 浏览全文
cat /path/to/file.md

# 按关键词搜索（大小写不敏感，显示行号与上下文）
grep -n -i -C 3 "关键词" /path/to/file.md

# 中文/复杂词搜索
grep -n "合同" /path/to/file.md
```

读取策略：

| 需求 | 命令 |
|------|------|
| 看全文结构 | `grep -n "^#" file.md`（只看标题） |
| 搜关键词 | `grep -n -i -C 3 "词" file.md` |
| 看某一段 | `sed -n '50,80p' file.md` |
| 统计匹配 | `grep -c "词" file.md` |

文字型 PDF **不需要**生成图片，直接在 md 上操作即可。

---

## 步骤3b：图片型 PDF —— 导出图片后按页读取

### 3b-1. 生成同名 `_img` 文件夹并导出每页图片

文件夹命名规则：**去掉 PDF 扩展名，加 `_img` 后缀**，与 PDF 同目录。

- `report.pdf` → `report_img/`
- `合同_2024.pdf` → `合同_2024_img/`

导出脚本（DPI 默认 150，文字清晰且文件适中；需更清晰可调到 200~300）：

```bash
python3 -c "
import fitz, os, sys
src = sys.argv[1]
stem = os.path.splitext(os.path.basename(src))[0]
out_dir = os.path.join(os.path.dirname(src) or '.', stem + '_img')
os.makedirs(out_dir, exist_ok=True)
doc = fitz.open(src)
for i, page in enumerate(doc, start=1):
    pix = page.get_pixmap(dpi=150)
    pix.save(os.path.join(out_dir, f'page_{i:03d}.png'))
print(f'已导出 {doc.page_count} 页到 {out_dir}')
" /path/to/file.pdf
```

导出后目录结构：

```
当前目录/
├── file.pdf
└── file_img/
    ├── page_001.png
    ├── page_002.png
    └── ...
```

### 3b-2. 判断执行模型是否支持读图

执行 agent 需自我评估是否具备图像理解能力：

- **支持读图**（如 Claude 系列含视觉能力的版本）→ 进入 3b-3。
- **不支持读图**（纯文本环境、无视觉能力的模型）→ **放弃**，向用户说明："该 PDF 为图片型扫描件，当前执行环境不支持读取图片，无法提取内容。建议换用支持视觉的模型，或先用 OCR 工具处理。"

### 3b-3. 按需读取指定页码的图片

无需一次性读取全部页（避免 Token 爆炸）。先让用户明确目标页码，或先读缩略信息再定位：

```bash
# 查看导出了哪些页
ls file_img/
```

然后用 Read 工具读取需要的页：

```
Read: /path/to/file_img/page_005.png
Read: /path/to/file_img/page_012.png
```

> 若用户想"快速看全貌"，可优先读取首页（`page_001.png`）与目录页；定位到目标后只读相关页。

---

## 完整示例

### 示例 1：文字型 PDF（论文/文档）

```bash
# 1. 探测类型
python3 -c "import fitz,sys; d=fitz.open(sys.argv[1]); t=sum(len(p.get_text().strip()) for p in d); print('TYPE=text' if t>50 else 'TYPE=image')" paper.pdf
# → TYPE=text

# 2. 转 Markdown
markitdown paper.pdf -o paper.md

# 3. grep 搜索
grep -n -i -C 3 "transformer" paper.md
```

### 示例 2：图片型 PDF（扫描合同）

```bash
# 1. 探测类型 → TYPE=image
# 2. 导出图片到 contract_img/
python3 -c "import fitz,os,sys; s=sys.argv[1]; stem=os.path.splitext(os.path.basename(s))[0]; d=os.path.join(os.path.dirname(s) or '.',stem+'_img'); os.makedirs(d,exist_ok=True); doc=fitz.open(s); [doc[i].get_pixmap(dpi=150).save(os.path.join(d,f'page_{i+1:03d}.png')) for i in range(doc.page_count)]; print('done',doc.page_count)" contract.pdf
```

随后由具备视觉能力的模型 Read `contract_img/page_001.png` 等指定页。

---

## 边界情况

- **混合型 PDF**：部分页有文本层、部分页是扫描图。建议默认走文字型（转 md + grep）；若用户指出某页内容缺失，再针对该页单独导出图片读取。
- **加密 PDF**：`fitz.open()` 可能失败。先用 `markitdown` 试转，或提示用户提供解密后的文件。
- **超大 PDF**（几百页）：图片型导出前先确认目标页码范围，按需渲染（修改脚本仅导出指定页），避免生成过多图片。
- **markitdown 转换为空**：即使探测判定为文字型，若转出的 md 接近空白，多半实际是图片型，改走 3b 流程。

---

## 安全注意

MarkItDown 以**当前进程权限**执行 I/O。处理来源不明的 PDF 时，注意路径校验，避免路径遍历风险。详见 [MarkItDown 安全说明](https://github.com/microsoft/markitdown#security-considerations)。

---

## 参考资料

- [MarkItDown 官方仓库](https://github.com/microsoft/markitdown)
- [PyMuPDF 文档](https://pymupdf.readthedocs.io/)
