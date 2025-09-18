import { HotkeyManager } from "@/core/hotkey/HotkeyManager"
import { HotkeyType, type HotkeyConfig } from "@/typings/hotkey-types"
import { useHotkeyListener } from "./useHotkeyListener"

// Vue Composable 包装器（保持向后兼容）
export function useHotkeyManager() {
  const hotkeyManager = HotkeyManager.getInstance()

  // 使用快捷键监听器
  const {
    isListening,
    currentKeys,
    getListening,
    startListening,
    stopListening,
    clearCurrentKeys,
  } = useHotkeyListener()

  // 删除快捷键
  const removeHotkey = async (id: string) => {
    return await hotkeyManager.unregister(id);
  };

  // 切换快捷键状态
  const toggleHotkey = async (id: string, enabled?: boolean) => {
    return await hotkeyManager.toggle(id, enabled);
  };

  // 注册快捷键（通用方法）
  const registerHotkey = async (
    keys: string,
    callbackKey: string,
    type: HotkeyType = HotkeyType.APPLICATION,
    options?: Partial<HotkeyConfig>
  ) => {
    const id = options?.id || `${type}_${Date.now()}`;
    const config: HotkeyConfig = {
      id,
      keys,
      type,
      enabled: true,
      callback: callbackKey,
      ...options,
    };

    return await hotkeyManager.register(config);
  };

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
    registerHotkey,

    // 初始化方法
    initialize: hotkeyManager.initialize.bind(hotkeyManager),

    // 管理器方法
    setScope: hotkeyManager.setScope.bind(hotkeyManager),
    getAll: hotkeyManager.getAll.bind(hotkeyManager),
    getByType: hotkeyManager.getByType.bind(hotkeyManager),
  };
}