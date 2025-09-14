import { ref, onMounted, onUnmounted } from "vue";
import hotkeys from "hotkeys-js";
import { useElectronHotkeys } from "./useElectronHotkeys";
import { getCallback } from "../config/hotkey-callbacks";
import { useHotkeyCache } from "./useHotkeyCache";
import { HotkeyType } from "../types/hotkey-types";

// 快捷键配置接口
export interface HotkeyConfig {
  /** 快捷键唯一标识 */
  id: string;
  /** 快捷键组合，如 "Ctrl+S" */
  keys: string;
  /** 快捷键类型 */
  type: HotkeyType;
  /** 快捷键名称 */
  name?: string;
  /** 快捷键描述 */
  description?: string;
  /** 快捷键分组 */
  group?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 是否阻止默认事件 */
  preventDefault?: boolean;
  /** 是否阻止事件冒泡 */
  stopPropagation?: boolean;
  /** 快捷键作用域 */
  scope?: string;
  /** 快捷键触发回调函数键名 */
  callback: string;
}

// 快捷键管理器类
class HotkeyManager {
  private hotkeys = new Map<string, HotkeyConfig>();
  private scopes = new Set<string>();
  private electronHotkeys: ReturnType<typeof useElectronHotkeys> | null = null;
  private hotkeyCache: ReturnType<typeof useHotkeyCache> | null = null;

  constructor() {
    // 设置默认配置
    hotkeys.filter = () => true; // 允许在所有元素上触发
    // 注意：不在这里初始化Electron快捷键管理器，避免重复创建实例
  }

  // 设置Electron快捷键管理器实例
  setElectronHotkeys(electronHotkeys: ReturnType<typeof useElectronHotkeys>) {
    this.electronHotkeys = electronHotkeys;
  }

  // 设置快捷键缓存管理器实例
  setHotkeyCache(hotkeyCache: ReturnType<typeof useHotkeyCache>) {
    this.hotkeyCache = hotkeyCache;
  }

  // 注册快捷键
  async register(config: HotkeyConfig): Promise<boolean> {
    try {
      const {
        id,
        keys,
        type,
        callback: callbackKey,
        preventDefault = true,
        stopPropagation = true,
        scope = "all",
      } = config;

      // 通过字符串键名获取回调函数
      const callback = getCallback(callbackKey);
      if (!callback) {
        console.error(`未找到回调函数: ${callbackKey}`);
        return false;
      }

      // 检查是否已存在
      if (this.hotkeys.has(id)) {
        console.warn(`快捷键 ${id} 已存在，将被覆盖`);
        await this.unregister(id);
      }

      // 根据类型设置不同的处理方式
      if (type === HotkeyType.GLOBAL) {
        // 全局快捷键使用Electron API注册
        if (!this.electronHotkeys) {
          console.error("Electron快捷键管理器未初始化");
          return false;
        }

        const success = await this.electronHotkeys.registerGlobalHotkey(keys, callback, {
          id: config.id,
          keys: config.keys,
          type: config.type,
          description: config.description,
          enabled: config.enabled,
          preventDefault: config.preventDefault,
          stopPropagation: config.stopPropagation,
          scope: config.scope,
          callback: config.callback,
        });

        if (success) {
          // 保存配置
          this.hotkeys.set(id, config);

          // 保存到缓存
          if (this.hotkeyCache) {
            await this.hotkeyCache.addGlobalHotkey(config);
          }

          console.log(`注册全局快捷键: ${id} -> ${keys}`);
          return true;
        }
        return false;
      } else {
        // 应用内快捷键使用hotkeys-js注册
        // 先解绑可能存在的快捷键
        hotkeys.unbind(keys, scope);

        const processedKeys = keys;
        hotkeys(processedKeys, { scope }, (event) => {
          if (!config.enabled) return;
          if (preventDefault) event.preventDefault();
          if (stopPropagation) event.stopPropagation();
          callback();
        });

        // 保存配置
        this.hotkeys.set(id, config);

        // 添加作用域
        if (scope !== "all") {
          this.scopes.add(scope);
        }

        console.log(`注册应用内快捷键: ${id} -> ${keys}`);
        return true;
      }
    } catch (error) {
      console.error(`注册快捷键失败: ${config.id}`, error);
      return false;
    }
  }

