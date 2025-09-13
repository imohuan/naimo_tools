import { ref, onMounted, onUnmounted } from "vue";
import hotkeys from "hotkeys-js";

// 快捷键类型定义
export enum HotkeyType {
  /** 全局快捷键（Electron） */
  GLOBAL = "global",
  /** 应用内快捷键 */
  APPLICATION = "application",
}

// 快捷键配置接口
export interface HotkeyConfig {
  /** 快捷键唯一标识 */
  id: string;
  /** 快捷键组合，如 "Ctrl+S" */
  keys: string;
  /** 快捷键类型 */
  type: HotkeyType;
  /** 快捷键描述 */
  description?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否阻止默认事件 */
  preventDefault?: boolean;
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean;
  /** 快捷键作用域 */
  scope?: string;
  /** 快捷键触发回调 */
  callback: (event: KeyboardEvent) => void;
}

// 快捷键管理器类
class HotkeyManager {
  private hotkeys = new Map<string, HotkeyConfig>();
  private scopes = new Set<string>();

  constructor() {
    // 设置默认配置
    hotkeys.filter = () => true; // 允许在所有元素上触发
  }

  // 注册快捷键
  register(config: HotkeyConfig): boolean {
    try {
      const {
        id,
        keys,
        type,
        callback,
        preventDefault = true,
        stopPropagation = true,
        scope = "all",
      } = config;

      // 检查是否已存在
      if (this.hotkeys.has(id)) {
        console.warn(`快捷键 ${id} 已存在，将被覆盖`);
        this.unregister(id);
      }

      // 根据类型设置不同的处理方式
      let processedKeys = keys;
      if (type === HotkeyType.GLOBAL) {
        // 全局快捷键需要特殊处理
        processedKeys = this.normalizeGlobalKeys(keys);
      }

      // 注册到 hotkeys-js
      hotkeys(processedKeys, { scope }, (event) => {
        if (!config.enabled) return;
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        callback(event);
      });

      // 保存配置
      this.hotkeys.set(id, config);

      // 添加作用域
      if (scope !== "all") {
        this.scopes.add(scope);
      }

      console.log(`注册快捷键: ${id} -> ${keys} (${type})`);
      return true;
    } catch (error) {
      console.error(`注册快捷键失败: ${config.id}`, error);
      return false;
    }
  }

  // 注销快捷键
  unregister(id: string): boolean {
    const config = this.hotkeys.get(id);
    if (!config) {
      console.warn(`快捷键 ${id} 不存在`);
      return false;
    }

    try {
      hotkeys.unbind(config.keys, config.scope || "all");
      this.hotkeys.delete(id);
      console.log(`注销快捷键: ${id}`);
      return true;
    } catch (error) {
      console.error(`注销快捷键失败: ${id}`, error);
      return false;
    }
  }

  // 启用/禁用快捷键
  toggle(id: string, enabled?: boolean): boolean {
    const config = this.hotkeys.get(id);
    if (!config) {
      console.warn(`快捷键 ${id} 不存在`);
      return false;
    }

    config.enabled = enabled !== undefined ? enabled : !config.enabled;
    console.log(`快捷键 ${id} ${config.enabled ? "已启用" : "已禁用"}`);
    return true;
  }

  // 设置当前作用域
  setScope(scope: string): void {
    hotkeys.setScope(scope);
    console.log(`切换到作用域: ${scope}`);
  }

  // 获取所有快捷键
  getAll(): HotkeyConfig[] {
    return Array.from(this.hotkeys.values());
  }

  // 根据类型获取快捷键
  getByType(type: HotkeyType): HotkeyConfig[] {
    return this.getAll().filter((config) => config.type === type);
  }

  // 清空所有快捷键
  clear(): void {
    this.hotkeys.forEach((_, id) => this.unregister(id));
    this.scopes.clear();
  }

  // 清空指定类型的快捷键
  clearByType(type: HotkeyType): void {
    const toRemove = this.getByType(type).map((config) => config.id);
    toRemove.forEach((id) => this.unregister(id));
  }

  // 标准化全局快捷键格式
  private normalizeGlobalKeys(keys: string): string {
    // 将我们的格式转换为 hotkeys-js 格式
    return keys.replace(/\+/g, ",").replace(/\s+/g, "").toLowerCase();
  }

  // 销毁管理器
  destroy(): void {
    this.clear();
    hotkeys.unbind(); // 解绑所有快捷键
  }
}

// 全局快捷键管理器实例
export const globalHotkeyManager = new HotkeyManager();

