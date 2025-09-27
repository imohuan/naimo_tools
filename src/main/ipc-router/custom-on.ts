import { BaseWindow, ipcMain } from "electron";


export function initializeCustomOn() {
  ipcMain.on("window-move", (event, id: number, x: number, y: number, width: number, height: number) => {
    try {
      // 只移动主窗口位置，使用 BaseWindow API
      const window = BaseWindow.fromId(id);
      if (window) {
        window.setBounds({ x, y, width, height });
      } else {
        console.warn(`窗口 ID ${id} 不存在或尚未创建`);
      }
    } catch (error) {
      console.error("处理窗口移动事件时发生错误:", error);
    }
  });
}
