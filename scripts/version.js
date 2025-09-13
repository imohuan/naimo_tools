#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, } from 'fs';

/**
 * 版本管理脚本
 * 支持自动累加版本号并执行git tag和push命令
 */

// 美化的日志输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${colors.bright}✨ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}${colors.bright}💥 ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}${colors.bright}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}${colors.bright}⚠️  ${message}${colors.reset}`);
}

function logStep(step, total, message) {
  const progress = `[${step}/${total}]`;
  console.log(`${colors.cyan}${colors.bright}${progress} ${message}${colors.reset}`);
}

function logHeader(message) {
  const border = '═'.repeat(message.length + 4);
  console.log(`\n${colors.magenta}${colors.bright}╔${border}╗${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}║  ${message}  ║${colors.reset}`);
  console.log(`${colors.magenta}${colors.bright}╚${border}╝${colors.reset}\n`);
}

function logSeparator() {
  console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`);
}

// 执行命令的Promise包装
function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    // 在Windows上，对于git命令，使用shell: false来避免参数解析问题
    const useShell = process.platform === 'win32' && command === 'git' ? false : true;

    const proc = spawn(command, args, {
      stdio: 'pipe',
      shell: useShell,
      cwd: process.cwd(),
      ...options
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        reject(new Error(`命令执行失败 (代码: ${code}): ${stderr || stdout}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

// 获取当前git标签
async function getCurrentTags() {
  try {
    const result = await execCommand('git', ['tag', '--sort=-version:refname']);
    return result.stdout.split('\n').filter(tag => tag.trim());
  } catch (error) {
    // 如果没有标签，返回空数组
    return [];
  }
}

// 解析版本号
function parseVersion(versionString) {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new Error(`无效的版本号格式: ${versionString}`);
  }

  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    build: parseInt(match[4] || 0)
  };
}

// 格式化版本号
function formatVersion(version, prefix = 'v') {
  if (version.build > 0) {
    return `${prefix}${version.major}.${version.minor}.${version.patch}.${version.build}`;
  }
  return `${prefix}${version.major}.${version.minor}.${version.patch}`;
}

// 获取下一个版本号
function getNextVersion(currentVersion, type = 'patch') {
  const version = { ...currentVersion };

  switch (type) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      version.build = 0;
      break;
    case 'minor':
      version.minor += 1;
      version.patch = 0;
      version.build = 0;
      break;
    case 'patch':
      version.patch += 1;
      version.build = 0;
      break;
    case 'build':
      version.build += 1;
      break;
    default:
      throw new Error(`不支持的版本类型: ${type}`);
  }

  return version;
}

