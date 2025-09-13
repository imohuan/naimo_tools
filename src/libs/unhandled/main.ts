import { app, dialog, clipboard, ipcMain } from 'electron';

import log from 'electron-log';
// @ts-ignore
import cleanStack from 'clean-stack';
import { ERROR_HANDLER_CHANNEL } from './config';
import { ensureError, ErrorHandlerOptions } from './common';

export class MainErrorHandler {
  private static instance: MainErrorHandler;
  private appName: string;
  private options: ErrorHandlerOptions;
  private isInstalled = false;

  constructor() {
    this.appName = 'name' in app ? app.name : (app as any).getName();
    this.reConstructLogError(log.error)
    this.options = {
      logger: log.error,
      showDialog: false, // 将在 install 方法中设置
    };
  }

  // 重构 logerror
  reConstructLogError(logger: any) {
    if (!logger.error || typeof logger.error !== 'function') return
    const oldError = logger.error
    logger.error = (message: string, ...args: any[]) => {
      const messages = [message, ...args].map(message => {
        if (message instanceof Error || message?.stack) return ensureError(message)
        return message
      })
      return oldError(...messages)
    }
  }

  getLog() {
    return log
  }

  static getInstance(): MainErrorHandler {
    if (!MainErrorHandler.instance) {
      MainErrorHandler.instance = new MainErrorHandler();
    }
    return MainErrorHandler.instance;
  }

  /**
   * 处理错误的核心方法
   */
  private handleError = async (title = `${this.appName} encountered an error`, error: any) => {
    error = ensureError(error);

    try {
      this.options.logger?.(error);
    } catch (loggerError) {
      dialog.showErrorBox(
        'The `logger` option function in electron-unhandled threw an error',
        ensureError(loggerError).stack || ''
      );
      return;
    }

    const shouldShowDialog = await Promise.resolve(this.options.showDialog);
    if (shouldShowDialog) {
      const stack = cleanStack(error.stack || '');

      if (app.isReady()) {
        const buttons = ['OK', "Copy",];
        if (this.options.reportButton) buttons.push('Report…');
        // Intentionally not using the `title` option as it's not shown on macOS
        const buttonIndex = dialog.showMessageBoxSync({
          type: 'error',
          buttons,
          defaultId: 0,
          noLink: true,
          message: title,
          detail: cleanStack(error.stack || '', { pretty: true }),
        });

        if (buttonIndex === 1) {
          clipboard.writeText(`${title}\n${stack}`);
        }

        if (buttonIndex === 2) {
          this.options.reportButton?.(error);
        }
      } else {
        dialog.showErrorBox(title, stack);
      }
    }
  };

  /**
   * 安装错误处理器
   */
  install(inputOptions?: ErrorHandlerOptions) {
    if (this.isInstalled) return
    this.isInstalled = true;
    if (inputOptions) {
      this.options = { ...this.options, ...inputOptions, };
    }

    // 注册 IPC 处理器
    ipcMain.handle(ERROR_HANDLER_CHANNEL, async (event_, title, error) => {
      await this.handleError(title, error);
    });

    // 主进程错误处理
    process.on('uncaughtException', (error: any) => {
      this.handleError('Unhandled Error', error).catch(console.error);
    });

    process.on('unhandledRejection', (error: any) => {
      this.handleError('Unhandled Promise Rejection', error).catch(console.error);
    });

    log.info('错误处理器已安装');
  }

  /**
   * 手动记录错误
   */
  logError(error: any, options: { title?: string } = {}) {
    this.handleError(options.title, error).catch(console.error);
  }

  /**
   * 更新配置
   */
  updateOptions(newOptions: Partial<ErrorHandlerOptions>) {
    this.options = { ...this.options, ...newOptions, };
  }
}
