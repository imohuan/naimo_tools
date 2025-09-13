
// 类型声明
import type { AllIpcRouter } from './ipc-routes';

interface ElectronAPI {
  log: {
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
    throw_error: (error: any, options?: { title?: string }) => void;
  };
  sendTo: {
    windowMove: (id: number, x: number, y: number, width: number, height: number) => void;
  };
  ipcRouter: AllIpcRouter;
}

interface WebUtils {
  /**
   * 获取文件的实际路径
   * @param file 文件对象
   * @returns 文件的实际路径
   */
  getPathForFile: (file: File) => string;
}

declare global {
  const api: ElectronAPI
  const webUtils: WebUtils
  interface Window {
    id: number | null;
    electronAPI: ElectronAPI;
    webUtils: WebUtils;
  }
}
