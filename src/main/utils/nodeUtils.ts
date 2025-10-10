import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import log from "electron-log";

/**
 * 获取当前文件的目录
 * @param metaUrl 当前文件的URL
 * @returns 当前文件的目录
 */
export function getDirname(metaUrl: string) {
  return dirname(fileURLToPath(metaUrl));
}

/**
 * 防抖函数
 * @param func 函数
 * @param wait 等待时间
 * @returns 函数
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 创建组合的 preload 脚本
 * 将内置 preload 和用户自定义 preload 合并
 * @param customScript 自定义脚本代码（如元数据等）
 * @param defaultPreloadPath 默认 preload 脚本路径
 * @param customPreloadPath 用户自定义 preload 脚本路径（可选）
 * @param outputName 输出文件的自定义名称（可选，不包含扩展名）
 */
export async function createCombinedPreloadScript(
  customScript: string,
  defaultPreloadPath: string,
  customPreloadPath?: string,
  outputName?: string
): Promise<string> {
  try {
    // 读取内置 preload 脚本
    const builtinPreloadContent = readFileSync(defaultPreloadPath, 'utf-8');

    // 读取用户自定义 preload 脚本（如果存在）
    let customPreloadContent = '';
    if (customPreloadPath && existsSync(customPreloadPath)) {
      try {
        customPreloadContent = readFileSync(customPreloadPath, 'utf-8');
        log.debug(`读取用户自定义 preload 脚本: ${customPreloadPath}`);
      } catch (error) {
        log.warn(`读取用户自定义 preload 脚本失败，将忽略: ${customPreloadPath}`, error);
      }
    }

    // 创建组合脚本内容
    const combinedContent = `
// 元数据和自定义脚本
${customScript}

// 内置 preload 脚本
${builtinPreloadContent}

${customPreloadContent ? `
(() => {
  // 用户自定义 preload 脚本
  ${customPreloadContent}
})()
` : ''}
`;

    // 创建临时文件
    const tempDir = join(tmpdir(), 'naimo');
    mkdirSync(tempDir, { recursive: true });

    // 使用自定义名称或默认名称
    const fileName = outputName
      ? outputName
      : `combined-preload-${Date.now()}.js`;
    const tempFilePath = join(tempDir, fileName);
    writeFileSync(tempFilePath, combinedContent, 'utf-8');

    log.debug(`创建组合 preload 脚本: ${tempFilePath}`);
    return tempFilePath;

  } catch (error) {
    log.error('创建组合 preload 脚本失败:', error);
    // 如果失败，回退到内置 preload
    return defaultPreloadPath
  }
}