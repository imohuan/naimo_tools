import { ref } from "vue";
import { HotkeyType } from "@/typings/hotkey-types";
import type { HotkeySettingsConfig, HotkeyConfig } from "@/typings/hotkey-types";
import { hotkeyConfig } from "../config/callbacks";
import { getHotkeyManager } from "./useHotkeyManager";

// 全局快捷键初始化状态
let globalInitializationInProgress = false;

// 全局快捷键初始化器类
class HotkeyInitializer {
  private isInitialized = ref(false);
  private initializationError = ref<string | null>(null);
  private config = ref<HotkeySettingsConfig>(hotkeyConfig);
  private hotkeyManager = getHotkeyManager();

  // 初始化全局快捷键
  public async initializeGlobalHotkeys(): Promise<void> {
    // 防止重复初始化
    if (globalInitializationInProgress) {
      console.log("⚠️ 全局快捷键初始化正在进行中，跳过重复初始化");
      return;
    }

    if (this.isInitialized.value) {
      console.log("✅ 全局快捷键已初始化，跳过重复初始化");
      return;
    }

    try {
      globalInitializationInProgress = true;
      console.log("🚀 开始初始化全局快捷键...");

      // 首先尝试从缓存恢复全局快捷键
      const restored = await this.hotkeyManager.restoreGlobalHotkeysFromCache();

      if (restored) {
        console.log("✅ 从缓存恢复全局快捷键成功");
      } else {
        console.log("⚠️ 从缓存恢复全局快捷键失败，使用默认配置");

        // 如果缓存恢复失败，使用默认配置注册全局快捷键
        for (const hotkey of this.config.value.global.hotkeys) {
          if (hotkey.enabled) {
            console.log(`🔧 注册默认全局快捷键: ${hotkey.id} -> ${hotkey.keys}`);
            const success = await this.hotkeyManager.register({
              ...hotkey,
              enabled: hotkey.enabled && this.config.value.global.enabled,
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
      for (const hotkey of this.config.value.application.hotkeys) {
        if (hotkey.enabled) {
          await this.hotkeyManager.register({
            ...hotkey,
            enabled: hotkey.enabled && this.config.value.application.enabled,
          });
        }
      }

      this.isInitialized.value = true;
      console.log("✅ 全局快捷键初始化完成");
    } catch (error) {
      console.error("❌ 全局快捷键初始化失败:", error);
      this.initializationError.value = error instanceof Error ? error.message : "未知错误";
    } finally {
      globalInitializationInProgress = false;
    }
  }

  // 重新初始化全局快捷键
  public async reinitializeGlobalHotkeys(): Promise<void> {
    this.isInitialized.value = false;
    this.initializationError.value = null;
    await this.initializeGlobalHotkeys();
  }

  /**
   * 获取所有快捷键配置
   */
  public getAllHotkeys(): HotkeyConfig[] {
    return [...this.config.value.global.hotkeys, ...this.config.value.application.hotkeys];
  }

  /**
   * 切换分组状态
   */
  public async toggleGroup(groupId: string): Promise<void> {
    if (groupId === "global") {
      for (const hotkey of this.config.value.global.hotkeys) {
        await this.hotkeyManager.toggle(hotkey.id, this.config.value.global.enabled);
      }
    } else if (groupId === "application") {
      for (const hotkey of this.config.value.application.hotkeys) {
        await this.hotkeyManager.toggle(hotkey.id, this.config.value.application.enabled);
      }
    }
  }

  /**
   * 更新快捷键配置
   */
  public async updateHotkeyConfig(hotkeyId: string, newKeys: string): Promise<boolean> {
    const allHotkeys = this.getAllHotkeys();
    const hotkeyConfig = allHotkeys.find((h) => h.id === hotkeyId);

    if (!hotkeyConfig) {
      console.warn(`未找到快捷键配置: ${hotkeyId}`);
      return false;
    }

    // 更新配置中的快捷键
    hotkeyConfig.keys = newKeys;

    // 重新注册快捷键
    await this.hotkeyManager.unregister(hotkeyId);

    return await this.hotkeyManager.register({
      ...hotkeyConfig,
      enabled: hotkeyConfig.enabled &&
        (hotkeyConfig.type === HotkeyType.GLOBAL
          ? this.config.value.global.enabled
          : this.config.value.application.enabled),
    });
  }

  /**
   * 获取快捷键配置
   */
  public getHotkeyConfig(): HotkeySettingsConfig {
    return this.config.value;
  }

  // 获取状态
  public getIsInitialized() {
    return this.isInitialized;
  }

  public getInitializationError() {
    return this.initializationError;
  }

  public getConfig() {
    return this.config;
  }
}

// 全局单例实例
let hotkeyInitializerInstance: HotkeyInitializer | null = null

// 获取单例实例
export const getHotkeyInitializer = (): HotkeyInitializer => {
  if (!hotkeyInitializerInstance) {
    hotkeyInitializerInstance = new HotkeyInitializer()
  }
  return hotkeyInitializerInstance
}

// Vue Composable 包装器（保持向后兼容）
export function useGlobalHotkeyInitializer() {
  const initializer = getHotkeyInitializer();

  return {
    // 状态
    isInitialized: initializer.getIsInitialized(),
    initializationError: initializer.getInitializationError(),
    config: initializer.getConfig(),

    // 方法
    initializeGlobalHotkeys: initializer.initializeGlobalHotkeys.bind(initializer),
    reinitializeGlobalHotkeys: initializer.reinitializeGlobalHotkeys.bind(initializer),
    getAllHotkeys: initializer.getAllHotkeys.bind(initializer),
    toggleGroup: initializer.toggleGroup.bind(initializer),
    updateHotkeyConfig: initializer.updateHotkeyConfig.bind(initializer),
    getHotkeyConfig: initializer.getHotkeyConfig.bind(initializer),
  };
}
