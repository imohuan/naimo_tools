import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 基础配置
  base: './',
  publicDir: 'public',

  // 构建配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,

    // Rollup 配置
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // 输出格式
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },

  },

  // 开发服务器配置
  server: {
    port: 3000,
    open: false,
    cors: true,
    hmr: true
  },

  // 预览服务器配置
  preview: {
    port: 4173
  },

  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  // 优化配置
  optimizeDeps: {
    include: []
  }
});

