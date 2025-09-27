import { resolve } from 'path';
import { readFileSync } from 'fs';
import { getDirname } from '@main/utils';

// 获取项目根目录
export function getProjectRoot(): string {
  const __dirname = getDirname(import.meta.url);
  // 从 src/main/config/ 回到项目根目录
  return resolve(__dirname, '../..');
}

// 从 package.json 读取渲染进程URL配置
export function getRendererUrl(): string {
  try {
    const packageJsonPath = resolve(getProjectRoot(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const devConfig = packageJson.config?.dev || {};
    const port = devConfig.rendererPort || 5173;
    const host = devConfig.rendererHost || 'localhost';
    return `http://${host}:${port}`;
  } catch (error) {
    console.warn('无法读取 package.json 配置，使用默认URL:', error);
    return 'http://localhost:5173';
  }
}

// WindowConfigManager 类已移除，其功能已由新的 BaseWindow 架构接管
// 保留的工具函数被 BaseWindowController 和其他新组件使用
