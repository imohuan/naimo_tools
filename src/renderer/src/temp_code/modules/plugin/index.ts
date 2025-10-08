import { defineStore } from "pinia";
import { shallowRef, computed, shallowReactive, ref } from "vue";
import type {
  PluginConfig,
  PluginHook,
  PluginItem,
  CommandConfig,
} from "@/typings/pluginTypes";
import type { PluginInstaller, PluginSetting, } from "@/temp_code/typings/plugin";
// import { SystemPluginInstaller } from "./modules/_system"; // 已禁用系统插件
import { LocalPluginInstaller } from "./modules/local";
import { GithubPluginInstaller } from "./modules/github";
import { useLoading } from "@/temp_code/hooks/useLoading";
import { storeUtils } from "@/temp_code/utils/store";

const modules = {
  // system: new SystemPluginInstaller(), // 已禁用：所有插件统一放在 plugins/ 目录
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
  // const systemPlugins = computed(() =>
  //   availablePlugins.value.filter((p) => p.options?.pluginType === "system")
  // ); // 已禁用系统插件
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

  /** 初始化插件系统 */
  const initialize = loading.withLoading(async () => {
    console.log("🚀 [插件系统] 开始初始化");

    // 1. 加载所有本地插件（系统插件已禁用，所有插件统一放在 plugins/ 目录）
    const local = await modules.local.getList();

    availablePlugins.value = [...local];
    console.log(`📋 加载了 ${local.length} 个本地插件`);

    // 2. 加载已安装的插件
    const installedIds = await getInstalledPluginIds();

    // 3. 安装已安装的插件
    if (silent.value) {
      // 加载插件设置
      const pluginSetting = (await storeUtils.get("pluginSetting")) || {};
      pluginSettings.value = new Map(Object.entries(pluginSetting as Record<string, PluginSetting>));
      console.log(`📋 加载了 ${pluginSettings.value.size} 个插件的设置`);

      // 实际安装和安装监听事件
      const waitInstalls = availablePlugins.value.filter((p) => installedIds.includes(p.id))
      await Promise.all(waitInstalls.map((p) => install(p)));
      _setupEventListeners();

      // 初始化自启动插件（后台静默创建，不切换到该插件窗口）
      await initAutoStartPlugins();
    } else {
      // 数据上的变化
      installedPlugins.value = availablePlugins.value.filter((p) =>
        installedIds.includes(p.id)
      );
    }
    console.log(`✅ 初始化完成，已安装 ${installedPlugins.value.length} 个插件`);
  }, "初始化插件系统失败");

  /** 安装插件 */
  const install = loading.withLoading(async (source: PluginConfig | string) => {
    console.log(`📦 开始安装:`, typeof source === "string" ? source : source.id);
    const installer = findInstaller(source);
    if (!installer) throw new Error(`未找到支持的安装器: ${source}`);
    console.log(`使用 ${installer.name} 安装`);
    const plugin = await installer.install(source, { skipLoad: !silent.value });

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
    if (!silent.value) {
      await naimo.router.appForwardMessageToMainView("plugin-installed", {
        pluginId: plugin.id,
      });
    }

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
    if (!(await installer.uninstall(id, { skip: silent.value }))) throw new Error(`卸载插件失败: ${id}`);

    // 从列表移除
    installedPlugins.value = installedPlugins.value.filter((p) => p.id !== id);
    // 清除钩子和保存
    clearPluginHooks(id);
    await saveInstalledPluginIds();
    if (!silent.value) {
      await updateAllLists();
      await naimo.router.appForwardMessageToMainView("plugin-uninstalled", {
        pluginId: id,
      });
    }
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

  // ==================== GitHub 插件相关 ====================

  /** 加载 GitHub 插件列表 */
  const loadGithubPlugins = listLoading.withLoading(
    async (options?: { search?: string; page?: number }) => {
      const plugins = await modules.github.getList(options);
      mergePlugins(plugins);
      return plugins;
    },
    "加载 GitHub 插件失败"
  );

  /** 加载更多 GitHub 插件 */
  const loadMoreGithubPlugins = listLoading.withLoading(async () => {
    const plugins = await modules.github.loadMore();
    mergePlugins(plugins);
    return plugins;
  }, "加载更多 GitHub 插件失败");

  /** 更新所有插件列表 */
  const updateAllLists = async () => {
    // 只加载本地插件（系统插件已禁用）
    const local = await modules.local.getList();
    const github = availablePlugins.value.filter(
      (p) => p.options?.pluginType === "github"
    );
    availablePlugins.value = [...local, ...github];
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
    // systemPlugins, // 已禁用系统插件
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
