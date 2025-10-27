import { app, BrowserWindow, ipcMain } from 'electron';
import { AutomationConfig, WindowConfig, BrowserInstance, AutomationStep, Logger, BrowserSession, NavigationOptions, GoToStep } from './typings';

import * as puppeteer from 'puppeteer-core';
import * as pie from 'puppeteer-in-electron';

/**
 * Auto Puppeteer 主进程类
 * 提供网页自动化、下载管理和缓存管理功能
 */
export class AutoPuppeteerMain {
  private initialized = false;
  private log: Logger = console; // 默认使用 console
  private sessions = new Map<number, BrowserSession>(); // 即时浏览器会话管理
  private customFunctions: Record<string, Function> = {}; // 自定义函数
  static instance: AutoPuppeteerMain | null = null;

  private constructor() {
    this.initCustomFunctions();
  }

  private initCustomFunctions(): void {
    // ========== 工具函数 ==========
    this.registerCustomFunction('waitForTimeout', async (context: BrowserSession, t: number) =>
      new Promise(resolve => setTimeout(resolve, t))
    );

    // ========== 窗口控制 ==========
    this.registerCustomFunction('show', async (context: BrowserSession) => {
      context.window.show();
    });

    this.registerCustomFunction('hide', async (context: BrowserSession) => {
      context.window.hide();
    });

    this.registerCustomFunction('close', async (context: BrowserSession) => {
      const browserId = context.window.id;
      if (!context.window.isDestroyed()) {
        context.window.destroy();
      }
      this.sessions.delete(browserId);
    });

    this.registerCustomFunction('getInfo', async (context: BrowserSession) => {
      const bounds = context.window.getBounds();
      return {
        id: context.window.id,
        url: context.window.webContents.getURL(),
        title: context.window.getTitle(),
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y
      };
    });

    // ========== 页面操作 ==========
    this.registerCustomFunction('css', async (context: BrowserSession, css: string) => {
      await context.page.addStyleTag({ content: css });
    });

    this.registerCustomFunction('mousedown', async (context: BrowserSession, selector: string) => {
      await context.page.waitForSelector(selector);
      const element = await context.page.$(selector);
      if (element) {
        await element.hover();
        await context.page.mouse.down();
      }
    });

    this.registerCustomFunction('mouseup', async (context: BrowserSession) => {
      await context.page.mouse.up();
    });

    this.registerCustomFunction('file', async (context: BrowserSession, selector: string, ...paths: string[]) => {
      const fileInput = await context.page.$(selector) as any;
      if (fileInput) {
        await fileInput.uploadFile(...paths);
      }
    });

    this.registerCustomFunction('check', async (context: BrowserSession, selector: string, checked: boolean) => {
      await context.page.waitForSelector(selector);
      const checkbox = await context.page.$(selector);
      if (checkbox) {
        const isChecked = await checkbox.evaluate((el: any) => el.checked);
        if (isChecked !== checked) {
          await checkbox.click();
        }
      }
    });

    this.registerCustomFunction('paste', async (context: BrowserSession, text: string) => {
      await context.page.keyboard.sendCharacter(text);
    });

    this.registerCustomFunction('device', async (context: BrowserSession, deviceOption: any) => {
      await context.page.emulate(deviceOption);
    });

    this.registerCustomFunction('viewport', async (context: BrowserSession, width: number, height: number) => {
      await context.page.setViewport({ width, height });
    });

    this.registerCustomFunction('useragent', async (context: BrowserSession, userAgent: string) => {
      const session = context.window.webContents.session;
      await session.setUserAgent(userAgent);
    });

    // ========== 其他操作 ==========
    this.registerCustomFunction('wait', async (context: BrowserSession, msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params: any[]) => {
      if (typeof msOrSelectorOrFunc === 'number') {
        await new Promise(resolve => setTimeout(resolve, msOrSelectorOrFunc));
      } else if (typeof msOrSelectorOrFunc === 'string') {
        await context.page.waitForSelector(msOrSelectorOrFunc, { timeout });
      } else if (typeof msOrSelectorOrFunc === 'function') {
        const funcStr = msOrSelectorOrFunc.toString();
        await context.page.waitForFunction(funcStr, { timeout }, ...params);
      }
    });

    this.registerCustomFunction('scroll', async (context: BrowserSession, selector?: string, x: number = 0, y: number = 10000) => {
      if (selector?.trim()) {
        await context.page.evaluate((selector: string, x: number, y: number) => {
          const element = document.querySelector(selector);
          if (element) element.scrollTo({ top: y, left: x });
        }, selector, x, y);
      } else {
        await context.page.evaluate((x: number, y: number) => {
          window.scrollTo(x, y);
        }, x, y);
      }
    });

    this.registerCustomFunction('devTools', async (context: BrowserSession, mode?: 'right' | 'bottom' | 'undocked' | 'detach') => {
      if (mode === 'detach') {
        context.window.webContents.openDevTools({ mode: 'detach' });
      } else {
        context.window.webContents.openDevTools({ mode: mode || 'detach' });
      }
    });
  }

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
   * 设置日志工具
   * @param logger 日志工具实例，需要实现 info、error、warn 方法
   */
  setLog(logger: Logger): void {
    this.log = logger;
  }

