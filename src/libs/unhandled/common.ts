/**
 * 通用错误处理工具函数
 */

/**
 * 确保传入的值是一个 Error 实例。
 * @param {any} value
 * @returns {Error}
 */
export function ensureError(value: any): Error {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if (typeof value.message === 'string') {
      const error = new Error(value.message);
      // 复制其他属性，如 name, code 等
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          (error as any)[key] = value[key];
        }
      }
      return error;
    }
  }

  // 如果无法转换为 Error 实例，就返回一个新的 Error
  return new Error(String(value));
}

/**
 * 统一的错误处理器选项接口
 */
export interface ErrorHandlerOptions {
  /**
   * 错误日志记录器
   */
  logger?: (error: any) => void;
  /**
   * 是否显示错误对话框
   */
  showDialog?: boolean | Promise<boolean>;
  /**
   * 错误报告按钮
   */
  reportButton?: (error: any) => void;
}

/**
 * 判断当前是否为主进程
 */
export function isMainProcess(): boolean {
  return (process as any).type === 'main';
}

/**
 * 判断当前是否为渲染进程
 */
export function isRendererProcess(): boolean {
  return (process as any).type === 'renderer';
}
