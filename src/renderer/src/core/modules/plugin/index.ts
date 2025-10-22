import { defineStore } from "pinia";
import { shallowRef, computed, shallowReactive, ref } from "vue";
import type {
  PluginConfig,
  PluginHook,
  PluginItem,
  CommandConfig,
} from "@/typings/pluginTypes";
import type { PluginInstaller, PluginSetting, } from "@/core/typings/plugin";
import { LocalPluginInstaller } from "./modules/local";
import { GithubPluginInstaller } from "./modules/github";
import { TemporaryPluginInstaller } from "./modules/temporary";
import { useLoading } from "@/core/hooks/useLoading";
import { storeUtils } from "@/core/utils/store";
import { appEventManager } from "../event";
import { SystemPluginInstaller } from "./modules/system";
import semver from "semver";

const modules = {
  temporary: new TemporaryPluginInstaller(),
  system: new SystemPluginInstaller(),
  local: new LocalPluginInstaller(),
  github: new GithubPluginInstaller(),
};
modules.github.setLocalInstaller(modules.local);

/**
 * 插件管理 Store
 * 安装和卸载 需要同步两个WebContentsView，所以一个需要发送同步信息给另一个View
 * 执行安装都进行安装（设置忽略加载模块），执行卸载只在设置中，其他View对数据进行更新
 */
