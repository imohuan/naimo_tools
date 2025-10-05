import { defineStore } from "pinia";
import { shallowRef, computed, shallowReactive, ref } from "vue";
import type {
  PluginConfig,
  PluginHook,
  PluginItem,
  CommandConfig,
} from "@/typings/pluginTypes";
import type { PluginInstaller } from "@/temp_code/typings/plugin";
import { SystemPluginInstaller } from "./modules/system";
import { LocalPluginInstaller } from "./modules/local";
import { GithubPluginInstaller } from "./modules/github";
import { useLoading } from "@/temp_code/hooks/useLoading";
import { storeUtils } from "@/temp_code/utils/store";

const modules = {
  system: new SystemPluginInstaller(),
  local: new LocalPluginInstaller(),
  github: new GithubPluginInstaller(),
};
modules.github.setLocalInstaller(modules.local);

/**
 * 插件管理 Store（简化版）
 */
export const usePluginStoreNew = defineStore("pluginNew", () => {
  // ==================== 工具实例 ====================
  const loading = useLoading();
  // ==================== 状态（单一数据源） ====================
  /** 已安装的插件列表 */
  const installedPlugins = shallowRef<PluginConfig[]>([]);
  /** 所有可用的插件列表 */
  const availablePlugins = shallowRef<PluginConfig[]>([]);
  /** 钩子系统 */
  const hooks = shallowReactive<Map<string, PluginHook[]>>(new Map());
  /** 命令系统 */
  const commands = shallowReactive<Map<string, CommandConfig>>(new Map());
  /** 安装器列表 */
  const installers = shallowReactive<Map<string, PluginInstaller>>(new Map());
  /** 是否静默 （是否不进行通讯） */
  const silent = ref(true);

  // ==================== 计算属性 ====================
  const enabledPlugins = computed(() => installedPlugins.value.filter((p) => p.enabled));
  const systemPlugins = computed(() =>
    availablePlugins.value.filter((p) => p.options?.pluginType === "system")
  );
  const localPlugins = computed(() =>
    availablePlugins.value.filter((p) => p.options?.pluginType === "local")
  );
  const githubPlugins = computed(() =>
    availablePlugins.value.filter((p) => p.options?.pluginType === "github")
  );
  const pluginCount = computed(() => installedPlugins.value.length);
  const enabledCount = computed(() => enabledPlugins.value.length);

  // ==================== 安装器管理 ====================

  // 注册所有安装器
  Object.values(modules).forEach((installer) => {
    installers.set(installer.type, installer);
  });

  /** 查找合适的安装器 */
  const findInstaller = (source: any): PluginInstaller | null => {
    for (const installer of installers.values()) {
      if (installer.canHandle(source)) return installer;
    }
    return null;
  };
  // ==================== 存储操作 ====================

  /** 获取已安装的插件ID列表 */
  const getInstalledPluginIds = async () => {
    return ((await storeUtils.get("installedPlugins")) as string[]) || [];
  };

  /** 保存已安装的插件ID列表 */
  const saveInstalledPluginIds = async () => {
    const ids = installedPlugins.value.map((p) => p.id);
    await storeUtils.set("installedPlugins", ids);
  };

  // ==================== 工具方法 ====================
  /** 获取插件详情 */
  const getPlugin = (id: string) => availablePlugins.value.find((p) => p.id === id);

  /** 合并插件到可用列表（去重） */
  const mergePlugins = (newPlugins: PluginConfig[]) => {
    const existingIds = new Set(availablePlugins.value.map((p) => p.id));
    const uniquePlugins = newPlugins.filter((p) => !existingIds.has(p.id));
    if (uniquePlugins.length > 0) {
      availablePlugins.value = [...availablePlugins.value, ...uniquePlugins];
    }
  };

  /** 清除插件的钩子 */
  const clearPluginHooks = (pluginId: string) => {
    Array.from(hooks.keys())
      .filter((h) => h.endsWith(`__${pluginId}`))
      .forEach((h) => hooks.delete(h));
  };

  // ==================== 插件 API ====================

  /** 获取插件API */
  const getPluginApi = async (pluginId: string) => {
    const plugin = getPlugin(pluginId);
    if (!plugin) {
      console.warn(`⚠️ 插件未找到: ${pluginId}`);
      return null;
    }

    return {
      getResourcePath: (...paths: string[]) => {
        const resolver = (plugin as any).getResourcePath;
        return resolver ? resolver(...paths) : paths.join("/");
      },
      getSettingValue: async (settingName?: string) => {
        const allSettings =
          ((await storeUtils.get("pluginSettings")) as Record<string, any>) || {};
        const pluginSettings = allSettings[pluginId] || {};
        return settingName ? pluginSettings[settingName] : pluginSettings;
      },
      setSettingValue: async (settingName: string, value: any) => {
        const allSettings =
          ((await storeUtils.get("pluginSettings")) as Record<string, any>) || {};
        allSettings[pluginId] = { ...allSettings[pluginId], [settingName]: value };
        return await storeUtils.set("pluginSettings", allSettings);
      },
      onCommand: (event: string, description: string, handler: PluginHook) => {
        commands.set(`${event}__${pluginId}`, {
          name: `${event}__${pluginId}`,
          handler,
          description,
        });
      },
      emitCommand: async (event: string, ...args: any[]) => {
        const command = commands.get(event);
        return command ? await command.handler(...args) : null;
      },
      onHook: (event: string, handler: PluginHook) => {
        const hookName = `${event}__${pluginId}`;
        hooks.set(hookName, [...(hooks.get(hookName) || []), handler]);
      },
      emitHook: async (event: string, ...args: any[]) => {
        for (const hookName of Array.from(hooks.keys()).filter((h) =>
          h.startsWith(`${event}__`)
        )) {
          const hookList = hooks.get(hookName);
          if (hookList) {
            for (const hook of hookList) {
              await hook(...args);
            }
          }
        }
      },
    };
  };

  // ==================== 核心方法 ====================

  /** 初始化插件系统 */
  const initialize = loading.withLoading(async () => {
    console.log("🚀 [插件系统] 开始初始化");

    // 1. 并行加载所有可用插件（使用包装后的安装器）
    const [system, local] = await Promise.all([
      modules.system.getList(),
      modules.local.getList(),
    ]);

    availablePlugins.value = [...system, ...local];
    console.log(`📋 加载了 ${system.length} 个系统插件，${local.length} 个本地插件`);

    // 2. 加载已安装的插件
    const installedIds = await getInstalledPluginIds();
    installedPlugins.value = availablePlugins.value.filter((p) =>
      installedIds.includes(p.id)
    );

    _setupEventListeners();
    console.log(`✅ 初始化完成，已安装 ${installedPlugins.value.length} 个插件`);
  }, "初始化插件系统失败");

  /** 安装插件 */
  const install = loading.withLoading(async (source: PluginConfig | string) => {
    console.log(`📦 开始安装:`, typeof source === "string" ? source : source.id);
    let plugin: PluginConfig;
    if (typeof source !== "string") {
      plugin = source;
    } else {
      const installer = findInstaller(source);
      if (!installer) throw new Error(`未找到支持的安装器: ${source}`);
      console.log(`使用 ${installer.name} 安装`);
      plugin = await installer.install(source, { skipLoad: silent.value });
    }

    // 检查是否已安装
    if (installedPlugins.value.some((p) => p.id === plugin.id)) {
      console.log(`ℹ️ 插件已安装: ${plugin.id}`);
      return plugin;
    }

    // 添加到已安装列表
    installedPlugins.value.push(plugin);

    // 添加到可用列表（如果不存在）
    if (!availablePlugins.value.some((p) => p.id === plugin.id)) {
      availablePlugins.value.push(plugin);
    }

    await saveInstalledPluginIds();
    if (!silent.value)
      await naimo.router.appForwardMessageToMainView("plugin-installed", {
        pluginId: plugin.id,
      });

    console.log(`✅ 安装成功: ${plugin.id}`);
    return plugin;
  }, "安装插件失败");

  /** 卸载插件 */
  const uninstall = loading.withLoading(async (id: string) => {
    console.log(`🗑️ 卸载插件: ${id}`);

    const plugin = getPlugin(id);
    if (!plugin) throw new Error(`插件未安装: ${id}`);

    // 使用对应的安装器卸载
    const installer = findInstaller(plugin);
    if (!installer) throw new Error(`未找到支持的安装器: ${plugin.id}`);

    if (!(await installer.uninstall(id))) {
      throw new Error(`卸载插件失败: ${id}`);
    }

    // 从列表移除
    installedPlugins.value = installedPlugins.value.filter((p) => p.id !== id);

    // 清除钩子和保存
    clearPluginHooks(id);
    await saveInstalledPluginIds();
    if (!silent.value)
      await naimo.router.appForwardMessageToMainView("plugin-uninstalled", {
        pluginId: id,
      });
    console.log(`✅ 卸载成功: ${id}`);
    return true;
  }, "卸载插件失败");

  /** 切换插件启用状态 */
  const toggle = loading.withLoading(async (id: string, enabled?: boolean) => {
    const plugin = getPlugin(id);
    if (!plugin) throw new Error(`插件未安装: ${id}`);

    plugin.enabled = enabled !== undefined ? enabled : !plugin.enabled;
    plugin.metadata = {
      ...plugin.metadata,
      createdAt: plugin.metadata?.createdAt || Date.now(),
      installedAt: plugin.metadata?.installedAt || Date.now(),
      updatedAt: Date.now(),
    };

    console.log(`✅ 切换插件状态: ${id} -> ${plugin.enabled ? "启用" : "禁用"}`);
    return true;
  }, "切换插件状态失败");

  // ==================== GitHub 插件相关 ====================

  /** 加载 GitHub 插件列表 */
  const loadGithubPlugins = loading.withLoading(
    async (options?: { search?: string; page?: number }) => {
      const plugins = await modules.github.getList(options);
      mergePlugins(plugins);
      return plugins;
    },
    "加载 GitHub 插件失败"
  );

  /** 加载更多 GitHub 插件 */
  const loadMoreGithubPlugins = loading.withLoading(async () => {
    const plugins = await modules.github.loadMore();
    mergePlugins(plugins);
    return plugins;
  }, "加载更多 GitHub 插件失败");

  /** 更新所有插件列表 */
  const updateAllLists = async () => {
    const [system, local] = await Promise.all([
      modules.system.getList(),
      modules.local.getList(),
    ]);
    const github = availablePlugins.value.filter(
      (p) => p.options?.pluginType === "github"
    );
    availablePlugins.value = [...system, ...local, ...github];
  };

  // ==================== 事件监听 ====================
  const _setupEventListeners = () => {
    // 监听插件安装事件（主窗口执行真正的安装）
    naimo.event.onPluginInstalled(async (_event, data) => {
      // 非静默状态：当前窗口是发送方（设置窗口），不处理自己发送的事件
      if (!silent.value) {
        console.log(`🔇 [PluginStoreNew] 忽略自己发送的安装事件: ${data.pluginId}`);
        return;
      }
      // 静默状态：当前是主窗口，执行真正的安装逻辑
      console.log(
        `📥 [PluginStoreNew] 主窗口接收到安装事件，开始执行真正的安装: ${data.pluginId}`
      );

      try {
        // 1. 更新所有插件列表 (包含新安装的插件 也就是本地插件，这里不需要加载远程插件）
        await updateAllLists();
        // 调用 install 方法执行完整的安装流程
        const plugin = getPlugin(data.pluginId);
        if (!plugin) throw new Error(`插件未找到: ${data.pluginId}`);
        // 因为 silent = true，install 方法不会再广播事件
        await install(plugin);
        console.log(`✅ [PluginStoreNew] 主窗口安装完成: ${data.pluginId}`);
      } catch (err) {
        console.error(`❌ [PluginStoreNew] 主窗口安装失败: ${data.pluginId}`, err);
      }
    });

    // 监听插件卸载事件（主窗口执行真正的卸载）
    naimo.event.onPluginUninstalled(async (_event, data) => {
      // 非静默状态：当前窗口是发送方（设置窗口），不处理自己发送的事件
      if (!silent.value) {
        console.log(`🔇 [PluginStoreNew] 忽略自己发送的卸载事件: ${data.pluginId}`);
        return;
      }
      // 静默状态：当前是主窗口，执行真正的卸载逻辑
      console.log(
        `📥 [PluginStoreNew] 主窗口接收到卸载事件，开始执行真正的卸载: ${data.pluginId}`
      );
      try {
        // 调用 uninstall 方法执行完整的卸载流程
        // 因为 silent = true，uninstall 方法不会再广播事件
        await uninstall(data.pluginId);
        console.log(`✅ [PluginStoreNew] 主窗口卸载完成: ${data.pluginId}`);
      } catch (err) {
        console.error(`❌ [PluginStoreNew] 主窗口卸载失败: ${data.pluginId}`, err);
      }
    });
  };

  // ==================== 返回 ====================
  return {
    // 状态
    loading: loading.loading,
    error: loading.error,
    installedPlugins,
    availablePlugins,

    // 计算属性
    enabledPlugins,
    systemPlugins,
    localPlugins,
    githubPlugins,
    pluginCount,
    enabledCount,

    // 核心方法
    initialize,
    install,
    uninstall,
    toggle,
    getPlugin,
    getPluginApi,

    // GitHub 相关
    loadGithubPlugins,
    loadMoreGithubPlugins,
    setGithubToken: modules.github.setGithubToken.bind(modules.github),
    clearGithubCache: modules.github.clearCache.bind(modules.github),
    getGithubSearchResult: modules.github.getSearchResult.bind(modules.github),

    // 工具方法
    updateAllLists,
    isPluginItem: (app: PluginItem) => "pluginId" in app,
    getInstalledPluginItem: (pluginId: string, itemPath: string) => {
      const plugin = installedPlugins.value.find((p) => p.id === pluginId);
      return (
        (plugin?.enabled && plugin.items?.find((item) => item.path === itemPath)) || null
      );
    },
    getSerializedPluginItem: (app: PluginItem): PluginItem => {
      const serialized: PluginItem = {
        // 应用相关字段
        name: app.name,
        path: app.path,
        icon: app.icon,
        ...(app.lastUsed && { lastUsed: app.lastUsed }),
        ...(app.usageCount && { usageCount: app.usageCount }),
        ...(app.description && { description: app.description }),
        ...(app.notAddToRecent && { notAddToRecent: app.notAddToRecent }),
        ...(app.hidden && { hidden: app.hidden }),
        // 插件相关字段
        ...(app.pluginId && { pluginId: app.pluginId }),
      };
      return serialized;
    },
    clearError: loading.clearError,
    setSilent: (value: boolean) => {
      silent.value = value;
    },

    // 钩子和命令
    hooks,
    commands,

    // 安装器列表
    installers: Array.from(installers.values()),
  };
});
