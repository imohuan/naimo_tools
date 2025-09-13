/**
 * Electron 主进程入口文件
 * 使用结构化架构和类型安全的 IPC 通信
 */

import { AppService } from './services/app.service';

console.log('🚀 主进程启动中...');

// 在这里设置断点 - 主进程入口点
const startTime = Date.now();
console.log('启动时间:', new Date(startTime).toLocaleTimeString());

// 获取应用服务实例
const appService = AppService.getInstance();
console.log('📦 应用服务实例已创建');
// console.log("🔍 导入的 IPC 处理器:", import.meta.glob("./ipc/handlers/*.handlers.ts"));

// 初始化应用
console.log('⚙️  开始初始化应用...');
appService.initialize()
  .then(() => {
    const endTime = Date.now();
    console.log('✅ 应用初始化完成，耗时:', endTime - startTime, 'ms');
  })
  .catch(error => {
    console.error('❌ 应用初始化失败:', error);
    process.exit(1);
  });

// 导出应用服务实例，供其他模块使用
export { appService };