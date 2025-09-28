import type { PluginItem } from '@/typings/pluginTypes'
import type { PluginApi } from '@shared/typings/global'
import { pluginManager } from './PluginManager'
import { ElectronStoreBridge } from '../store/ElectronStoreBridge'
import { LifecycleType } from '@/typings/windowTypes'

/**
 * 插件 API 生成器
 * 统一生成插件执行时需要的 API 对象，避免在不同地方重复定义相同逻辑
 */
export class PluginApiGenerator {
  private static instance: PluginApiGenerator
  private storeBridge: ElectronStoreBridge

  private constructor() {
    this.storeBridge = ElectronStoreBridge.getInstance()
  }

  public static getInstance(): PluginApiGenerator {
    if (!PluginApiGenerator.instance) {
      PluginApiGenerator.instance = new PluginApiGenerator()
    }
    return PluginApiGenerator.instance
  }

  /**
   * 生成插件 API 对象
   * @param pluginItem 插件项目信息
   * @param options 额外选项
   * @returns 完整的插件 API 对象
   */
  async generateApi(
    pluginItem: PluginItem,
    options: {
      toggleInput?: (value?: boolean) => void
      openPluginWindow?: (item: PluginItem) => Promise<void>
      pluginStore?: {
        installZip: (zipPath: string) => Promise<boolean>
        install: (pluginData: any) => Promise<boolean>
        uninstall: (pluginId: string) => Promise<boolean>
        toggle: (pluginId: string, enabled: boolean) => Promise<boolean>
      }
      hotkeyEmit?: boolean
    } = {}
  ): Promise<PluginApi> {
    // 获取插件基础 API
    const pluginApi = await pluginManager.getPluginApi(pluginItem.pluginId as string)

    // 文件列表管理
    const addPathToFileList = async (name: string, path: string) => {
      await this.storeBridge.addListItem("fileList", {
        name: name,
        path: path,
        icon: null,
        lastUsed: Date.now(),
        usageCount: 1,
      }, {
        position: 'start',
        unique: true,
        uniqueField: 'path'
      })
    }

    // 创建网页窗口
    const openWebPageWindow = async (url: string, windowOptions: any = {}) => {
      // 获取当前视图信息
      const currentViewInfo = await naimo.router.windowGetCurrentViewInfo()
      if (!currentViewInfo) {
        console.warn('⚠️ 无法获取当前视图信息，跳过插件窗口创建')
        return
      }

      // 合并选项
      const finalOptions = {
        path: windowOptions.path || pluginItem.path,
        pluginId: pluginItem.pluginId,
        name: pluginItem.name,
        title: windowOptions.title || pluginItem.name,
        url,
        lifecycleType: windowOptions.lifecycleType || pluginItem.lifecycleType,
        preload: windowOptions.preload,
        hotkeyEmit: options.hotkeyEmit || false,
        ...windowOptions
      }

      // 直接创建插件视图
      const result = await naimo.router.windowCreatePluginView({
        path: finalOptions.path,
        title: finalOptions.name || '插件',
        url: url || '',
        lifecycleType: finalOptions.lifecycleType === LifecycleType.BACKGROUND ? 'background' : 'foreground',
        preload: finalOptions.preload || ''
      })

      if (result.success && options.openPluginWindow) {
        // 通知主应用打开插件窗口
        await options.openPluginWindow(pluginItem)
        console.log(`✅ 插件视图创建成功: ${result.viewId} (${pluginItem.name})`)
      }

      // await options.openPluginWindow!(pluginItem)
      return result
    }

    // 组装完整的 API 对象
    return {
      ...pluginApi,
      toggleInput: options.toggleInput || (() => { }),
      openPluginWindow: options.openPluginWindow ? () => options.openPluginWindow!(pluginItem) : () => Promise.resolve(),
      addPathToFileList,
      plugin: options.pluginStore || {
        installZip: () => Promise.resolve(false),
        install: () => Promise.resolve(false),
        uninstall: () => Promise.resolve(false),
        toggle: () => Promise.resolve(false),
      },
      openWebPageWindow
    }
  }

  /**
   * 为插件执行生成 API（简化版本，用于插件执行时）
   * @param pluginItem 插件项目信息
   * @param context 执行上下文
   * @returns 插件 API 对象
   */
  async generateExecutionApi(
    pluginItem: PluginItem,
    context: {
      files: any[]
      searchText: string
      toggleInput: (value?: boolean) => void
      openPluginWindow: (item: PluginItem) => Promise<void>
      pluginStore: {
        installZip: (zipPath: string) => Promise<boolean>
        install: (pluginData: any) => Promise<boolean>
        uninstall: (pluginId: string) => Promise<boolean>
        toggle: (pluginId: string, enabled: boolean) => Promise<boolean>
      }
      hotkeyEmit?: boolean
    }
  ): Promise<PluginApi> {
    return this.generateApi(pluginItem, {
      toggleInput: context.toggleInput,
      openPluginWindow: context.openPluginWindow,
      pluginStore: context.pluginStore,
      hotkeyEmit: context.hotkeyEmit
    })
  }
}

// 导出单例实例
export const pluginApiGenerator = PluginApiGenerator.getInstance()
