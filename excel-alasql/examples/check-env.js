/**
 * 检查环境配置
 *
 * 验证 Node.js、npm 和 AlaSQL 是否正确安装
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('检查 AlaSQL 环境');
console.log('='.repeat(60));

/**
 * 检查 Node.js 是否安装
 */
function checkNodeJS() {
  try {
    const version = process.version;
    console.log(`\n✓ Node.js: ${version}`);
    return true;
  } catch (e) {
    console.log('\n✗ Node.js 未安装');
    console.log('  解决方案:');
    console.log('  1. Ubuntu/Debian: sudo apt install nodejs npm');
    console.log('  2. macOS: brew install node');
    console.log('  3. 访问: https://nodejs.org/');
    return false;
  }
}

/**
 * 检查 npm 是否安装
 */
function checkNPM() {
  try {
    const { execSync } = require('child_process');
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✓ npm: ${version}`);
    return true;
  } catch (e) {
    console.log('✗ npm 未安装');
    console.log('  npm 通常随 Node.js 一起安装');
    return false;
  }
}

/**
 * 检查 AlaSQL 是否安装
 */
function checkAlaSQL() {
  try {
    // 尝试本地安装
    require('alasql');
    console.log('✓ AlaSQL 已安装（本地）');
    return true;
  } catch (e) {
    try {
      // 尝试全局安装
      const { execSync } = require('child_process');
      execSync('alasql --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      console.log('✓ AlaSQL 已安装（全局）');
      return true;
    } catch (e2) {
      console.log('✗ AlaSQL 未安装');
      console.log('  安装方法:');
      console.log('  1. 本地安装: npm install alasql');
      console.log('  2. 全局安装: npm install -g alasql');
      console.log('  3. 使用 npx: npx alasql (无需安装)');
      return false;
    }
  }
}

/**
 * 检查工作目录
 */
function checkWorkingDirectory() {
  const cwd = process.cwd();
  console.log(`\n✓ 当前工作目录: ${cwd}`);

  // 检查 package.json
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    console.log('✓ 找到 package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies && pkg.dependencies.alasql) {
        console.log('✓ AlaSQL 在 package.json 依赖中');
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  // 检查 node_modules
  const nodeModulesPath = path.join(cwd, 'node_modules', 'alasql');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('✓ 找到 node_modules/alasql');
  }
}

/**
 * 测试 AlaSQL 功能
 */
function testAlaSQL() {
  try {
    const alasql = require('alasql');

    // 简单测试
    const testData = [
      { name: '测试', value: 100 }
    ];

    alasql('CREATE TABLE test');
    alasql('INSERT INTO test VALUES ?', [testData]);
    const result = alasql('SELECT * FROM test');

    if (result && result.length > 0) {
      console.log('✓ AlaSQL 功能测试通过');
      alasql('DROP TABLE test');
      return true;
    }
  } catch (e) {
    console.log('✗ AlaSQL 功能测试失败:', e.message);
    return false;
  }
}

// 执行所有检查
console.log('\n[1/4] 检查 Node.js...');
const nodeOk = checkNodeJS();

console.log('\n[2/4] 检查 npm...');
const npmOk = checkNPM();

console.log('\n[3/4] 检查 AlaSQL...');
const alasqlOk = checkAlaSQL();

console.log('\n[4/4] 检查工作目录...');
checkWorkingDirectory();

// 总结
console.log('\n' + '='.repeat(60));
console.log('检查结果总结');
console.log('='.repeat(60));

const allOk = nodeOk && npmOk && alasqlOk;

if (allOk) {
  console.log('✓ 所有检查通过！');
  console.log('\n可以开始使用 AlaSQL 了');

  // 测试功能
  console.log('\n运行功能测试...');
  testAlaSQL();

} else {
  console.log('✗ 部分检查未通过');
  console.log('\n请按照上述提示安装缺失的组件');
  console.log('\n快速安装命令:');
  console.log('  npm install alasql');
}

// 提供快速开始代码
console.log('\n' + '='.repeat(60));
console.log('快速开始代码');
console.log('='.repeat(60));
console.log(`
const alasql = require('alasql');

// 读取 Excel
const data = alasql('SELECT * FROM XLSX("data.xlsx")');
console.log('读取', data.length, '行数据');

// 查询
const result = alasql('SELECT * FROM ? WHERE value > 50', [data]);
console.log('筛选结果:', result.length, '行');

// 写入
alasql('SELECT * INTO XLSX("output.xlsx") FROM ?', [data]);
console.log('已写入 output.xlsx');
`);