// 更新package.json版本
function updatePackageJsonVersion(newVersion) {
  try {
    const packageJsonPath = 'package.json';
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    const versionString = formatVersion(newVersion, '');
    packageJson.version = versionString;

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    logSuccess(`已更新 package.json 版本为: ${colors.cyan}${colors.bright}${versionString}${colors.reset}`);

    return versionString;
  } catch (error) {
    logError(`更新 package.json 失败: ${error.message}`);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    const args = process.argv.slice(2);
    const versionType = args[0] || 'patch'; // 默认patch版本

    // 支持的版本类型
    const supportedTypes = ['major', 'minor', 'patch', 'build'];
    if (!supportedTypes.includes(versionType)) {
      logError(`不支持的版本类型: ${versionType}`);
      logInfo(`支持的类型: ${supportedTypes.join(', ')}`);
      process.exit(1);
    }

    logHeader('🚀 版本管理流程启动');

    // 1. 获取当前标签
    logStep(1, 5, '获取当前git标签...');
    const tags = await getCurrentTags();

    let currentVersion;
    if (tags.length === 0) {
      // 如果没有标签，从package.json读取版本
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      currentVersion = parseVersion(packageJson.version);
      logWarning(`没有找到git标签，使用package.json版本: ${colors.cyan}${packageJson.version}${colors.reset}`);
    } else {
      // 使用最新的标签
      const latestTag = tags[0];
      currentVersion = parseVersion(latestTag);
      logSuccess(`当前最新标签: ${colors.cyan}${colors.bright}${latestTag}${colors.reset}`);
    }

    // 2. 计算下一个版本
    const nextVersion = getNextVersion(currentVersion, versionType);
    const nextVersionString = formatVersion(nextVersion);

    logSeparator();
    logHeader('📈 版本升级信息');
    log(`   ${colors.dim}当前版本:${colors.reset} ${colors.yellow}${formatVersion(currentVersion)}${colors.reset}`);
    log(`   ${colors.dim}升级类型:${colors.reset} ${colors.blue}${versionType}${colors.reset}`);
    logSuccess(`   ${colors.dim}新版本:${colors.reset} ${colors.green}${colors.bright}${nextVersionString}${colors.reset}`);
    logSeparator();

    // 3. 更新package.json
    logStep(2, 5, '更新package.json...');
    const packageVersion = updatePackageJsonVersion(nextVersion);

    // 4. 创建git标签
    logStep(3, 5, '创建git标签...');
    await execCommand('git', ['add', 'package.json']);
    await execCommand('git', ['commit', '-m', `chore: bump version to ${nextVersionString}`]);
    await execCommand('git', ['tag', nextVersionString]);
    logSuccess(`已创建标签: ${colors.cyan}${colors.bright}${nextVersionString}${colors.reset}`);

    // 5. 推送到远程仓库
    logStep(4, 5, '推送到远程仓库...');
    await execCommand('git', ['push', 'origin', 'main']);
    await execCommand('git', ['push', 'origin', nextVersionString]);
    logSuccess(`已推送标签到远程仓库: ${colors.cyan}${colors.bright}${nextVersionString}${colors.reset}`);

    // 6. 完成
    logStep(5, 5, '版本管理完成!');
    logSeparator();
    logHeader('🎉 版本管理成功完成');
    log(`   ${colors.dim}新版本:${colors.reset} ${colors.green}${colors.bright}${nextVersionString}${colors.reset}`);
    log(`   ${colors.dim}状态:${colors.reset} ${colors.green}已推送到远程仓库${colors.reset}`);
    logSeparator();

  } catch (error) {
    logError(`\n版本管理失败: ${error.message}`);
    process.exit(1);
  }
}

// 显示帮助信息
function showHelp() {
  logHeader('📖 版本管理脚本使用说明');

  log(`${colors.cyan}${colors.bright}用法:${colors.reset}`);
  log(`  ${colors.dim}node scripts/version.js [版本类型]${colors.reset}\n`);

  log(`${colors.cyan}${colors.bright}版本类型:${colors.reset}`);
  log(`  ${colors.green}patch${colors.reset}   - 补丁版本 (默认) ${colors.dim}例: v1.0.0 -> v1.0.1${colors.reset}`);
  log(`  ${colors.blue}minor${colors.reset}   - 次版本    ${colors.dim}例: v1.0.0 -> v1.1.0${colors.reset}`);
  log(`  ${colors.red}major${colors.reset}   - 主版本    ${colors.dim}例: v1.0.0 -> v2.0.0${colors.reset}`);
  log(`  ${colors.yellow}build${colors.reset}   - 构建版本  ${colors.dim}例: v1.0.0 -> v1.0.0.1${colors.reset}\n`);

  log(`${colors.cyan}${colors.bright}示例:${colors.reset}`);
  log(`  ${colors.dim}node scripts/version.js patch${colors.reset}`);
  log(`  ${colors.dim}node scripts/version.js minor${colors.reset}`);
  log(`  ${colors.dim}node scripts/version.js major${colors.reset}\n`);

  log(`${colors.cyan}${colors.bright}功能:${colors.reset}`);
  log(`  ${colors.green}✨${colors.reset} 自动累加版本号`);
  log(`  ${colors.blue}📦${colors.reset} 更新package.json`);
  log(`  ${colors.magenta}🏷️${colors.reset} 创建git标签`);
  log(`  ${colors.cyan}🚀${colors.reset} 推送到远程仓库`);

  logSeparator();
}

// 检查参数
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// 运行主函数
main();
