/**
 * 构建 preload.ts 的脚本
 * 将 TypeScript 编译为 CommonJS 格式
 * 同时复制必要的配置文件
 */

import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildPreload() {
  console.log('🔨 正在构建 preload.ts...');

  try {
    await build({
      configFile: false,
      build: {
        lib: {
          entry: resolve(__dirname, '../src/preload.ts'),
          formats: ['cjs'],
          fileName: () => 'preload.js'
        },
        outDir: resolve(__dirname, '../dist'),
        emptyOutDir: false,
        sourcemap: true,
        minify: false, // 不压缩，便于调试
        rollupOptions: {
          external: ['electron'],
          output: {
            format: 'cjs',
            exports: 'auto',
            // 确保 preload 是单个文件，不分块
            inlineDynamicImports: true
          }
        },
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, '../src')
        }
      }
    });

    console.log('✅ preload.ts 构建完成!');
  } catch (error) {
    console.error('❌ preload.ts 构建失败:', error);
    process.exit(1);
  }
}

function copyManifest() {
  console.log('📋 正在复制 manifest.json...');

  try {
    const sourcePath = resolve(__dirname, '../manifest.json');
    const destPath = resolve(__dirname, '../dist/manifest.json');
    copyFileSync(sourcePath, destPath);
    console.log('✅ manifest.json 复制完成!');
  } catch (error) {
    console.error('❌ manifest.json 复制失败:', error);
    process.exit(1);
  }
}

async function run() {
  await buildPreload();
  copyManifest();
}

run();

