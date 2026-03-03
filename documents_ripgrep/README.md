### 技术方案
- nodejs + tesseract + ripgrep
- 文件类型：
  - 所有文本文件 （ripgrep 搜索）
  - tesseract 支持文件 （不额外装其他模块）
    - .docx
    - .xlsx
    - .pptx
- 旧版 Office 提示需要另存成新版本才可以被搜索到。

### 需要全局安装
- pnpm （npm 也可以，但是推荐pnpm，更先进）
- pnpm add -g textract  
- pnpm add -g @vscode/ripgrep
