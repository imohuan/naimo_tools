/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, BrowserWindow } from "electron";
import { resolve } from "path";
import log from "electron-log";
import { NewWindowManager } from "@main/window/NewWindowManager";
import { BaseWindowController } from "@main/window/BaseWindowController";

/**
 * 最小化窗口 - 基于视图类别的智能控制
 */
export async function minimize(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('最小化失败：无法获取当前视图信息');
      return false;
    }

    // 根据视图类别决定控制行为
    if (currentViewInfo.config.category === ViewCategory.MAIN_WINDOW) {
      log.debug('最小化操作被禁止：主窗口视图不支持窗口控制');
      return false;
    }

    if (currentViewInfo.config.category === ViewCategory.DETACHED_WINDOW) {
      // 分离窗口视图允许最小化
      const controller = BaseWindowController.getInstance();
      const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

      if (callingWindow && !callingWindow.isDestroyed()) {
        if (callingWindow.isMinimized?.()) {
          log.debug('窗口已是最小化状态');
          return true;
        }
        callingWindow.minimize();
        log.debug(`分离窗口已最小化，ID: ${callingWindow.id}`);
        return true;
      }
    }

    log.warn('最小化失败：无法找到调用窗口或不支持的视图类别');
    return false;
  } catch (error) {
    log.error('最小化窗口失败:', error);
    return false;
  }
}

/**
 * 最大化/还原窗口 - 基于视图类别的智能控制
 */
export async function maximize(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('最大化失败：无法获取当前视图信息');
      return false;
    }

    // 根据视图类别决定控制行为
    if (currentViewInfo.config.category === ViewCategory.MAIN_WINDOW) {
      log.debug('最大化操作被禁止：主窗口视图不支持窗口控制');
      return false;
    }

    if (currentViewInfo.config.category === ViewCategory.DETACHED_WINDOW) {
      // 分离窗口视图允许最大化/还原
      const controller = BaseWindowController.getInstance();
      const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

      if (callingWindow && !callingWindow.isDestroyed()) {
        if (callingWindow.isMaximized()) {
          callingWindow.unmaximize();
          log.debug(`分离窗口已还原，ID: ${callingWindow.id}`);
        } else {
          callingWindow.maximize();
          log.debug(`分离窗口已最大化，ID: ${callingWindow.id}`);
        }
        return true;
      }
    }

    log.warn('最大化失败：无法找到调用窗口或不支持的视图类别');
    return false;
  } catch (error) {
    log.error('最大化窗口失败:', error);
    return false;
  }
}

/**
 * 关闭窗口 - 基于视图类别的智能控制
 */
export async function close(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('关闭失败：无法获取当前视图信息');
      return false;
    }

    // 根据视图类别决定控制行为
    if (currentViewInfo.config.category === ViewCategory.MAIN_WINDOW) {
      log.debug('关闭操作被禁止：主窗口视图不支持窗口控制');
      return false;
    }

    if (currentViewInfo.config.category === ViewCategory.DETACHED_WINDOW) {
      // 分离窗口视图允许关闭
      const baseWindowController = BaseWindowController.getInstance();
      const callingWindow = baseWindowController.getWindow(currentViewInfo.parentWindowId);

      if (!callingWindow || callingWindow.isDestroyed()) {
        log.warn(`关闭失败：窗口不存在或已销毁 (${currentViewInfo.parentWindowId})`);
        return false;
      }

      callingWindow.close();
      log.debug(`已关闭分离窗口: ${callingWindow.id}`);
      return true;
    }

    log.warn('关闭失败：不支持的视图类别');
    return false;
  } catch (error) {
    log.error('关闭窗口失败:', error);
    return false;
  }
}

/**
 * 切换窗口显示状态
 * @param show 可选参数，指定是否显示窗口。不传则进行toggle
 */
export async function toggleShow(event: Electron.IpcMainInvokeEvent, _id?: number, show?: boolean): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('切换窗口显示失败：无法获取当前视图信息');
      return false;
    }

    const baseWindowController = BaseWindowController.getInstance();
    const callingWindow = baseWindowController.getWindow(currentViewInfo.parentWindowId);

    if (!callingWindow || callingWindow.isDestroyed()) {
      log.warn(`切换窗口显示失败：窗口不存在或已销毁 (${currentViewInfo.parentWindowId})`);
      return false;
    }

    const isVisible = baseWindowController.isWindowVisible(callingWindow);
    const shouldShow = show ?? !isVisible;

    if (shouldShow && !isVisible) {
      baseWindowController.showWindow(callingWindow);
      callingWindow.focus();
      log.debug(`窗口已显示: ${callingWindow.id}`);
    } else if (!shouldShow && isVisible) {
      baseWindowController.hideWindow(callingWindow);
      log.debug(`窗口已隐藏: ${callingWindow.id}`);
    }

    return true;
  } catch (error) {
    log.error('切换窗口显示状态失败:', error);
    return false;
  }
}

