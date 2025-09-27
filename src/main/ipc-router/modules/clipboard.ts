/**
 * 剪切板管理模块
 * 提供剪切板读取和写入功能
 */

import { clipboard, nativeImage } from "electron";
import log from "electron-log";

/**
 * 读取剪切板文本内容
 * @returns 剪切板中的文本内容
 */
export function readText(event: Electron.IpcMainInvokeEvent): string {
  try {
    const text = clipboard.readText();
    log.info("📋 读取剪切板文本成功");
    return text;
  } catch (error) {
    log.error("❌ 读取剪切板文本失败:", error);
    return "";
  }
}

/**
 * 写入文本到剪切板
 * @param event IPC事件对象
 * @param text 要写入的文本
 * @returns 是否写入成功
 */
export function writeText(event: Electron.IpcMainInvokeEvent, text: string): boolean {
  try {
    clipboard.writeText(text);
    log.info("📋 写入剪切板文本成功");
    return true;
  } catch (error) {
    log.error("❌ 写入剪切板文本失败:", error);
    return false;
  }
}

/**
 * 清空剪切板
 * @returns 是否清空成功
 */
export function clear(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    clipboard.clear();
    log.info("📋 清空剪切板成功");
    return true;
  } catch (error) {
    log.error("❌ 清空剪切板失败:", error);
    return false;
  }
}

/**
 * 检查剪切板是否有文本内容
 * @returns 是否有文本内容
 */
export function hasText(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const text = clipboard.readText();
    return text.trim().length > 0;
  } catch (error) {
    log.error("❌ 检查剪切板文本失败:", error);
    return false;
  }
}

/**
 * 检测剪切板内容是否为中文
 * @returns 是否包含中文字符
 */
export function hasChineseText(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const text = clipboard.readText();
    // 使用正则表达式检测中文字符
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(text);
  } catch (error) {
    log.error("❌ 检测剪切板中文内容失败:", error);
    return false;
  }
}

/**
 * 获取剪切板中的中文文本
 * 如果剪切板中包含中文，返回文本；否则返回空字符串
 * @returns 中文文本或空字符串
 */
export function getChineseText(event: Electron.IpcMainInvokeEvent): string {
  try {
    const text = clipboard.readText();
    const chineseRegex = /[\u4e00-\u9fff]/;

    if (chineseRegex.test(text)) {
      log.info("📋 检测到剪切板中包含中文内容");
      return text;
    } else {
      log.info("📋 剪切板中无中文内容");
      return "";
    }
  } catch (error) {
    log.error("❌ 获取剪切板中文内容失败:", error);
    return "";
  }
}

/**
 * 检查剪切板是否有图片内容
 * @returns 是否有图片内容
 */
export function hasImage(event: Electron.IpcMainInvokeEvent): boolean {
  try {
    const image = clipboard.readImage();
    return !image.isEmpty();
  } catch (error) {
    log.error("❌ 检查剪切板图片失败:", error);
    return false;
  }
}

/**
 * 读取剪切板图片内容并转换为base64
 * @returns base64格式的图片数据，如果没有图片则返回null
 */
export function readImageAsBase64(event: Electron.IpcMainInvokeEvent): string | null {
  try {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      log.info("📋 剪切板中没有图片内容");
      return null;
    }

    const buffer = image.toPNG();
    const base64Data = buffer.toString('base64');
    log.info("📋 读取剪切板图片成功");
    return `data:image/png;base64,${base64Data}`;
  } catch (error) {
    log.error("❌ 读取剪切板图片失败:", error);
    return null;
  }
}

/**
 * 写入图片到剪切板
 * @param event IPC事件对象
 * @param imageData base64格式的图片数据
 * @returns 是否写入成功
 */
export function writeImage(event: Electron.IpcMainInvokeEvent, imageData: string): boolean {
  try {
    // 移除data:image/png;base64,前缀
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const image = nativeImage.createFromBuffer(buffer);

    clipboard.writeImage(image);
    log.info("📋 写入剪切板图片成功");
    return true;
  } catch (error) {
    log.error("❌ 写入剪切板图片失败:", error);
    return false;
  }
}
