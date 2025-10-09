import { ipcRenderer } from 'electron';
import axios from 'axios';
import { load } from 'cheerio';
import { DomParserConfig, AutomationConfig, HtmlFetchResult, } from './typings';

// IPC 通讯函数
/**
 * 执行自动化任务
 * @param config 自动化配置
 * @returns 页面HTML内容
 */
export async function automateWithJson(config: AutomationConfig): Promise<any[]> {
  return ipcRenderer.invoke('automate-with-json', config);
}

/**
 * 获取 HTML 内容
 * @param url 目标URL
 * @param asyncConfig 自动化配置（可选）
 * @returns HTML获取结果
 */
export async function fetchHTML(url: string, asyncConfig: AutomationConfig | null = null): Promise<HtmlFetchResult> {
  try {
    let html = '';

    if (asyncConfig) {
      asyncConfig.url = url;
      const result = await automateWithJson(asyncConfig);
      html = result.slice(-2)?.[0]
    } else {
      const response = await axios.get(url);
      html = response.data;
    }

    return {
      html,
      getConfig: (config: DomParserConfig | DomParserConfig[]) => parseHtmlByConfig(config, html),
      getTitle: () => parseHtmlByConfig({ cls: "title::text" }, html),
      getLinks: () => parseHtmlByConfig({
        cls: "@a::attr(href)",
        process: (relativeUrl: string) => new URL(relativeUrl, url).href
      }, html),
      getImages: () => parseHtmlByConfig({ cls: "@img::attr(src)" }, html)
    };
  } catch (error) {
    console.error('Error fetching HTML:', error);
    throw error;
  }
}

/**
 * 获取 JSON 数据
 * @param url 目标URL
 * @returns JSON数据
 */
export async function fetchJSON(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching JSON:', error);
    throw error;
  }
}

/**
 * DOM 解析器 - 根据配置对象从 HTML 中提取数据
 * @param config 解析配置
 * @param html HTML内容
 * @param root 根节点（递归使用）
 * @returns 解析结果
 */
export function parseHtmlByConfig(config: DomParserConfig | DomParserConfig[], html: string, root: any = null): any {
  const $ = root ? root : load(html);

  if (!Array.isArray(config)) {
    return parseNode(config, $, root);
  }

  const result: any = {};
  config.forEach(cfg => {
    result[cfg.name!] = parseNode(cfg, $, root);
  });

  return result;
}

/**
 * 解析单个配置节点
 * @param cfg 配置对象
 * @param $ Cheerio实例
 * @param root 根节点
 * @returns 解析结果
 */
