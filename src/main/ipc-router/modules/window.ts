/**
 * 窗口管理模块
 * 展示新的 IPC 路由系统使用方式
 */

import { app, BrowserWindow, Menu } from "electron";
import { resolve } from "path";
import log from "electron-log";
import { NewWindowManager } from "@main/window/NewWindowManager";
import { BaseWindowController } from "@main/window/BaseWindowController";
import { AppConfigManager } from "@main/config/appConfig";

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

      if (!callingWindow || callingWindow.isDestroyed()) {
        log.warn('最小化失败：窗口不存在或已销毁');
        return false;
      }

      // 【安全检查】严格验证：禁止操作主窗口
      const mainWindow = manager.getMainWindow();
      if (mainWindow && callingWindow.id === mainWindow.id) {
        log.error(`严重错误：分离窗口控制栏试图最小化主窗口！视图ID: ${currentViewInfo.id}`);
        return false;
      }

      if (callingWindow.isMinimized?.()) {
        log.debug('窗口已是最小化状态');
        return true;
      }
      callingWindow.minimize();
      log.debug(`分离窗口已最小化，ID: ${callingWindow.id}`);
      return true;
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

      if (!callingWindow || callingWindow.isDestroyed()) {
        log.warn('最大化失败：窗口不存在或已销毁');
        return false;
      }

      // 【安全检查】严格验证：禁止操作主窗口
      const mainWindow = manager.getMainWindow();
      if (mainWindow && callingWindow.id === mainWindow.id) {
        log.error(`严重错误：分离窗口控制栏试图最大化主窗口！视图ID: ${currentViewInfo.id}`);
        return false;
      }

      if (callingWindow.isMaximized()) {
        callingWindow.unmaximize();
        log.debug(`分离窗口已还原，ID: ${callingWindow.id}`);
      } else {
        callingWindow.maximize();
        log.debug(`分离窗口已最大化，ID: ${callingWindow.id}`);
      }
      return true;
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
export async function close(event: Electron.IpcMainInvokeEvent, viewInfo?: any): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();
    const currentViewInfo = viewInfo || viewManager.getCurrentViewInfo(event.sender);

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

      // 【安全检查】严格验证：禁止关闭主窗口
      const mainWindow = manager.getMainWindow();
      if (mainWindow && callingWindow.id === mainWindow.id) {
        log.error(`严重错误：分离窗口控制栏试图关闭主窗口！视图ID: ${currentViewInfo.id}, 窗口ID: ${currentViewInfo.parentWindowId}`);
        log.error(`这是一个BUG，控制栏视图的 parentWindowId 应该是分离窗口ID，而不是主窗口ID`);
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

export async function isMainView(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  const manager = NewWindowManager.getInstance();
  const viewManager = manager.getViewManager();
  const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);
  return currentViewInfo?.parentWindowId === manager.getMainWindow()?.id;
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
      await baseWindowController.showWindow(callingWindow, true);
      // if (currentViewInfo.id === 'main-view') {
      //   const viewInfo = viewManager.getViewInfo(currentViewInfo.id);
      //   if (viewInfo) await sendAppFocus(viewInfo.view.webContents, { timestamp: Date.now() })
      // }
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
 * 设置窗口置顶状态 - 基于视图类别的智能控制
 * @param alwaysOnTop 是否置顶
 */
export async function setAlwaysOnTop(event: Electron.IpcMainInvokeEvent, alwaysOnTop: boolean): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('设置窗口置顶失败：无法获取当前视图信息');
      return false;
    }

    // 根据视图类别决定控制行为
    if (currentViewInfo.config.category === ViewCategory.MAIN_WINDOW) {
      log.debug('置顶操作被禁止：主窗口视图不支持窗口置顶控制');
      return false;
    }

    if (currentViewInfo.config.category === ViewCategory.DETACHED_WINDOW) {
      // 分离窗口视图允许置顶
      const controller = BaseWindowController.getInstance();
      const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

      if (!callingWindow || callingWindow.isDestroyed()) {
        log.warn('设置窗口置顶失败：窗口不存在或已销毁');
        return false;
      }

      // 【安全检查】严格验证：禁止操作主窗口
      const mainWindow = manager.getMainWindow();
      if (mainWindow && callingWindow.id === mainWindow.id) {
        log.error(`严重错误：分离窗口控制栏试图置顶主窗口！视图ID: ${currentViewInfo.id}`);
        return false;
      }

      callingWindow.setAlwaysOnTop(alwaysOnTop);
      log.debug(`分离窗口置顶状态已设置，ID: ${callingWindow.id}, 置顶: ${alwaysOnTop}`);
      return true;
    }

    log.warn('设置窗口置顶失败：无法找到调用窗口或不支持的视图类别');
    return false;
  } catch (error) {
    log.error('设置窗口置顶失败:', error);
    return false;
  }
}

