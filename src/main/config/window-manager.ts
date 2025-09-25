import { debounce } from '@main/utils';
import { BrowserWindow, screen } from 'electron';
import log from 'electron-log';

/**
 * 窗口类型枚举
 */
export enum WindowType {
  /** 主窗口 */
  MAIN = 'main',
  /** 跟随窗口 */
  FOLLOWING = 'following',
  /** 独立窗口 */
  SEPARATED = 'separated',
  /** 后台窗口 */
  BACKGROUND = 'background'
}

/**
 * 窗口信息接口
 */
export interface WindowInfo {
  /** 窗口ID */
  id: number;
  /** Electron窗口实例 */
  window: BrowserWindow;
  /** 窗口类型 */
  type: WindowType;
  /** 窗口标题 */
  title?: string;
  /** 窗口URL */
  url?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessed: Date;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 窗口查询条件
 */
export interface WindowQuery {
  /** 窗口类型 */
  type?: WindowType;
  /** 窗口标题 */
  title?: string;
  /** 窗口URL */
  url?: string;
  /** 是否已销毁 */
  isDestroyed?: boolean;
  /** 是否可见 */
  isVisible?: boolean;
  /** 是否聚焦 */
  isFocused?: boolean;
}

/**
 * 基本窗口元数据
 */
export interface BasicWindowMetadata {
  /** 窗口标题 */
  title: string;
  /** 最初 窗口URL */
  url: string;
  /** 父窗口ID */
  parentWindowId: number;
  /** 是否初始化 */
  init: boolean;
  /** 路径 */
  path: string;
  /** 额外元数据 */
  [key: string]: any;
}

/**
 * 窗口状态信息
 */
interface Position {
  /** x坐标（小于0表示窗口隐藏） */
  x: number;
  /** y坐标 */
  y: number;
}

/**
 * 优化的窗口管理器
 * 提供统一的窗口管理、类型安全、生命周期管理和查询功能
 */
export class WindowManager {
  private static instance: WindowManager;
  windows: Map<number, WindowInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private windowPositions: Map<number, Position> = new Map();