/**
 * 检查窗口是否最大化
 * @returns 窗口是否最大化
 */
export async function isMaximized(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息来判断是主窗口还是分离窗口
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      return false;
    }

    // 如果是主窗口的视图调用，始终返回false（主窗口不支持最大化）
    if (mainWindow && currentViewInfo.parentWindowId === mainWindow.id) {
      return false;
    }

    // 如果是分离窗口调用，检查实际状态
    const controller = BaseWindowController.getInstance();
    const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

    if (callingWindow && !callingWindow.isDestroyed()) {
      return callingWindow.isMaximized();
    }

    return false;
  } catch (error) {
    log.error('检查窗口是否最大化失败:', error);
    return false;
  }
}

/**
 * 检查窗口是否全屏或最大化
 * @returns 窗口是否处于全屏或最大化状态
 */
export async function isFullscreen(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息来判断是主窗口还是分离窗口
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      return false;
    }

    // 如果是主窗口的视图调用，始终返回false（主窗口不支持全屏）
    if (mainWindow && currentViewInfo.parentWindowId === mainWindow.id) {
      return false;
    }

    // 如果是分离窗口调用，检查实际状态
    const controller = BaseWindowController.getInstance();
    const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

    if (callingWindow && !callingWindow.isDestroyed()) {
      // 检查是否全屏
      const isFullScreen = callingWindow.isFullScreen?.() || false;
      // 检查是否最大化
      const isMaximized = callingWindow.isMaximized();

      log.debug(`窗口状态检查 (ID: ${callingWindow.id}): 全屏=${isFullScreen}, 最大化=${isMaximized}`);

      // 全屏或最大化都返回 true
      return isFullScreen || isMaximized;
    }

    return false;
  } catch (error) {
    log.error('检查窗口是否全屏失败:', error);
    return false;
  }
}

/**
 * 检查窗口是否显示
 * @param id 窗口ID
 * @returns 窗口是否显示
 */
export async function isWindowVisible(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }
    return BaseWindowController.getInstance().isWindowVisible(mainWindow);
  } catch (error) {
    log.error('检查窗口显示状态失败:', error);
    return false;
  }
}

/**
 * 设置窗口大小
 * @param width 窗口宽度
 * @param height 窗口高度
 */
export async function setSize(event: Electron.IpcMainInvokeEvent, width: number, height: number): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('设置窗口大小失败：主窗口不存在或已销毁');
      return false;
    }

    const controller = BaseWindowController.getInstance();
    const currentBounds = mainWindow.getBounds();
    const nextBounds = {
      width: width === -1 ? currentBounds.width : width,
      height: height === -1 ? currentBounds.height : height
    };

    if (nextBounds.width === currentBounds.width && nextBounds.height === currentBounds.height) {
      return true;
    }

    controller.setWindowBounds(mainWindow, nextBounds);
    log.debug(`主窗口大小已设置为: ${nextBounds.width}x${nextBounds.height}`);
    return true;
  } catch (error) {
    log.error('设置窗口大小失败:', error);
    return false;
  }
}

/**
 * 动态调整窗口高度
 * 使用前端传递的高度直接设置窗口大小
 * @param height 前端计算的目标高度
 */
export async function adjustHeight(event: Electron.IpcMainInvokeEvent, height: number): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    await manager.adjustWindowHeight(height);
    log.debug(`动态调整窗口高度: ${height}px`);
    return true;
  } catch (error) {
    log.error('动态调整窗口高度失败:', error);
    return false;
  }
}

/**
 * 设置窗口是否可调整大小
 * @param resizable 是否可调整大小
 */
export async function setResizable(event: Electron.IpcMainInvokeEvent, resizable: boolean): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('设置窗口大小调整状态失败：主窗口不存在或已销毁');
      return false;
    }

    mainWindow.setResizable(resizable);
    log.debug(`主窗口可调整大小状态已设置为: ${resizable}`);
    return true;
  } catch (error) {
    log.error('设置窗口可调整大小状态失败:', error);
    return false;
  }
}

