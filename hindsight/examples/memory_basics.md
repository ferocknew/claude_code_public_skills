# 记忆写入与浏览

前置：已按 `.env.example` 配置好 `HINDSIGHT_MCP_URL` 与 `HINDSIGHT_TOKEN`。

## 写入一条记忆

```bash
node skill.js retain "用户偏好：回答使用简体中文，代码注释也用中文" \
  --context preference \
  --tags preference,language \
  --metadata '{"source":"chat"}'
```

常用可选项：

| 选项 | 说明 |
|------|------|
| `--context` | 记忆所属上下文，默认 `general` |
| `--timestamp` | 记忆发生时间，ISO 8601；不传则用当前时间 |
| `--tags` | 逗号分隔标签，便于后续过滤 |
| `--metadata` | JSON 对象，值建议用字符串 |
| `--document-id` | 关联的外部文档 ID |
| `--strategy` | 服务端写入策略 |

本 skill 只提供异步写入 `retain`，不提供同步写入 `sync-retain`。

## 长文本：从文件或标准输入读取

```bash
node skill.js retain --content-file ./notes.md --tags notes
printf '来自管道的记忆内容' | node skill.js retain --content-file - --tags stdin
```

`--content-file` 与位置参数不能同时使用。

## 浏览记忆

```bash
# 最近 20 条，表格展示
node skill.js list-memories --limit 20 --format table

# 只看 observation 类型，并按键值过滤
node skill.js list-memories --type observation --query "部署" --limit 10

# 标签过滤（匹配模式：any / all / any_strict / all_strict / exact）
node skill.js list-memories --tags project,node --tags-match all --limit 10
```

返回结构通常为：

```json
{
  "items": [
    {
      "id": "<memory_id>",
      "text": "记忆正文",
      "context": "上下文",
      "fact_type": "observation",
      "tags": ["preference"],
      "state": "valid",
      "occurred_start": "2026-01-01T00:00:00+00:00"
    }
  ],
  "total": 123,
  "limit": 20,
  "offset": 0
}
```

## 查看单条记忆

```bash
node skill.js get-memory <memory_id>
```

`get-memory` 返回的字段比列表更完整（如 `entities` 数组、`mentioned_at`、`proof_count`）。列表里的 `id` 即可直接用于 `get-memory`、`update-memory`、`invalidate-memory`。
