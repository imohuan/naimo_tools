import { defineConfig } from 'vite'
import { resolve } from 'path';
import { readFileSync } from 'fs';

import Vue from '@vitejs/plugin-vue'
import Icons from "unplugin-icons/vite";
import Tailwindcss from "@tailwindcss/vite";
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'
import Renderer from 'vite-plugin-electron-renderer'

// 从 package.json 读取开发服务器配置
function getDevConfig() {
  try {
    const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    const devConfig = packageJson.config?.dev || {};
    return {
      port: devConfig.rendererPort || 5173,
      host: devConfig.rendererHost || 'localhost'
    };
  } catch (error) {
    console.warn('无法读取 package.json 配置，使用默认值:', error);
    return { port: 5173, host: 'localhost' };
  }
}

const devConfig = getDevConfig();

// 自定义插件：修复多入口 HTML 文件的输出路径
function customHtmlOutputPlugin() {
  return {
    name: 'custom-html-output',
    enforce: 'post' as const,
    async writeBundle(options: any, bundle: any) {
      const fs = await import('fs');
      const path = await import('path');

      const outDir = options.dir || '../../dist/renderer';

      // 处理需要重命名的 HTML 文件
      const filesToMove = [];

      for (const fileName of Object.keys(bundle)) {
        if (fileName.endsWith('.html') && fileName.includes('/')) {
          let newFileName;

          // 为 crop-window 特殊处理
          if (fileName.includes('crop-window')) {
            newFileName = 'crop-window.html';
          } else {
            // 其他文件只保留文件名部分
            newFileName = fileName.split('/').pop() || fileName;
          }

          filesToMove.push({
            oldPath: path.resolve(outDir, fileName),
            newPath: path.resolve(outDir, newFileName),
            oldFileName: fileName,
            newFileName: newFileName
          });
        }
      }

      // 执行文件移动和路径修复
      for (const { oldPath, newPath, oldFileName, newFileName } of filesToMove) {
        try {
          if (fs.existsSync(oldPath) && oldPath !== newPath) {
            // 读取 HTML 文件内容
            let htmlContent = fs.readFileSync(oldPath, 'utf-8');

            // 修复资源路径：将 ../../../assets/ 替换为 ./assets/
            htmlContent = htmlContent.replace(/\.\.\/\.\.\/\.\.\/assets\//g, './assets/');
            htmlContent = htmlContent.replace(/\.\.\/\.\.\/assets\//g, './assets/');
            htmlContent = htmlContent.replace(/\.\.\/assets\//g, './assets/');

            // 确保目标目录存在
            fs.mkdirSync(path.dirname(newPath), { recursive: true });

            // 写入修复后的内容到新位置
            fs.writeFileSync(newPath, htmlContent, 'utf-8');

            // 删除原文件
            fs.unlinkSync(oldPath);

            console.log(`✓ HTML 文件路径和资源引用修复: ${oldFileName} -> ${newFileName}`);

            // 清理空的源目录
            let dirToClean = path.dirname(oldPath);
            while (dirToClean !== outDir) {
              try {
                if (fs.readdirSync(dirToClean).length === 0) {
                  fs.rmdirSync(dirToClean);
                  dirToClean = path.dirname(dirToClean);
                } else {
                  break;
                }
              } catch {
                break;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️  处理文件时出错: ${oldFileName}`, error);
        }
      }
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './', // 设置基础路径为相对路径，确保资源文件能正确加载
  server: {
    port: devConfig.port,
    host: devConfig.host,
    // 开发环境下，多入口页面的访问路径：
    // 主页面：http://localhost:5173/
    // 裁剪窗口：http://localhost:5173/src/pages/crop-window/
    // 日志查看器：http://localhost:5173/public/log-viewer.html
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      "@main": resolve(__dirname, '../main'),
      "@renderer": resolve(__dirname, '../renderer'),
      "@libs": resolve(__dirname, '../libs'),
      "@shared": resolve(__dirname, '../shared')
    },
  },
  // 启用源码映射以支持VSCode调试
  build: {
    outDir: '../../dist/renderer', // 指定输出目录到 dist/renderer
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline', // 生产环境不生成sourcemap
    minify: process.env.NODE_ENV === 'production', // 生产环境压缩代码
    rollupOptions: {
      external: ['electron',],
      // 多入口配置
      input: {
        main: resolve(__dirname, 'index.html'),
        'crop-window': resolve(__dirname, 'src/pages/crop-window/index.html'),
        'log-viewer': resolve(__dirname, 'public/log-viewer.html')
      },
      output: {
        format: 'es',
        sourcemapExcludeSources: false // 包含源代码在source map中
      }
    }
  },
  // 开发环境下启用源码映射
  css: {
    devSourcemap: true
  },
  // 优化开发体验
  esbuild: {
    sourcemap: true // ESBuild也启用源码映射
  },
  plugins: [
    Vue(),
    Tailwindcss(),

    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'pinia',
        '@vueuse/core',
      ],
      dts: './typings/auto-imports.d.ts',
    }),

    Icons({ autoInstall: true, compiler: "vue3", }),
    Components({
      dirs: ['./src/components'],
      dts: './typings/components.d.ts',
      resolvers: [
        IconsResolver({
          prefix: "icon",
          enabledCollections: ['mdi'],
        }),
      ]
    }),

    Renderer(),
    customHtmlOutputPlugin(),// 添加自定义插件修复 HTML 输出路径
  ],
})
