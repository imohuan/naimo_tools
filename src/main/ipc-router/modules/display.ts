/**
 * 显示器信息模块
 * 提供显示器信息查询、鼠标位置等功能
 */

import { screen } from "electron";
import log from "electron-log";
import type { Display } from "@shared/typings/naimoApiTypes";

/**
 * 将 Electron Display 转换为 Naimo Display 格式
 */
function convertDisplay(display: Electron.Display): Display {
  return {
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    internal: display.internal,
  };
}

/**
 * 获取主显示器信息
 * @param event IPC事件对象
 * @returns 主显示器信息
 */
export async function getPrimaryDisplay(
  event: Electron.IpcMainInvokeEvent
): Promise<Display> {
  try {
    const display = screen.getPrimaryDisplay();
    log.info("🖥️ 获取主显示器信息成功");
    return convertDisplay(display);
  } catch (error) {
    log.error("❌ 获取主显示器信息失败:", error);
    throw error;
  }
}

/**
 * 获取所有显示器信息
 * @param event IPC事件对象
 * @returns 所有显示器信息数组
 */
export async function getAllDisplays(
  event: Electron.IpcMainInvokeEvent
): Promise<Display[]> {
  try {
    const displays = screen.getAllDisplays();
    log.info(`🖥️ 获取所有显示器信息成功，共 ${displays.length} 个显示器`);
    return displays.map(convertDisplay);
  } catch (error) {
    log.error("❌ 获取所有显示器信息失败:", error);
    return [];
  }
}

/**
 * 获取鼠标当前位置
 * @param event IPC事件对象
 * @returns 鼠标坐标 {x, y}
 */
export async function getCursorPosition(
  event: Electron.IpcMainInvokeEvent
): Promise<{ x: number; y: number }> {
  try {
    const point = screen.getCursorScreenPoint();
    log.info(`🖱️ 获取鼠标位置成功: (${point.x}, ${point.y})`);
    return point;
  } catch (error) {
    log.error("❌ 获取鼠标位置失败:", error);
    return { x: 0, y: 0 };
  }
}

/**
 * 根据屏幕坐标获取所在的显示器
 * @param event IPC事件对象
 * @param point 屏幕坐标
 * @returns 显示器信息
 */
export async function getDisplayNearestPoint(
  event: Electron.IpcMainInvokeEvent,
  point: { x: number; y: number }
): Promise<Display> {
  try {
    const display = screen.getDisplayNearestPoint(point);
    log.info(`🖥️ 获取坐标 (${point.x}, ${point.y}) 附近的显示器信息成功`);
    return convertDisplay(display);
  } catch (error) {
    log.error("❌ 获取显示器信息失败:", error);
    throw error;
  }
}

/**
 * 将屏幕坐标转换为 DIP 坐标
 * DIP (Device Independent Pixels): 设备独立像素
 * @param event IPC事件对象
 * @param point 屏幕坐标
 * @returns DIP 坐标
 */
export async function screenToDipPoint(
  event: Electron.IpcMainInvokeEvent,
  point: { x: number; y: number }
): Promise<{ x: number; y: number }> {
  try {
    const dipPoint = screen.screenToDipPoint(point);
    log.info(
      `📐 屏幕坐标转DIP: (${point.x}, ${point.y}) -> (${dipPoint.x}, ${dipPoint.y})`
    );
    return dipPoint;
  } catch (error) {
    log.error("❌ 屏幕坐标转DIP失败:", error);
    return point;
  }
}

/**
 * 将 DIP 坐标转换为屏幕坐标
 * @param event IPC事件对象
 * @param point DIP 坐标
 * @returns 屏幕坐标
 */
export async function dipToScreenPoint(
  event: Electron.IpcMainInvokeEvent,
  point: { x: number; y: number }
): Promise<{ x: number; y: number }> {
  try {
    const screenPoint = screen.dipToScreenPoint(point);
    log.info(
      `📐 DIP转屏幕坐标: (${point.x}, ${point.y}) -> (${screenPoint.x}, ${screenPoint.y})`
    );
    return screenPoint;
  } catch (error) {
    log.error("❌ DIP转屏幕坐标失败:", error);
    return point;
  }
}

