---
name: obsidian-cli
description: 使用 Obsidian CLI 读取、创建、搜索和操作当前 Obsidian 知识库中的笔记。当用户提到 "Obsidian"、"vault"、"日记"、"读取笔记"、"搜索笔记" 或需要与 Obsidian 知识库交互时使用此 skill。
---

# Obsidian CLI Skill

此 skill 使 Claude Code 能够通过官方 Obsidian CLI 命令与本地 Obsidian 知识库交互。

## 前置要求

- 已安装并运行 Obsidian 桌面应用
- Obsidian CLI 可用（版本 1.8.0+）
- 知识库已在 Obsidian 中打开

## 快速参考

### 读取笔记

```bash
# 按名称读取文件（类似 wikilink）
obsidian read file="我的笔记"

# 按精确路径读取文件
obsidian read path="文件夹/note.md"

# 获取文件信息
obsidian file file="我的笔记"

# 显示标题/大纲
obsidian outline file="我的笔记"

# 统计字数/字符数
obsidian wordcount file="我的笔记"
```

### 创建和编辑

```bash
# 创建新文件
obsidian create name="新笔记" content="# 标题\n\n内容"

# 使用模板创建
obsidian create name="新笔记" template="日记模板"

# 追加内容（添加到末尾并换行）
obsidian append file="我的笔记" content="## 新章节\n\n更多内容"

# 前置内容（添加到开头）
obsidian prepend file="我的笔记" content="## 简介\n\n第一部分内容"

# 追加内容但不换行
obsidian append file="我的笔记" content="text" inline
```

### 日记

```bash
# 打开日记
obsidian daily

# 读取日记内容
obsidian daily:read

# 获取日记路径
obsidian daily:path

# 追加到日记
obsidian daily:append content="## 任务\n\n新任务"

# 前置到日记
obsidian daily:prepend content="## 优先级\n\n重要事项"
```

### 搜索

```bash
# 在知识库中搜索文本
obsidian search query="关键词"

# 区分大小写搜索
obsidian search query="Keyword" case

# 带上下文搜索（显示匹配行）
obsidian search:context query="关键词"

# 限制结果数量
obsidian search query="关键词" limit=10

# 仅获取匹配数量
obsidian search query="关键词" total

# 在特定文件夹中搜索
obsidian search query="关键词" path="Projects"
```

### 文件和文件夹

```bash
# 列出所有文件
obsidian files

# 按扩展名过滤
obsidian files ext=md

# 按文件夹过滤
obsidian files folder="Projects"

# 获取文件数量
obsidian files total

# 列出文件夹
obsidian folders

# 显示文件夹信息
obsidian folder path="Projects"

# 列出没有入链的文件（孤立文件）
obsidian orphans

# 列出没有出链的文件（死胡同）
obsidian deadends
```

### 标签

```bash
# 列出所有标签
obsidian tags

# 列出标签及计数
obsidian tags counts

# 按计数排序
obsidian tags sort=count

# 获取标签信息
obsidian tag name="#重要"

# 获取标签出现次数
obsidian tag name="#重要" total

# 显示当前文件的标签
obsidian tags active
```

### 链接

```bash
# 列出文件的出链
obsidian links file="我的笔记"

# 获取链接数量
obsidian links file="我的笔记" total

# 列出指向文件的反向链接
obsidian backlinks file="我的笔记"

# 列出反向链接及计数
obsidian backlinks file="我的笔记" counts

# 列出未解析的链接
obsidian unresolved
```

### 任务

```bash
# 列出所有任务
obsidian tasks

# 显示未完成任务
obsidian tasks todo

# 显示已完成任务
obsidian tasks done

# 显示日记中的任务
obsidian tasks daily

# 显示当前文件的任务
obsidian tasks active

# 显示任务及文件分组和行号
obsidian tasks verbose

# 切换任务状态
obsidian task path="Projects/note.md" line=5 toggle

# 标记任务为完成
obsidian task path="Projects/note.md" line=5 done

# 设置自定义状态
obsidian task path="Projects/note.md" line=5 status="!"
```

### 属性（YAML Frontmatter）

```bash
# 列出知识库中的所有属性
obsidian properties

# 列出属性及计数
obsidian properties counts

# 显示文件的属性
obsidian properties file="我的笔记"

# 读取特定属性
obsidian property:read name="状态" file="我的笔记"

# 设置属性
obsidian property:set name="状态" value="完成" file="我的笔记"

# 设置带类型的属性
obsidian property:set name="优先级" value=1 type=number file="我的笔记"

# 删除属性
obsidian property:remove name="旧属性" file="我的笔记"
```

### 模板

