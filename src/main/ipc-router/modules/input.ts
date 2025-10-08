/**
 * 输入模拟模块
 * 提供模拟粘贴操作（复制到剪贴板 + 发送粘贴键）
 * 
 * 注意：此模块需要第三方库来模拟键盘操作
 * - Windows: 可以使用 robotjs 或 @nut-tree/nut-js
 * - macOS/Linux: 同样支持上述库
 * 
 * 当前实现为基础版本，后续可根据需要集成键盘模拟库
 */

import { clipboard, nativeImage } from "electron";
import log from "electron-log";
import fs from "fs-extra";

/**
 * 模拟粘贴文本
 * 将文本复制到剪贴板，然后模拟 Ctrl+V 或 Cmd+V
 * 
 * @param event IPC事件对象
 * @param text 要粘贴的文本
 * @returns 是否操作成功
 */
export async function pasteText(
  event: Electron.IpcMainInvokeEvent,
  text: string
): Promise<boolean> {
  try {
    // 1. 将文本复制到剪贴板
    clipboard.writeText(text);
    log.info("📋 文本已复制到剪贴板");

    // 2. 模拟粘贴键（需要键盘模拟库）
    // TODO: 集成 robotjs 或 @nut-tree/nut-js 来模拟 Ctrl+V
    log.warn(
      "⚠️ 键盘模拟功能尚未实现，文本已复制到剪贴板，请手动粘贴（Ctrl+V）"
    );

    return true;
  } catch (error) {
    log.error("❌ 模拟粘贴文本失败:", error);
    return false;
  }
}

/**
 * 模拟粘贴图片
 * 将图片复制到剪贴板，然后模拟 Ctrl+V 或 Cmd+V
 * 
 * @param event IPC事件对象
 * @param imageData base64格式的图片数据或Buffer
 * @returns 是否操作成功
 */
export async function pasteImage(
  event: Electron.IpcMainInvokeEvent,
  imageData: string | Buffer
): Promise<boolean> {
  try {
    let image: Electron.NativeImage;

    if (typeof imageData === "string") {
      // 处理 base64 字符串
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      image = nativeImage.createFromBuffer(buffer);
    } else {
      // 处理 Buffer
      image = nativeImage.createFromBuffer(imageData);
    }

    // 1. 将图片复制到剪贴板
    clipboard.writeImage(image);
    log.info("📋 图片已复制到剪贴板");

    // 2. 模拟粘贴键（需要键盘模拟库）
    // TODO: 集成 robotjs 或 @nut-tree/nut-js 来模拟 Ctrl+V
    log.warn(
      "⚠️ 键盘模拟功能尚未实现，图片已复制到剪贴板，请手动粘贴（Ctrl+V）"
    );

    return true;
  } catch (error) {
    log.error("❌ 模拟粘贴图片失败:", error);
    return false;
  }
}

/**
 * 模拟粘贴文件
 * 将文件路径复制到剪贴板，然后模拟 Ctrl+V 或 Cmd+V
 * 
 * @param event IPC事件对象
 * @param filePath 文件路径（单个或多个）
 * @returns 是否操作成功
 */
export async function pasteFile(
  event: Electron.IpcMainInvokeEvent,
  filePath: string | string[]
): Promise<boolean> {
  try {
    const paths = Array.isArray(filePath) ? filePath : [filePath];

    // 验证文件是否存在
    for (const path of paths) {
      if (!(await fs.pathExists(path))) {
        log.error(`❌ 文件不存在: ${path}`);
        return false;
      }
    }

    // 1. 将文件路径写入剪贴板
    // 注意：Electron 的 clipboard.writeBuffer 可以用来写入文件列表
    // 但是具体格式因平台而异
    clipboard.write({
      text: paths.join("\n"),
      // 在 Windows 上，可以使用特殊格式
      // 在 macOS 上，可以使用 NSFilenamesPboardType
    });
    log.info(`📋 文件路径已复制到剪贴板: ${paths.join(", ")}`);

    // 2. 模拟粘贴键（需要键盘模拟库）
    // TODO: 集成 robotjs 或 @nut-tree/nut-js 来模拟 Ctrl+V
    log.warn(
      "⚠️ 键盘模拟功能尚未实现，文件路径已复制到剪贴板，请手动粘贴（Ctrl+V）"
    );

    return true;
  } catch (error) {
    log.error("❌ 模拟粘贴文件失败:", error);
    return false;
  }
}

/**
 * 模拟按键
 * 
 * @param event IPC事件对象
 * @param key 按键名称（如 "ctrl+v", "enter", "esc" 等）
 * @returns 是否模拟成功
 */
export async function simulateKeyPress(
  event: Electron.IpcMainInvokeEvent,
  key: string
): Promise<boolean> {
  try {
    // TODO: 集成 robotjs 或 @nut-tree/nut-js 来模拟按键
    log.warn(
      `⚠️ 键盘模拟功能尚未实现，无法模拟按键: ${key}`
    );
    log.info(
      "💡 提示：请安装 @nut-tree/nut-js 或 robotjs 来启用键盘模拟功能"
    );

    return false;
  } catch (error) {
    log.error("❌ 模拟按键失败:", error);
    return false;
  }
}

/**
 * 模拟组合键
 * 
 * @param event IPC事件对象
 * @param modifiers 修饰键数组（如 ["ctrl", "shift"]）
 * @param key 主键（如 "v"）
 * @returns 是否模拟成功
 */
export async function simulateHotkey(
  event: Electron.IpcMainInvokeEvent,
  modifiers: string[],
  key: string
): Promise<boolean> {
  try {
    const hotkeyStr = [...modifiers, key].join("+");

    // TODO: 集成 robotjs 或 @nut-tree/nut-js 来模拟组合键
    log.warn(
      `⚠️ 键盘模拟功能尚未实现，无法模拟组合键: ${hotkeyStr}`
    );
    log.info(
      "💡 提示：请安装 @nut-tree/nut-js 或 robotjs 来启用键盘模拟功能"
    );

    return false;
  } catch (error) {
    log.error("❌ 模拟组合键失败:", error);
    return false;
  }
}

