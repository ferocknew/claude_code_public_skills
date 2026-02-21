#!/bin/bash
# HTTP MCP 工具 - Shell 启动脚本

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js"
    echo "请安装 Node.js 18 或更高版本"
    exit 1
fi

# 获取 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "错误: Node.js 版本过低（当前: $(node -v)，需要: 18+）"
    exit 1
fi

# 运行主脚本
node "$SCRIPT_DIR/run.js" "$@"
