import type { PluginConfig, PluginHook, PluginItem } from '@/typings/plugin-types'
import type { CoreAPI } from '@/typings/core-types'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronStoreBridge } from '../store/ElectronStoreBridge'
import type { AppConfig } from '@shared/types'
import { getDeafultPlugins, getDeafultPluginById } from '@/modules/plugins/config/default-plugins'

/**
 * 插件管理器核心类
 * 处理插件逻辑，不依赖Vue框架
 */
export class PluginManager extends BaseSingleton implements CoreAPI {
  private storeBridge: ElectronStoreBridge
  private storeKey: keyof AppConfig = 'installedPlugins'
  /** 所有可用插件 */
  public allAvailablePlugins: Map<string, PluginConfig> = new Map()
  /** 已安装插件 */
  public installedPlugins: Map<string, PluginConfig> = new Map()
  /** 钩子 */
  public hooks: Map<string, PluginHook[]> = new Map()

  constructor() {
    super()
    this.storeBridge = ElectronStoreBridge.getInstance()
  }

  async getInstalledPluginIds(): Promise<Set<string>> {
    const ids = await this.storeBridge.get(this.storeKey) as string[]
    return new Set(ids)
  }

  async setInstalledPluginIds(pluginIds: Set<string>): Promise<void> {
    const ids = Array.from(pluginIds)
    await this.storeBridge.set(this.storeKey, ids)
  }

  async initialize(): Promise<any> {
    this.allAvailablePlugins = await this.getPluginList()
    await this.loadInstalledPlugins()
  }

  /** 获取插件列表 */
  async getPluginList(): Promise<Map<string, PluginConfig>> {
    const defaultPlugins = getDeafultPlugins()
    const thirdPartyPlugins = await api.ipcRouter.filesystemGetAllInstalledPlugins()
    console.log("📋 默认插件数量:", defaultPlugins.length);
    console.log("📋 第三方插件数量:", thirdPartyPlugins.length);
    const allPlugins = [...defaultPlugins, ...thirdPartyPlugins]
    return new Map(allPlugins.map(plugin => [plugin.id, plugin]))
  }

  /** 加载已安装的插件 */
  async loadInstalledPlugins(): Promise<PluginConfig[]> {
    console.log("🔌 开始加载已安装的插件...");

    try {
      const loadedPlugins: PluginConfig[] = [];
      // 1. 获取已安装的插件列表
      const installedPluginIds = await this.getInstalledPluginIds();
      console.log("📋 已安装的插件ID列表:", installedPluginIds);
      // 2. 从缓存中加载已安装的插件
      for (const pluginId of installedPluginIds) {
        const plugin = this.allAvailablePlugins.get(pluginId);
        if (plugin) {
          await this.install(plugin, true)
        } else {
          console.warn(`⚠️ 插件未在缓存中找到: ${pluginId}`);
        }
      }
      console.log(
        "✅ 已安装插件加载完成:",
        loadedPlugins.map((p) => ({ id: p.id, name: p.name, itemsCount: p.items.length }))
      );
      return loadedPlugins;
    } catch (error) {
      console.error("❌ 加载已安装插件时发生错误:", error);
      return [];
    }
  }

  /** 验证插件配置 */
  validatePluginConfig(pluginData: PluginConfig): boolean {
    if (!pluginData.id) {
      return false;
    }
    if (!pluginData.name) {
      return false;
    }
    if (!pluginData.version) {
      return false;
    }
    if (!pluginData.author) {
      return false;
    }
    if (!pluginData.icon) {
      return false;
    }
    if (!pluginData.category) {
      return false;
    }
    if (!pluginData.items || pluginData.items.length === 0) {
      return false;
    }
    return true
  }

  /** 安装插件 */
  async install(pluginData: PluginConfig, focus = false): Promise<boolean> {
    try {
      console.log(`📦 开始安装插件: ${pluginData.id}`);

      // 验证插件配置
      if (!this.validatePluginConfig(pluginData)) {
        console.error(`❌ 插件配置无效: ${pluginData.id}`);
        return false;
      }

      // 获取当前已安装的插件列表
      const installedPluginIds = await this.getInstalledPluginIds();

      // 检查插件是否已安装
      if (installedPluginIds.has(pluginData.id) && !focus) {
        console.warn(`⚠️ 插件已安装: ${pluginData.id}`);
        return true;
      }

      // 设置插件ID
      pluginData.items.forEach(item => {
        item.pluginId = pluginData.id
        item.path = item.pluginId + ':' + item.name
      })

      // 统一处理所有插件
      const plugin: PluginConfig = {
        ...pluginData,
        enabled: pluginData.enabled !== false,
        metadata: {
          createdAt: pluginData.metadata?.createdAt || Date.now(),
          installedAt: pluginData.metadata?.installedAt || Date.now(),
          updatedAt: Date.now(),
        }
      };

      installedPluginIds.add(pluginData.id);
      await this.setInstalledPluginIds(installedPluginIds);
      this.installedPlugins.set(pluginData.id, plugin);
      this.allAvailablePlugins.set(pluginData.id, plugin);
      console.log(`✅ 插件安装成功: ${pluginData.id}`);
      return true;
    } catch (error) {
      console.error(`❌ 安装插件失败: ${pluginData.id}`, error);
      return false;
    }
  }