// Vue Composable
export function useHotkeyManager() {
  const isListening = ref(false);
  const currentKeys = ref<string[]>([]);
  let callback: any = null;

  // 按键映射 - 映射为 hotkeys-js 可识别的格式
  const keyMap: Record<string, string> = {
    Control: "ctrl",
    Meta: "cmd",
    Alt: "alt",
    Shift: "shift",
    " ": "space",
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Enter: "enter",
    Escape: "esc",
    Backspace: "backspace",
    Delete: "delete",
    Tab: "tab",
    CapsLock: "capslock",
    F1: "f1",
    F2: "f2",
    F3: "f3",
    F4: "f4",
    F5: "f5",
    F6: "f6",
    F7: "f7",
    F8: "f8",
    F9: "f9",
    F10: "f10",
    F11: "f11",
    F12: "f12",
    // 数字键
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    // 字母键（统一转为小写）
    "a": "a", "A": "a",
    "b": "b", "B": "b",
    "c": "c", "C": "c",
    "d": "d", "D": "d",
    "e": "e", "E": "e",
    "f": "f", "F": "f",
    "g": "g", "G": "g",
    "h": "h", "H": "h",
    "i": "i", "I": "i",
    "j": "j", "J": "j",
    "k": "k", "K": "k",
    "l": "l", "L": "l",
    "m": "m", "M": "m",
    "n": "n", "N": "n",
    "o": "o", "O": "o",
    "p": "p", "P": "p",
    "q": "q", "Q": "q",
    "r": "r", "R": "r",
    "s": "s", "S": "s",
    "t": "t", "T": "t",
    "u": "u", "U": "u",
    "v": "v", "V": "v",
    "w": "w", "W": "w",
    "x": "x", "X": "x",
    "y": "y", "Y": "y",
    "z": "z", "Z": "z",
    // 特殊符号（映射到对应的数字键）
    "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
    "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
    "_": "-", "+": "=", "{": "[", "}": "]", "|": "\\",
    ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
    "~": "`",
  };

  const modifierKeys = ["Control", "Meta", "Alt", "Shift"];

  // 获取当前按下的按键（按正确顺序）
  const getCurrentPressedKeys = (event: KeyboardEvent): string[] => {
    const keys: string[] = [];

    // 按顺序添加修饰键
    if (event.ctrlKey) keys.push("ctrl");
    if (event.shiftKey) keys.push("shift");
    if (event.altKey) keys.push("alt");

    // 添加非修饰键（只能有一个）
    const key = event.key;
    let normalizedKey = keyMap[key] || key.toLowerCase();

    // 如果按下了 Shift 键，需要特殊处理
    if (event.shiftKey && !modifierKeys.includes(key)) {
      // 对于字母，Shift 会产生大写字母，但我们统一使用小写
      if (key.length === 1 && /[A-Z]/.test(key)) {
        normalizedKey = key.toLowerCase();
      }
      // 对于数字键上的符号，Shift 会产生特殊符号，但 hotkeys-js 需要数字
      else if (key.length === 1 && /[!@#$%^&*()_+{}|:"<>?~]/.test(key)) {
        // 特殊符号已经映射到对应的数字键，保持不变
        normalizedKey = keyMap[key] || key;
      }
    }

    if (!modifierKeys.includes(key)) {
      keys.push(normalizedKey);
    }

    return keys;
  };

  // 开始监听快捷键输入
  const startListening = () => {
    isListening.value = true;
    currentKeys.value = [];
  };

  // 停止监听
  const stopListening = () => {
    isListening.value = false;
  };

  const getListening = (): Promise<string[]> => {
    return new Promise((resolve) => {
      startListening();
      callback = (keys: string[]) => {
        resolve(keys);
        callback = null
      };
    });
  };

  // 清除当前按键
  const clearCurrentKeys = () => {
    currentKeys.value = [];
  };

  // 处理按键按下
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isListening.value) return;

    event.preventDefault();
    event.stopPropagation();

    const key = event.key;

    // 处理特殊按键
    if (key === "Escape") {
      clearCurrentKeys();
      stopListening();
      return;
    }

    // 获取当前按下的所有按键
    const pressedKeys = getCurrentPressedKeys(event);
    currentKeys.value = pressedKeys;
  };

  // 处理按键松开
  const handleKeyUp = (event: KeyboardEvent) => {
    if (!isListening.value) return;

    // 检查是否所有按键都已松开
    const hasPressedKeys = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey ||
      (event.key && !["Control", "Meta", "Alt", "Shift"].includes(event.key));

    if (!hasPressedKeys) {
      // 所有按键都已松开，停止监听
      if (callback) callback([...currentKeys.value]);
      clearCurrentKeys();
      stopListening();
    }
  };

  // 删除快捷键
  const removeHotkey = (id: string) => {
    return globalHotkeyManager.unregister(id);
  };

  // 切换快捷键状态
  const toggleHotkey = (id: string, enabled?: boolean) => {
    return globalHotkeyManager.toggle(id, enabled);
  };

  // 注册全局快捷键（Electron）
  const registerGlobalHotkey = (
    keys: string,
    callback: (event: KeyboardEvent) => void,
    options?: Partial<HotkeyConfig>
  ) => {
    const id = options?.id || `global_${Date.now()} `;
    const config: HotkeyConfig = {
      id,
      keys,
      type: HotkeyType.GLOBAL,
      enabled: true,
      callback,
      ...options,
    };

    return globalHotkeyManager.register(config);
  };

  // 注册应用内快捷键
  const registerAppHotkey = (
    keys: string,
    callback: (event: KeyboardEvent) => void,
    options?: Partial<HotkeyConfig>
  ) => {
    const id = options?.id || `app_${Date.now()} `;
    const config: HotkeyConfig = {
      id,
      keys,
      type: HotkeyType.APPLICATION,
      enabled: true,
      callback,
      ...options,
    };

    return globalHotkeyManager.register(config);
  };

  // 生命周期管理
  onMounted(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
  });

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
  });

  return {
    // 状态
    isListening,
    currentKeys,

    // 方法
    getListening,
    startListening,
    stopListening,
    clearCurrentKeys,
    removeHotkey,
    toggleHotkey,

    // 注册方法
    registerGlobalHotkey,
    registerAppHotkey,

    // 管理器方法
    setScope: globalHotkeyManager.setScope.bind(globalHotkeyManager),
    getAll: globalHotkeyManager.getAll.bind(globalHotkeyManager),
    getByType: globalHotkeyManager.getByType.bind(globalHotkeyManager),

    // 类型
    HotkeyType,
  };
}
