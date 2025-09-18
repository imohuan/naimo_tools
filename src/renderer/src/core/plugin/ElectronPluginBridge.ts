import type { PluginConfig, PluginItem } from '@/typings/plugin-types'
import { BaseSingleton } from '../BaseSingleton'

/**
 * Electron插件桥接层
 * 处理与Electron主进程的插件相关通信
 */
export class ElectronPluginBridge extends BaseSingleton {
  constructor() {
    super()
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginPath: string): Promise<PluginConfig | null> {
    try {
      const plugin = await api.ipcRouter.pluginLoadPlugin(pluginPath)
      console.log(`🔌 加载插件: ${pluginPath} -> ${plugin ? '成功' : '失败'}`)
      return plugin
    } catch (error) {
      console.error('🔌 加载插件失败:', error)
      return null
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginUnloadPlugin(pluginId)
      console.log(`🔌 卸载插件: ${pluginId} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 卸载插件失败:', error)
      return false
    }
  }

  /**
   * 执行插件项目
   */
  async executePluginItem(item: PluginItem): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginExecutePluginItem(item)
      console.log(`🔌 执行插件项目: ${item.name} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 执行插件项目失败:', error)
      return false
    }
  }

  /**
   * 获取插件列表
   */
  async getPluginList(): Promise<PluginConfig[]> {
    try {
      const plugins = await api.ipcRouter.pluginGetPluginList()
      console.log(`🔌 获取插件列表: ${plugins.length} 个插件`)
      return plugins
    } catch (error) {
      console.error('🔌 获取插件列表失败:', error)
      return []
    }
  }

  /**
   * 安装插件
   */
  async installPlugin(pluginData: PluginConfig): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginInstallPlugin(pluginData)
      console.log(`🔌 安装插件: ${pluginData.name} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 安装插件失败:', error)
      return false
    }
  }

  /**
   * 从ZIP文件安装插件
   */
  async installPluginFromZip(zipPath: string): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginInstallPluginFromZipFile(zipPath)
      console.log(`🔌 从ZIP文件安装插件: ${zipPath} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 从ZIP文件安装插件失败:', error)
      return false
    }
  }

  /**
   * 获取插件配置
   */
  async getPluginConfig(pluginId: string): Promise<any> {
    try {
      const config = await api.ipcRouter.pluginGetPluginConfig(pluginId)
      return config
    } catch (error) {
      console.error('🔌 获取插件配置失败:', error)
      return null
    }
  }

  /**
   * 设置插件配置
   */
  async setPluginConfig(pluginId: string, config: any): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginSetPluginConfig(pluginId, config)
      console.log(`🔌 设置插件配置: ${pluginId} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 设置插件配置失败:', error)
      return false
    }
  }

  /**
   * 获取插件目录
   */
  async getPluginDirectory(): Promise<string> {
    try {
      const directory = await api.ipcRouter.pluginGetPluginDirectory()
      return directory
    } catch (error) {
      console.error('🔌 获取插件目录失败:', error)
      return ''
    }
  }

  /**
   * 检查插件更新
   */
  async checkPluginUpdates(): Promise<PluginConfig[]> {
    try {
      const updates = await api.ipcRouter.pluginCheckPluginUpdates()
      console.log(`🔌 检查插件更新: ${updates.length} 个更新`)
      return updates
    } catch (error) {
      console.error('🔌 检查插件更新失败:', error)
      return []
    }
  }

  /**
   * 更新插件
   */
  async updatePlugin(pluginId: string): Promise<boolean> {
    try {
      const success = await api.ipcRouter.pluginUpdatePlugin(pluginId)
      console.log(`🔌 更新插件: ${pluginId} -> ${success ? '成功' : '失败'}`)
      return success
    } catch (error) {
      console.error('🔌 更新插件失败:', error)
      return false
    }
  }

  /**
   * 获取插件桥接器状态
   */
  getStatus(): { isReady: boolean } {
    return { isReady: true }
  }
}

// 导出单例实例
export const electronPluginBridge = ElectronPluginBridge.getInstance()