  /**
   * 注册自定义函数
   * @param name 函数名
   * @param func 函数实现
   */
  registerCustomFunction(name: string, func: Function): void {
    this.customFunctions[name] = func;
  }

  /**
   * 批量注册自定义函数
   * @param functions 函数映射对象
   */
  registerCustomFunctions(functions: Record<string, Function>): void {
    Object.assign(this.customFunctions, functions);
  }

  /**
   * 设置 IPC 处理程序
   */
  private setupIpcHandlers(): void {
    // 自动化相关
    ipcMain.handle('automate-with-json', async (event, config: AutomationConfig) => {
      return this.runAutomationTask(config);
    });
    // UBrowser 链式调用模式
    ipcMain.handle('ubrowser:execute', async (event, actions: AutomationStep[], options?: WindowConfig) => {
      return await this.executeActions(options || {}, actions);
    });
    // UBrowser 即时执行模式
    ipcMain.handle('ubrowserInstant:execute', async (event, browserId: number | null, action: string, ...args: any[]) => {
      return await this.executeInstantAction(browserId, action, args);
    });
  }

  /**
   * 创建浏览器窗口
   */
  private async createBrowserWindow(config: WindowConfig): Promise<{ window: BrowserWindow; browser: puppeteer.Browser }> {
    const browser = await pie.connect(app, puppeteer);

    const win = new BrowserWindow({
      ...(config?.show ? { show: config.show } : {}),
      ...(config?.width ? { width: config.width } : {}),
      ...(config?.height ? { height: config.height } : {}),
      ...(config?.x ? { x: config.x } : {}),
      ...(config?.y ? { y: config.y } : {}),
      ...(config?.center ? { center: config.center } : {}),
      ...(config?.minWidth ? { minWidth: config.minWidth } : {}),
      ...(config?.minHeight ? { minHeight: config.minHeight } : {}),
      ...(config?.maxWidth ? { maxWidth: config.maxWidth } : {}),
      ...(config?.maxHeight ? { maxHeight: config.maxHeight } : {}),
      ...(config?.resizable ? { resizable: config.resizable } : {}),
      ...(config?.movable ? { movable: config.movable } : {}),
      ...(config?.minimizable ? { minimizable: config.minimizable } : {}),
      ...(config?.maximizable ? { maximizable: config.maximizable } : {}),
      ...(config?.alwaysOnTop ? { alwaysOnTop: config.alwaysOnTop } : {}),
      ...(config?.fullscreen ? { fullscreen: config.fullscreen } : {}),
      ...(config?.fullscreenable ? { fullscreenable: config.fullscreenable } : {}),
      ...(config?.opacity ? { opacity: config.opacity } : {}),
      ...(config?.frame ? { frame: config.frame } : {}),
      ...(config?.closable ? { closable: config.closable } : {}),
      ...(config?.focusable ? { focusable: config.focusable } : {}),
      ...(config?.skipTaskbar ? { skipTaskbar: config.skipTaskbar } : {}),
      ...(config?.backgroundColor ? { backgroundColor: config.backgroundColor } : {}),
      ...(config?.hasShadow ? { hasShadow: config.hasShadow } : {}),
      ...(config?.transparent ? { transparent: config.transparent } : {}),
      webPreferences: config.webPreferences || {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const ses = win.webContents.session;

    // 请求拦截配置
    if (config.requestInterception?.enabled) {
      const regexList = config.requestInterception.regex || [
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

    return { window: win, browser };
  }

  /**
   * 执行单个action
   * @param session 浏览器会话（作为执行上下文）
   * @param action 操作名称
   * @param args 操作参数
   */
  private async executeAction(context: BrowserSession, action: string, args: any[]): Promise<any> {
    const { page } = context;

    // 检查是否是自定义函数
    if (this.customFunctions[action]) {
      this.log.info(`正在执行自定义动作: ${action} with args:`, args);
      return await this.customFunctions[action](context, ...args);
    }

    // Puppeteer 原生方法
    const parts = action.split('.');
    let func: any = page;
    let execContext: any = page;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (func && typeof func[part] !== 'undefined') {
        execContext = func;
        func = func[part];
      } else {
        func = null;
        break;
      }
    }

    if (typeof func === 'function') {
      this.log.info(`正在执行Puppeteer动作: ${action} with args:`, args);

      // 特殊处理：对于需要选择器的操作，先等待选择器
      if (['type', 'click'].includes(parts[parts.length - 1])) {
        const selector = args[0];
        await page.waitForSelector(selector);
      }

      // 特殊处理：evaluate 方法需要将函数对象转换为可执行函数
      if (action === 'evaluate' && args.length > 0) {
        const firstArg = args[0];
        // 检查是否是特殊标记的函数对象
        if (typeof firstArg === 'object' && firstArg !== null && firstArg.__isFunction) {
          try {
            const funcStr = firstArg.code;
            // 使用 new Function 创建可执行函数
            // 创建一个函数，该函数返回原函数的执行结果
            const wrappedFunc = new Function(`return (${funcStr}).apply(this, arguments)`);
            args[0] = wrappedFunc;
          } catch (e) {
            this.log.error(`无法将函数代码转换为可执行函数:`, e);
            throw e;
          }
        }
      }

      return await func.apply(execContext, args);
    } else {
      this.log.warn(`未知的动作: ${action}`);
    }
  }

  async executeActions(config: WindowConfig, actions: AutomationStep[]) {
    const finalConfig: WindowConfig = { width: 800, height: 600, show: true, ...config };
    const { window: win, browser } = await this.createBrowserWindow(finalConfig);

    let session: BrowserSession = { window: win, page: null as any, browser };
    let timeoutId: NodeJS.Timeout | undefined;
    const results: any[] = [];

    try {
      const timeout = config.timeout || 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`AUTOMATION_TIMEOUT Automation task timed out after ${timeout / 1000} seconds.`));
        }, timeout);
      });

