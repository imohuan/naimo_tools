import { defineStore } from "pinia";
import { ref, shallowRef, computed, readonly, triggerRef } from "vue";
import type { HotkeyConfig, HotkeyStats } from "@/temp_code/typings/hotkey";
import { HotkeyType } from "@/temp_code/typings/hotkey";
import { AppModule } from "./modules/app";
import { GlobalModule } from "./modules/global";
import { storeUtils } from "@/temp_code/utils/store";
import {
  isValidHotkeyFormat,
  checkHotkeyConflict,
  triggerHotkeyEvent,
} from "@/temp_code/utils/hotkey";
import { useLoading } from "@/temp_code/hooks/useLoading";

// 导入默认快捷键配置
import { hotkeyConfig } from "@/modules/hotkeys/config/hotkey";

/**
 * 快捷键主 Store
 *
 * 核心职责：
 * - 统一管理所有快捷键数据（唯一数据源）
 * - 协调应用内快捷键和全局快捷键子模块
 * - 提供快捷键的增删改查接口
 * - 处理快捷键数据持久化
 *
 * 使用方式：
 * ```ts
 * const app = useApp()
 * await app.hotkey.register(config)  // 注册快捷键
 * await app.hotkey.unregister(id)    // 注销快捷键
 * await app.hotkey.toggle(id)        // 切换启用状态
 * ```
 */