/**
 * 打开日志查看器窗口
 */
export function openLogViewer(event: Electron.IpcMainInvokeEvent): void {
  // 检查是否已经有日志查看器窗口打开
  const existingWindow = BrowserWindow.getAllWindows().find(
    (window) => window.getTitle() === "日志查看器"
  );

  if (existingWindow) {
    existingWindow.focus();
    return;
  }

  // 创建新的日志查看器窗口
  const logWindow = new BrowserWindow({
    width: 1500,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "日志查看器",
    frame: false, // 无边框窗口
    show: false,
    hasShadow: false, // 移除窗口阴影
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: resolve(app.getAppPath(), 'dist/main/preloads/basic.js'), // 注入basic.js preload
      webSecurity: true,
    },
  });

  // 加载日志查看器HTML文件
  const logViewerPath = resolve(app.getAppPath(), 'dist/renderer/log-viewer.html');
  logWindow.loadFile(logViewerPath);

  // 窗口准备好后显示
  logWindow.once("ready-to-show", () => {
    logWindow.show();
    log.info("日志查看器窗口已打开");
  });

  // 窗口关闭时的处理
  logWindow.on("closed", () => {
    log.info("日志查看器窗口已关闭");
  });

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === "development") {
    logWindow.webContents.openDevTools({ mode: "bottom" });
  }
}


/**
 * 显示主窗口
 * 通过ViewManager获取main-view的父窗口并显示
 */
export async function show(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const viewManager = ViewManager.getInstance();
    const mainViewInfo = viewManager.getViewInfo('main-view');

    if (!mainViewInfo) {
      log.warn('显示窗口失败：找不到main-view');
      return false;
    }

    const baseWindowController = BaseWindowController.getInstance();
    const parentWindow = baseWindowController.getWindow(mainViewInfo.parentWindowId);

    if (!parentWindow || parentWindow.isDestroyed()) {
      log.warn('显示窗口失败：主窗口不存在或已销毁');
      return false;
    }

    baseWindowController.showWindow(parentWindow);
    parentWindow.focus();
    log.debug('主窗口已显示');

    return true;
  } catch (error) {
    log.error('显示窗口失败:', error);
    return false;
  }
}

/**
 * 隐藏主窗口
 * 通过ViewManager获取main-view的父窗口并隐藏
 */
export async function hide(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const viewManager = ViewManager.getInstance();
    const mainViewInfo = viewManager.getViewInfo('main-view');

    if (!mainViewInfo) {
      log.warn('隐藏窗口失败：找不到main-view');
      return false;
    }

    const baseWindowController = BaseWindowController.getInstance();
    const parentWindow = baseWindowController.getWindow(mainViewInfo.parentWindowId);

    if (!parentWindow || parentWindow.isDestroyed()) {
      log.warn('隐藏窗口失败：主窗口不存在或已销毁');
      return false;
    }

    baseWindowController.hideWindow(parentWindow);
    log.debug('主窗口已隐藏');

    return true;
  } catch (error) {
    log.error('隐藏窗口失败:', error);
    return false;
  }
}

/**
 * 获取UI常量配置
 * @returns UI常量配置对象，包含headerHeight、maxHeight、padding
 */
export function getUIConstants(event: Electron.IpcMainInvokeEvent): {
  headerHeight: number;
  maxHeight: number;
  padding: number;
} {
  return { headerHeight: 50, maxHeight: 420, padding: 8 };
}

// legacy createWebPageWindow 已移除，统一使用 showNewView

// ===== 新窗口管理 API =====
// 以下是基于 NewWindowManager 的新窗口管理 API

import { ViewManager } from '@main/window/ViewManager'
import { ViewType, LifecycleType } from '@renderer/src/typings/windowTypes'
import { ViewCategory } from '@main/typings/windowTypes'
import type { PluginItem } from '@renderer/src/typings/pluginTypes'


/**
 * 显示视图（新架构）
 */
