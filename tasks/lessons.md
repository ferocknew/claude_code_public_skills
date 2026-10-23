# Lessons

- 2026-05-31：为本仓库新增 Node.js skill 时，优先遵循现有 `pnpm-lock.yaml` 习惯，使用 `pnpm install` / `pnpm build` 验证，不要提交 npm 生成的 `package-lock.json`。
- 2026-05-31：生成 skill 专用 `.env` 时只放必要配置，并使用带业务前缀的大写变量名，例如 `FINANCIAL_MCP_URL`、`FINANCIAL_MCP_TOKEN`，避免通用 `url`、`token` 造成冲突。
- 2026-10-24：Windows 上重写 git 历史时，filter-repo 与 filter-branch 都会被含尾随空格的非法路径（GitHub 网页误建的 `agent-browser /SKILL.md`）卡死；先用 `git -c core.protectNTFS=false filter-branch --index-filter` 删除该路径，再做 `tree-filter` 内容替换；完成后 `git diff <重写前树> HEAD` 必须为空再推送。
