@echo off
REM HTTP MCP 工具 - Windows 启动脚本

setlocal

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: 未找到 Node.js
    echo 请安装 Node.js 18 或更高版本
    exit /b 1
)

REM 获取 Node.js 主版本号
for /f "tokens=1 delims=v." %%i in ('node -v') do set NODE_MAJOR=%%i

if %NODE_MAJOR% lss 18 (
    echo 错误: Node.js 版本过低（当前: 版本 %NODE_MAJOR%，需要: 18+）
    exit /b 1
)

REM 运行主脚本
node "%SCRIPT_DIR%run.js" %*
