import type { PluginConfig, PluginManager, PluginItem } from "@/typings/plugin-types";
import { PluginExecuteType } from "@/typings/plugin-types";
import { getDefaultPlugins, getDefaultPluginById } from "./default-plugins";

/**
 * 插件管理器实现
 */
export class PluginManagerImpl implements PluginManager {
  private plugins: Map<string, PluginConfig> = new Map();
  private allAvailablePlugins: PluginConfig[] = [];
  private availablePluginsLoaded = false;

  /**
   * 获取已安装的插件列表
   */
  private async getInstalledPlugins(): Promise<string[]> {
    try {
      const installedPlugins = await api.ipcRouter.storeGet("installedPlugins");
      return Array.isArray(installedPlugins) ? installedPlugins : [];
    } catch (error) {
      console.error("❌ 读取已安装插件列表失败:", error);
      return [];
    }
  }

  /**
   * 保存已安装的插件列表
   */
  private async saveInstalledPlugins(pluginIds: string[]): Promise<void> {
    try {
      await api.ipcRouter.storeSet("installedPlugins", pluginIds);
    } catch (error) {
      console.error("❌ 保存已安装插件列表失败:", error);
    }
  }

  /**
   * 获取所有可用的插件列表（包括默认插件和第三方插件）
   */
  async getAllAvailablePlugins(): Promise<PluginConfig[]> {
    // 如果已经加载过，直接返回缓存的结果
    if (this.availablePluginsLoaded && this.allAvailablePlugins.length > 0) {
      return this.allAvailablePlugins;
    }

    try {
      console.log("🔌 开始获取所有可用插件...");

      // 获取默认插件
      const defaultPlugins = getDefaultPlugins();

      // 获取第三方插件
      const thirdPartyPlugins: any[] = await api.ipcRouter.filesystemGetAllInstalledPlugins();

      // 合并所有插件
      this.allAvailablePlugins = [...defaultPlugins, ...thirdPartyPlugins];
      this.availablePluginsLoaded = true;

      console.log("📦 所有可用插件数量:", this.allAvailablePlugins.length);
      console.log("📋 默认插件数量:", defaultPlugins.length);
      console.log("📋 第三方插件数量:", thirdPartyPlugins.length);

      return this.allAvailablePlugins;
    } catch (error) {
      console.error("❌ 获取所有可用插件失败:", error);
      return [];
    }
  }