function parseNode(cfg: DomParserConfig, $: any, root: any = null): any {
  const selector = cfg.cls;
  let pureSelector = '';
  let funcStr = '';
  let node = null;
  const isBatch = selector.startsWith('@');

  // 处理 | 分隔符，实现或关系
  const selectors = selector.replace('@', '').split('|').map(s => s.trim());

  for (const s of selectors) {
    const parts = s.split('::');
    pureSelector = parts[0];
    funcStr = parts[1] || '';

    if (root && pureSelector === '^') {
      node = root;
    } else {
      node = $(pureSelector, root);
    }

    if (node.length > 0) {
      break;
    }
  }

  // 如果有子节点配置，且匹配到了多于一个的元素，则递归处理
  if (cfg.children && node && node.length > 0) {
    const list: any[] = [];
    node.each((i: number, el: any) => {
      const childData: any = {};
      cfg.children!.forEach(childCfg => {
        childData[childCfg.name!] = parseNode(childCfg, $, $(el));
      });
      list.push(childData);
    });
    return list;
  }

  if (!node || !node.length) {
    return null;
  }

  // 执行函数
  if (funcStr) {
    const funcName = funcStr.split('(')[0];
    const attrMatch = funcStr.match(/\(([^)]+)\)/);
    const attrName = attrMatch ? attrMatch[1].replace(/['"]/g, '') : null;

    if (isBatch) {
      const results: any[] = [];
      node.each((i: number, el: any) => {
        results.push(processValue($(el), funcName, attrName, cfg.process));
      });
      return results;
    } else {
      return processValue(node, funcName, attrName, cfg.process);
    }
  }

  return node;
}

/**
 * 处理值的辅助函数
 * @param node DOM节点
 * @param funcName 函数名
 * @param attrName 属性名
 * @param processFn 后处理函数
 * @returns 处理后的值
 */
function processValue(node: any, funcName: string, attrName: string | null, processFn?: Function): any {
  let value = null;
  switch (funcName) {
    case 'text':
      value = node.text().trim();
      break;
    case 'attr':
      value = attrName ? node.attr(attrName) : null;
      break;
    case 'html':
      value = node.html();
      break;
    default:
      value = null;
  }

  if (processFn && typeof processFn === 'function') {
    return processFn(value);
  }
  return value;
}

// 导出对象
export const autoPuppeteerRenderer = {
  parseHtmlByConfig,
  fetchHTML,
  fetchJSON,
  automateWithJson,
};

// ========== UBrowser 渲染进程封装 ==========

import { WindowConfig, BrowserInstance, CookieFilter, DeviceOptions, Rect, AutomationStep } from './typings';

// IPC 调用函数类型
type IpcInvokeFunction = (channel: string, ...args: any[]) => Promise<any>;

/**
 * 创建渲染进程 UBrowser 对象
 * 链式调用模式：构建操作队列，最后统一执行
 */
function createUBrowserObject(ipcInvoke: IpcInvokeFunction) {
  const actions: AutomationStep[] = [];

  /**
   * 添加操作到队列
   */
  const addAction = (actionType: string, ...args: any[]) => {
    actions.push({ action: actionType, args } as AutomationStep);
    return api;
  };

  // API 对象
  const api = {
    // ========== 基础操作 ==========

    /** 导航到指定 URL */
    goto(url: string, options?: WindowConfig) {
      return addAction('goto', url, options);
    },

    /** 设置用户代理（User-Agent） */
    useragent(ua: string) {
      return addAction('useragent', ua);
    },

    /** 设置视口大小 */
    viewport(width: number, height: number) {
      return addAction('viewport', width, height);
    },

    /** 隐藏浏览器窗口 */
    hide() {
      return addAction('hide');
    },

    /** 显示浏览器窗口 */
    show() {
      return addAction('show');
    },

    // ========== 网页操作 ==========

    /** 注入自定义 CSS 样式 */
    css(css: string) {
      return addAction('css', css);
    },

    /** 在页面上下文中执行 JavaScript 代码或函数 */
    evaluate(func: Function | string, ...params: any[]) {
      // 将函数转换为 Puppeteer 可执行的格式
      if (typeof func === 'function') {
        const funcStr = func.toString();
        // 检查是否是箭头函数或普通函数
        if (funcStr.includes('=>') || funcStr.startsWith('function')) {
          // 包装成立即执行的函数表达式，让 Puppeteer 可以直接执行
          // 使用特殊标记让主进程知道这是需要特殊处理的
          return addAction('evaluate', { __isFunction: true, code: funcStr }, ...params);
        }
      }
      // 如果是字符串，直接传递
      return addAction('evaluate', func, ...params);
    },

    /** 模拟按键操作 */
    press(key: string, options?: { delay?: number }) {
      return addAction('keyboard.press', key, options);
    },

    /** 点击指定选择器的元素 */
    click(selector: string) {
      return addAction('click', selector);
    },

    /** 在指定元素上按下鼠标 */
    mousedown(selector: string) {
      return addAction('mousedown', selector);
    },

    /** 释放鼠标按键 */
    mouseup() {
      return addAction('mouseup');
    },

    /** 上传文件到文件输入框 */
    file(selector: string, payload: string | string[] | Buffer) {
      return addAction('file', selector, payload);
    },

    /** 在输入框中输入文本（模拟逐字输入） */
    type(selector: string, text: string, options?: { delay?: number }) {
      return addAction('type', selector, text, options);
    },

    /** 直接设置输入框的值（不触发输入事件） */
    value(selector: string, value: string) {
      return addAction('value', selector, value);
    },

    /** 选择下拉框选项 */
    select(selector: string, ...values: string[]) {
      return addAction('select', selector, ...values);
    },

    /** 设置复选框或单选框的选中状态 */
    check(selector: string, checked: boolean) {
      return addAction('check', selector, checked);
    },

    /** 聚焦到指定元素 */
    focus(selector: string) {
      return addAction('focus', selector);
    },

    /** 滚动到指定元素或坐标位置 */
    scroll(selectorOrX: string | number, y?: number) {
      if (typeof selectorOrX === 'string') {
        return addAction('scroll', selectorOrX);
      } else if (y !== undefined) {
        return addAction('scroll', selectorOrX, y);
      } else {
        return addAction('scroll', 0, selectorOrX);
      }
    },

    /** 粘贴文本内容 */
    paste(text: string) {
      return addAction('paste', text);
    },

    /** 截取页面截图 */
    screenshot(options?: any) {
      return addAction('screenshot', options);
    },

    /** 生成页面 PDF */
    pdf(options?: any) {
      return addAction('pdf', options);
    },

    /** 模拟设备环境（如手机、平板） */
    device(options: DeviceOptions) {
      return addAction('device', options);
    },

    /** 等待指定时间、选择器或函数条件满足 */
    wait(msOrSelectorOrFunc: number | string | Function, timeout?: number, ...params: any[]) {
      if (typeof msOrSelectorOrFunc === 'number') {
        return addAction('wait', msOrSelectorOrFunc);
      } else if (typeof msOrSelectorOrFunc === 'string') {
        return addAction('wait', msOrSelectorOrFunc, timeout);
      } else {
        return addAction('wait', msOrSelectorOrFunc.toString(), timeout, ...params);
      }
    },

    /** 等待选择器元素出现 */
    waitForSelector(selector: string, options?: { visible?: boolean; hidden?: boolean; timeout?: number }) {
      return addAction('waitForSelector', selector, options);
    },

    /** 等待选择器元素出现（简化版） */
    when(selector: string) {
      return addAction('when', selector);
    },

    /** 标记任务结束 */
    end() {
      return addAction('end');
    },

    /** 打开开发者工具 */
    devTools(mode?: 'right' | 'bottom' | 'undocked' | 'detach') {
      return addAction('devTools', mode || 'detach');
    },

    // ========== Cookie 操作 ==========

    /** 获取指定 URL 的 Cookies */
    cookies(...urls: string[]) {
      return addAction('cookies', ...urls);
    },

    /** 设置 Cookies */
    setCookie(...cookies: any[]) {
      return addAction('setCookie', ...cookies);
    },

    /** 删除 Cookies */
    deleteCookie(...cookies: any[]) {
      return addAction('deleteCookie', ...cookies);
    },

    // ========== 执行 ==========

    /** 执行所有操作队列并返回结果 */
    async run(options?: WindowConfig): Promise<[...any[], BrowserInstance]> {
      try {
        const result = await ipcInvoke('ubrowser:execute', actions, options);
        return result;
      } finally {
        actions.length = 0; // 清空操作队列
      }
    }
  };

  return api;
}

/**
 * 创建 UBrowser API 对象
 */
export function createRendererUBrowser(ipcInvoke: IpcInvokeFunction) {
  return {
    /**
     * 链式调用模式：构建操作队列，最后统一执行
     * @example
     * await naimo.ubrowser.goto("https://www.baidu.com").wait("#kw").run()
     */
    goto(url: string, options?: WindowConfig) {
      const ubrowser = createUBrowserObject(ipcInvoke);
      return ubrowser.goto(url, options);
    }
  };
}

// ========== 即时执行浏览器封装 ==========

/**
 * 创建即时执行浏览器对象
 */
function createInstantBrowserObject(ipcInvoke: IpcInvokeFunction) {
  let browserId: number | null = null;

  /**
   * 确保浏览器已创建
   */
  const ensureBrowser = () => {
    if (browserId === null) {
      throw new Error('浏览器未创建，请先调用 goto() 方法');
    }
  };

  return {
    /**
     * 打开浏览器并跳转到指定网页
     */
    async goto(url: string, options?: WindowConfig): Promise<BrowserInstance> {
      const result = await ipcInvoke('ubrowserInstant:execute', null, 'goto', url, options);
      browserId = result.id;
      return result;
    },

    /**
     * 等待（毫秒或选择器）
     */
    async wait(msOrSelector: number | string, timeout?: number): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'wait', msOrSelector, timeout);
    },

    /**
     * 点击元素
     */
    async click(selector: string): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'click', selector);
    },

    /**
     * 输入文本
     */
    async type(selector: string, text: string, options?: { delay?: number }): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'type', selector, text, options);
    },

    /**
     * 设置输入框的值
     */
    async value(selector: string, value: string): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'value', selector, value);
    },

    /**
     * 选择下拉框选项
     */
    async select(selector: string, ...values: string[]): Promise<string[]> {
      ensureBrowser();
      return await ipcInvoke('ubrowserInstant:execute', browserId, 'select', selector, ...values);
    },

    /**
     * 模拟键盘按键
     */
    async press(key: string, options?: { delay?: number }): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'keyboard.press', key, options);
    },

    /**
     * 执行自定义 JS 代码
     */
    async evaluate(func: Function | string, ...params: any[]): Promise<any> {
      ensureBrowser();
      // 将函数转换为 Puppeteer 可执行的格式
      if (typeof func === 'function') throw new Error('函数不能直接传递');
      return await ipcInvoke('ubrowserInstant:execute', browserId, 'evaluate', func, ...params);
    },

    /**
     * 滚动页面
     */
    async scroll(selectorOrX: string | number, y?: number): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'scroll', selectorOrX, y);
    },

    /**
     * 截图
     */
    async screenshot(options?: any): Promise<Buffer> {
      ensureBrowser();
      return await ipcInvoke('ubrowserInstant:execute', browserId, 'screenshot', options);
    },

    /**
     * 聚焦元素
     */
    async focus(selector: string): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'focus', selector);
    },

    /**
     * 获取 Cookies
     */
    async cookies(...urls: string[]): Promise<any> {
      ensureBrowser();
      return await ipcInvoke('ubrowserInstant:execute', browserId, 'cookies', ...urls);
    },

    /**
     * 设置 Cookies
     */
    async setCookie(...cookies: any[]): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'setCookie', ...cookies);
    },

    /**
     * 删除 Cookies
     */
    async deleteCookie(...cookies: any[]): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'deleteCookie', ...cookies);
    },

    /**
     * 显示窗口
     */
    async show(): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'show');
    },

    /**
     * 隐藏窗口
     */
    async hide(): Promise<void> {
      ensureBrowser();
      await ipcInvoke('ubrowserInstant:execute', browserId, 'hide');
    },

    /**
     * 关闭浏览器
     */
    async close(): Promise<void> {
      if (browserId !== null) {
        await ipcInvoke('ubrowserInstant:execute', browserId, 'close');
        browserId = null;
      }
    },

    /**
     * 获取浏览器信息
     */
    async getInfo(): Promise<BrowserInstance> {
      ensureBrowser();
      return await ipcInvoke('ubrowserInstant:execute', browserId, 'getInfo');
    }
  };
}

/**
 * 创建即时执行浏览器 API
 */
export function createInstantUBrowser(ipcInvoke: IpcInvokeFunction) {
  return {
    /**
     * 创建新的浏览器实例（即时执行模式）
     */
    create() {
      return createInstantBrowserObject(ipcInvoke);
    }
  };
}
