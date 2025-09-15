import type { PluginConfig, PluginManager, PluginItem } from "@/typings/plugin-types";
import { PluginExecuteType } from "@/typings/plugin-types";

/**
 * 插件管理器实现
 */
export class PluginManagerImpl implements PluginManager {
  private plugins: Map<string, PluginConfig> = new Map();
  private storageKey = "naimo_plugins";

  /**
   * 获取本地存储的插件数据
   */
  private getStoredPlugins(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("❌ 读取插件存储数据失败:", error);
      return {};
    }
  }

  /**
   * 保存插件数据到本地存储
   */
  private saveStoredPlugins(data: Record<string, any>): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("❌ 保存插件存储数据失败:", error);
    }
  }

  /**
   * 加载所有插件
   */
  async loadAllPlugins(): Promise<PluginConfig[]> {
    console.log("🔌 开始加载所有插件...");

    try {
      // 从本地存储获取插件数据
      const storedData = this.getStoredPlugins();
      const installedPlugins = storedData.installedPlugins || [];
      console.log("📦 已安装的插件:", installedPlugins);

      const loadedPlugins: PluginConfig[] = [];

      // 并行加载所有插件
      const loadPromises = installedPlugins.map(async (pluginId: string) => {
        try {
          const plugin = await this.loadPlugin(pluginId);
          if (plugin) {
            loadedPlugins.push(plugin);
          }
        } catch (error) {
          console.error(`❌ 加载插件失败: ${pluginId}`, error);
        }
      });

      await Promise.all(loadPromises);

      console.log(
        "✅ 插件加载完成:",
        loadedPlugins.map((p) => ({ id: p.id, name: p.name, itemsCount: p.items.length }))
      );
      return loadedPlugins;
    } catch (error) {
      console.error("❌ 加载插件时发生错误:", error);
      return [];
    }
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(pluginId: string): Promise<PluginConfig | null> {
    try {
      // 从本地存储获取插件配置
      const storedData = this.getStoredPlugins();
      const pluginConfig = storedData[`plugin_${pluginId}`];
      if (!pluginConfig) {
        console.warn(`⚠️ 插件配置不存在: ${pluginId}`);
        return null;
      }

      // 验证插件配置
      if (!this.validatePluginConfig(pluginConfig)) {
        console.error(`❌ 插件配置无效: ${pluginId}`);
        return null;
      }

      // 缓存插件
      this.plugins.set(pluginId, pluginConfig);
      console.log(`✅ 插件加载成功: ${pluginId}`);
      return pluginConfig;
    } catch (error) {
      console.error(`❌ 加载插件失败: ${pluginId}`, error);
      return null;
    }
  }

  /**
   * 安装插件
   */
  async installPlugin(pluginConfig: PluginConfig): Promise<boolean> {
    try {
      console.log(`📦 开始安装插件: ${pluginConfig.id}`);

      // 验证插件配置
      if (!this.validatePluginConfig(pluginConfig)) {
        console.error(`❌ 插件配置无效`);
        return false;
      }

      // 设置安装时间
      pluginConfig.metadata = {
        createdAt: pluginConfig.metadata?.createdAt || Date.now(),
        installedAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 获取当前存储数据
      const storedData = this.getStoredPlugins();

      // 保存插件配置
      storedData[`plugin_${pluginConfig.id}`] = pluginConfig;

      // 更新已安装插件列表
      const installedPlugins = storedData.installedPlugins || [];
      if (!installedPlugins.includes(pluginConfig.id)) {
        installedPlugins.push(pluginConfig.id);
        storedData.installedPlugins = installedPlugins;
      }

      // 保存到本地存储
      this.saveStoredPlugins(storedData);

      // 缓存插件
      this.plugins.set(pluginConfig.id, pluginConfig);

      console.log(`✅ 插件安装成功: ${pluginConfig.id}`);
      return true;
    } catch (error) {
      console.error(`❌ 安装插件失败: ${pluginConfig.id}`, error);
      return false;
    }
  }

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 开始卸载插件: ${pluginId}`);

      // 获取当前存储数据
      const storedData = this.getStoredPlugins();

      // 从存储中删除插件配置
      delete storedData[`plugin_${pluginId}`];

      // 从已安装插件列表中移除
      const installedPlugins = storedData.installedPlugins || [];
      const updatedPlugins = installedPlugins.filter((id: string) => id !== pluginId);
      storedData.installedPlugins = updatedPlugins;

      // 保存到本地存储
      this.saveStoredPlugins(storedData);

      // 从缓存中移除
      this.plugins.delete(pluginId);

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

      // 获取当前存储数据并更新
      const storedData = this.getStoredPlugins();
      storedData[`plugin_${pluginId}`] = plugin;
      this.saveStoredPlugins(storedData);

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

          // 保存更新到本地存储
          const storedData = this.getStoredPlugins();
          storedData[`plugin_${item.pluginId}`] = plugin;
          this.saveStoredPlugins(storedData);
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