  /** 卸载插件 */
  async uninstall(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 开始卸载插件: ${pluginId}`);
      // 检查是否是默认插件
      const isDefaultPlugin = getDeafultPluginById(pluginId) !== null;
      // 对于第三方插件，需要删除文件
      if (!isDefaultPlugin) {
        const success = await api.ipcRouter.filesystemUninstallPlugin(pluginId);
        if (!success) {
          console.error(`❌ 删除插件文件失败: ${pluginId}`);
          return false;
        }
      }

      // 从已安装插件列表中移除
      const installedPluginIds = await this.getInstalledPluginIds();
      installedPluginIds.delete(pluginId);
      await this.setInstalledPluginIds(installedPluginIds);

      // 清楚他的钩子函数
      const hookNames = Array.from(this.hooks.keys()).filter(f => f.split('__')[1] === pluginId)
      for (const hookName of hookNames) {
        this.hooks.delete(hookName);
      }

      // 从缓存中移除 
      this.installedPlugins.delete(pluginId);
      console.log(`✅ 插件卸载成功: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`❌ 卸载插件失败: ${pluginId}`, error);
      return false;
    }
  }

  /** 启用/禁用插件 */
  async toggle(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      console.log(`🔄 切换插件状态: ${pluginId} -> ${enabled ? '启用' : '禁用'}`);
      const plugin = this.installedPlugins.get(pluginId);
      if (!plugin) {
        console.warn(`⚠️ 插件未安装: ${pluginId}`);
        return false;
      }

      plugin.enabled = enabled;
      plugin.metadata = {
        createdAt: plugin.metadata?.createdAt || Date.now(),
        updatedAt: Date.now(),
        installedAt: plugin.metadata?.installedAt || Date.now(),
        ...plugin.metadata
      }

      this.installedPlugins.set(pluginId, plugin);
      console.log(`✅ 插件状态更新成功: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`❌ 更新插件状态失败: ${pluginId}`, error);
      return false;
    }
  }

  async emitHook(hookName: string, ...args: any[]): Promise<void> {
    const hookNames = Array.from(this.hooks.keys()).filter(f => f.split('__')[0] === hookName)
    for (const hookName of hookNames) {
      const hooks = this.hooks.get(hookName);
      if (hooks) {
        for (const hook of hooks) {
          await hook(...args);
        }
      }
    }
  }

  /** 获取插件API */
  async getPluginApi(pluginId: string): Promise<any> {
    const plugin = this.allAvailablePlugins.get(pluginId);
    if (!plugin) {
      console.warn(`⚠️ 插件未找到: ${pluginId}`);
      return null;
    }

    return {
      onHook: (event: string, handler: PluginHook) => {
        const hookName = `${event}__${pluginId}`;
        this.hooks.set(hookName, [...(this.hooks.get(hookName) || []), handler])
      },
      emitHook: (event: string, ...args: any[]) => {
        this.emitHook(event, ...args)
      },
    }
  }

  isPluginItem(app: PluginItem): boolean {
    return "pluginId" in app && "executeType" in app;
  }

  /**
   * 获取已安装的插件项目
   * @param pluginId 插件ID
   * @param itemPath 项目路径
   * @returns 
   */
  getInstalledPluginItem(pluginId: string, itemPath: string): PluginItem | null {
    const plugin = this.installedPlugins.get(pluginId);
    if (!plugin || plugin.items.length === 0 || !plugin.enabled) return null
    return plugin.items.find(item => item.path === itemPath) || null;
  }

  /**
   * 获取序列化后的插件项目
   * @param app 
   * @returns 
   */
  getSerializedPluginItem(app: PluginItem): PluginItem {
    const serialized: PluginItem = {
      // 应用相关字段
      name: app.name,
      path: app.path,
      icon: null,
      ...(app.lastUsed && { lastUsed: app.lastUsed }),
      ...(app.usageCount && { usageCount: app.usageCount }),
      ...(app.description && { description: app.description }),
      ...(app.notAddToRecent && { notAddToRecent: app.notAddToRecent }),
      ...(app.hidden && { hidden: app.hidden }),
      // 插件相关字段
      ...(app.pluginId && { pluginId: app.pluginId }),
      ...(app.executeType && { executeType: app.executeType }),
    }
    return serialized
  }

  /** 销毁 */
  async destroy(): Promise<void> {
    this.reset();
  }

  reset(): void {
    this.hooks.clear();
    this.installedPlugins.clear();
    this.allAvailablePlugins.clear();
  }
}

// 导出单例实例
export const pluginManager = PluginManager.getInstance()
