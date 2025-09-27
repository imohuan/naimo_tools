import type { PluginConfig, PluginHook, PluginItem, CommandConfig } from '@/typings/plugin-types'
import type { CoreAPI } from '@/typings/core-types'
import { BaseSingleton } from '../BaseSingleton'
import { ElectronStoreBridge } from '../store/ElectronStoreBridge'
import type { AppConfig } from '@shared/types'
import { getDeafultPlugins, getDeafultPluginById } from '@/modules/plugins/config/default-plugins'
import { PluginGithub } from './PluginGithub'
import { isFunction } from '@shared/utils'
import type { ViewState, LifecycleType, LifecycleStrategy } from '@/typings/window-types'
import { ViewType } from '@/typings/window-types'

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
  /** 命令列表 */
  public commandList: Map<string, CommandConfig> = new Map()

  /** 插件视图状态管理 */
  private pluginViewStates: Map<string, ViewState> = new Map()

  /** 后台运行的插件集合 */
  private backgroundPlugins: Set<string> = new Set()

  /** 生命周期管理器是否已初始化 */
  private lifecycleInitialized = false

  github: PluginGithub
  githubPlugins: PluginConfig[] = []


  constructor() {
    super()
    this.storeBridge = ElectronStoreBridge.getInstance()
    this.github = PluginGithub.getInstance()
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
    await this.updatePluginList()
    await this.loadInstalledPlugins()
    await this.initializeLifecycleManagement()
  }

  /**
   * 初始化生命周期管理
   */
  private async initializeLifecycleManagement(): Promise<void> {
    if (this.lifecycleInitialized) return

    try {
      // 初始化新窗口管理器
      const initResult = await naimo.router.windowInitializeNewWindowManager()
      if (!initResult.success) {
        console.warn('⚠️ NewWindowManager 初始化失败，插件生命周期管理将使用降级模式:', initResult.error)
        return
      }

      // 监听插件视图事件
      this.setupViewEventListeners()

      this.lifecycleInitialized = true
      console.log('✅ 插件生命周期管理初始化成功')
    } catch (error) {
      console.error('❌ 插件生命周期管理初始化失败:', error)
    }
  }

  /**
   * 设置视图事件监听器
   */
  private setupViewEventListeners(): void {
    try {
      // 监听全局快捷键触发事件
      window.addEventListener('global-hotkey-trigger', (event: any) => {
        const { hotkeyId } = event.detail
        if (hotkeyId === 'plugin-lifecycle-cleanup') {
          this.cleanupBackgroundViews()
        }
      })

      // 检查naimo对象是否可用
      if (window.naimo?.ipcRenderer?.on) {
        // 监听插件视图打开事件
        naimo.ipcRenderer.on('plugin-view-opened', (data: any) => {
          this.handlePluginViewOpened(data)
        })

        // 监听插件视图关闭事件
        naimo.ipcRenderer.on('plugin-view-closed', (data: any) => {
          this.handlePluginViewClosed(data)
        })
      } else {
        console.warn('⚠️ naimo.ipcRenderer 不可用，跳过插件视图事件监听器设置')
      }
    } catch (error) {
      console.error('❌ 设置视图事件监听器失败:', error)
    }
  }

  async updatePluginList(): Promise<void> {
    this.allAvailablePlugins = await this.getPluginList()
    this.githubPlugins.forEach(plugin => {
      this.allAvailablePlugins.set(plugin.id, plugin)
    })
  }

  async loadAsyncPluginList(init = false): Promise<void> {
    await this.github.loadMore()
    const githubPlugins = this.github.result
    const githubPluginsConfig: PluginConfig[] = githubPlugins.items.map(item => item.config).filter(Boolean) as PluginConfig[]
    this.githubPlugins = githubPluginsConfig

    if (init) {
      this.githubPlugins.forEach(plugin => {
        // 避免已经下载到本地的插件重复添加
        if (this.allAvailablePlugins.has(plugin.id)) return
        this.allAvailablePlugins.set(plugin.id, plugin)
      })
    }
  }

  /** 获取插件列表 */
  async getPluginList(): Promise<Map<string, PluginConfig>> {
    const defaultPlugins = getDeafultPlugins()
    const thirdPartyPlugins = await naimo.router.pluginGetAllInstalledPlugins()
    const thirdPartyPluginsConfig: PluginConfig[] = await Promise.all(thirdPartyPlugins.map(plugin => naimo.webUtils.loadPluginConfig(plugin.configPath)))
    thirdPartyPluginsConfig.forEach(plugin => {
      // 标记为第三方插件
      if (plugin) plugin.options = { ...(plugin?.options || {}), isThirdParty: true, }
    })

    // const localPlugins = await naimo.webUtils.loadPluginConfig(join(app.getPath('userData'), 'plugins'))
    console.log("📋 默认插件数量:", defaultPlugins.length);
    console.log("📋 第三方插件数量:", thirdPartyPlugins.length);
    const allPlugins = [...defaultPlugins, ...thirdPartyPluginsConfig]
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
          await this.preInstall(plugin, true)
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

      const getResourcePath = (pluginData as any)?.getResourcePath

      if (getResourcePath) {
        if (pluginData.icon) pluginData.icon = getResourcePath(pluginData.icon)
      }

      // 设置插件ID
      pluginData.items.forEach(item => {
        item.pluginId = pluginData.id
        item.path = item.pluginId + ':' + item.path
        if (getResourcePath) {
          if (item.icon) item.icon = getResourcePath(item.icon)
        }
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

  async preInstall(pluginData: PluginConfig, focus = false): Promise<boolean> {
    const hasItems = pluginData?.items && pluginData.items?.length > 0
    const firstItemHasOnEnter = hasItems && pluginData.items?.[0]?.onEnter && typeof pluginData.items?.[0]?.onEnter === 'function'
    if (!firstItemHasOnEnter || !hasItems) {
      // 需要加载插件配置文件 x.js
      if (!pluginData?.main) {
        throw new Error(`❌ 插件主文件不存在: ${pluginData.id}`);
      }

      const getResourcePath = (pluginData as any)?.getResourcePath
      pluginData.main = getResourcePath ? getResourcePath(pluginData.main) : pluginData.main

      // 设置github插件的getResourcePath, 否则在updatePluginList更新的时候, 会丢失getResourcePath属性, 导致最后getPluginApi获取不到getResourcePath
      const githubPlugin: any = this.githubPlugins.find(p => p.id === pluginData.id)
      if (githubPlugin) githubPlugin.getResourcePath = getResourcePath

      let items: PluginItem[] = []
      // 加载配置文件
      const module: any = await naimo.webUtils.loadPluginConfig(pluginData.main as string)
      if (module?.items && module?.items?.length > 0) {
        items = module.items
      } else if (Array.isArray(module)) {
        items = module
      } else if (module && typeof module === 'object') {
        Object.keys(module).forEach(key => {
          if (isFunction(module[key])) return
          items.push({ ...module[key], path: key })
        })
      }

      pluginData.items = items
    }
    return this.install(pluginData, focus)
  }

  async installUrl(url: string): Promise<boolean> {
    const downloadId = await naimo.download.startDownload({ url })

    // 等待下载完成
    return new Promise((resolve, reject) => {
      let completedUnsubscribe: (() => void) | null = null
      let errorUnsubscribe: (() => void) | null = null
      let cancelledUnsubscribe: (() => void) | null = null

      // 清理所有监听器的函数
      const cleanup = () => {
        completedUnsubscribe?.()
        errorUnsubscribe?.()
        cancelledUnsubscribe?.()
      }

      // 监听下载完成事件
      completedUnsubscribe = naimo.download.onDownloadCompleted((data) => {
        if (data.id === downloadId) {
          cleanup() // 清理监听器
          // 下载完成，获取文件路径并安装
          this.installZip(data.filePath)
            .then(result => resolve(result))
            .catch(error => reject(error)).finally(() => {
              // 删除下载文件
              naimo.download.deleteDownload(downloadId, true)
            })
        }
      })

      // 监听下载错误事件
      errorUnsubscribe = naimo.download.onDownloadError((data) => {
        if (data.id === downloadId) {
          cleanup() // 清理监听器
          console.error(`❌ 插件下载失败: ${data.error}`)
          reject(new Error(data.error))
        }
      })

      // 监听下载取消事件
      cancelledUnsubscribe = naimo.download.onDownloadCancelled((data) => {
        if (data.id === downloadId) {
          cleanup() // 清理监听器
          console.warn(`⚠️ 插件下载已取消`)
          reject(new Error('下载已取消'))
        }
      })
    })
  }

  /** 从ZIP文件安装插件 */
  async installZip(zipPath: string): Promise<boolean> {
    const zipConfig = await naimo.router.pluginInstallPluginFromZip(zipPath);
    if (!zipConfig) {
      console.error(`❌ 安装插件失败: ${zipPath}`);
      return false;
    }

    // 使用 naimo.webUtils.requirePluginConfig 直接加载插件配置（支持函数）
    const config = await naimo.webUtils.loadPluginConfig(zipConfig.configPath);
    if (!config) {
      console.error(`❌ 读取插件配置失败: ${zipConfig.configPath}`);
      return false;
    }

    if (!config?.options) config.options = {}
    config.options.isThirdParty = true

    const result = await this.preInstall(config, true);
    await this.updatePluginList();
    return result;
  }

  /** 卸载插件 */
  async uninstall(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️ 开始卸载插件: ${pluginId}`);
      // 检查是否是默认插件
      const isDefaultPlugin = getDeafultPluginById(pluginId) !== null;
      const plugin = this.installedPlugins.get(pluginId);

      if (!plugin) {
        console.warn(`⚠️ 插件未安装: ${pluginId}`);
        return false;
      }

      // 对于第三方插件，需要删除文件
      if (!isDefaultPlugin || (plugin && plugin.options?.isThirdParty)) {
        const success = await naimo.router.pluginUninstallPlugin(pluginId);
        if (!success) {
          console.error(`❌ 删除插件文件失败: ${pluginId}`);
          return false;
        } else {
          await this.updatePluginList();
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

  async emitCommand(name: string, ...args: any[]): Promise<any> {
    const command = this.commandList.get(name);
    if (command) return await command.handler(...args);
    return null;
  }


  /**
   * 获取指定插件的设置值
   * @param pluginId 插件ID
   * @returns 插件的设置值对象，如果插件不存在或没有设置则返回空对象
   */
  async getPluginSettingValue(pluginId: string): Promise<Record<string, any>> {
    try {
      // 检查插件是否存在
      if (!this.installedPlugins.has(pluginId)) {
        console.warn(`⚠️ 插件未安装: ${pluginId}`)
        return {}
      }

      // 从存储中获取所有插件设置
      const allPluginSettings = await this.storeBridge.get('pluginSettings') as Record<string, Record<string, any>> || {}

      // 返回指定插件的设置，如果没有则返回空对象
      return allPluginSettings[pluginId] || {}
    } catch (error) {
      console.error(`获取插件设置失败 (${pluginId}):`, error)
      return {}
    }
  }

  /**
   * 设置指定插件的设置值
   * @param pluginId 插件ID
   * @param settings 设置值对象
   * @returns 是否设置成功
   */
  async setPluginSettingValue(pluginId: string, settings: Record<string, any>): Promise<boolean> {
    try {
      // 检查插件是否存在
      if (!this.installedPlugins.has(pluginId)) {
        console.warn(`⚠️ 插件未安装: ${pluginId}`)
        return false
      }

      // 获取当前所有插件设置
      const allPluginSettings = await this.storeBridge.get('pluginSettings') as Record<string, Record<string, any>> || {}

      // 更新指定插件的设置
      allPluginSettings[pluginId] = { ...allPluginSettings[pluginId], ...settings }

      // 保存到存储
      const success = await this.storeBridge.set('pluginSettings', allPluginSettings)

      if (success) {
        console.log(`✅ 插件设置保存成功: ${pluginId}`)
      } else {
        console.error(`❌ 插件设置保存失败: ${pluginId}`)
      }

      return success
    } catch (error) {
      console.error(`设置插件配置失败 (${pluginId}):`, error)
      return false
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
      getResourcePath: (...paths: string[]) => {
        const getResourcePath = (plugin as any).getResourcePath
        return getResourcePath ? getResourcePath(...paths) : paths.join('/');
      },
      getSettingValue: async (settingName?: string) => {
        const settingValue = await this.getPluginSettingValue(pluginId)
        return settingName ? settingValue[settingName] || null : settingValue
      },
      setSettingValue: async (settingName: string, value: any) => {
        return await this.setPluginSettingValue(pluginId, { [settingName]: value })
      },
      onCommand: (event: string, description: string, handler: PluginHook) => {
        const commandName = `${event}__${pluginId}`;
        this.commandList.set(commandName, { name: commandName, handler, description })
      },
      emitCommand: (event: string, ...args: any[]) => {
        this.emitCommand(event, ...args)
      },
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
    return "pluginId" in app
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
      icon: app.icon,
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

  /**
   * 创建插件视图
   */
  async createPluginView(pluginItem: PluginItem): Promise<{ success: boolean; viewId?: string; error?: string }> {
    try {
      if (!this.lifecycleInitialized) {
        console.warn('⚠️ 生命周期管理未初始化，使用传统窗口创建方式')
        return { success: false, error: '生命周期管理未初始化' }
      }

      // 检查是否已有该插件的视图
      const existingViewId = this.getPluginViewId(pluginItem.path)
      if (existingViewId) {
        // 如果已存在，切换到该视图
        const switchResult = await naimo.router.windowSwitchToNewView(existingViewId)
        if (switchResult.success) {
          console.log(`🔄 切换到已存在的插件视图: ${existingViewId}`)
          return { success: true, viewId: existingViewId }
        }
      }

      // 确定生命周期策略
      const lifecycleType = this.getPluginLifecycleType(pluginItem)

      // 创建新的插件视图
      const result = await naimo.router.windowCreatePluginView({
        path: pluginItem.path,
        pluginId: pluginItem.pluginId,
        name: pluginItem.name,
        url: pluginItem.executeParams?.url,
        closeAction: pluginItem.closeAction || 'close'
      })

      if (result.success && result.viewId) {
        // 创建视图状态
        const viewState: ViewState = {
          id: result.viewId,
          type: ViewType.PLUGIN,
          isActive: true,
          isVisible: true,
          isDetached: false,
          lastAccessTime: Date.now(),
          lifecycle: {
            type: lifecycleType,
            persistOnClose: lifecycleType === 'background',
            maxIdleTime: 5 * 60 * 1000, // 5分钟
            memoryThreshold: 100 // 100MB
          } as LifecycleStrategy,
          pluginItem
        }

        this.pluginViewStates.set(result.viewId, viewState)

        if (lifecycleType === 'background') {
          this.backgroundPlugins.add(pluginItem.path)
        }

        console.log(`✅ 插件视图创建成功: ${result.viewId} (${pluginItem.name})`)
        return { success: true, viewId: result.viewId }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ 创建插件视图失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 关闭插件视图
   */
  async closePluginView(viewId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const viewState = this.pluginViewStates.get(viewId)
      if (!viewState) {
        return { success: false, error: '视图状态未找到' }
      }

      // 根据生命周期策略处理关闭
      if (viewState.lifecycle.type === 'background' && viewState.lifecycle.persistOnClose) {
        // 后台模式：隐藏视图但保持运行
        const result = await naimo.router.windowHideNewView(viewId)
        if (result.success) {
          viewState.isVisible = false
          viewState.lastAccessTime = Date.now()
          console.log(`🔄 插件视图已隐藏到后台: ${viewId}`)
          return { success: true }
        } else {
          return { success: false, error: result.error }
        }
      } else {
        // 前台模式：完全移除视图
        const result = await naimo.router.windowRemoveNewView(viewId)
        if (result.success) {
          this.pluginViewStates.delete(viewId)
          if (viewState.pluginItem) {
            this.backgroundPlugins.delete(viewState.pluginItem.path)
          }
          console.log(`❌ 插件视图已移除: ${viewId}`)
          return { success: true }
        } else {
          return { success: false, error: result.error }
        }
      }
    } catch (error) {
      console.error('❌ 关闭插件视图失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取插件生命周期类型
   */
  private getPluginLifecycleType(pluginItem: PluginItem): LifecycleType {
    // 优先使用插件项目的 closeAction 配置
    if (pluginItem.closeAction === 'hide') {
      return 'background'
    }
    // 默认为前台模式
    return 'foreground'
  }

  /**
   * 获取插件的视图ID
   */
  private getPluginViewId(pluginPath: string): string | null {
    for (const [viewId, viewState] of this.pluginViewStates) {
      if (viewState.pluginItem?.path === pluginPath) {
        return viewId
      }
    }
    return null
  }

  /**
   * 处理插件视图打开事件
   */
  private handlePluginViewOpened(data: { viewId: string; path: string; pluginId?: string }): void {
    console.log(`📱 插件视图已打开: ${data.viewId} (${data.path})`)

    const viewState = this.pluginViewStates.get(data.viewId)
    if (viewState) {
      viewState.isVisible = true
      viewState.isActive = true
      viewState.lastAccessTime = Date.now()
    }
  }

  /**
   * 处理插件视图关闭事件
   */
  private handlePluginViewClosed(data: { viewId: string }): void {
    console.log(`📱 插件视图已关闭: ${data.viewId}`)

    const viewState = this.pluginViewStates.get(data.viewId)
    if (viewState) {
      if (viewState.lifecycle.type === 'background' && viewState.lifecycle.persistOnClose) {
        // 后台模式：标记为不可见但保留状态
        viewState.isVisible = false
        viewState.isActive = false
        viewState.lastAccessTime = Date.now()
      } else {
        // 前台模式：完全移除状态
        this.pluginViewStates.delete(data.viewId)
        if (viewState.pluginItem) {
          this.backgroundPlugins.delete(viewState.pluginItem.path)
        }
      }
    }
  }

  /**
   * 清理后台视图
   */
  async cleanupBackgroundViews(): Promise<{ recycledCount: number; error?: string }> {
    try {
      const now = Date.now()
      const recycledViews: string[] = []

      for (const [viewId, viewState] of this.pluginViewStates) {
        if (viewState.lifecycle.type === 'background' && !viewState.isActive) {
          const idleTime = now - viewState.lastAccessTime

          // 检查是否超过最大空闲时间
          if (viewState.lifecycle.maxIdleTime && idleTime > viewState.lifecycle.maxIdleTime) {
            const result = await naimo.router.windowRemoveNewView(viewId)
            if (result.success) {
              this.pluginViewStates.delete(viewId)
              if (viewState.pluginItem) {
                this.backgroundPlugins.delete(viewState.pluginItem.path)
              }
              recycledViews.push(viewId)
              console.log(`🗑️ 回收空闲插件视图: ${viewId}`)
            }
          }
        }
      }

      console.log(`🧹 后台视图清理完成，回收了 ${recycledViews.length} 个视图`)
      return { recycledCount: recycledViews.length }
    } catch (error) {
      console.error('❌ 清理后台视图失败:', error)
      return {
        recycledCount: 0,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取所有插件视图状态
   */
  getPluginViewStates(): Map<string, ViewState> {
    return new Map(this.pluginViewStates)
  }

  /**
   * 获取后台运行的插件列表
   */
  getBackgroundPlugins(): Set<string> {
    return new Set(this.backgroundPlugins)
  }

  /**
   * 切换插件的生命周期模式
   */
  async switchPluginLifecycleMode(pluginPath: string, lifecycleType: LifecycleType): Promise<boolean> {
    try {
      const viewId = this.getPluginViewId(pluginPath)
      if (!viewId) {
        console.warn(`⚠️ 插件视图未找到: ${pluginPath}`)
        return false
      }

      const viewState = this.pluginViewStates.get(viewId)
      if (!viewState) {
        return false
      }

      // 更新生命周期策略
      viewState.lifecycle.type = lifecycleType
      viewState.lifecycle.persistOnClose = lifecycleType === 'background'

      // 更新后台插件集合
      if (lifecycleType === 'background') {
        this.backgroundPlugins.add(pluginPath)
      } else {
        this.backgroundPlugins.delete(pluginPath)
      }

      console.log(`🔄 插件生命周期模式已切换: ${pluginPath} -> ${lifecycleType}`)
      return true
    } catch (error) {
      console.error('❌ 切换插件生命周期模式失败:', error)
      return false
    }
  }

  reset(): void {
    this.hooks.clear();
    this.installedPlugins.clear();
    this.allAvailablePlugins.clear();
    this.pluginViewStates.clear();
    this.backgroundPlugins.clear();
    this.lifecycleInitialized = false;
  }
}

// 导出单例实例
export const pluginManager = PluginManager.getInstance()
