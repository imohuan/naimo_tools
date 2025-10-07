import { BaseWindow, ipcMain, BrowserWindow, WebContentsView } from "electron";


export function initializeCustomOn() {
  // 处理 BrowserWindow 移动 - 从 event 中直接获取窗口
  ipcMain.on("window-move", (event, x: number, y: number, width: number, height: number) => {
    try {
      // 方案1: 从 event.sender 获取 BrowserWindow
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.setBounds({ x, y, width, height });
      } else {
        console.warn(`[window-move] 无法从 event.sender 获取窗口`);
      }
    } catch (error) {
      console.error("[window-move] 处理窗口移动事件时发生错误:", error);
    }
  });

  // 处理 View 移动 - 使用传入的父窗口 ID，移动 View 所在的 BaseWindow
  ipcMain.on("view-move", (event, id: number, x: number, y: number, width: number, height: number) => {
    try {
      // 使用 BaseWindow.fromId 直接获取父窗口
      // id 是 parentWindowId，即 View 所在的 BaseWindow 的 ID
      const window = BaseWindow.fromId(id);
      if (window) {
        window.setBounds({ x, y, width, height });
      } else {
        console.warn(`[view-move] 窗口 ID ${id} 不存在`);
      }
    } catch (error) {
      console.error("[view-move] 处理视图移动事件时发生错误:", error);
    }
  });
}
