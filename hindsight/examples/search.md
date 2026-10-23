# 记忆检索（recall）

## 基础检索

```bash
# 基础检索
node skill.js recall "用户对验证方式的要求"

# 限制返回规模与预算
node skill.js recall "部署拓扑" --max-tokens 2048 --budget high

# 只看 observation，并优先返回 observation
node skill.js recall "技术偏好" --types observation --prefer-observations

# 标签过滤
node skill.js recall "项目约定" --tags project,node --tags-match all

# 组合条件（JSON 参数按服务端 schema 传递）
node skill.js recall "发布流程" \
  --tags project \
  --tag-groups '[{"tags":["release","ci"],"match":"any"}]' \
  --min-scores '{"semantic":0.4}' \
  --temporal-window '{"start":"2026-01-01T00:00:00Z","end":"2026-12-31T23:59:59Z"}'
```

## 返回结构

通常为：

```json
{
  "results": [
    {
      "id": "<memory_id>",
      "text": "记忆正文",
      "fact_type": "observation",
      "tags": ["project:node"],
      "scores": { "final": 1.07, "semantic": 0.65, "keyword": 0.1 },
      "occurred_start": "2026-01-01T00:00:00+00:00"
    }
  ]
}
```

`scores.final` 越高越相关；`--min-scores` 可按维度设置最低分。其余字段与可选值以服务端工具定义为准。

> 服务端另有 `reflect`（基于记忆的综合回答），当前部署因反代 60 秒超时不可用，本 skill 不封装；详见 SKILL.md 常见问题 Q4。