  /**
   * 加载已安装的插件（仅从缓存中加载）
   */
  async loadInstalledPlugins(): Promise<PluginConfig[]> {
    console.log("🔌 开始加载已安装的插件...");

    try {
      const loadedPlugins: PluginConfig[] = [];
      // 1. 获取已安装的插件列表
      const installedPluginIds = await this.getInstalledPlugins();

      console.log("📋 已安装的插件ID列表:", installedPluginIds);

      // 2. 从缓存中加载已安装的插件
      for (const pluginId of installedPluginIds) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
          loadedPlugins.push(plugin);
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

  /**
   * 初始化插件系统（加载所有可用插件并安装已安装的插件）
   */
  async initializePlugins(): Promise<PluginConfig[]> {
    console.log("🔌 开始初始化插件系统...");

    try {
      // 1. 获取所有可用的插件
      const allPlugins = await this.getAllAvailablePlugins();

      // 2. 获取已安装的插件列表
      const installedPluginIds = await this.getInstalledPlugins();

      console.log("📦 所有可用插件数量:", allPlugins.length);
      console.log("📋 已安装的插件ID列表:", installedPluginIds);

      const loadedPlugins: PluginConfig[] = [];

      // 3. 遍历所有插件，只安装已安装的插件
      for (const pluginData of allPlugins) {
        if (installedPluginIds.includes(pluginData.id)) {
          try {
            const success = await this.installPlugin(pluginData);
            if (success) {
              const plugin = this.plugins.get(pluginData.id);
              if (plugin) {
                loadedPlugins.push(plugin);
              }
            }
          } catch (error) {
            console.error(`❌ 加载插件失败: ${pluginData.id}`, error);
          }
        }
      }

      console.log(
        "✅ 插件系统初始化完成:",
        loadedPlugins.map((p) => ({ id: p.id, name: p.name, itemsCount: p.items.length }))
      );
      return loadedPlugins;
    } catch (error) {
      console.error("❌ 初始化插件系统时发生错误:", error);
      return [];
    }
  }

  /**
   * 重新加载所有插件（清除缓存）
   */
  async reloadAllPlugins(): Promise<PluginConfig[]> {
    console.log("🔄 重新加载所有插件...");

    // 清除缓存
    this.allAvailablePlugins = [];
    this.availablePluginsLoaded = false;
    this.plugins.clear();

    // 重新初始化插件系统
    return await this.initializePlugins();
  }


  /**
   * 安装插件（统一处理所有插件）
   */
  async installPlugin(pluginData: any): Promise<boolean> {
    try {
      console.log(`📦 开始安装插件: ${pluginData.id}`);

      // 验证插件配置
      if (!this.validatePluginConfig(pluginData)) {
        console.error(`❌ 插件配置无效: ${pluginData.id}`);
        return false;
      }

      // 获取当前已安装的插件列表
      const installedPluginIds = await this.getInstalledPlugins();

      // 检查插件是否已安装
      if (installedPluginIds.includes(pluginData.id)) {
        console.warn(`⚠️ 插件已安装: ${pluginData.id}`);
        return true;
      }

      // 统一处理所有插件
      const plugin: PluginConfig = {
        id: pluginData.id,
        name: pluginData.name,
        description: pluginData.description,
        version: pluginData.version,
        author: pluginData.author,
        icon: pluginData.icon,
        category: pluginData.category,
        enabled: pluginData.enabled !== false,
        items: pluginData.items || [],
        options: pluginData.options,
        metadata: {
          createdAt: pluginData.metadata?.createdAt || Date.now(),
          installedAt: pluginData.metadata?.installedAt || Date.now(),
          updatedAt: Date.now(),
        }
      };

      // 添加插件到已安装列表
      installedPluginIds.push(pluginData.id);
      await this.saveInstalledPlugins(installedPluginIds);

      // 缓存插件
      this.plugins.set(pluginData.id, plugin);

      // 清除可用插件缓存，因为可能有新的插件被安装
      this.availablePluginsLoaded = false;
      this.allAvailablePlugins = [];

      console.log(`✅ 插件安装成功: ${pluginData.id}`);
      return true;
    } catch (error) {
      console.error(`❌ 安装插件失败: ${pluginData.id}`, error);
      return false;
    }
  }

  /**
   * 从zip文件安装插件
   */
  async installPluginFromZip(zipPath: string): Promise<boolean> {
    try {
      console.log(`📦 开始从zip文件安装插件: ${zipPath}`);

      // 调用主进程安装插件
      const success = await api.ipcRouter.filesystemInstallPluginFromZip(zipPath);

      if (success) {
        // 清除缓存并重新加载所有插件
        await this.reloadAllPlugins();
        console.log(`✅ 插件安装成功: ${zipPath}`);
      } else {
        console.error(`❌ 插件安装失败: ${zipPath}`);
      }

      return success;
    } catch (error) {
      console.error(`❌ 从zip文件安装插件失败: ${zipPath}`, error);
      return false;
    }
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 开始卸载插件: ${pluginId}`);

      // 检查是否是默认插件
      const isDefaultPlugin = getDefaultPluginById(pluginId) !== null;

      // 对于第三方插件，需要删除文件
      if (!isDefaultPlugin) {
        const success = await api.ipcRouter.filesystemUninstallPlugin(pluginId);
        if (!success) {
          console.error(`❌ 删除插件文件失败: ${pluginId}`);
          return false;
        }
      }

      // 从已安装插件列表中移除
      const installedPluginIds = await this.getInstalledPlugins();
      const updatedPluginIds = installedPluginIds.filter(id => id !== pluginId);
      await this.saveInstalledPlugins(updatedPluginIds);

      // 从缓存中移除
      this.plugins.delete(pluginId);

      // 清除可用插件缓存，因为插件列表可能发生变化
      this.availablePluginsLoaded = false;
      this.allAvailablePlugins = [];

      console.log(`✅ 插件卸载成功: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`❌ 卸载插件失败: ${pluginId}`, error);
      return false;
    }
  }

  /**
   * 启用/禁用插件
   */
  async togglePlugin(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        console.warn(`⚠️ 插件不存在: ${pluginId}`);
        return false;
      }

      plugin.enabled = enabled;
      plugin.metadata = {
        createdAt: plugin.metadata?.createdAt || Date.now(),
        installedAt: plugin.metadata?.installedAt || Date.now(),
        updatedAt: Date.now(),
      };

      // 更新缓存中的插件
      this.plugins.set(pluginId, plugin);