  // 注销快捷键
  async unregister(id: string): Promise<boolean> {
    const config = this.hotkeys.get(id);
    if (!config) {
      console.warn(`快捷键 ${id} 不存在`);
      return false;
    }

    try {
      if (config.type === HotkeyType.GLOBAL) {
        // 全局快捷键使用Electron API注销
        if (!this.electronHotkeys) {
          console.error("Electron快捷键管理器未初始化");
          return false;
        }

        const success = await this.electronHotkeys.unregisterGlobalHotkey(id);
        if (success) {
          this.hotkeys.delete(id);

          // 从缓存中移除
          if (this.hotkeyCache) {
            await this.hotkeyCache.removeGlobalHotkey(id);
          }

          console.log(`注销全局快捷键: ${id}`);
          return true;
        }
        return false;
      } else {
        // 应用内快捷键使用hotkeys-js注销
        hotkeys.unbind(config.keys, config.scope || "all");
        this.hotkeys.delete(id);
        console.log(`注销应用内快捷键: ${id}`);
        return true;
      }
    } catch (error) {
      console.error(`注销快捷键失败: ${id}`, error);
      return false;
    }
  }

  // 启用/禁用快捷键
  async toggle(id: string, enabled?: boolean): Promise<boolean> {
    const config = this.hotkeys.get(id);
    if (!config) {
      console.warn(`快捷键 ${id} 不存在`);
      return false;
    }
    config.enabled = enabled !== undefined ? enabled : !config.enabled;

    // 更新缓存状态
    if (config.type === HotkeyType.GLOBAL && this.hotkeyCache) {
      await this.hotkeyCache.updateGlobalHotkeyStatus(id, config.enabled);
    }

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
  async clear(): Promise<void> {
    const unregisterPromises = Array.from(this.hotkeys.keys()).map((id) =>
      this.unregister(id)
    );
    await Promise.all(unregisterPromises);
    this.scopes.clear();
  }

  // 清空指定类型的快捷键
  async clearByType(type: HotkeyType): Promise<void> {
    const toRemove = this.getByType(type).map((config) => config.id);
    const unregisterPromises = toRemove.map((id) => this.unregister(id));
    await Promise.all(unregisterPromises);
  }

  // 从缓存恢复全局快捷键
  async restoreGlobalHotkeysFromCache(): Promise<boolean> {
    if (!this.hotkeyCache || !this.electronHotkeys) {
      console.warn("快捷键缓存或Electron快捷键管理器未初始化");
      return false;
    }

    try {
      const cachedHotkeys = await this.hotkeyCache.loadGlobalHotkeys();
      console.log("从缓存恢复全局快捷键:", cachedHotkeys);

      // 如果缓存为空，返回false，让调用方使用默认配置
      if (!cachedHotkeys || cachedHotkeys.length === 0) {
        console.log("缓存中没有全局快捷键配置，将使用默认配置");
        return false;
      }

      let restoredCount = 0;
      for (const config of cachedHotkeys) {
        if (config.enabled) {
          // 通过字符串键名获取回调函数
          const callback = getCallback(config.callback);
          if (callback) {
            const success = await this.electronHotkeys.registerGlobalHotkey(
              config.keys,
              callback,
              {
                id: config.id,
                keys: config.keys,
                type: config.type,
                description: config.description,
                enabled: config.enabled,
                preventDefault: config.preventDefault,
                stopPropagation: config.stopPropagation,
                scope: config.scope,
                callback: config.callback,
              }
            );
            if (success) {
              this.hotkeys.set(config.id, config);
              restoredCount++;
              console.log(`恢复全局快捷键: ${config.id} -> ${config.keys}`);
            } else {
              console.warn(`恢复全局快捷键失败: ${config.id}`);
            }
          } else {
            console.error(`未找到回调函数: ${config.callback}`);
          }
        }
      }

      // 只有当至少恢复了一个快捷键时才返回true
      return restoredCount > 0;
    } catch (error) {
      console.error("从缓存恢复全局快捷键失败:", error);
      return false;
    }
  }

  // 销毁管理器
  async destroy(): Promise<void> {
    await this.clear();
    hotkeys.unbind(); // 解绑所有快捷键
  }
}

// 全局快捷键管理器实例
export const globalHotkeyManager = new HotkeyManager();

// Vue Composable
export function useHotkeyManager(
  electronHotkeys?: ReturnType<typeof useElectronHotkeys>
) {
  const isListening = ref(false);
  const currentKeys = ref<string[]>([]);
  let callback: any = null;

  // 初始化快捷键缓存管理器
  const hotkeyCache = useHotkeyCache();

  // 如果提供了electronHotkeys实例，设置到全局管理器中
  if (electronHotkeys) {
    globalHotkeyManager.setElectronHotkeys(electronHotkeys);
    globalHotkeyManager.setHotkeyCache(hotkeyCache);
  }

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
    a: "a",
    A: "a",
    b: "b",
    B: "b",
    c: "c",
    C: "c",
    d: "d",
    D: "d",
    e: "e",
    E: "e",
    f: "f",
    F: "f",
    g: "g",
    G: "g",
    h: "h",
    H: "h",
    i: "i",
    I: "i",
    j: "j",
    J: "j",
    k: "k",
    K: "k",
    l: "l",
    L: "l",
    m: "m",
    M: "m",
    n: "n",
    N: "n",
    o: "o",
    O: "o",
    p: "p",
    P: "p",
    q: "q",
    Q: "q",
    r: "r",
    R: "r",
    s: "s",
    S: "s",
    t: "t",
    T: "t",
    u: "u",
    U: "u",
    v: "v",
    V: "v",
    w: "w",
    W: "w",
    x: "x",
    X: "x",
    y: "y",
    Y: "y",
    z: "z",
    Z: "z",
    // 特殊符号（映射到对应的数字键）
    "!": "1",
    "@": "2",
    "#": "3",
    $: "4",
    "%": "5",
    "^": "6",
    "&": "7",
    "*": "8",
    "(": "9",
    ")": "0",
    _: "-",
    "+": "=",
    "{": "[",
    "}": "]",
    "|": "\\",
    ":": ";",
    '"': "'",
    "<": ",",
    ">": ".",
    "?": "/",
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

    // 只有当按键不是修饰键时才添加
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
        callback = null;
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

    console.log("KeyUp:", event.key, "code:", event.code);

    // 检查是否所有按键都已松开
    // 对于修饰键，检查对应的属性
    // 对于其他键，检查 event.key 是否在排除列表中
    const hasPressedKeys =
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.metaKey ||
      (event.key &&
        !["Control", "Meta", "Alt", "Shift", " "].includes(event.key) &&
        !modifierKeys.includes(event.key));

    console.log("Has pressed keys:", hasPressedKeys);

    if (!hasPressedKeys) {
      // 所有按键都已松开，停止监听
      console.log("All keys released, calling callback with:", currentKeys.value);
      if (callback) callback([...currentKeys.value]);
      clearCurrentKeys();
      stopListening();
    }
  };