  private constructor() {
    this.startCleanupTimer();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  initPostion(window: BrowserWindow) {
    const [x, y] = window.getPosition();
    this.windowPositions.set(window.id, { x, y });
  }

  setXCenter(window: BrowserWindow, y: number) {
    const { width } = window.getBounds();
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const centerX = Math.floor((screenWidth - width) / 2);
    window.setPosition(centerX, y);
    this.windowPositions.set(window.id, { x: centerX, y });
  }

  show(window: BrowserWindow) {
    const { x, y } = this.windowPositions.get(window.id) || { x: 0, y: 0 };
    if (x < 0) {
      this.setXCenter(window, y);
    } else {
      window.setPosition(x, y);
      this.windowPositions.set(window.id, { x, y });
    }
  }

  hide(window: BrowserWindow) {
    const [x, y] = window.getPosition();
    const newX = x - 2000;
    window.setPosition(newX, y);
    this.windowPositions.set(window.id, { x, y });
  }

  /**
   * 检查窗口是否显示
   * @param window 窗口实例
   * @returns 窗口是否显示
   */
  isWindowVisible(window: BrowserWindow): boolean {
    return window.getPosition()[0] > 0
  }

  isAllWindowBlur(): boolean {
    return this.windows.values().every(info => !info.window.isFocused());
  }

  getMainInfo(): WindowInfo | undefined {
    return this.windows.values().find(info => info.type === WindowType.MAIN);
  }

  /**
   * 注册窗口
   */
  public registerWindow(
    window: BrowserWindow,
    type: WindowType,
    metadata?: BasicWindowMetadata
  ): void {
    const windowInfo: WindowInfo = {
      id: window.id,
      window,
      type,
      title: window.getTitle(),
      url: window.webContents.getURL(),
      createdAt: new Date(),
      lastAccessed: new Date(),
      metadata
    };

    this.windows.set(window.id, windowInfo);

    // 监听窗口失去焦点
    window.on("blur", debounce(() => {
      if (this.isAllWindowBlur()) {
        log.debug("所有窗口失去焦点");
        this.getMainInfo()?.window.webContents.send("window-all-blur");
      }
    }, 100));

    log.debug(`窗口已注册: ID=${window.id}, 类型=${type}, 标题=${windowInfo.title}`);
  }

  public setMetadata(windowId: number, metadata: Partial<BasicWindowMetadata> = {}): void {
    const windowInfo = this.windows.get(windowId);
    if (windowInfo) windowInfo.metadata = { ...windowInfo.metadata, ...metadata };
    log.debug(`窗口元数据已设置: ID=${windowId}, 元数据=${JSON.stringify(metadata)}`);
  }

  /**
   * 注销窗口
   */
  public unregisterWindow(windowId: number): boolean {
    const windowInfo = this.windows.get(windowId);
    if (windowInfo) {
      this.windows.delete(windowId);
      this.windowPositions.delete(windowId);
      if (!windowInfo.window.isDestroyed()) {
        windowInfo.window.destroy();
      }
      log.debug(`窗口已注销: ID=${windowId}, 类型=${windowInfo.type}`);
      return true;
    }
    return false;
  }

  /**
   * 更新窗口信息
   */
  public updateWindowInfo(windowId: number, updates: Partial<WindowInfo>): boolean {
    const windowInfo = this.windows.get(windowId);
    if (windowInfo) {
      Object.assign(windowInfo, updates);
      windowInfo.lastAccessed = new Date();
      return true;
    }
    return false;
  }

  /**
   * 获取窗口信息
   */
  public getWindowInfo(windowId: number): WindowInfo | undefined {
    const windowInfo = this.windows.get(windowId);
    if (windowInfo) {
      windowInfo.lastAccessed = new Date();
    }
    return windowInfo;
  }

  /**
   * 获取指定类型的所有窗口
   */
  public getWindowsByType(type: WindowType): BrowserWindow[] {
    return this.getWindowInfoByType(type).map(info => info.window);
  }


  /**
   * 获取指定类型的所有窗口信息
   */
  public getWindowInfoByType(type: WindowType): WindowInfo[] {
    return Array.from(this.windows.values())
      .filter(info => info.type === type && !info.window.isDestroyed());
  }

  /**
   * 查询窗口
   */
  public queryWindows(query: WindowQuery): WindowInfo[] {
    return Array.from(this.windows.values()).filter(info => {
      if (query.type && info.type !== query.type) return false;
      if (query.title && info.title !== query.title) return false;
      if (query.url && !info.url?.includes(query.url)) return false;
      if (query.isDestroyed !== undefined && info.window.isDestroyed() !== query.isDestroyed) return false;
      if (query.isVisible !== undefined && info.window.isVisible() !== query.isVisible) return false;
      if (query.isFocused !== undefined && info.window.isFocused() !== query.isFocused) return false;
      return true;
    });
  }

  /**
   * 获取所有活跃窗口（未销毁的）
   */
  public getAllActiveWindows(): WindowInfo[] {
    return Array.from(this.windows.values())
      .filter(info => !info.window.isDestroyed());
  }

  /**
   * 获取窗口统计信息
   */
  public getWindowStats(): Record<WindowType, number> {
    const stats: Record<WindowType, number> = {
      [WindowType.MAIN]: 0,
      [WindowType.FOLLOWING]: 0,
      [WindowType.SEPARATED]: 0,
      [WindowType.BACKGROUND]: 0
    };

    this.windows.forEach(info => {
      if (!info.window.isDestroyed()) {
        stats[info.type]++;
      }
    });

    return stats;
  }

  /**
   * 清理已销毁的窗口
   */
  public cleanupDestroyedWindows(): number {
    let cleanedCount = 0;
    const toDelete: number[] = [];

    this.windows.forEach((info, id) => {
      if (info.window.isDestroyed()) {
        toDelete.push(id);
        cleanedCount++;
      }
    });

    toDelete.forEach(id => this.unregisterWindow(id));

    if (cleanedCount > 0) {
      log.debug(`清理了 ${cleanedCount} 个已销毁的窗口`);
    }

    return cleanedCount;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    // 每30秒清理一次已销毁的窗口
    this.cleanupInterval = setInterval(() => {
      this.cleanupDestroyedWindows();
    }, 30000);
  }

  /**
   * 停止清理定时器
   */
  public stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.stopCleanupTimer();
    this.windows.forEach(info => {
      this.unregisterWindow(info.id);
    });
    this.windowPositions.clear();
    WindowManager.instance = null as any;
  }

  // 兼容性方法 - 保持与原有代码的兼容性
  /**
   * 获取跟随窗口集合（兼容性方法）
   */
  public get followingWindows(): Set<BrowserWindow> {
    return new Set(this.getWindowsByType(WindowType.FOLLOWING));
  }

  /**
   * 获取分离窗口集合（兼容性方法）
   */
  public get separatedWindows(): Set<BrowserWindow> {
    return new Set(this.getWindowsByType(WindowType.SEPARATED));
  }

  /**
   * 获取后台窗口集合（兼容性方法）
   */
  public get backgroundWindows(): Set<BrowserWindow> {
    return new Set(this.getWindowsByType(WindowType.BACKGROUND));
  }
}
