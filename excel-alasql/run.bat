@echo off
REM Excel 通用查询工具 (Windows 版本)
REM
REM 用法:
REM   run.bat <文件路径> [操作]
REM
REM 示例:
REM   run.bat excel\故障树.xlsx
REM   run.bat excel\故障树.xlsx "中间事件"
REM   run.bat excel\故障树.xlsx "*" > output.json

setlocal

set "EXCEL_FILE=%~1"
set "OPERATION=%~2"

REM 显示帮助
if "%EXCEL_FILE%"=="" goto :help
if "%EXCEL_FILE%"=="-h" goto :help
if "%EXCEL_FILE%"=="--help" goto :help

REM 检查文件是否存在
if not exist "%EXCEL_FILE%" (
    echo 错误: 文件不存在 - %EXCEL_FILE%
    exit /b 1
)

REM 使用 PowerShell 执行内联 JavaScript
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "npx --yes --package=alasql@1.7.3 --package=xlsx@0.18.5 node -e \"const {promise:alasql}=require('alasql');(async()=>{const data=await alasql('SELECT * FROM XLSX(\"\"%EXCEL_FILE%\"\",{autoExt:false})');const op='%OPERATION%';if(op==='*'){console.log(JSON.stringify(data,null,2));return;}if(op){const filtered=data.filter(r=>Object.values(r).some(v=>String(v).includes(op)));if(filtered.length){console.log('找到 '+filtered.length+' 条匹配记录');console.table(filtered);}else{console.log('未找到匹配记录');}return;}console.log('总记录数: '+data.length);console.log('列数: '+Object.keys(data[0]).length);console.log('列名: '+Object.keys(data[0]).join(', '));data.slice(0,3).forEach((r,i)=>{console.log('['+(i+1)+']');Object.entries(r).forEach(([k,v])=>{const s=String(v||'');console.log('  '+k+': '+(s.length>40?s.substr(0,40)+'...':s));});});Object.keys(data[0]).forEach((c,i)=>{const nonNull=data.filter(r=>r[c]!==null&&r[c]!==undefined&&r[c]!=='');const unique=[...new Set(nonNull.map(r=>String(r[c])))];console.log((i+1)+'. '+c+' - 非空: '+nonNull.length+'/'+data.length+' ('+((nonNull.length/data.length)*100).toFixed(1)+'%%), 唯一值: '+unique.length+' 个');});})().catch(e=>{console.error('错误: '+e.message);process.exit(1);});\""

goto :eof

:help
echo Excel 通用查询工具 v1.0 (Windows 版本)
echo.
echo 用法:
echo   run.bat ^<文件路径^> [操作]
echo.
echo 操作类型:
echo   (无参数)   显示数据概览
echo   "关键词"   全文搜索
echo   "*"        导出 JSON
echo.
echo 示例:
echo   run.bat excel\故障树.xlsx
echo   run.bat excel\故障树.xlsx "中间事件"
echo   run.bat excel\故障树.xlsx "*" ^> output.json
echo.
exit /b 0
