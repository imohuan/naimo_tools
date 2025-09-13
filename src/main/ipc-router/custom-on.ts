import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log";

export function initializeCustomOn() {
  ipcMain.on("window-move", (event, id: number, x: number, y: number, width: number, height: number) => {
    const window = BrowserWindow.fromId(id);
    if (window) {
      window.setBounds({ x, y, width, height });
    }
  });
}