      const taskPromise = (async () => {
        for (const step of actions) {
          const { action, args } = step;

          // goto 操作需要特殊处理（创建 session）
          if (action === 'goto') {
            const [url, gotoOptions] = args as [string, NavigationOptions?];
            // 加载页面（使用统一的方法）
            await this.loadPageWithTimeout(win, url, { timeout: gotoOptions?.timeout, headers: gotoOptions?.headers });
            // 连接 Puppeteer 并创建会话
            const page = await pie.getPage(browser, win);
            session = { window: win, page, browser };
            continue;
          }

          // 其他操作都通过 executeAction 统一处理
          if (!session) {
            throw new Error(`操作 ${action} 需要先执行 goto 操作`);
          }

          const result = await this.executeAction(session, action, args);
          if (result !== undefined) {
            results.push(result);
          }
        }
        if (session) results.push(await this.executeAction(session, 'getInfo', []));
        this.log.info('[UBrowser] 任务完成');
        return JSON.parse(JSON.stringify(results))

      })()
      return await Promise.race([taskPromise, timeoutPromise]);
    } catch (error: any) {
      if (error.message.includes('AUTOMATION_TIMEOUT')) {
        this.log.error('自动化任务超时。正在获取当前页面 HTML...');
        if (session && session?.page) {
          try {
            const html = await session.page.content();
            return [html, {}];
          } catch (htmlError) {
            this.log.error('获取超时页面的 HTML 失败:', htmlError);
            throw error;
          }
        } else {
          const html = await win.webContents.executeJavaScript('document.documentElement.outerHTML');
          if (html) return [html, {}];
          this.log.warn('任务在 Puppeteer 连接前超时，无法获取 HTML。');
          throw error;
        }
      } else {
        this.log.error('自动化执行过程中出错:', error.message);
        throw error;
      }

    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
    }
  }

  /**
   * 运行自动化任务
   * @param config 自动化配置
   * @returns 页面HTML内容
   */
  async runAutomationTask(config: AutomationConfig): Promise<any[]> {
    const goto: GoToStep = { action: 'goto', args: [config.url || 'about:blank', {}] }
    const actions: AutomationStep[] = [goto, ...config.steps]
    return await this.executeActions(config, actions);
  }

  // ========== UBrowser 即时执行模式 ==========
  /**
   * 获取会话
   */
  private getSession(browserId: number): BrowserSession {
    const session = this.sessions.get(browserId);
    if (!session) {
      throw new Error(`浏览器实例 ${browserId} 不存在`);
    }
    return session;
  }

  /**
   * 统一执行即时操作
   */
  async executeInstantAction(browserId: number | null, action: string, args: any[]): Promise<any> {
    this.log.info(`[InstantUBrowser] 执行操作: ${action}`, args);

    switch (action) {
      case 'goto': {
        // goto 是特殊的，它创建新的浏览器实例
        const [url, options] = args;
        return await this.createInstantBrowser(url, options);
      }

      default: {
        // 其他操作需要 browserId
        if (browserId === null) {
          throw new Error(`操作 ${action} 需要提供 browserId`);
        }

        const session = this.getSession(browserId);
        return await this.executeAction(session, action, args);
      }
    }
  }

  /**
   * 加载页面（支持超时和请求头）
   */
  private async loadPageWithTimeout(
    win: BrowserWindow,
    url: string,
    options?: { timeout?: number; headers?: Record<string, string> }
  ): Promise<void> {
    const ses = win.webContents.session;

    // 设置请求头
    if (options?.headers) {
      ses.webRequest.onBeforeSendHeaders((details, callback) => {
        callback({ requestHeaders: { ...details.requestHeaders, ...options.headers } });
      });
    }

    // 加载页面（支持超时）
    await new Promise<void>((resolve, reject) => {
      const timer = options?.timeout ? setTimeout(() => {
        reject(new Error('页面加载超时'));
      }, options.timeout) : null;

      win.webContents.once('did-finish-load', () => {
        if (timer) clearTimeout(timer);
        resolve();
      });

      win.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
        if (timer) clearTimeout(timer);
        reject(new Error(`页面加载失败: ${errorDescription}`));
      });

      win.loadURL(url);
    });
  }

  /**
   * 创建即时浏览器实例
   */
  private async createInstantBrowser(url: string, options?: WindowConfig): Promise<BrowserInstance> {
    this.log.info('[InstantUBrowser] 打开浏览器', url);

    const finalOptions: WindowConfig = {
      show: true, width: 1200, height: 800, ...options
    };
    const { window: win, browser } = await this.createBrowserWindow(finalOptions);

    // 加载页面
    await this.loadPageWithTimeout(win, url, { timeout: options?.timeout, headers: options?.headers });

    const page = await pie.getPage(browser, win);

    const browserId = win.id;
    const session: BrowserSession = { window: win, page, browser };
    this.sessions.set(browserId, session);

    win.on('closed', () => {
      this.sessions.delete(browserId);
      this.log.info('[InstantUBrowser] 浏览器窗口已关闭', browserId);
    });

    // 使用 getInfo 自定义函数获取窗口信息
    return await this.executeAction(session, 'getInfo', []);
  }

}

// 导出单例实例
export const autoPuppeteerMain = AutoPuppeteerMain.getInstance();