  // 删除快捷键
  const removeHotkey = async (id: string) => {
    return await globalHotkeyManager.unregister(id);
  };

  // 切换快捷键状态
  const toggleHotkey = async (id: string, enabled?: boolean) => {
    return await globalHotkeyManager.toggle(id, enabled);
  };

  // 注册全局快捷键（Electron）
  const registerGlobalHotkey = async (
    keys: string,
    callbackKey: string,
    options?: Partial<HotkeyConfig>
  ) => {
    const id = options?.id || `global_${Date.now()}`;
    const config: HotkeyConfig = {
      id,
      keys,
      type: HotkeyType.GLOBAL,
      enabled: true,
      callback: callbackKey,
      ...options,
    };

    return await globalHotkeyManager.register(config);
  };

  // 注册应用内快捷键
  const registerAppHotkey = async (
    keys: string,
    callbackKey: string,
    options?: Partial<HotkeyConfig>
  ) => {
    const id = options?.id || `app_${Date.now()}`;
    const config: HotkeyConfig = {
      id,
      keys,
      type: HotkeyType.APPLICATION,
      enabled: true,
      callback: callbackKey,
      ...options,
    };

    return await globalHotkeyManager.register(config);
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

    // 缓存方法
    restoreGlobalHotkeysFromCache: globalHotkeyManager.restoreGlobalHotkeysFromCache.bind(
      globalHotkeyManager
    ),

    // 管理器方法
    setScope: globalHotkeyManager.setScope.bind(globalHotkeyManager),
    getAll: globalHotkeyManager.getAll.bind(globalHotkeyManager),
    getByType: globalHotkeyManager.getByType.bind(globalHotkeyManager),

    // 类型
    HotkeyType,
  };
}