```bash
# 列出模板
obsidian templates

# 获取模板数量
obsidian templates total

# 读取模板内容
obsidian template:read name="日记模板"

# 读取模板并解析变量
obsidian template:read name="日记模板" resolve title="我的标题"
```

### 知识库

```bash
# 列出已知的知识库
obsidian vaults

# 显示当前知识库信息
obsidian vault

# 显示知识库名称
obsidian vault info=name

# 显示知识库路径
obsidian vault info=path

# 显示知识库文件数量
obsidian vault info=files

# 指定特定知识库
obsidian vault="我的知识库" read file="笔记"
```

### 插件

```bash
# 列出已安装的插件
obsidian plugins

# 列出已启用的插件
obsidian plugins:enabled

# 按插件类型过滤
obsidian plugins filter=community

# 获取插件信息
obsidian plugin id="obsidian-git"

# 启用插件
obsidian plugin:enable id="obsidian-git"

# 禁用插件
obsidian plugin:disable id="obsidian-git"

# 安装社区插件
obsidian plugin:install id="obsidian-git"

# 卸载插件
obsidian plugin:uninstall id="obsidian-git"
```

### 主题

```bash
# 显示当前主题
obsidian theme

# 列出已安装的主题
obsidian themes

# 设置当前主题
obsidian theme:set name="Minimal"

# 安装社区主题
obsidian theme:install name="Minimal"

# 卸载主题
obsidian theme:uninstall name="Minimal"
```

### 移动和删除

```bash
# 移动/重命名文件
obsidian move file="旧名称" to="文件夹/新名称.md"

# 重命名文件
obsidian rename file="旧名称" name="新名称"

# 删除文件（移至回收站）
obsidian delete file="不需要的笔记"

# 永久删除
obsidian delete file="不需要的笔记" permanent
```

### 最近打开

```bash
# 列出最近打开的文件
obsidian recents

# 获取最近文件数量
obsidian recents total
```

### 别名

```bash
# 列出知识库中的别名
obsidian aliases

# 列出文件的别名
obsidian aliases file="我的笔记"

# 列出别名及文件路径
obsidian aliases verbose

# 获取别名数量
obsidian aliases total
```

### 书签

```bash
# 列出书签
obsidian bookmarks

# 添加文件书签
obsidian bookmark file="Projects/note.md"

# 添加文件夹书签
obsidian bookmark folder="Projects"

# 添加 URL 书签
obsidian bookmark url="https://example.com" title="示例网站"

# 获取书签数量
obsidian bookmarks total
```

### 打开文件

```bash
# 打开文件
obsidian open file="我的笔记"

# 在新标签页打开
obsidian open file="我的笔记" newtab

# 打开随机笔记
obsidian random

# 读取随机笔记
obsidian random:read
```

## 输出格式

部分命令支持不同的输出格式：

```bash
# TSV（默认）
obsidian tags format=tsv

# CSV
obsidian tags format=csv

# JSON
obsidian tags format=json

# YAML（用于属性）
obsidian properties format=yaml

# Markdown（用于 base:query）
obsidian base:query file="My Base" format=md
```

## 特殊字符

在内容值中使用转义序列：

- `\n` - 换行
- `\t` - 制表符
- `\"` - 引号（在引号字符串内）

示例：
```bash
obsidian append content="## 标题\n\n- 项目 1\n- 项目 2" file="我的笔记"
```

## 使用技巧

1. **文件 vs 路径**：`file` 按名称解析（类似 wikilink），`path` 是精确路径（folder/note.md）
2. **当前文件**：大多数命令在省略 file/path 时默认为当前文件
3. **引用值**：对带空格的值使用引号：`name="我的笔记"`
4. **知识库选择**：使用 `vault=<name>` 指定特定知识库
5. **仅计数**：使用 `total` 标志仅获取计数而不是完整列表

## 使用示例

### 查找所有带 #project 标签的笔记

```bash
obsidian search query="#project"
```

### 获取文件夹中所有未完成的任务

```bash
obsidian tasks path="Projects" todo
```

### 创建日记条目

```bash
obsidian daily:append content="## $(date +%Y-%m-%d)\n\n- 任务 1\n- 任务 2"
```

### 搜索未解析的链接

```bash
obsidian unresolved verbose
```

### 获取当前文件的反向链接

```bash
obsidian backlinks counts
```

## 版本信息

检查你的 Obsidian CLI 版本：
```bash
obsidian version
```

最低要求版本：1.8.0

## 参考资料

- [Obsidian CLI 文档](https://help.obsidian.md/Advanced+usage+CLI)
- [Obsidian 帮助](https://help.obsidian.md)
