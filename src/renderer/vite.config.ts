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

// https://vite.dev/config/
export default defineConfig({
  base: './', // 设置基础路径为相对路径，确保资源文件能正确加载
  server: {
    port: devConfig.port,
    host: devConfig.host,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      "@main": resolve(__dirname, '../main'),
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

    Renderer()
  ],
})