/**
 * 检查窗口是否置顶
 * @returns 窗口是否置顶
 */
export async function isAlwaysOnTop(event: Electron.IpcMainInvokeEvent): Promise<boolean> {
  try {
    const manager = NewWindowManager.getInstance();
    const mainWindow = manager.getMainWindow();
    const viewManager = manager.getViewManager();

    // 获取当前视图信息来判断是主窗口还是分离窗口
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      return false;
    }

    // 如果是主窗口的视图调用，始终返回false（主窗口不支持置顶）
    if (mainWindow && currentViewInfo.parentWindowId === mainWindow.id) {
      return false;
    }

    // 如果是分离窗口调用，检查实际状态
    const controller = BaseWindowController.getInstance();
    const callingWindow = controller.getWindow(currentViewInfo.parentWindowId);

    if (callingWindow && !callingWindow.isDestroyed()) {
      return callingWindow.isAlwaysOnTop();
    }

    return false;
  } catch (error) {
    log.error('检查窗口是否置顶失败:', error);
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

    await baseWindowController.showWindow(parentWindow, true);
    // await sendAppFocus(mainViewInfo.view.webContents, { timestamp: Date.now() })
    // 关键修复：强制刷新所有 WebContentsView 以确保正确渲染
    // 这解决了只有一个窗口时 View 可能不显示的问题
    setTimeout(() => {
      try {
        const allViews = viewManager.getAllViewsForWindow(parentWindow.id);
        allViews.forEach((viewInfo: WebContentsViewInfo) => {
          if (!viewInfo.view.webContents.isDestroyed()) {
            // 方法1：强制重绘视图内容
            viewInfo.view.webContents.invalidate();
            // 方法2：通过重新设置边界触发布局更新
            const currentBounds = viewInfo.view.getBounds();
            viewInfo.view.setBounds(currentBounds);
            log.debug(`已刷新视图: ${viewInfo.id}`);
          }
        });
      } catch (refreshError) {
        log.error('刷新视图时出错:', refreshError);
      }
    }, 50);
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

    // 在隐藏前暂停所有视图的渲染以节省资源
    const allViews = viewManager.getAllViewsForWindow(parentWindow.id);
    allViews.forEach((viewInfo: WebContentsViewInfo) => {
      if (!viewInfo.view.webContents.isDestroyed()) {
        // 暂停渲染以节省资源
        viewInfo.view.webContents.setBackgroundThrottling(true);
      }
    });

    baseWindowController.hideWindow(parentWindow);
    log.debug('主窗口已隐藏');

    return true;
  } catch (error) {
    log.error('隐藏窗口失败:', error);
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
  if (process.env.NODE_ENV === "development" && OPEN_DEVTOOLS) {
    logWindow.webContents.openDevTools({ mode: "bottom" });
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
import { ViewCategory, type WebContentsViewInfo } from '@main/typings/windowTypes'
import type { PluginItem } from '@renderer/src/typings/pluginTypes'
import { OPEN_DEVTOOLS } from "@shared/constants";


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
    const configManager = AppConfigManager.getInstance()

    // 确定最终使用的 lifecycleType
    let finalLifecycleType = params.lifecycleType

    // 如果是插件视图，优先使用 pluginSetting.backgroundRun
    if (params.pluginItem && params.pluginItem.fullPath) {
      const pluginId = params.pluginItem.fullPath.split(':')[0]
      const pluginSettings = configManager.get('pluginSetting') || {}
      const pluginSetting = pluginSettings[pluginId]

      if (pluginSetting && typeof pluginSetting.backgroundRun === 'boolean') {
        finalLifecycleType = pluginSetting.backgroundRun ? LifecycleType.BACKGROUND : LifecycleType.FOREGROUND
        log.info(`插件 ${pluginId} (showNewView) 使用 pluginSetting.backgroundRun 设置: ${pluginSetting.backgroundRun}`)
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
      lifecycleStrategy: finalLifecycleType ? {
        type: finalLifecycleType,
        persistOnClose: finalLifecycleType === LifecycleType.BACKGROUND,
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

    // 构建分离配置，只包含有值的字段，避免 undefined 覆盖默认值
    let detachConfig: Partial<any> | undefined = undefined

    if (config) {
      detachConfig = {}

      if (config.title) {
        detachConfig.title = config.title
      }
      if (config.width && config.height) {
        detachConfig.bounds = {
          x: 0, y: 0,
          width: config.width,
          height: config.height
        }
      }
      if (config.showControlBar !== undefined) {
        detachConfig.showControlBar = config.showControlBar
      }
    }

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
  noSwitch?: boolean  // 是否不切换到该视图（静默创建，用于自启动插件）
  data?: any  // 传递给插件的任意参数
}): Promise<{ success: boolean; viewId?: string; error?: string; detached?: boolean }> {
  try {
    const manager = NewWindowManager.getInstance()
    const configManager = AppConfigManager.getInstance()

    // 从 fullPath 中提取插件ID（格式通常是 "pluginId" 或 "pluginId:path"）
    const pluginId = params.fullPath.split(':')[0]

    // 获取插件设置
    const pluginSettings = configManager.get('pluginSetting') || {}
    const pluginSetting = pluginSettings[pluginId]

    // 确定最终使用的 lifecycleType
    // 优先使用 pluginSetting.backgroundRun，其次才使用传入的 lifecycleType 参数
    let finalLifecycleType = params.lifecycleType
    if (pluginSetting && typeof pluginSetting.backgroundRun === 'boolean') {
      // 根据 backgroundRun 设置确定生命周期类型
      finalLifecycleType = pluginSetting.backgroundRun ? LifecycleType.BACKGROUND : LifecycleType.FOREGROUND
      log.info(`插件 ${pluginId} 使用 pluginSetting.backgroundRun 设置: ${pluginSetting.backgroundRun}, lifecycleType: ${finalLifecycleType}`)
    } else {
      log.info(`插件 ${pluginId} 未配置 backgroundRun，使用传入的 lifecycleType: ${finalLifecycleType}`)
    }

    // 使用最终确定的 lifecycleType 创建视图
    const result = await manager.createPluginView({
      ...params,
      lifecycleType: finalLifecycleType
    })
    if (result.success && result.viewId) {
      log.info(`✅ 插件视图创建成功: ${result.viewId}, fullPath: ${params.fullPath}`)

      // 检查插件配置，判断是否需要自动分离窗口
      try {
        // 从 fullPath 中提取插件ID（格式通常是 "pluginId" 或 "pluginId:path"）
        const pluginId = params.fullPath.split(':')[0]

        // 获取配置管理器
        const configManager = AppConfigManager.getInstance()
        const pluginSettings = configManager.get('pluginSetting')

        // 检查该插件是否配置了自动分离
        if (pluginSettings && pluginSettings[pluginId]?.autoSeparate === true && params?.noSwitch !== true) {
          log.info(`插件 ${pluginId} 配置了自动分离窗口，正在分离...`)

          // 延迟一小段时间确保视图完全加载，然后执行分离
          setTimeout(async () => {
            try {
              const detachResult = await manager.detachView(result.viewId!)
              if (detachResult.success) {
                log.info(`✅ 插件视图已自动分离到独立窗口: ${result.viewId}`)
              } else {
                log.warn(`⚠️ 自动分离插件视图失败: ${result.viewId}, 错误: ${detachResult.error}`)
              }
            } catch (detachError) {
              log.error('自动分离插件视图时出错:', detachError)
            }
          }, 200) // 延迟200ms确保视图完全准备好

          return { success: true, viewId: result.viewId, detached: true }
        }
      } catch (error) {
        log.error('检查插件自动分离配置时出错:', error)
        // 不影响插件视图的创建，只是记录错误
      }

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
 * 关闭所有不支持后台运行的插件视图，隐藏支持后台运行的插件视图
 * @param forceClose 是否强制关闭所有插件视图，忽略后台运行配置
 */
export async function closePluginView(event: Electron.IpcMainInvokeEvent, forceClose?: boolean): Promise<{ success: boolean; error?: string; closedCount?: number; hiddenCount?: number }> {
  try {
    const manager = NewWindowManager.getInstance()
    const lifecycleManager = manager.getLifecycleManager()
    const detachManager = manager.getDetachManager()
    const configManager = AppConfigManager.getInstance()

    // 获取所有视图
    const allViews = manager.getAllViews()

    // 获取插件设置
    const pluginSettings = configManager.get('pluginSetting') || {}

    // 分类插件视图：需要关闭的和需要隐藏的
    const nonBackgroundPluginViews: typeof allViews = []
    const backgroundPluginViews: typeof allViews = []

    for (const viewInfo of allViews) {
      // 检查是否为插件视图
      if (!viewInfo.id.startsWith('plugin:')) {
        continue
      }

      // 排除已分离的视图
      if (detachManager.isViewDetached(viewInfo.id)) {
        if (forceClose) {
          // 直接关闭分离窗口
          await close(event, viewInfo)
        }
        continue
      }

      // 如果强制关闭，所有插件视图都直接关闭
      if (forceClose) {
        nonBackgroundPluginViews.push(viewInfo)
        continue
      }

      // 从 viewInfo.id 中提取插件 ID（格式：plugin:pluginId 或 plugin:pluginId:path）
      const pluginId = viewInfo.id.replace(/^plugin:/, '').split(':')[0]

      // 优先使用 pluginSetting 中的 backgroundRun 设置
      const pluginSetting = pluginSettings[pluginId]
      if (pluginSetting && typeof pluginSetting.backgroundRun === 'boolean') {
        // 如果配置了 backgroundRun，以此为准
        // backgroundRun 为 true 表示支持后台运行，应该隐藏
        // backgroundRun 为 false 表示不支持后台运行，应该关闭
        if (pluginSetting.backgroundRun) {
          backgroundPluginViews.push(viewInfo)
        } else {
          nonBackgroundPluginViews.push(viewInfo)
        }
        continue
      }

      // 备选方案：使用生命周期状态判断
      const lifecycleState = lifecycleManager.getViewState(viewInfo.id)
      if (!lifecycleState) {
        // 如果没有生命周期状态，默认关闭
        nonBackgroundPluginViews.push(viewInfo)
        continue
      }

      // 检查是否为前台模式（不支持后台运行）
      if (lifecycleState.strategy.type === LifecycleType.FOREGROUND || !lifecycleState.strategy.persistOnClose) {
        nonBackgroundPluginViews.push(viewInfo)
      } else {
        backgroundPluginViews.push(viewInfo)
      }
    }

    let closedCount = 0
    let hiddenCount = 0
    let errors: string[] = []

    // 关闭所有不支持后台运行的插件视图
    for (const viewInfo of nonBackgroundPluginViews) {
      try {
        const result = await manager.closePluginView(viewInfo.id)
        if (result.success) {
          closedCount++
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

    // 隐藏所有支持后台运行的插件视图
    for (const viewInfo of backgroundPluginViews) {
      try {
        const result = await manager.hideView(viewInfo.id)
        if (result.success) {
          hiddenCount++
          log.info(`已隐藏支持后台运行的插件视图: ${viewInfo.id}`)
        } else {
          errors.push(`隐藏视图 ${viewInfo.id} 失败: ${result.error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        errors.push(`隐藏视图 ${viewInfo.id} 异常: ${errorMsg}`)
        log.error(`隐藏插件视图异常: ${viewInfo.id}`, error)
      }
    }

    if (forceClose) {
      log.info(`插件视图强制关闭完成，成功关闭 ${closedCount} 个插件视图`)
    } else {
      log.info(`插件视图处理完成，成功关闭 ${closedCount} 个不支持后台运行的插件视图，隐藏 ${hiddenCount} 个支持后台运行的插件视图`)
    }

    if (errors.length > 0) {
      log.warn('部分插件视图处理失败:', errors)
      return {
        success: true, // 部分成功仍然返回成功
        closedCount,
        hiddenCount,
        error: `部分视图处理失败: ${errors.join('; ')}`
      }
    }

    return {
      success: true,
      closedCount,
      hiddenCount
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
    isDetached?: boolean;
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

/**
 * 显示系统弹出菜单
 * @param event IPC事件对象
 * @param options 菜单选项
 * @returns 用户点击的菜单项索引，取消则返回null
 */
export async function showPopupMenu(
  event: Electron.IpcMainInvokeEvent,
  options: {
    items: Array<{
      label: string;
      type?: 'normal' | 'separator' | 'checkbox' | 'radio';
      checked?: boolean;
      enabled?: boolean;
      submenu?: Array<{
        label: string;
        type?: 'normal' | 'separator' | 'checkbox' | 'radio';
        checked?: boolean;
        enabled?: boolean;
        id?: string;
      }>;
      id?: string;
    }>;
    x?: number;
    y?: number;
  }
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // 获取发送请求的窗口
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) {
        log.error('显示弹出菜单失败：无法找到窗口');
        resolve(null);
        return;
      }

      // 构建菜单模板的辅助函数
      const buildMenuTemplate = (items: typeof options.items): any[] => {
        return items.map((item) => {
          const menuItem: any = {
            label: item.label,
            enabled: item.enabled !== false,
          };

          // 处理子菜单
          if (item.submenu && item.submenu.length > 0) {
            // 有子菜单时，不设置 type，让 Electron 自动识别为 submenu
            menuItem.submenu = item.submenu.map((subItem) => {
              const subMenuItem: any = {
                label: subItem.label,
                enabled: subItem.enabled !== false,
              };

              // 设置子菜单项的类型
              if (subItem.type) {
                subMenuItem.type = subItem.type;
              }

              // 处理 checkbox 和 radio 类型的 checked 属性
              if (subItem.type === 'checkbox' || subItem.type === 'radio') {
                subMenuItem.checked = subItem.checked || false;
              }

              if (subItem.id) {
                subMenuItem.click = () => {
                  resolve(subItem.id!);
                };
              }

              return subMenuItem;
            });
          } else {
            // 没有子菜单时才设置 type
            if (item.type) {
              menuItem.type = item.type;
            }

            // 处理 checkbox 和 radio 类型的 checked 属性
            if (item.type === 'checkbox' || item.type === 'radio') {
              menuItem.checked = item.checked || false;
            }

            // 设置点击事件
            if (item.id) {
              menuItem.click = () => {
                resolve(item.id!);
              };
            }
          }

          return menuItem;
        });
      };

      // 构建菜单模板
      const menuTemplate = buildMenuTemplate(options.items);

      // 创建菜单
      const menu = Menu.buildFromTemplate(menuTemplate);

      // 显示菜单
      menu.popup({
        window,
        x: options.x,
        y: options.y,
        callback: () => {
          // 菜单关闭但没有选择任何项
          resolve(null);
        }
      });
    } catch (error) {
      log.error('显示弹出菜单时发生错误:', error);
      resolve(null);
    }
  });
}

/**
 * 设置指定视图的页面缩放
 */
export async function setViewZoomFactor(
  event: Electron.IpcMainInvokeEvent,
  viewId: string,
  zoomFactor: number
): Promise<{ success: boolean; error?: string }> {
  try {
    log.info(`尝试设置视图缩放: ${viewId}, 缩放比例: ${zoomFactor}`);

    // 限制缩放范围
    if (zoomFactor < 0.3 || zoomFactor > 1.5) {
      log.warn(`缩放比例超出范围: ${zoomFactor}，将限制在 0.3-1.5 之间`);
      zoomFactor = Math.max(0.3, Math.min(1.5, zoomFactor));
    }

    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    const viewInfo = viewManager.getViewInfo(viewId);
    if (!viewInfo) {
      log.warn(`未找到视图: ${viewId}`);
      return { success: false, error: '视图不存在' };
    }

    if (viewInfo.view.webContents.isDestroyed()) {
      log.warn(`视图 ${viewId} 的 webContents 已销毁`);
      return { success: false, error: 'webContents 已销毁' };
    }

    viewInfo.view.webContents.setZoomFactor(zoomFactor);
    log.info(`成功设置视图 ${viewId} 的缩放比例: ${(zoomFactor * 100).toFixed(0)}%`);

    return { success: true };
  } catch (error) {
    log.error('设置视图缩放失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 打开指定视图的 DevTools
 */
export async function openViewDevTools(event: Electron.IpcMainInvokeEvent, viewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    log.info(`尝试打开视图 DevTools: ${viewId}`);

    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    const viewInfo = viewManager.getViewInfo(viewId);
    if (!viewInfo) {
      log.warn(`未找到视图: ${viewId}`);
      return { success: false, error: '视图不存在' };
    }

    if (viewInfo.view.webContents.isDevToolsOpened()) {
      log.info(`视图 ${viewId} 的 DevTools 已经打开`);
      return { success: true };
    }

    viewInfo.view.webContents.openDevTools({ mode: 'detach' });
    log.info(`成功打开视图 ${viewId} 的 DevTools`);

    return { success: true };
  } catch (error) {
    log.error('打开视图 DevTools 失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 关闭指定 PID 的进程（主要用于关闭 DevTools）
 */
export async function closeProcessByPid(event: Electron.IpcMainInvokeEvent, pid: number): Promise<{ success: boolean; error?: string }> {
  try {
    log.info(`尝试关闭进程: PID ${pid}`);

    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();

    // 遍历所有视图，检查其 DevTools 是否打开并匹配 PID
    const allViews = viewManager.getAllViews();
    for (const viewInfo of allViews) {
      // 检查视图和 webContents 是否存在且未被销毁
      if (!viewInfo.view || !viewInfo.view.webContents) {
        continue;
      }

      const webContents = viewInfo.view.webContents;
      if (webContents.isDestroyed()) {
        continue;
      }

      // 检查 DevTools 是否打开
      if (webContents.isDevToolsOpened()) {
        const devToolsWebContents = webContents.devToolsWebContents;
        // 检查 DevTools 的进程 ID 是否匹配
        if (devToolsWebContents && !devToolsWebContents.isDestroyed() && devToolsWebContents.getOSProcessId() === pid) {
          log.info(`找到匹配的 DevTools (视图: ${viewInfo.id}), 正在关闭...`);
          webContents.closeDevTools();
          return { success: true };
        }
      }
    }

    // 如果在视图中没找到，检查所有窗口
    const allWindows = BrowserWindow.getAllWindows();
    for (const window of allWindows) {
      // 检查窗口和 webContents 是否存在且未被销毁
      if (!window || window.isDestroyed() || !window.webContents) {
        continue;
      }

      const webContents = window.webContents;
      if (webContents.isDestroyed()) {
        continue;
      }

      if (webContents.isDevToolsOpened()) {
        const devToolsWebContents = webContents.devToolsWebContents;
        if (devToolsWebContents && !devToolsWebContents.isDestroyed() && devToolsWebContents.getOSProcessId() === pid) {
          log.info(`找到匹配的 DevTools (窗口: ${window.id}), 正在关闭...`);
          webContents.closeDevTools();
          return { success: true };
        }
      }
    }

    log.warn(`未找到 PID ${pid} 对应的 DevTools`);
    return { success: false, error: '未找到对应的 DevTools' };
  } catch (error) {
    log.error(`关闭进程失败 (PID ${pid}):`, error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}

/**
 * 处理默认的 ESC 快捷键行为
 * 此函数由 preload 脚本调用，当页面没有阻止 ESC 事件时执行
 */
export async function handleDefaultEscShortcut(event: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const manager = NewWindowManager.getInstance();
    const viewManager = manager.getViewManager();
    const { emitEvent } = await import('@main/core/ProcessEvent');

    // 获取当前视图信息
    const currentViewInfo = viewManager.getCurrentViewInfo(event.sender);

    if (!currentViewInfo) {
      log.warn('处理 ESC 快捷键失败：无法获取当前视图信息');
      return { success: false, error: '无法获取当前视图信息' };
    }

    // 触发 ESC 事件
    emitEvent.emit('view:esc-pressed', {
      viewId: currentViewInfo.id,
      windowId: currentViewInfo.parentWindowId,
      timestamp: Date.now()
    });

    log.debug(`ESC 快捷键已触发，视图ID: ${currentViewInfo.id}`);
    return { success: true };
  } catch (error) {
    log.error('处理 ESC 快捷键失败:', error);
    return { success: false, error: error instanceof Error ? error.message : '未知错误' };
  }
}
