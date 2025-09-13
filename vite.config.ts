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
    sourcemap: isDevelopment ? true : false,
    minify: isDevelopment ? false : 'terser', // 开发环境不压缩，便于调试
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/main.ts'),
        iconWorker: resolve(__dirname, 'src/main/workers/icon-worker.ts'),
      },
      external: [
        'electron',
        'electron-log',
        'electron-store',
        'electron-unhandled',
        'update-electron-app',
        'path',
        'url',
        'fs',
        'fs/promises',
        'os',
        'crypto',
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
        'crypto',
        'serialize-error'
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
      '@shared': resolve(__dirname, 'src/shared'),
      '@libs': resolve(__dirname, 'src/libs'),
    }
  }
});
