# 脚本示例

常用命令和脚本示例。

## 环境变量配置

```bash
# 设置默认 URL 和 Token
export WIKI_URL="https://wiki.example.com"
export WIKI_TOKEN="your-api-token"

# 简化命令
node skill.js query pages
node skill.js create "new/page" "标题" "内容"
```

## 创建文档页面

```bash
node skill.js create \
  https://wiki.example.com \
  YOUR_TOKEN \
  "docs/api-reference" \
  "API 参考" \
  "# API 参考文档\n\n这是一份 API 参考文档。"
```

## 批量更新页面

```bash
# 创建脚本批量更新
for id in 10 11 12; do
  node skill.js update \
    https://wiki.example.com \
    YOUR_TOKEN \
    $id \
    "更新后的内容"
done
```

## 搜索并导出

```bash
# 搜索结果导出到 JSON
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" --format json > results.json

# 评论列表导出到 YAML
node skill.js comments https://wiki.example.com YOUR_TOKEN list "test/history" "zh" > comments.yaml
```

## 评论操作示例

```bash
# 查询评论列表（默认 YAML 格式）
node skill.js comments $WIKI_URL $WIKI_TOKEN list "test/history" "zh"

# 查询单条评论
node skill.js comments $WIKI_URL $WIKI_TOKEN single 1

# 创建评论
node skill.js comments $WIKI_URL $WIKI_TOKEN create 78 "这是一条评论"

# 创建评论（回复他人）
node skill.js comments $WIKI_URL $WIKI_TOKEN create 78 "回复内容" --replyTo 1

# 创建评论（访客模式）
node skill.js comments $WIKI_URL $WIKI_TOKEN create 78 "访客评论" \
  --guestName "访客" --guestEmail "guest@example.com"

# 更新评论
node skill.js comments $WIKI_URL $WIKI_TOKEN update 1 "更新后的内容"

# 指定返回字段
node skill.js comments $WIKI_URL $WIKI_TOKEN list "test/history" "zh" \
  --fields "id,content,authorName,createdAt"

# 输出 JSON 格式
node skill.js comments $WIKI_URL $WIKI_TOKEN list "test/history" "zh" --format json
```

## 搜索页面示例

```bash
# 基本搜索
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词"

# 指定搜索路径
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" --path "docs"

# 限制结果数量
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" --limit 20

# 搜索并显示预览
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" --preview

# 搜索并预览前 5 条，按行提取
node skill.js search https://wiki.example.com YOUR_TOKEN "关键词" \
  --preview --previewCount 5 --contextLength 1
```