export const usePluginStoreNew = defineStore("pluginNew", () => {
  // ==================== 工具实例 ====================
  const loading = useLoading();
  const listLoading = useLoading();
  // ==================== 状态（单一数据源） ====================
  const id = Math.random().toString(36).substring(2, 15);
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

  const pluginSettings = shallowRef<Map<string, PluginSetting>>(new Map());

  // ==================== 计算属性 ====================
  const enabledPlugins = computed(() => installedPlugins.value.filter((p) => p.enabled));
  const systemPlugins = computed(() =>
    availablePlugins.value.filter((p) => p.options?.pluginType === "system")
  );
  const localPlugins = computed(() =>
    availablePlugins.value.filter((p) => p.options?.pluginType === "local")
  );
  const temporaryPlugins = computed(() => availablePlugins.value.filter((p) => p.options?.pluginType === "temporary"))
  const temporaryItems = computed(() =>
    temporaryPlugins.value.flatMap((plugin) => plugin.feature)
  );
  const temporaryFullPaths = computed(() =>
    temporaryItems.value.map((m) => m.fullPath || `${m.pluginId}:${m.path}`)
  );

  const githubPlugins = shallowRef<PluginConfig[]>([]);
  const pluginCount = computed(() => installedPlugins.value.length);
  const enabledCount = computed(() => enabledPlugins.value.length);

  const officialPluginIds = computed(() => {
    return githubPlugins.value.filter((p: any) => {
      return p?.github ? p.github?.user === "imohuan" : false
    }).map((p) => p.id);
  });

  const isOfficialPlugin = (pluginId: string) => {
    return officialPluginIds.value.includes(pluginId);
  };

  const needUpdatePlugins = computed(() => {
    const pluginMap = new Map([...systemPlugins.value, ...localPlugins.value].map((p) => [p.id, p]));
    console.log("needUpdatePlugins", pluginMap, githubPlugins.value);
    const needUpdate = githubPlugins.value.filter((p) => {
      const plugin = pluginMap.has(p.id) ? pluginMap.get(p.id) : null
      if (!plugin) return false

      // 使用 semver 比较版本号：如果远程版本大于本地版本，则需要更新
      try {
        const remoteVersion = semver.valid(semver.coerce(p.version))
        const localVersion = semver.valid(semver.coerce(plugin.version))

        // 如果两个版本号都有效，则比较；否则使用字符串比较
        if (remoteVersion && localVersion) {
          return semver.gt(remoteVersion, localVersion)
        }
        return plugin.version !== p.version
      } catch (error) {
        // 如果 semver 解析失败，降级到字符串比较
        console.warn(`版本号解析失败: ${plugin.id}, 本地: ${plugin.version}, 远程: ${p.version}`, error)
        return plugin.version !== p.version
      }
    })

    return needUpdate
  })

  // ==================== 安装器管理 ====================

  // 注册所有安装器
  Object.values(modules).forEach((installer) => {
    const oldGetList = installer.getList.bind(installer);
    installer.getList = async (options?: any) => {
      const list = await oldGetList(options);
      list.forEach((p) => installer.setupPluginFeatures(p));
      return list
    }
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

  const getPluginSettings = (pluginId: string) => {
    return pluginSettings.value.get(pluginId) || {};
  };

  const setPluginSettings = async (pluginId: string, settings: PluginSetting) => {
    const oldSettings = getPluginSettings(pluginId);
    const newSettings = { ...oldSettings, ...settings };
    pluginSettings.value.set(pluginId, newSettings);

    // 将所有插件设置转换为对象格式并保存到本地存储
    const allSettings: Record<string, PluginSetting> = {};
    pluginSettings.value.forEach((value, key) => {
      allSettings[key] = value;
    });

    await storeUtils.set("pluginSetting", allSettings);
    console.log(`💾 已保存插件设置到本地存储: ${pluginId}`, newSettings);
  };

  /**
   * 初始化自启动插件
   * 根据插件设置中的 followMainProgram 配置，自动创建插件视图
   */
  const initAutoStartPlugins = async () => {
    console.log("🔍 检查自启动插件配置...");

    for (const plugin of installedPlugins.value) {
      const settings = getPluginSettings(plugin.id);
      // 检查插件是否配置了跟随主程序启动
      if (settings && (settings as any).followMainProgram === true) {
        console.log(`🚀 自启动插件: ${plugin.name} (${plugin.id})`);
        try {
          // 构建插件视图参数
          const fullPath = `${plugin.id}`;
          const url = plugin.main || '';
          const preloadPath = plugin.preload || '';

          // 如果没有 URL，跳过（避免创建空白视图）
          if (!url && !preloadPath) {
            console.warn(`⚠️ 插件 ${plugin.name} 没有 main 或 preload，跳过自启动`);
            continue;
          }

          // 确定生命周期类型：优先使用 pluginSetting.backgroundRun
          let lifecycleType: 'FOREGROUND' | 'BACKGROUND' = 'FOREGROUND';
          if (settings && typeof (settings as any).backgroundRun === 'boolean') {
            lifecycleType = (settings as any).backgroundRun ? 'BACKGROUND' : 'FOREGROUND';
            console.log(`🔄 自启动插件 ${plugin.id} 使用 backgroundRun: ${(settings as any).backgroundRun}, lifecycleType: ${lifecycleType}`);
          }

          // 调用 IPC 创建插件视图（静默模式）
          const result = await naimo.router.windowCreatePluginView({
            fullPath,
            title: plugin.name,
            url: url || 'about:blank',
            lifecycleType,
            preload: preloadPath,
            singleton: plugin.singleton !== false,
            noSwitch: true, // 静默创建，不切换视图
            data: { autoStart: true } // 标记为自启动
          });

          if (result.success) {
            console.log(`✅ 自启动插件视图创建成功: ${fullPath} -> ${result.viewId}`);
          } else {
            console.warn(`⚠️ 自启动插件视图创建失败: ${fullPath}`, result.error);
          }
        } catch (error) {
          console.error(`❌ 创建自启动插件视图时出错: ${plugin.id}`, error);
        }
      }
    }

    console.log("✅ 自启动插件检查完成");
  };

  // ==================== 核心方法 ====================
  const getLocalPlugins = async () => {
    const local = await modules.local.getList();
    const system = await modules.system.getList();
    const temporary = await modules.temporary.getList();
    return [...local, ...system, ...temporary];
  }

  /** 初始化插件系统 */
  const initialize = loading.withLoading(async () => {
    console.log("🚀 [插件系统] 开始初始化");
    if (silent.value) await modules.temporary.clear();

    // 1. 加载所有本地插件（系统插件已禁用，所有插件统一放在 plugins/ 目录）
    availablePlugins.value = await getLocalPlugins();
    triggerRef(availablePlugins);
    console.log(`📋 加载了 ${availablePlugins.value.length} 个本地插件`);

    // 2. 加载已安装的插件
    const installedIds = await getInstalledPluginIds();

    // 3. 安装已安装的插件
    if (silent.value) {
      // 加载插件设置
      const pluginSetting = (await storeUtils.get("pluginSetting")) || {};
      pluginSettings.value = new Map(Object.entries(pluginSetting as Record<string, PluginSetting>));
      console.log(`📋 加载了 ${pluginSettings.value.size} 个插件的设置`);

      // 实际安装和安装监听事件
      const waitInstalls = availablePlugins.value.filter((p) => installedIds.includes(p.id) || p.options?.pluginType === "system")
      await Promise.all(waitInstalls.map((p) => install(p)));
      // 初始化自启动插件（后台静默创建，不切换到该插件窗口）
      await initAutoStartPlugins();
    } else {
      // 数据上的变化
      installedPlugins.value = availablePlugins.value.filter((p) =>
        installedIds.includes(p.id)
      );
      triggerRef(installedPlugins);
    }

    _setupEventListeners();
    console.log(`✅ 初始化完成，已安装 ${installedPlugins.value.length} 个插件`);
    console.log(`✅ 当前插件`, { ...installedPlugins.value });
  }, "初始化插件系统失败");

  /** 安装插件 */
  const install = loading.withLoading(async (source: PluginConfig | string, focus: boolean = false) => {
    console.log(`📦 开始安装:`, typeof source === "string" ? source : source.id);
    const installer = findInstaller(source);
    if (!installer) throw new Error(`未找到支持的安装器: ${source}`);
    console.log(`使用 ${installer.name} 安装`);
    const plugin = await installer.install(source);

    // 检查是否已安装
    const index = installedPlugins.value.findIndex((p) => p.id === plugin.id);
    if (index !== -1) {
      console.log(`ℹ️ 插件已安装: ${plugin.id}`);
      if (!focus) return plugin;
      installedPlugins.value.splice(index, 1);
    }

    // 添加到已安装列表
    installedPlugins.value.push(plugin);
    triggerRef(installedPlugins);

    // 添加到可用列表（如果不存在）
    const availableIndex = availablePlugins.value.findIndex((p) => p.id === plugin.id);
    if (availableIndex !== -1) availablePlugins.value.splice(availableIndex, 1);
    availablePlugins.value.push(plugin);
    triggerRef(availablePlugins);

    await saveInstalledPluginIds();
    if (!silent.value) {
      await naimo.router.appForwardMessageToMainView("plugin-installed", {
        pluginId: plugin.id, sender: id,
      });
    }

    appEventManager.emit("plugin:installed", { pluginId: plugin.id, });
    console.log(`✅ 安装成功: ${plugin.id}`);

    if (plugin.main?.startsWith(".")) {
      naimo.log.warn(`插件路径依然是相对路径 ${plugin.main}\n请检查插件配置，需要将插件路径改为绝对路径`)
      naimo.log.warn(`插件路径信息: ${installer.type} - ${plugin.options?.getResourcePath?.toString()}`)
      debugger
    }

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
    if (!(await installer.uninstall(id, { skip: silent.value }))) throw new Error(`卸载插件失败: ${id}`);

    // 从列表移除
    installedPlugins.value = installedPlugins.value.filter((p) => p.id !== id);
    // 清除钩子和保存
    clearPluginHooks(id);
    await saveInstalledPluginIds();
    if (!silent.value) {
      await updateAllLists();
      await naimo.router.appForwardMessageToMainView("plugin-uninstalled", {
        pluginId: id, sender: id,
      });
    }
    appEventManager.emit("plugin:uninstalled", { pluginId: id, });
    console.log(`✅ 卸载成功: ${id}`);
    return true;
  }, "卸载插件失败");

  /** 切换插件启用状态 */
  const toggle = loading.withLoading(async (id: string, enabled?: boolean) => {
    const plugin = getPlugin(id);
    if (!plugin) throw new Error(`插件未安装: ${id}`);
    plugin.enabled = enabled !== undefined ? enabled : !plugin.enabled;
    console.log(`✅ 切换插件状态: ${id} -> ${plugin.enabled ? "启用" : "禁用"}`);
    return true;
  }, "切换插件状态失败");

  /** 更新插件 */
  const update = loading.withLoading(async (source: PluginConfig | string) => {
    // 1. 解析插件ID和配置
    let pluginId: string;
    let newPluginConfig: PluginConfig;

    if (typeof source === "string") {
      // 如果是字符串，从 githubPlugins 中查询
      pluginId = source;
      const githubPlugin = githubPlugins.value.find((p) => p.id === pluginId);
      if (!githubPlugin) {
        throw new Error(`未在 GitHub 插件列表中找到插件: ${pluginId}`);
      }
      newPluginConfig = githubPlugin
    } else {
      // 如果是插件配置对象
      pluginId = source.id;
      newPluginConfig = source;
    }

    console.log(`🔄 开始更新插件: ${pluginId}`);

    // 2. 检查插件是否已安装
    const installedPlugin = getPlugin(pluginId);
    if (!installedPlugin) {
      throw new Error(`插件未安装，无法更新: ${pluginId}`);
    }

    // 3. 记录旧版本信息
    const oldVersion = installedPlugin.version;
    const newVersion = newPluginConfig.version;
    console.log(`📦 版本更新: ${oldVersion} -> ${newVersion}`);

    try {
      // 4. 先卸载旧版本
      console.log(`🗑️ 卸载旧版本: ${pluginId}`);
      await uninstall(pluginId);

      // 5. 安装新版本
      console.log(`📥 安装新版本: ${pluginId}`);

      const updatedPlugin: PluginConfig = await install(newPluginConfig?.downloadUrl ? newPluginConfig?.downloadUrl : newPluginConfig)
      console.log(`✅ 插件更新成功: ${pluginId} (${oldVersion} -> ${newVersion})`);

      // 6. 触发更新事件
      appEventManager.emit("plugin:updated", {
        pluginId, oldVersion, newVersion
      });

      await updateAllLists()
      return updatedPlugin;
    } catch (error) {
      console.error(`❌ 插件更新失败: ${pluginId}`, error);
      // 如果安装新版本失败，尝试回滚（重新安装旧版本）
      console.warn(`⚠️ 尝试回滚到旧版本: ${pluginId}`);
      try {
        await install(installedPlugin);
        console.log(`✅ 已回滚到旧版本: ${pluginId}`);
      } catch (rollbackError) {
        console.error(`❌ 回滚失败: ${pluginId}`, rollbackError);
      }
      throw error;
    }
  }, "更新插件失败");

  // ==================== GitHub 插件相关 ====================

  const updateGithubPlugins = async (list: PluginConfig[]) => {
    githubPlugins.value = list;
    triggerRef(githubPlugins);

    mergePlugins(list);
    return list
  }

  /** 加载更多 GitHub 插件 */
  const loadMoreGithubPlugins = listLoading.withLoading(async () => {
    const plugins = await modules.github.loadMore();
    return updateGithubPlugins(plugins);
  }, "加载更多 GitHub 插件失败");

  /** 加载 GitHub 插件列表 */
  const loadGithubPlugins = listLoading.withLoading(
    async (options?: { search?: string; page?: number }) => {
      const plugins = await modules.github.getList(options);
      return updateGithubPlugins(plugins);
    },
    "加载 GitHub 插件失败"
  );

  /** 更新所有插件列表 */
  const updateAllLists = async () => {
    // 只加载本地插件（系统插件已禁用）
    const locals = await getLocalPlugins();
    const github = availablePlugins.value.filter(
      (p) => p.options?.pluginType === "github"
    );
    availablePlugins.value = [...locals, ...github];
  };

  const getInstalledPluginItem = (fullPath: string) => {
    // fullPath 格式: "pluginId:path"
    const parts = fullPath.split(':');
    if (parts.length < 2) {
      console.warn('getInstalledPluginItem: fullPath 格式错误，应为 "pluginId:path"');
      return null;
    }

    const pluginId = parts[0];
    const path = parts.slice(1).join(':'); // 支持 path 中包含冒号

    const plugin = enabledPlugins.value.find((p) => p.id === pluginId);
    return (
      (plugin?.feature?.find((item) => item.path === path)) || null
    );
  }

  const getSerializedPluginItem = (app: PluginItem): PluginItem => {
    const serialized: PluginItem = {
      // 搜索类型字段（必需）
      type: app.type || 'text',
      // 应用相关字段
      name: app.name,
      path: app.path,
      icon: app.icon,
      ...(app.command && { command: app.command }),
      ...(app.fullPath && { fullPath: app.fullPath }), // 包含 fullPath 作为唯一标识
      ...(app.category && { category: app.category }),
      ...(app.description && { description: app.description }),
      ...(app.weight && { weight: app.weight }),
      ...(app.anonymousSearchFields && { anonymousSearchFields: app.anonymousSearchFields }),
      // 插件相关字段
      ...(app.pluginId && { pluginId: app.pluginId }),
    } as PluginItem;
    return serialized;
  }

  // ==================== 事件监听 ====================
  const _setupEventListeners = () => {
    // 监听插件安装事件（主窗口执行真正的安装）
    naimo.event.onPluginInstalled(async (_event, data) => {
      if (data.sender === id) return;
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
      if (data.sender === id) return;
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
    listLoading: listLoading.loading,
    error: loading.error,
    installedPlugins,
    availablePlugins,

    // 计算属性
    enabledPlugins,
    officialPluginIds,
    isOfficialPlugin,
    systemPlugins, // 已禁用系统插件
    localPlugins,
    githubPlugins,
    temporaryPlugins,
    temporaryItems,
    temporaryFullPaths,
    needUpdatePlugins,
    pluginCount,
    enabledCount,

    // 核心方法
    initialize,
    install,
    uninstall,
    update,
    toggle,
    getPlugin,
    getInstalledPluginItem,
    getSerializedPluginItem,
    getPluginSettings,
    setPluginSettings,

    // GitHub 相关
    loadGithubPlugins,
    loadMoreGithubPlugins,
    setGithubToken: modules.github.setGithubToken.bind(modules.github),
    clearGithubCache: modules.github.clearCache.bind(modules.github),
    getGithubSearchResult: modules.github.getSearchResult.bind(modules.github),

    // 工具方法
    updateAllLists,
    isPluginItem: (app: PluginItem) => "pluginId" in app && "fullPath" in app,

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
