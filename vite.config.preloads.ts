import { defineConfig } from 'vite';
import { resolve, normalize } from 'path';
import { statSync, existsSync } from 'fs';
import commonjs from 'vite-plugin-commonjs';
import { builtinModules } from 'module';

// 单文件打包模式 - 通过环境变量指定入口文件
function getPreloadEntries() {
  const preloadsDir = resolve(__dirname, 'src/main/preloads');
  const entries: Record<string, string> = {};

  const singleFile = process.env.PRELOAD_ENTRY;
  if (!singleFile) {
    console.error('❌ 必须指定 PRELOAD_ENTRY 环境变量');
    process.exit(1);
  }

  const filePath = resolve(preloadsDir, `${singleFile}.ts`);
  if (statSync(preloadsDir).isDirectory() && existsSync(filePath)) {
    entries[singleFile] = filePath;
    console.log(`📦 单文件打包模式: ${singleFile}.ts`);
    return entries;
  } else {
    console.error(`❌ 指定的 preload 文件不存在: ${singleFile}.ts`);
    process.exit(1);
  }
}

const isDevelopment = process.env.NODE_ENV === 'development';
const root = normalize(resolve(__dirname, 'src/main/preloads'))

console.log('getPreloadEntries:', getPreloadEntries());

export default defineConfig({
  root,
  mode: process.env.NODE_ENV || 'development',
  build: {
    outDir: resolve(__dirname, 'dist/main/preloads'),
    emptyOutDir: false, // 不清理目录，允许多个文件共存
    sourcemap: isDevelopment ? "inline" : false,
    minify: isDevelopment ? false : 'terser', // 开发环境不压缩
    lib: {
      entry: getPreloadEntries(),
      formats: ['cjs']
    },
    rollupOptions: {
      external: [
        'electron',
        // 'electron-log',
        // 'electron-store',
        "module",
        'path',
        'url',
        'fs',
        'os',
        'electron',
        'electron-log',
        'electron-store',
        'path',
        'url',
        'fs',
        'os',
        "ensure-error",
        'lodash-es',
        "extract-file-icon",
        'crypto',
        'clean-stack',
        // "cheerio",
        // "axios",
        "puppeteer-core",
        "puppeteer-in-electron",
        ...builtinModules
      ],
      output: {
        format: 'cjs', // 改为 CommonJS 格式
        entryFileNames: '[name].js', // 使用 .js 扩展名
        // chunkFileNames: '[name].js',
        exports: 'auto',
        sourcemapExcludeSources: true, // 包含源代码在source map中
        // manualChunks: (id) => {
        //   if (!id.startsWith(root.replace(/\\/g, "/"))) return "chunk"
        // }
        // 强制将所有代码打包到单个文件中
        manualChunks: undefined,
        // 禁用代码分割，确保所有代码都在一个文件中
        inlineDynamicImports: true,
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
  },
  plugins: [commonjs()]
});
