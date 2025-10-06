import type { PluginConfig } from '@/typings/pluginTypes'
import { BasePluginInstaller } from './base'
import { PluginSourceType, type InstallOptions, type UninstallOptions } from '@/temp_code/typings/plugin'

/**
 * 系统插件安装器
 * 处理内置默认插件
 */
export class SystemPluginInstaller extends BasePluginInstaller {
  readonly name = '系统插件'
  readonly type = PluginSourceType.SYSTEM
  readonly weight = 1
  readonly pluginType = 'system'

  /** 插件模块缓存 */
  private pluginModules = import.meta.glob('@/plugins/*.ts', { eager: true })
  /** 插件列表缓存 */
  private pluginsCache: PluginConfig[] | null = null

  /**
   * 获取所有默认插件
   * 动态从 base-plugins 目录加载所有插件
   */
  private getDefaultPlugins(): PluginConfig[] {
    // 使用缓存
    if (this.pluginsCache) {
      return this.pluginsCache
    }
    const plugins: PluginConfig[] = []

    console.log('🔍 [系统插件] 开始加载默认插件...')
    console.log('📋 找到的模块路径:', Object.keys(this.pluginModules))

    // 遍历所有导入的模块
    for (const path in this.pluginModules) {
      const module = this.pluginModules[path] as any
      console.log(`📦 处理模块: ${path}`)
      console.log('  - 模块内容:', Object.keys(module))

      // 处理单个插件导出的情况
      if (module.default && Array.isArray(module.default)) {
        // 如果模块有 default 导出且是数组，说明是多个插件的集合
        console.log(`  ✅ 找到 default 数组导出，插件数量: ${module.default.length}`)
        plugins.push(...module.default)
      } else if (module.default && typeof module.default === 'object' && module.default.id) {
        // 如果模块有 default 导出且是单个插件对象
        console.log(`  ✅ 找到 default 对象导出: ${module.default.id}`)
        plugins.push(module.default)
      } else {
        // 处理命名导出的情况，查找所有以 Plugin 结尾的导出
        let foundCount = 0
        for (const key in module) {
          if (key.endsWith('Plugin') && typeof module[key] === 'object' && module[key].id) {
            console.log(`  ✅ 找到命名导出: ${key} (id: ${module[key].id})`)
            plugins.push(module[key])
            foundCount++
          }
        }
        if (foundCount === 0) {
          console.warn(`  ⚠️ 未找到以Plugin结尾的导出`)
        }
      }
    }

    console.log('🔌 [系统插件] 动态加载的默认插件数量:', plugins.length)
    console.log('📊 插件列表:', plugins.map(p => ({ id: p.id, name: p.name })))

    // 缓存插件列表
    this.pluginsCache = plugins
    return plugins
  }

  /**
   * 根据ID获取默认插件
   */
  private getDefaultPluginById(pluginId: string): PluginConfig | null {
    const plugins = this.getDefaultPlugins()
    return plugins.find(plugin => plugin.id === pluginId) || null
  }

  /** 判断是否为系统插件 */
  canHandle(source: any): boolean {
    const id = typeof source === 'string' ? source : source?.id
    return id ? this.getDefaultPluginById(id) !== null : false
  }

  /** 获取所有系统插件列表 */
  async getList(): Promise<PluginConfig[]> {
    const plugins = this.getDefaultPlugins()
    // 为每个插件添加类型标记
    plugins.forEach(plugin => this.setPluginType(plugin))
    return plugins
  }

  /** 安装系统插件 id 或 插件配置 */
  async install(source: any, options?: InstallOptions): Promise<PluginConfig> {
    // 获取插件配置
    let pluginData: PluginConfig
    if (typeof source === 'string') {
      const found = this.getDefaultPluginById(source)
      if (!found) throw new Error(`系统插件不存在: ${source}`)
      pluginData = found
    } else {
      pluginData = source
    }

    console.log(`📦 [系统插件] 安装: ${pluginData.id}`)

    // 统一处理插件（自动添加类型标记）
    const plugin = await this.processPlugin(pluginData, options)

    console.log(`✅ [系统插件] 安装成功: ${plugin.id}`)
    return plugin
  }

  /** 卸载系统插件（只是禁用） */
  async uninstall(pluginId: string, _options?: UninstallOptions): Promise<boolean> {
    console.log(`🗑️ [系统插件] 卸载: ${pluginId}`)
    console.log(`✅ [系统插件] 卸载成功: ${pluginId}`)
    return true
  }
}
