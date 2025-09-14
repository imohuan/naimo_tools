import { ref } from "vue";
import { useElectronHotkeys } from "./useElectronHotkeys";
import { useHotkeyManager } from "./useHotkeyManager";
import { hotkeyConfig } from "../config/hotkey-callbacks";
import { HotkeyType } from "../types/hotkey-types";
import type { HotkeySettingsConfig, HotkeyConfig } from "../types/hotkey-config";

// 全局快捷键初始化状态
let globalInitializationInProgress = false;

// 全局快捷键初始化器
export function useGlobalHotkeyInitializer() {
  const isInitialized = ref(false);
  const initializationError = ref<string | null>(null);

  // 加载配置
  const config = ref<HotkeySettingsConfig>(hotkeyConfig);

  // 初始化全局快捷键
  const initializeGlobalHotkeys = async () => {
    // 防止重复初始化
    if (globalInitializationInProgress) {
      console.log("⚠️ 全局快捷键初始化正在进行中，跳过重复初始化");
      return;
    }

    if (isInitialized.value) {
      console.log("✅ 全局快捷键已初始化，跳过重复初始化");
      return;
    }

    try {
      globalInitializationInProgress = true;
      console.log("🚀 开始初始化全局快捷键...");

      // 初始化 Electron 快捷键管理器
      const electronHotkeys = useElectronHotkeys();

      // 初始化快捷键管理器
      const hotkeyManager = useHotkeyManager(electronHotkeys);

      // 首先尝试从缓存恢复全局快捷键
      const restored = await hotkeyManager.restoreGlobalHotkeysFromCache();

      if (restored) {
        console.log("✅ 从缓存恢复全局快捷键成功");
      } else {
        console.log("⚠️ 从缓存恢复全局快捷键失败，使用默认配置");

        // 如果缓存恢复失败，使用默认配置注册全局快捷键
        for (const hotkey of hotkeyConfig.global.hotkeys) {
          if (hotkey.enabled) {
            console.log(`🔧 注册默认全局快捷键: ${hotkey.id} -> ${hotkey.keys}`);
            const success = await hotkeyManager.registerGlobalHotkey(hotkey.keys, hotkey.callback, {
              id: hotkey.id,
              description: hotkey.description,
              enabled: hotkey.enabled,
            });
            if (success) {
              console.log(`✅ 默认全局快捷键注册成功: ${hotkey.id}`);
            } else {
              console.error(`❌ 默认全局快捷键注册失败: ${hotkey.id}`);
            }
          }
        }
      }

      // 注册应用内快捷键
      for (const hotkey of hotkeyConfig.application.hotkeys) {
        if (hotkey.enabled) {
          await hotkeyManager.registerAppHotkey(hotkey.keys, hotkey.callback, {
            id: hotkey.id,
            description: hotkey.description,
            enabled: hotkey.enabled,
          });
        }
      }

      isInitialized.value = true;
      console.log("✅ 全局快捷键初始化完成");
    } catch (error) {
      console.error("❌ 全局快捷键初始化失败:", error);
      initializationError.value = error instanceof Error ? error.message : "未知错误";
    } finally {
      globalInitializationInProgress = false;
    }
  };

  // 重新初始化全局快捷键
  const reinitializeGlobalHotkeys = async () => {
    isInitialized.value = false;
    initializationError.value = null;
    await initializeGlobalHotkeys();
  };

  /**
   * 获取所有快捷键配置
   */
  const getAllHotkeys = (): HotkeyConfig[] => {
    return [...config.value.global.hotkeys, ...config.value.application.hotkeys];
  };

  /**
   * 切换分组状态
   */
  const toggleGroup = async (groupId: string) => {
    // 初始化快捷键管理器
    const electronHotkeys = useElectronHotkeys();
    const hotkeyManager = useHotkeyManager(electronHotkeys);

    if (groupId === "global") {
      config.value.global.hotkeys.forEach(async (hotkey) => {
        await hotkeyManager.toggleHotkey(hotkey.id, config.value.global.enabled);
      });
    } else if (groupId === "application") {
      config.value.application.hotkeys.forEach(async (hotkey) => {
        await hotkeyManager.toggleHotkey(hotkey.id, config.value.application.enabled);
      });
    }
  };

  /**
   * 更新快捷键配置
   */
  const updateHotkeyConfig = async (hotkeyId: string, newKeys: string) => {
    const allHotkeys = getAllHotkeys();
    const hotkeyConfig = allHotkeys.find((h) => h.id === hotkeyId);

    if (!hotkeyConfig) {
      console.warn(`未找到快捷键配置: ${hotkeyId}`);
      return false;
    }

    // 初始化快捷键管理器
    const electronHotkeys = useElectronHotkeys();
    const hotkeyManager = useHotkeyManager(electronHotkeys);

    // 更新配置中的快捷键
    hotkeyConfig.keys = newKeys;

    // 重新注册快捷键
    await hotkeyManager.removeHotkey(hotkeyId);

    if (hotkeyConfig.type === HotkeyType.GLOBAL) {
      return await hotkeyManager.registerGlobalHotkey(
        hotkeyConfig.keys,
        hotkeyConfig.callback,
        {
          id: hotkeyConfig.id,
          description: hotkeyConfig.description,
          enabled: hotkeyConfig.enabled && config.value.global.enabled,
        }
      );
    } else {
      return await hotkeyManager.registerAppHotkey(
        hotkeyConfig.keys,
        hotkeyConfig.callback,
        {
          id: hotkeyConfig.id,
          description: hotkeyConfig.description,
          enabled: hotkeyConfig.enabled && config.value.application.enabled,
        }
      );
    }
  };

  /**
   * 获取快捷键配置
   */
  const getHotkeyConfig = () => {
    return config.value;
  };

  // 不在组件挂载时自动初始化，避免重复初始化
  // onMounted(() => {
  //   initializeGlobalHotkeys();
  // });

  return {
    // 状态
    isInitialized,
    initializationError,
    config,

    // 方法
    initializeGlobalHotkeys,
    reinitializeGlobalHotkeys,
    getAllHotkeys,
    toggleGroup,
    updateHotkeyConfig,
    getHotkeyConfig,
  };
}