export async function showNewView(event: Electron.IpcMainInvokeEvent, params: {
  type: ViewType
  path?: string
  url?: string
  pluginItem?: PluginItem
  forceNew?: boolean
  lifecycleType?: LifecycleType
}): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()

    const viewParams = {
      type: params.type,
      config: {
        path: params.path,
        url: params.url
      },
      pluginItem: params.pluginItem,
      forceNew: params.forceNew || false,
      lifecycleStrategy: params.lifecycleType ? {
        type: params.lifecycleType,
        persistOnClose: params.lifecycleType === LifecycleType.BACKGROUND,
        maxIdleTime: 5 * 60 * 1000,
        memoryThreshold: 100
      } : undefined
    }

    const result = await manager.showView(viewParams)

    if (result.success && result.viewId) {
      log.info(`视图显示成功，ID: ${result.viewId}`)
      return { success: true, viewId: result.viewId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('显示视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 隐藏视图（新架构）
 */
export async function hideNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.hideView(viewId)

    if (result.success) {
      log.info(`视图隐藏成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('隐藏视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 移除视图（新架构）
 */
export async function removeNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.removeView(viewId)

    if (result.success) {
      log.info(`视图移除成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('移除视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 切换到视图（新架构）
 */
export async function switchToNewView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.switchToView(viewId)

    if (result.success) {
      log.info(`切换到视图成功，ID: ${viewId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('切换视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 分离视图（新架构）
 */
export async function detachNewView(event: Electron.IpcMainInvokeEvent, viewId: string, config?: {
  title?: string
  width?: number
  height?: number
  showControlBar?: boolean
}): Promise<{ success: boolean; detachedWindowId?: number; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()

    const detachConfig = config ? {
      title: config.title,
      bounds: config.width && config.height ? {
        x: 0, y: 0, width: config.width, height: config.height
      } : undefined,
      showControlBar: config.showControlBar !== false,
      sourceViewId: viewId
    } : undefined

    const result = await manager.detachView(viewId, detachConfig)

    if (result.success && result.data?.detachedWindowId) {
      log.info(`视图分离成功，ID: ${viewId}, 窗口ID: ${result.data.detachedWindowId}`)
      return { success: true, detachedWindowId: result.data.detachedWindowId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('分离视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 重新附加视图（新架构）
 */
export async function reattachNewView(event: Electron.IpcMainInvokeEvent, detachedWindowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.reattachView(detachedWindowId)

    if (result.success) {
      log.info(`视图重新附加成功，窗口ID: ${detachedWindowId}`)
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('重新附加视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取活跃视图信息（新架构）
 */
export function getActiveNewView(event: Electron.IpcMainInvokeEvent): { success: boolean; viewInfo?: any; error?: string } {
  try {
    const manager = NewWindowManager.getInstance()
    const viewInfo = manager.getActiveView()

    return {
      success: true,
      viewInfo: viewInfo ? {
        id: viewInfo.id,
        type: viewInfo.config.type,
        isVisible: viewInfo.state.isVisible,
        isActive: viewInfo.state.isActive,
        createdAt: viewInfo.createdAt,
        config: viewInfo.config
      } : null
    }
  } catch (error) {
    log.error('获取活跃视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取所有视图信息（新架构）
 */
export function getAllNewViews(event: Electron.IpcMainInvokeEvent): { success: boolean; views?: any[]; error?: string } {
  try {
    const manager = NewWindowManager.getInstance()
    const views = manager.getAllViews()

    return {
      success: true,
      views: views.map(viewInfo => ({
        id: viewInfo.id,
        type: viewInfo.config.type,
        isVisible: viewInfo.state.isVisible,
        isActive: viewInfo.state.isActive,
        createdAt: viewInfo.createdAt,
        config: viewInfo.config
      }))
    }
  } catch (error) {
    log.error('获取所有视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取窗口管理器性能指标（新架构）
 */
export function getNewWindowManagerMetrics(event: Electron.IpcMainInvokeEvent): { success: boolean; metrics?: any; error?: string } {
  try {
    const manager = NewWindowManager.getInstance()
    const metrics = manager.getPerformanceMetrics()
    const statistics = manager.getStatistics()

    return {
      success: true,
      metrics: {
        performance: metrics,
        statistics
      }
    }
  } catch (error) {
    log.error('获取性能指标失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 清理后台视图（新架构）
 */
export async function cleanupNewBackgroundViews(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    await manager.cleanupBackgroundViews()

    log.info('后台视图清理完成')
    return { success: true }
  } catch (error) {
    log.error('清理后台视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 更新窗口管理器配置（新架构）
 */
export function updateNewWindowManagerConfig(event: Electron.IpcMainInvokeEvent, config: {
  memoryRecycleThreshold?: number
  autoRecycleInterval?: number
  maxActiveViews?: number
}): { success: boolean; error?: string } {
  try {
    const manager = NewWindowManager.getInstance()
    manager.updateConfig(config)

    log.info('窗口管理器配置更新成功')
    return { success: true }
  } catch (error) {
    log.error('更新配置失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 销毁窗口管理器（新架构）
 */
export function destroyNewWindowManager(event: Electron.IpcMainInvokeEvent): { success: boolean; error?: string } {
  try {
    const manager = NewWindowManager.getInstance()
    manager.destroy()
    log.info('NewWindowManager 已销毁')
    return { success: true }
  } catch (error) {
    log.error('销毁窗口管理器失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 创建插件视图（新架构专用 - 懒加载架构）
 */
export async function createPluginView(event: Electron.IpcMainInvokeEvent, params: {
  fullPath: string
  title: string
  lifecycleType: LifecycleType
  url: string  // 可选：没有则后台加载 about:blank（用于无 UI 的后台插件）
  preload: string
  singleton?: boolean
  data?: any  // 传递给插件的任意参数
}): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.createPluginView(params)
    if (result.success && result.viewId) {
      log.info(`✅ 插件视图创建成功: ${result.viewId}, fullPath: ${params.fullPath}`)
      return { success: true, viewId: result.viewId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('创建插件视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 关闭插件视图（新架构专用）
 * 关闭所有不支持后台运行的插件视图
 */
export async function closePluginView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string; closedCount?: number }> {
  try {
    const manager = NewWindowManager.getInstance()
    const lifecycleManager = manager.getLifecycleManager()

    // 获取所有视图
    const allViews = manager.getAllViews()

    // 筛选出不支持后台运行的插件视图
    const nonBackgroundPluginViews = allViews.filter(viewInfo => {
      // 检查是否为插件视图
      if (!viewInfo.id.startsWith('plugin:')) {
        return false
      }

      // 获取视图的生命周期状态
      const lifecycleState = lifecycleManager.getViewState(viewInfo.id)
      if (!lifecycleState) {
        // 如果没有生命周期状态，默认关闭
        return true
      }

      // 检查是否为前台模式（不支持后台运行）
      return lifecycleState.strategy.type === LifecycleType.FOREGROUND || !lifecycleState.strategy.persistOnClose
    })

    let successCount = 0
    let errors: string[] = []

    // 关闭所有不支持后台运行的插件视图
    for (const viewInfo of nonBackgroundPluginViews) {
      try {
        const result = await manager.closePluginView(viewInfo.id)
        if (result.success) {
          successCount++
          log.info(`已关闭不支持后台运行的插件视图: ${viewInfo.id}`)
        } else {
          errors.push(`关闭视图 ${viewInfo.id} 失败: ${result.error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        errors.push(`关闭视图 ${viewInfo.id} 异常: ${errorMsg}`)
        log.error(`关闭插件视图异常: ${viewInfo.id}`, error)
      }
    }

    log.info(`插件视图关闭完成，成功关闭 ${successCount} 个不支持后台运行的插件视图`)

    if (errors.length > 0) {
      log.warn('部分插件视图关闭失败:', errors)
      return {
        success: true, // 部分成功仍然返回成功
        closedCount: successCount,
        error: `部分视图关闭失败: ${errors.join('; ')}`
      }
    }

    return {
      success: true,
      closedCount: successCount
    }
  } catch (error) {
    log.error('关闭插件视图失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}


/**
 * 创建设置页面 WebContentsView
 */
export async function createSettingsView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.createSettingsView()

    if (result.success) {
      log.info(`设置页面创建成功: ${result.viewId}`)
      return {
        success: true,
        viewId: result.viewId
      }
    } else {
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    log.error('创建设置页面时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 关闭设置页面 WebContentsView
 */
export async function closeSettingsView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance()
    const result = await manager.closeSettingsView()

    if (result.success) {
      log.info('设置页面关闭成功')
      return { success: true }
    } else {
      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    log.error('关闭设置页面时发生错误:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 获取当前WebContentsView的完整信息
 * 通过webContents查找对应的WebContentsViewInfo，并返回序列化后的信息
 * @param event IPC事件对象
 * @returns 序列化后的视图信息，如果找不到则返回null
 */
export function getCurrentViewInfo(event: Electron.IpcMainInvokeEvent): {
  id: string;
  parentWindowId: number;
  config: any;
  state: {
    isVisible: boolean;
    isActive: boolean;
    lastAccessTime: number;
    memoryUsage?: number;
  };
  createdAt: string; // 序列化为ISO字符串
} | null {
  try {
    const viewManager = ViewManager.getInstance()
    return viewManager.getCurrentViewInfo(event.sender)
  } catch (error) {
    log.error('获取当前视图信息时发生错误:', error)
    return null
  }
}