      console.log(`✅ 插件状态更新: ${pluginId} -> ${enabled ? "启用" : "禁用"}`);
      return true;
    } catch (error) {
      console.error(`❌ 更新插件状态失败: ${pluginId}`, error);
      return false;
    }
  }

  /**
   * 获取插件列表
   */
  async getPluginList(): Promise<PluginConfig[]> {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取插件项目列表
   */
  getPluginItems(): PluginItem[] {
    return Array.from(this.plugins.values()).flatMap((plugin) => plugin.items);
  }

  getEnabledPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values()).filter((plugin) => plugin.enabled);
  }

  getPluginIds() {
    return Array.from(this.plugins.keys());
  }

  /**
   * 获取默认插件列表
   */
  getDefaultPlugins(): PluginConfig[] {
    return getDefaultPlugins();
  }

  /**
   * 获取第三方插件列表
   */
  getThirdPartyPlugins(): PluginConfig[] {
    return Array.from(this.plugins.values()).filter(plugin => {
      const defaultPlugin = getDefaultPluginById(plugin.id);
      return !defaultPlugin;
    });
  }


  /**
   * 检查插件是否为默认插件
   */
  isDefaultPlugin(pluginId: string): boolean {
    return getDefaultPluginById(pluginId) !== null;
  }

  /**
   * 执行插件项目
   */
  async executePluginItem(item: PluginItem): Promise<void> {
    try {
      console.log(`🚀 执行插件项目: ${item.name} (类型: ${item.executeType})`);

      switch (item.executeType) {
        case PluginExecuteType.OPEN_APP:
          // 默认打开软件
          await api.ipcRouter.appLaunchApp(item.path);
          break;

        case PluginExecuteType.SHOW_WEBPAGE:
          // 创建新窗口显示网页
          if (item.executeParams?.url) {
            // 直接通过主进程创建新窗口，传递pluginId信息
            await api.ipcRouter.windowCreateWebPageWindow(window.id!, item.executeParams.url, {
              title: item.name,
              name: item.name,
              pluginId: item.pluginId,
            });
          } else {
            console.error("❌ 网页URL未提供");
          }
          break;

        case PluginExecuteType.CUSTOM_CODE:
          // 执行自定义代码
          if (item.executeParams?.code) {
            await this.executeCustomCode(item.executeParams.code, item);
          } else {
            console.error("❌ 自定义代码未提供");
          }
          break;

        default:
          console.error(`❌ 未知的执行类型: ${item.executeType}`);
      }

      // 更新使用统计
      await this.updateUsageStats(item);
    } catch (error) {
      console.error(`❌ 执行插件项目失败: ${item.name}`, error);
    }
  }

  /**
   * 执行自定义代码
   */
  private async executeCustomCode(code: string, item: PluginItem): Promise<void> {
    try {
      // 创建安全的执行环境
      const context = {
        item,
        api,
        console: {
          log: (...args: any[]) => console.log(`[插件 ${item.pluginId}]`, ...args),
          error: (...args: any[]) => console.error(`[插件 ${item.pluginId}]`, ...args),
          warn: (...args: any[]) => console.warn(`[插件 ${item.pluginId}]`, ...args),
        },
      };

      // 使用 Function 构造函数创建安全的执行函数
      const executeFunction = new Function(
        "context",
        `
        with (context) {
          ${code}
        }
      `
      );

      await executeFunction(context);
    } catch (error) {
      console.error(`❌ 执行自定义代码失败: ${item.name}`, error);
      throw error;
    }
  }

  /**
   * 更新使用统计
   */
  private async updateUsageStats(item: PluginItem): Promise<void> {
    try {
      // 更新插件项目的使用统计
      const plugin = this.plugins.get(item.pluginId);
      if (plugin) {
        const pluginItem = plugin.items.find((i) => i.path === item.path);
        if (pluginItem) {
          pluginItem.lastUsed = Date.now();
          pluginItem.usageCount = (pluginItem.usageCount || 0) + 1;
          plugin.metadata = {
            createdAt: plugin.metadata?.createdAt || Date.now(),
            installedAt: plugin.metadata?.installedAt || Date.now(),
            updatedAt: Date.now(),
          };

          // 更新缓存中的插件
          this.plugins.set(item.pluginId, plugin);
        }
      }
    } catch (error) {
      console.error("❌ 更新使用统计失败:", error);
    }
  }

  /**
   * 验证插件配置
   */
  private validatePluginConfig(config: any): config is PluginConfig {
    return (
      config &&
      typeof config.id === "string" &&
      typeof config.name === "string" &&
      typeof config.version === "string" &&
      typeof config.enabled === "boolean" &&
      Array.isArray(config.items)
    );
  }
}

// 创建全局插件管理器实例
export const pluginManager = new PluginManagerImpl();
