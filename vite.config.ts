import { defineConfig } from 'vite';
import { resolve } from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDevelopment:', isDevelopment);

export default defineConfig({
  mode: process.env.NODE_ENV || 'development',
  root: resolve(__dirname, 'src/main'),
  build: {
    outDir: resolve(__dirname, 'dist/main'),
    // emptyOutDir: true,
    sourcemap: true, // 始终生成 source map，便于调试生产环境错误
    minify: isDevelopment ? false : 'esbuild', // 开发环境不压缩，便于调试
    // sourcemap: true,
    // minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/main.ts'),
        iconWorker: resolve(__dirname, 'src/main/workers/iconWorker.ts'),
      },
      external: [
        'electron',
        'electron-log',
        'electron-store',
        'electron-unhandled',
        'update-electron-app',
        "archiver",
        'path',
        'node:path',
        'url',
        'node:url',
        'fs',
        'node:fs',
        'fs/promises',
        'node:fs/promises',
        'fs-extra',
        'os',
        'node:os',
        'crypto',
        'node:crypto',
        'util',
        'node:util',
        'events',
        'stream',
        'buffer',
        'child_process',
        'clean-stack',
        'ensure-error',
        'lodash-es',
        "extract-file-icon",
        "electron-dl-manager",
        'constants',
        'zlib',
        'serialize-error',
        'puppeteer-core',
        'puppeteer-in-electron',
        'axios',
        'cheerio',
        'lowdb',
        'lowdb/node',
        'steno',
      ],
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        sourcemapExcludeSources: false, // 包含源代码在source map中
        // 强制将所有代码打包到单个文件中
        manualChunks: undefined,
        // 禁用代码分割，确保所有代码都在一个文件中
        inlineDynamicImports: false,
      }
    },
    target: 'node18'
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@libs': resolve(__dirname, 'src/libs'),
    }
  }
});
