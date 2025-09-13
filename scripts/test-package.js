#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🧪 开始测试打包...\n');

try {
  console.log('🛑 终止现有进程...');
  try {
    execSync('pnpm kill', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    // console.log('🛑 终止现有进程失败:', error.message);
  }

  console.log('📦 打包应用...');
  execSync('pnpm package', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('🚀 启动测试应用...');
  execSync('start ./out/electron-app-win32-x64/electron-app.exe', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('✅ 测试完成！应用已启动');

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}
