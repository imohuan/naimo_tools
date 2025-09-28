/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, BrowserWindow } from "electron";
import { join, resolve } from "path";
import log from "electron-log";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { AppConfigManager } from "@main/config/app.config";
import { NewWindowManager } from "@main/window/NewWindowManager";
import { BaseWindowController } from "@main/window/BaseWindowController";

/**
 * 最小化窗口
 */
export async function minimize(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('最小化失败：主窗口不存在或已销毁');
      return false;
    }
    if (mainWindow.isMinimized?.()) {
      log.debug('主窗口已是最小化状态');
      return true;
    }
    mainWindow.minimize();
    log.debug('主窗口已最小化');
    return true;
  } catch (error) {
    log.error('最小化窗口失败:', error);
    return false;
  }
}

/**
 * 最大化/还原窗口
 */
export async function maximize(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('最大化失败：主窗口不存在或已销毁');
      return false;
    }

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      log.debug('主窗口已还原');
    } else {
      mainWindow.maximize();
      log.debug('主窗口已最大化');
    }
    return true;
  } catch (error) {
    log.error('最大化窗口失败:', error);
    return false;
  }
}

/**
 * 关闭窗口
 */
export async function close(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('关闭失败：主窗口不存在或已销毁');
      return false;
    }

    // 由窗口管理器负责关闭逻辑，确保视图先行清理
    const result = await manager.destroyMainWindow();
    if (!result.success) {
      log.warn(`关闭主窗口失败: ${result.error}`);
      return false;
    }

    log.debug('主窗口已关闭');
    return true;
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
    const mainWindow = manager.getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      log.warn('切换窗口显示失败：主窗口不存在或已销毁');
      return false;
    }

    const baseWindowController = BaseWindowController.getInstance();

    const isVisible = baseWindowController.isWindowVisible(mainWindow);
    const shouldShow = show ?? !isVisible;

    if (shouldShow && !isVisible) {
      baseWindowController.showWindow(mainWindow);
      mainWindow.focus();
      log.debug('主窗口已显示');
    } else if (!shouldShow && isVisible) {
      baseWindowController.hideWindow(mainWindow);
      log.debug('主窗口已隐藏');
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
    if (!mainWindow || mainWindow.isDestroyed()) {
      return false;
    }
    return mainWindow.isMaximized();
  } catch (error) {
    log.error('检查窗口是否最大化失败:', error);
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
    const windowManager = NewWindowManager.getInstance();

    await windowManager.adjustWindowHeight(height);
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

    if (!baseWindowController.isWindowVisible(parentWindow)) {
      baseWindowController.showWindow(parentWindow);
      parentWindow.focus();
      log.debug('主窗口已显示');
    } else {
      log.debug('主窗口已是显示状态');
    }

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

    if (baseWindowController.isWindowVisible(parentWindow)) {
      baseWindowController.hideWindow(parentWindow);
      log.debug('主窗口已隐藏');
    } else {
      log.debug('主窗口已是隐藏状态');
    }

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
import { ViewType, LifecycleType } from '@renderer/src/typings/window-types'
import type { PluginItem } from '@renderer/src/typings/plugin-types'
import { PluginExecuteType } from '@renderer/src/typings/plugin-types'
import { BaseWindow } from 'electron'

// 创建 NewWindowManager 实例（在需要时初始化）
let newWindowManager: NewWindowManager | null = null

/**
 * 初始化新窗口管理器
 */
export async function initializeNewWindowManager(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    if (newWindowManager) {
      return { success: true }
    }

    // 创建默认配置
    const defaultConfig = {
      layout: {
        headerHeight: 60,
        contentBounds: { x: 0, y: 60, width: 800, height: 540 },
        totalBounds: { x: 0, y: 0, width: 800, height: 600 },
        padding: 0
      },
      defaultLifecycle: {
        type: LifecycleType.FOREGROUND,
        persistOnClose: false,
        maxIdleTime: 5 * 60 * 1000,
        memoryThreshold: 100
      },
      maxActiveViews: 5,
      memoryRecycleThreshold: 500,
      autoRecycleInterval: 30 * 1000
    }

    newWindowManager = NewWindowManager.getInstance(defaultConfig)
    await newWindowManager.initialize()

    log.info('NewWindowManager 初始化成功')
    return { success: true }
  } catch (error) {
    log.error('NewWindowManager 初始化失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

/**
 * 创建主窗口（新架构）
 */
export async function createNewMainWindow(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; windowId?: number; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return initResult
      }
    }

    const config = AppConfigManager.getInstance().getConfig()
    const result = await newWindowManager!.createMainWindow(config)

    if (result.success && result.windowId) {
      log.info(`新主窗口创建成功，ID: ${result.windowId}`)
      return { success: true, windowId: result.windowId }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    log.error('创建新主窗口失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }
  }
}

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
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return initResult
      }
    }

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

    const result = await newWindowManager!.showView(viewParams)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.hideView(viewId)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.removeView(viewId)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.switchToView(viewId)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const detachConfig = config ? {
      title: config.title,
      bounds: config.width && config.height ? {
        x: 0, y: 0, width: config.width, height: config.height
      } : undefined,
      showControlBar: config.showControlBar !== false,
      sourceViewId: viewId
    } : undefined

    const result = await newWindowManager.detachView(viewId, detachConfig)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.reattachView(detachedWindowId)

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const viewInfo = newWindowManager.getActiveView()

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const views = newWindowManager.getAllViews()

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const metrics = newWindowManager.getPerformanceMetrics()
    const statistics = newWindowManager.getStatistics()

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
export async function cleanupNewBackgroundViews(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    await newWindowManager.cleanupBackgroundViews()

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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    newWindowManager.updateConfig(config)

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
    if (newWindowManager) {
      newWindowManager.destroy()
      newWindowManager = null
      log.info('NewWindowManager 已销毁')
    }

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
 * 创建插件视图（新架构专用）
 * 这是一个为插件系统优化的便利函数
 */
export async function createPluginView(event: Electron.IpcMainInvokeEvent, params: {
  path: string
  pluginId?: string
  name?: string
  title?: string
  url?: string
  closeAction?: 'hide' | 'close'
  executeParams?: any
  preload?: string
}): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    // 构建插件项目信息
    const pluginItem: PluginItem = {
      path: params.path,
      name: params.name || params.title || 'Plugin',
      icon: null, // 暂时设为null，后续可以根据需要设置
      pluginId: params.pluginId || params.path,
      executeType: params.url ? PluginExecuteType.SHOW_WEBPAGE : PluginExecuteType.CUSTOM_CODE,
      executeParams: params.executeParams || (params.url ? { url: params.url } : {}),
      closeAction: params.closeAction || 'close'
    }

    // 确定生命周期类型
    const lifecycleType = params.closeAction === 'hide'
      ? LifecycleType.BACKGROUND
      : LifecycleType.FOREGROUND

    const result = await showNewView(event, {
      type: ViewType.PLUGIN,
      url: params.url,
      path: params.path,
      pluginItem,
      forceNew: false,
      lifecycleType
    })

    if (result.success) {
      log.info(`插件视图创建成功: ${result.viewId} (${params.name || params.path})`)

      // 通知主渲染进程插件视图已打开
      const mainWindow = newWindowManager?.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 获取主视图的 webContents
        const viewManager = ViewManager.getInstance();
        const mainViewInfo = viewManager.getViewInfo('main-view');
        if (mainViewInfo) {
          mainViewInfo.view.webContents.send("plugin-view-opened", {
            viewId: result.viewId,
            path: params.path,
            pluginId: params.pluginId,
            name: params.name,
            title: params.title,
            url: params.url
          })
          log.debug(`已通知主渲染进程插件视图打开: ${result.viewId}`)
        }

        return { success: true, viewId: result.viewId }
      } else {
        // 即使没有主窗口，视图创建成功仍然返回成功
        return { success: true, viewId: result.viewId }
      }
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
 */
export async function closePluginView(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    const result = await newWindowManager.removeView(viewId)

    if (result.success) {
      log.info(`插件视图关闭成功: ${viewId}`)

      // 通知主渲染进程插件视图已关闭
      const mainWindow = newWindowManager?.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 获取主视图的 webContents
        const viewManager = ViewManager.getInstance();
        const mainViewInfo = viewManager.getViewInfo('main-view');
        if (mainViewInfo) {
          mainViewInfo.view.webContents.send("plugin-view-closed", {
            viewId
          })
        }
        log.debug(`已通知主渲染进程插件视图关闭: ${viewId}`)
      }

      return { success: true }
    } else {
      return { success: false, error: result.error }
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
 * 创建组合的 preload 脚本
 * 将内置 preload 和用户自定义 preload 合并
 */
async function createCombinedPreloadScript(customPreloadPath: string, defaultPreloadPath: string): Promise<string> {
  try {
    // 读取内置 preload 脚本
    const builtinPreloadPath = defaultPreloadPath
    const builtinPreloadContent = readFileSync(builtinPreloadPath, 'utf-8');

    // 读取用户自定义 preload 脚本
    const customPreloadContent = readFileSync(customPreloadPath, 'utf-8');

    // 创建组合脚本内容
    const combinedContent = `
// 内置 preload 脚本
${builtinPreloadContent}

(() => {
  // 用户自定义 preload 脚本
  ${customPreloadContent}
})()
`;

    // 创建临时文件
    const tempDir = join(tmpdir(), 'naimo-preloads');
    mkdirSync(tempDir, { recursive: true });

    const tempFilePath = join(tempDir, `combined-preload-${Date.now()}.js`);
    writeFileSync(tempFilePath, combinedContent, 'utf-8');

    log.debug(`创建组合 preload 脚本: ${tempFilePath}`);
    return tempFilePath;

  } catch (error) {
    log.error('创建组合 preload 脚本失败:', error);
    // 如果失败，回退到内置 preload
    return defaultPreloadPath
  }
}

/**
 * 创建设置页面 WebContentsView
 */
export async function createSettingsView(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; viewId?: string; error?: string }> {
  try {
    if (!newWindowManager) {
      const initResult = await initializeNewWindowManager(event)
      if (!initResult.success) {
        return { success: false, error: initResult.error }
      }
    }

    log.info('通过 IPC 创建设置页面 WebContentsView')

    const result = await newWindowManager!.createSettingsView()

    if (result.success) {
      log.info(`设置页面创建成功: ${result.viewId}`)
      return {
        success: true,
        viewId: result.viewId
      }
    } else {
      log.error(`设置页面创建失败: ${result.error}`)
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
    if (!newWindowManager) {
      return { success: false, error: 'NewWindowManager 未初始化' }
    }

    log.info('通过 IPC 关闭设置页面 WebContentsView')

    const result = await newWindowManager.closeSettingsView()

    if (result.success) {
      log.info('设置页面关闭成功')
      return { success: true }
    } else {
      log.error(`设置页面关闭失败: ${result.error}`)
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
    const webContents = event.sender;

    // 获取ViewManager实例并遍历所有视图
    const viewManager = ViewManager.getInstance();
    const allViews = viewManager.getAllViews();

    for (const viewInfo of allViews) {
      if (viewInfo.view.webContents === webContents) {
        // 找到匹配的WebContentsView，返回序列化后的信息
        log.debug(`找到当前WebContentsView: ${viewInfo.id}, 父窗口ID: ${viewInfo.parentWindowId}`);

        return {
          id: viewInfo.id,
          parentWindowId: viewInfo.parentWindowId,
          config: viewInfo.config,
          state: {
            isVisible: viewInfo.state.isVisible,
            isActive: viewInfo.state.isActive,
            lastAccessTime: viewInfo.state.lastAccessTime,
            memoryUsage: viewInfo.state.memoryUsage
          },
          createdAt: viewInfo.createdAt.toISOString()
        };
      }
    }

    log.warn('无法找到当前webContents对应的视图信息');
    return null;
  } catch (error) {
    log.error('获取当前视图信息时发生错误:', error);
    return null;
  }
}
