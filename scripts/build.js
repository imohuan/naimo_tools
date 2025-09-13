#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

console.log('🚀 开始构建 Electron 应用...\n');

try {
  // 确保 dist 目录存在
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  console.log('📦 构建渲染进程...');
  execSync('vite build src/renderer --config src/renderer/vite.config.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  console.log('🔧 构建主进程...');
  execSync('vite build --config vite.config.ts', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  console.log('📜 构建 preload 脚本...');

  // 获取所有 preload 文件
  const preloadsDir = join(process.cwd(), 'src/main/preloads');
  const preloadFiles = [];

  try {
    const files = readdirSync(preloadsDir);
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        const name = file.replace('.ts', '');
        preloadFiles.push(name);
      }
    });
  } catch (error) {
    console.log('No preloads directory found or empty');
  }

  // 逐个打包每个 preload 文件
  for (const preloadFile of preloadFiles) {
    console.log(`  📦 打包 ${preloadFile}.ts...`);
    execSync(`vite build --config vite.config.preloads.ts`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PRELOAD_ENTRY: preloadFile
      }
    });
  }

  console.log('✅ 构建完成！');
  console.log('\n可用的命令：');
  console.log('  npm run start    - 启动应用');
  console.log('  npm run package  - 打包应用');
  console.log('  npm run make     - 创建安装包');
  console.log('  npm run publish  - 发布应用');

} catch (error) {
  console.error('❌ 构建失败:', error.message);
  process.exit(1);
}
