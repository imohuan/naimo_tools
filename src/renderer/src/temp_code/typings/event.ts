import type { HotkeyConfig, HotkeyType } from "./hotkey";

/**
 * 定义应用事件类型
 */
export interface AppEvents {
  // 快捷键相关事件
  "hotkey:triggered": {
    id: string;
    config: HotkeyConfig;
    type: HotkeyType;
  };

  // 搜索相关事件
  "search:focus-requested": void;
  "search:clear": void;

  // 插件相关事件
  "plugin:executed": {
    pluginId: string;
    path: string;
    hotkeyEmit: boolean;
  };

  // 窗口管理事件
  "window:close-requested": void;
  "window:show-hide-requested": void;
  "window:resize": {
    height: number;
  };

  // 设置相关事件
  "settings:open": void;
  "settings:close": void;

  // 文件相关事件
  "file:drop": {
    files: FileList;
  };
  "file:paste": {
    files: File[];
  };
  "file:clear": void;

  // 插件视图相关事件
  "plugin:view:active": {
    viewId: string;
    pluginPath?: string;
    pluginName?: string;
  };
  "plugin:view:closed": {
    viewId: string;
    pluginPath?: string;
  };

  // 窗口分离相关事件
  "window:detached": {
    success: boolean;
    detachedWindowId?: number;
    viewId?: string;
    error?: string;
  };
  "window:detached:closed": {
    windowId: number;
    viewId?: string;
    timestamp: number;
  };

  // 通知相关事件
  "notification:show": {
    message: string;
    type: "success" | "warning" | "error" | "info";
    duration?: number;
    source?: string;
  };
}

/**
 * 事件类型键
 */
export type AppEventType = keyof AppEvents;

/**
 * 事件处理函数类型
 */
export type AppEventHandler<T extends AppEventType> = (event: AppEvents[T]) => void;
