# Lessons

- 2026-05-31：为本仓库新增 Node.js skill 时，优先遵循现有 `pnpm-lock.yaml` 习惯，使用 `pnpm install` / `pnpm build` 验证，不要提交 npm 生成的 `package-lock.json`。
- 2026-05-31：生成 skill 专用 `.env` 时只放必要配置，并使用带业务前缀的大写变量名，例如 `FINANCIAL_MCP_URL`、`FINANCIAL_MCP_TOKEN`，避免通用 `url`、`token` 造成冲突。
