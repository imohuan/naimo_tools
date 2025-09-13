
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
  ipcRouter: AllIpcRouter;
}


declare global {
  const api: ElectronAPI
  interface Window {
    electronAPI: ElectronAPI;
  }
}
