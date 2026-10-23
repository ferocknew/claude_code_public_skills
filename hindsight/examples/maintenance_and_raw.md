# 记忆维护、心智模型与通用调用

> `update-memory` 与 `invalidate-memory` 会修改真实记忆。执行前先 `get-memory <memory_id>` 确认目标。

## 修改一条记忆

```bash
# 只改正文
node skill.js update-memory <memory_id> --text "修正后的记忆内容"

# 修改上下文与发生时间
node skill.js update-memory <memory_id> \
  --context corrected \
  --occurred-start 2026-01-01T00:00:00Z \
  --occurred-end 2026-01-02T00:00:00Z

# 修改实体，并关闭实体解析
node skill.js update-memory <memory_id> --entities Docker,Node --no-resolve-entities
```

至少提供一个修改字段，否则以用法错误（退出码 2）退出。

## 软作废与恢复

```bash
node skill.js invalidate-memory <memory_id> --reason "内容已过时"
node skill.js invalidate-memory <memory_id> --restore
```

`invalidate-memory` 是软作废（可恢复），不会物理删除。作废后默认不再出现在正常检索结果中。

## 心智模型

```bash
node skill.js list-mental-models --limit 10
node skill.js list-mental-models --tags project --limit 20 --format table
```

服务端只暴露列表接口，**没有 `get_mental_model`**，无法按 id 查看单条心智模型。

## 通用调用

先查看工具与必填参数：

```bash
node skill.js tools
```

再调用：

```bash
node skill.js call recall --args '{"query":"部署拓扑","max_tokens":1024}'
node skill.js call list_memories --args '{"type":"observation","limit":5}'

# 参数较多时写入文件
node skill.js call recall --args-file ./recall_args.json
printf '{"query":"发布流程"}' | node skill.js call recall --args-file -
```

`--args` 与 `--args-file` 只能二选一，内容必须是 JSON 对象；服务端不存在的工具会返回 `Unknown tool` 并以退出码 1 结束。