export const useHotkeyStore = defineStore("hotkey", () => {
  // ==================== 状态层 ====================

  /**
   * 所有快捷键的唯一数据源
   * 使用 shallowRef 优化性能（Map 本身是响应式的，内部项变化需手动触发）
   */
  const hotkeys = shallowRef<Map<string, HotkeyConfig>>(new Map());
  /** 加载状态管理 */
  const loading = useLoading();
  /** 是否已初始化 */
  const initialized = ref(false);
  /** 是否静默 （是否不进行通讯） */
  const silent = ref(true);

  // ==================== 子模块 ====================

  /** 应用内快捷键模块 */
  const appModule = new AppModule();
  /** 全局快捷键模块 */
  const globalModule = new GlobalModule();

  // ==================== 计算属性 ====================

  /** 全局快捷键列表 */
  const globalHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter((h) => h.type === HotkeyType.GLOBAL)
  );
  /** 应用内快捷键列表 */
  const appHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter((h) => h.type === HotkeyType.APPLICATION)
  );
  /** 已启用的快捷键列表 */
  const enabledHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter((h) => h.enabled)
  );
  /** 已禁用的快捷键列表 */
  const disabledHotkeys = computed(() =>
    Array.from(hotkeys.value.values()).filter((h) => !h.enabled)
  );
  /** 快捷键总数 */
  const hotkeyCount = computed(() => hotkeys.value.size);
  /** 已启用数量 */
  const enabledCount = computed(() => enabledHotkeys.value.length);
  /** 已禁用数量 */
  const disabledCount = computed(() => disabledHotkeys.value.length);

  /** 快捷键统计信息 */
  const stats = computed<HotkeyStats>(() => ({
    total: hotkeyCount.value,
    globalCount: globalHotkeys.value.length,
    appCount: appHotkeys.value.length,
    enabledCount: enabledCount.value,
    disabledCount: disabledCount.value,
  }));

  // ==================== 核心方法 ====================

  /**
   * 初始化快捷键系统
   * 从存储加载快捷键配置并注册
   */
  const initialize = loading.withLoading(async (): Promise<void> => {
    if (initialized.value) {
      console.warn("[HotkeyStore] 已经初始化过了");
      return;
    }
    console.log("[HotkeyStore] 开始初始化...");

    // 初始化全局快捷键事件监听器
    _setupEventListeners();

    // 合并默认配置和存储配置
    const mergedConfig = await _loadAndMergeConfig();

    // 恢复 Map 数据
    hotkeys.value = mergedConfig;
    triggerRef(hotkeys);

    console.log(`[HotkeyStore] 加载了 ${hotkeys.value.size} 个快捷键配置`);

    // 注册所有已启用的快捷键
    const enabledConfigs = Array.from(hotkeys.value.values()).filter((h) => h.enabled);

    for (const config of enabledConfigs) {
      await _registerToModule(config);
    }

    // 保存合并后的配置
    await _saveToStorage();

    initialized.value = true;
    console.log("[HotkeyStore] ✅ 初始化完成");
  }, "初始化失败");

  /**
   * 注册快捷键
   *
   * @param config 快捷键配置
   * @param skipValidation 是否跳过验证（用于保存未完成的快捷键配置）
   * @returns 是否成功
   */
  const register = loading.withLoadingSafe(
    async (config: HotkeyConfig, skipValidation: boolean = false): Promise<boolean> => {
      // 如果 keys 为空，只保存配置，不进行验证和注册
      if (!config.keys || config.keys.trim() === "") {
        if (!skipValidation) {
          loading.error.value = "快捷键格式无效";
          return false;
        }
        // 只保存到 Map 和存储，不注册到模块
        hotkeys.value.set(config.id, config);
        triggerRef(hotkeys);
        await _saveToStorage();
        console.log(`[HotkeyStore] ✅ 保存未完成的快捷键配置: ${config.id}`);
        return true;
      }

      // 验证配置
      if (!isValidHotkeyFormat(config.keys)) {
        loading.error.value = "快捷键格式无效";
        return false;
      }

      // 检查冲突
      const conflict = checkHotkeyConflict(
        config.keys,
        Array.from(hotkeys.value.values()),
        config.id
      );

      if (conflict) {
        loading.error.value = `快捷键冲突: ${conflict.id} 已使用相同的键组合`;
        console.warn(`[HotkeyStore] 快捷键冲突: ${config.keys}`);
        return false;
      }

      // 添加到 Map
      hotkeys.value.set(config.id, config);
      triggerRef(hotkeys);

      // 如果启用，则注册到对应的子模块
      if (config.enabled) {
        await _registerToModule(config);
      }

      // 持久化
      await _saveToStorage();
      console.log(`[HotkeyStore] ✅ 注册成功: ${config.id}`);

      // 广播快捷键更新事件（非静默模式时广播）
      if (!silent.value) await _broadcastHotkeyUpdate(config);
      return true;
    },
    "注册失败"
  );

  /**
   * 注销快捷键
   *
   * @param id 快捷键 ID
   * @returns 是否成功
   */
  const unregister = loading.withLoadingSafe(async (id: string): Promise<boolean> => {
    const config = hotkeys.value.get(id);
    if (!config) {
      loading.error.value = "快捷键不存在";
      return false;
    }

    // 如果已启用，先注销
    if (config.enabled) {
      await _unregisterFromModule(config);
    }

    // 从 Map 中删除
    hotkeys.value.delete(id);
    triggerRef(hotkeys);

    // 持久化
    await _saveToStorage();

    console.log(`[HotkeyStore] ✅ 注销成功: ${id}`);

    // 广播快捷键更新事件（非静默模式时广播，keys 为空表示删除）
    if (!silent.value)
      await _broadcastHotkeyUpdate({ ...config, keys: "", enabled: false });

    return true;
  }, "注销失败");

  /**
   * 切换快捷键启用状态
   *
   * @param id 快捷键 ID
   * @returns 是否成功
   */
  const toggle = loading.withLoadingSafe(async (id: string): Promise<boolean> => {
    const config = hotkeys.value.get(id);
    if (!config) {
      loading.error.value = "快捷键不存在";
      return false;
    }

    const newEnabled = !config.enabled;
    // 更新配置
    const updatedConfig = { ...config, enabled: newEnabled };

    // 注册或注销
    if (newEnabled) {
      await _registerToModule(updatedConfig);
    } else {
      await _unregisterFromModule(config);
    }

    // 更新 Map 英文因为如果是卸载的话他会删除这个快捷键，所以我们需要重新设置
    hotkeys.value.set(id, updatedConfig);
    triggerRef(hotkeys);

    // 持久化
    await _saveToStorage();

    console.log(`[HotkeyStore] ✅ 切换状态: ${id} -> ${newEnabled ? "启用" : "禁用"}`);
    // 广播快捷键更新事件（非静默模式时广播）
    if (!silent.value) await _broadcastHotkeyUpdate(updatedConfig);
    return true;
  }, "切换状态失败");

  /**
   * 更新快捷键配置
   *
   * @param id 快捷键 ID
   * @param updates 要更新的字段
   * @returns 是否成功
   */
  const updateConfig = loading.withLoadingSafe(
    async (id: string, updates: Partial<HotkeyConfig>): Promise<boolean> => {
      const config = hotkeys.value.get(id);
      if (!config) {
        loading.error.value = "快捷键不存在";
        return false;
      }

      const isKeysChanged = updates.keys && updates.keys !== config.keys;
      // 如果更新了 keys，检查冲突
      if (isKeysChanged) {
        if (!isValidHotkeyFormat(updates.keys!)) {
          loading.error.value = "快捷键格式无效";
          return false;
        }
        const conflict = checkHotkeyConflict(
          updates.keys!,
          Array.from(hotkeys.value.values()),
          id
        );
        if (conflict) {
          loading.error.value = `快捷键冲突: ${conflict.id} 已使用相同的键组合`;
          return false;
        }
      }

      // 如果当前已启用，先注销
      if (config.enabled && isKeysChanged) {
        await _unregisterFromModule(config);
      }

      // 更新配置
      const updatedConfig = { ...config, ...updates };
      hotkeys.value.set(id, updatedConfig);
      triggerRef(hotkeys);

      // 如果更新后仍然启用，重新注册
      if (updatedConfig.enabled && isKeysChanged) {
        await _registerToModule(updatedConfig);
      }

      // 持久化
      await _saveToStorage();

      console.log(`[HotkeyStore] ✅ 更新成功: ${id}`);

      // 广播快捷键更新事件（非静默模式时广播）
      if (!silent.value) await _broadcastHotkeyUpdate(updatedConfig);

      return true;
    },
    "更新失败"
  );

  /**
   * 获取指定快捷键配置
   *
   * @param id 快捷键 ID
   * @returns 快捷键配置，不存在返回 undefined
   */
  const getConfig = (id: string): HotkeyConfig | undefined => {
    return hotkeys.value.get(id);
  };

  /**
   * 检查快捷键是否存在
   *
   * @param id 快捷键 ID
   * @returns 是否存在
   */
  const has = (id: string): boolean => {
    return hotkeys.value.has(id);
  };

  /**
   * 清空所有快捷键
   */
  const clear = loading.withLoadingSafe(async (): Promise<void> => {
    // 注销所有已启用的快捷键
    const enabledConfigs = Array.from(hotkeys.value.values()).filter((h) => h.enabled);

    for (const config of enabledConfigs) {
      await _unregisterFromModule(config);
    }

    // 清空 Map
    hotkeys.value.clear();
    triggerRef(hotkeys);

    // 持久化
    await _saveToStorage();

    console.log("[HotkeyStore] ✅ 已清空所有快捷键");
  }, "清空失败");

  /**
   * 重新加载快捷键（从存储）
   */
  const reload = loading.withLoading(async (): Promise<void> => {
    // 先清空当前所有快捷键
    await clear();

    // 重新初始化
    initialized.value = false;
    await initialize();

    console.log("[HotkeyStore] ✅ 重新加载完成");
  }, "重新加载失败");

  const setSilent = (value: boolean): void => {
    silent.value = value;
  };

  // ==================== 内部辅助方法 ====================

  /**
   * 广播快捷键更新事件到其他view
   * @param config 快捷键配置（如果 keys 为空表示删除）
   * @private
   */
  const _broadcastHotkeyUpdate = async (config: HotkeyConfig): Promise<void> => {
    try {
      console.log(`📡 [HotkeyStore] 转发快捷键更新事件到其他view: ${config.id}`);
      // 通过主进程转发事件到其他view（不包括当前view）
      await window.naimo.router.appForwardMessageToMainView("hotkey-updated", {
        hotkeyId: config.id,
        name: config.name,
        keys: config.keys,
        enabled: config.enabled ?? true,
        type: config.type === HotkeyType.GLOBAL ? "global" : "application",
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`❌ [HotkeyStore] 转发快捷键更新事件失败:`, error);
    }
  };

  /**
   * 初始化全局快捷键事件监听器
   * 监听主进程发送的 global-hotkey-trigger 事件
   * @private
   */
  const _setupEventListeners = (): void => {
    // 监听主进程发送的全局快捷键触发事件
    naimo.event.onGlobalHotkeyTrigger((_event, data) => {
      console.log("[HotkeyStore] 收到全局快捷键触发:", data);
      const { hotkeyId } = data;
      const config = hotkeys.value.get(hotkeyId);
      if (config) {
        console.log(`[HotkeyStore] 触发快捷键: ${config.id} (${config.name})`);
        if (config.callback) config.callback();
        triggerHotkeyEvent(config);
      } else {
        console.warn(`[HotkeyStore] 未找到配置: ${hotkeyId}`);
      }
    });

    // 核心逻辑：监听其他view发送的快捷键更新事件
    // 主View监听设置View的更新（silent=true时接收）
    // 设置View不处理（silent=false时忽略，因为自己就是发起者）
    naimo.event.onHotkeyUpdated(async (_event, data) => {
      console.log("[HotkeyStore] 收到快捷键更新:", data);
      // 如果当前处于非静默模式，跳过处理（避免循环更新）
      // 非静默模式说明当前view是发起者，不需要再处理自己发出的更新
      if (!silent.value) {
        console.log("[HotkeyStore] 非静默模式，跳过快捷键更新（避免循环）");
        return;
      }

      try {
        const { hotkeyId, name, keys, enabled, type } = data;

        // 如果 keys 为空，说明快捷键被删除
        if (!keys) {
          console.log(`[HotkeyStore] 快捷键已删除: ${hotkeyId}`);
          const config = hotkeys.value.get(hotkeyId);
          if (config && config.enabled) await _unregisterFromModule(config);
          hotkeys.value.delete(hotkeyId);
          triggerRef(hotkeys);
          await _saveToStorage();
          return;
        }

        // 获取现有配置
        const existingConfig = hotkeys.value.get(hotkeyId);
        // 转换类型
        const hotkeyType = type === "global" ? HotkeyType.GLOBAL : HotkeyType.APPLICATION;
        // 如果快捷键已存在且已启用，先注销旧的
        if (existingConfig && existingConfig.enabled)
          await _unregisterFromModule(existingConfig);

        // 构建新的配置
        const newConfig: HotkeyConfig = {
          id: hotkeyId,
          keys,
          type: hotkeyType,
          enabled,
          name: name || existingConfig?.name || hotkeyId,
          description: existingConfig?.description || "",
          callback: existingConfig?.callback,
          scope: existingConfig?.scope,
          preventDefault: existingConfig?.preventDefault,
          stopPropagation: existingConfig?.stopPropagation,
        };

        // 更新 Map
        hotkeys.value.set(hotkeyId, newConfig);
        triggerRef(hotkeys);
        // 如果启用，则注册
        if (enabled) {
          await _registerToModule(newConfig);
          console.log(
            `[HotkeyStore] ✅ 已同步更新快捷键: ${hotkeyId} (${newConfig.name})`
          );
        } else {
          console.log(`[HotkeyStore] ✅ 已同步禁用快捷键: ${hotkeyId}`);
        }
        // 保存到存储
        await _saveToStorage();
      } catch (err) {
        console.error(`[HotkeyStore] ❌ 同步快捷键更新失败: ${data.hotkeyId}`, err);
      }
    });
    console.log("[HotkeyStore] ✅ 监听器已初始化");
  };

  /**
   * 注册快捷键到对应的子模块
   * @private
   */
  const _registerToModule = async (config: HotkeyConfig): Promise<void> => {
    if (config.type === HotkeyType.GLOBAL) {
      await globalModule.register(config);
    } else {
      appModule.register(config);
    }
  };

  /**
   * 从对应的子模块注销快捷键
   * @private
   */
  const _unregisterFromModule = async (config: HotkeyConfig): Promise<void> => {
    if (config.type === HotkeyType.GLOBAL) {
      await globalModule.unregister(config.id);
    } else {
      appModule.unregister(config);
    }
  };

  /**
   * 加载并合并配置（默认配置 + 存储配置）
   * @private
   */
  const _loadAndMergeConfig = async (): Promise<Map<string, HotkeyConfig>> => {
    try {
      const defaultConfigs: HotkeyConfig[] = [];
      // 安全地展开配置数组
      if (hotkeyConfig.global && Array.isArray(hotkeyConfig.global)) {
        defaultConfigs.push(...hotkeyConfig.global);
      }
      if (hotkeyConfig.application && Array.isArray(hotkeyConfig.application)) {
        defaultConfigs.push(...hotkeyConfig.application);
      }

      console.log(
        `[HotkeyStore] 加载默认配置: ${defaultConfigs.length} 个`,
        defaultConfigs
      );
      // 2. 从存储加载用户配置
      const savedData = (await storeUtils.get("hotkeys" as any)) || [];
      const savedMap = new Map<string, HotkeyConfig>(
        Array.isArray(savedData) ? savedData : []
      );

      // 3. 合并配置：用户配置优先
      const mergedMap = new Map<string, HotkeyConfig>();

      // 先添加默认配置
      for (const config of defaultConfigs) {
        mergedMap.set(config.id, config);
      }

      // 用存储的配置覆盖默认配置
      for (const [id, config] of savedMap.entries()) {
        if (mergedMap.has(id)) {
          // 如果是已有的配置，合并（保留用户的自定义设置）
          const defaultConfig = mergedMap.get(id)!;
          mergedMap.set(id, {
            ...defaultConfig,
            ...config,
            // 确保关键字段从用户配置中读取
            keys: config.keys,
            enabled: config.enabled,
          });
        } else {
          // 新的自定义快捷键，直接添加
          mergedMap.set(id, config);
        }
      }
      console.log(
        `[HotkeyStore] 配置合并完成: ${defaultConfigs.length} 个默认配置, ${savedMap.size} 个存储配置`
      );
      return mergedMap;
    } catch (error) {
      console.error("[HotkeyStore] 加载配置失败:", error);
      // 返回空的 Map，避免程序崩溃
      return new Map<string, HotkeyConfig>();
    }
  };

  /**
   * 保存到持久化存储
   * @private
   */
  const _saveToStorage = async (): Promise<void> => {
    try {
      const data = Array.from(hotkeys.value.entries());
      await storeUtils.set("hotkeys" as any, data);
    } catch (err) {
      console.error("[HotkeyStore] 保存到存储失败:", err);
    }
  };

  // ==================== 返回 ====================

  return {
    // 状态（只读）
    hotkeys: readonly(hotkeys),
    loading: readonly(loading.loading),
    error: readonly(loading.error),
    initialized: readonly(initialized),

    // 计算属性
    globalHotkeys,
    appHotkeys,
    enabledHotkeys,
    disabledHotkeys,
    hotkeyCount,
    enabledCount,
    disabledCount,
    stats,

    // 方法
    initialize,
    register,
    unregister,
    toggle,
    updateConfig,
    getConfig,
    has,
    clear,
    reload,
    setSilent,
  };
});
