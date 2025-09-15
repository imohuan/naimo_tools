import { BrowserWindow, ipcMain } from "electron";
import { WindowConfigManager } from "../config/window.config";
import { calculateFollowingWindowBounds } from "./modules/window";
import { WindowType } from "../config/window-manager";


export function initializeCustomOn() {
  ipcMain.on("window-move", (event, id: number, x: number, y: number, width: number, height: number) => {
    const window = BrowserWindow.fromId(id);
    const windowManager = WindowConfigManager.getWindowManager();

    if (window) window.setBounds({ x, y, width, height });

    // 使用抽象函数计算跟随窗口的最终边界
    const bounds = calculateFollowingWindowBounds(x, y, width, height, 2);

    // 获取所有跟随窗口并更新位置
    const followingWindows = windowManager.getWindowsByType(WindowType.FOLLOWING);
    followingWindows.forEach(win => {
      // 设置计算好的边界
      win.setBounds(bounds);
    });
  });
}
