import { ipcRenderer } from 'electron';
import { arch, platform } from 'os';
import axios from 'axios';
import { load } from 'cheerio';
import { DomParserConfig, AutomationConfig, HtmlFetchResult, SystemInfo } from './typings';

// IPC 通讯函数
/**
 * 执行自动化任务
 * @param config 自动化配置
 * @returns 页面HTML内容
 */
export async function automateWithJson(config: AutomationConfig): Promise<string> {
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
      html = await ipcRenderer.invoke('automate-with-json', asyncConfig);
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
