import { app, BrowserWindow, ipcMain } from 'electron';
import { AutomationConfig } from './typings';

import * as puppeteer from 'puppeteer-core';
import * as pie from 'puppeteer-in-electron';

/**
 * Auto Puppeteer 主进程类
 * 提供网页自动化、下载管理和缓存管理功能
 */
export class AutoPuppeteerMain {
  private initialized = false;
  static instance: AutoPuppeteerMain | null = null;

  static getInstance(): AutoPuppeteerMain {
    if (!this.instance) {
      this.instance = new AutoPuppeteerMain();
    }
    return this.instance;
  }

  /**
   * 初始化 auto_puppeteer 主进程功能
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    // 初始化 puppeteer-in-electron
    await pie.initialize(app);
    this.setupIpcHandlers();
    this.initialized = true;
  }


  /**
   * 设置 IPC 处理程序
   */
  private setupIpcHandlers(): void {
    // 自动化相关
    ipcMain.handle('automate-with-json', async (event, config: AutomationConfig) => {
      return this.runAutomationTask(config);
    });
  }

  /**
   * 运行自动化任务
   * @param config 自动化配置
   * @returns 页面HTML内容
   */
  async runAutomationTask(config: AutomationConfig): Promise<string> {
    const browser = await pie.connect(app, puppeteer);

    const win = new BrowserWindow({
      show: config.show || false,
      webPreferences: {
        nodeIntegration: false
      }
    });

    const ses = win.webContents.session;

    // 请求拦截配置
    if (config.requestInterception?.enabled) {
      let regexList = config.requestInterception.regex || [
        /\.(png|jpg|jpeg|gif|svg|webp)$/i,
        /\.(css|woff2?|ttf|eot)$/i
      ];

      ses.webRequest.onBeforeRequest({
        urls: ['*://*/*']
      }, (details, callback) => {
        const shouldCancel = regexList.some(regex => regex.test(details.url));
        callback(shouldCancel ? { cancel: true } : {});
      });
    }

    const url = config.url || 'about:blank';
    let page: any;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const timeout = config.timeout || 5000;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`AUTOMATION_TIMEOUT Automation task timed out after ${timeout / 1000} seconds.`));
        }, timeout);
      });

      const taskPromise = (async () => {
        await new Promise<void>((resolve, reject) => {
          win.webContents.once('did-finish-load', () => {
            console.log(`页面 ${url} 加载完成。`);
            resolve();
          });
          win.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
            reject(new Error(`页面加载失败: ${errorDescription} (错误码: ${errorCode})`));
          });
          win.loadURL(url);
        });

        page = await pie.getPage(browser, win);
        console.log(`Puppeteer 已连接到新窗口，开始执行自动化任务...`);

        const customFunctions = {
          'waitForTimeout': async (t: number) => new Promise(resolve => setTimeout(resolve, t))
        };

        for (const step of config.steps) {
          const { action, args } = step;
          if (typeof customFunctions[action as keyof typeof customFunctions] === 'function') {
            console.log(`正在执行自定义动作: ${action} with args:`, args);
            await (customFunctions[action as keyof typeof customFunctions] as any)(...args);
          } else {
            const parts = action.split('.');
            let context = page;
            let func = page;

            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              if (func && typeof func[part] !== 'undefined') {
                context = func;
                func = func[part];
              } else {
                func = null;
                break;
              }
            }

            if (typeof func === 'function') {
              console.log(`正在执行Puppeteer动作: ${action} with args:`, args);
              if (['type', 'click'].includes(parts[parts.length - 1])) {
                const selector = args[0];
                await page.waitForSelector(selector);
              }
              await func.apply(context, args);
            } else {
              console.warn(`未知的动作: ${action}`);
            }
          }
        }

        const html = await page.content();
        console.log('自动化任务完成，正在返回页面源码。');
        return html;
      })();

      return await Promise.race([taskPromise, timeoutPromise]);
    } catch (error: any) {
      if (error.message.includes('AUTOMATION_TIMEOUT')) {
        console.error('自动化任务超时。正在获取当前页面 HTML...');
        if (page) {
          try {
            return await page.content();
          } catch (htmlError) {
            console.error('获取超时页面的 HTML 失败:', htmlError);
            throw error;
          }
        } else {
          const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
          if (html) return html;
          console.warn('任务在 Puppeteer 连接前超时，无法获取 HTML。');
          throw error;
        }
      } else {
        console.error('自动化执行过程中出错:', error.message);
        throw error;
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
    }
  }

}

// 导出单例实例
export const autoPuppeteerMain = AutoPuppeteerMain.getInstance();
