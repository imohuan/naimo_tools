/**
 * 分离处理器
 * 处理 Alt+D 快捷键和视图分离功能
 */

import { BaseSingleton } from '../BaseSingleton'
import type { DetachedWindowConfig } from '@/typings/windowTypes'
import { HotkeyManager } from '../hotkey/HotkeyManager'
import type { HotkeyConfig, HotkeyEventListener } from '@/typings/hotkeyTypes'
import { HotkeyType } from '@/typings/hotkeyTypes'
import { eventSystem } from '@/utils/eventSystem'

/** 分离事件接口 */
export interface DetachEvent {
  /** 视图ID */
  viewId: string
  /** 插件路径 */
  pluginPath?: string
  /** 插件名称 */
  pluginName?: string
  /** 时间戳 */
  timestamp: number
}

/** 分离结果接口 */
export interface DetachResult {
  /** 是否成功 */
  success: boolean
  /** 分离的窗口ID */
  detachedWindowId?: number
  /** 错误信息 */
  error?: string
}

/**
 * 分离处理器核心类
 * 处理视图分离的前端逻辑，不依赖Vue框架
 */
export class DetachHandler extends BaseSingleton {
  /** 是否已初始化 */
  private isInitialized = false

  /** 热键管理器实例 */
  private hotkeyManager = HotkeyManager.getInstance()

  /** Alt+D 快捷键配置 */
  private detachHotkeyConfig: HotkeyConfig = {
    id: 'view-detach',
    keys: 'alt+d',
    type: HotkeyType.APPLICATION,
    description: '分离当前视图到独立窗口',
    scope: 'all',
    enabled: true
  }

  /** 热键事件监听器 */
  private hotkeyEventListener: HotkeyEventListener = (event) => {
    if (event.detail.id === this.detachHotkeyConfig.id) {
      this.handleDetachHotkey()
    }
  }

  /** 当前活跃的插件视图信息 */
  private currentPluginView: {
    viewId?: string
    pluginPath?: string
    pluginName?: string
  } = {}

  constructor() {
    super()
  }

  /**
   * 初始化分离处理器
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // 注册 Alt+D 快捷键
      await this.registerDetachHotkey()

      // 设置事件监听器
      this.setupEventListeners()

      this.isInitialized = true
      console.log('✅ DetachHandler 初始化成功')
    } catch (error) {
      console.error('❌ DetachHandler 初始化失败:', error)
      throw error
    }
  }

  /**
   * 注册分离快捷键
   */
  private async registerDetachHotkey(): Promise<void> {
    try {
      // 使用热键管理器注册快捷键
      const success = await this.hotkeyManager.register(this.detachHotkeyConfig)
      if (success) {
        console.log('✅ Alt+D 分离快捷键注册成功')

        // 添加热键事件监听器
        this.hotkeyManager.addListener('app-hotkey-triggered', this.hotkeyEventListener)
      } else {
        console.warn('⚠️ Alt+D 分离快捷键注册失败')
      }
    } catch (error) {
      console.error('❌ 注册分离快捷键时发生错误:', error)
      throw error
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听插件视图更新事件
    eventSystem.on('plugin:view:active', (data) => {
      this.updateCurrentPluginView(data.viewId, data.pluginPath, data.pluginName)
    })

    // 监听插件视图关闭事件
    eventSystem.on('plugin:view:closed', (data) => {
      if (data.viewId === this.currentPluginView.viewId) {
        this.clearCurrentPluginView()
      }
    })

    // 监听来自主进程的视图分离事件
    naimo.event.onViewDetached((_event, data) => {
      console.log('📡 收到主进程分离事件:', data)
      this.handleDetachFromMainProcess(data)
    })

    // 监听分离窗口关闭事件
    naimo.event.onDetachedWindowClosed((_event, data) => {
      console.log('🪟 分离窗口已关闭:', data)
      this.handleDetachedWindowClosed(data)
    })
  }

  /**
   * 处理 Alt+D 快捷键触发
   */
  private async handleDetachHotkey(): Promise<void> {
    try {
      console.log('⌨️ Alt+D 快捷键被触发')

      // 检查是否有活跃的插件视图
      if (!this.currentPluginView.viewId) {
        console.warn('⚠️ 没有活跃的插件视图可以分离')
        this.showDetachNotification('没有可分离的插件视图', 'warning')
        return
      }

      // 执行分离操作
      const result = await this.detachCurrentView()

      if (result.success) {
        console.log('✅ 视图分离成功:', result.detachedWindowId)
        this.showDetachNotification('视图已成功分离到新窗口', 'success')
      } else {
        console.error('❌ 视图分离失败:', result.error)
        this.showDetachNotification(`分离失败: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('❌ 处理分离快捷键时发生错误:', error)
      this.showDetachNotification('分离操作发生错误', 'error')
    }
  }

  /**
   * 分离当前视图
   */
  private async detachCurrentView(): Promise<DetachResult> {
    if (!this.currentPluginView.viewId) {
      return {
        success: false,
        error: '没有活跃的视图可以分离'
      }
    }

    try {
      // 构建分离配置
      const detachConfig: DetachedWindowConfig = {
        title: this.currentPluginView.pluginName || '分离窗口',
        bounds: {
          x: 100,
          y: 100,
          width: 800,
          height: 600
        },
        sourceViewId: this.currentPluginView.viewId,
        showControlBar: true,
        metadata: {
          pluginPath: this.currentPluginView.pluginPath,
          name: this.currentPluginView.pluginName
        }
      }

      // 调用主进程的分离API
      const result = await naimo.router.windowDetachNewView(
        this.currentPluginView.viewId,
        detachConfig
      )

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 处理来自主进程的分离事件
   */
  private handleDetachFromMainProcess(data: {
    detachedViewId: string;
    sourceWindowId: number;
    detachedWindowId: number;
    timestamp: number;
    remainingViews: string[]
  }): void {
    // 这里可以处理主进程主动发起的分离事件
    // 例如，通过其他方式触发的分离操作
    console.log('📡 处理主进程分离事件:', data)
  }

  /**
   * 处理分离窗口关闭事件
   */
  private handleDetachedWindowClosed(data: { viewId: string; detachedWindowId: number; timestamp: number }): void {
    console.log('🪟 分离窗口关闭处理:', data)

    // 触发事件通知其他组件
    eventSystem.emit('window:detached:closed', {
      windowId: data.detachedWindowId,
      viewId: data.viewId,
      timestamp: data.timestamp
    })
  }

  /**
   * 更新当前插件视图信息
   */
  updateCurrentPluginView(viewId: string, pluginPath?: string, pluginName?: string): void {
    this.currentPluginView = {
      viewId,
      pluginPath,
      pluginName
    }
    console.log('🔄 当前插件视图已更新:', this.currentPluginView)
  }

  /**
   * 清除当前插件视图信息
   */
  clearCurrentPluginView(): void {
    this.currentPluginView = {}
    console.log('🧹 当前插件视图信息已清除')
  }

  /**
   * 显示分离通知
   */
  private showDetachNotification(message: string, type: 'success' | 'warning' | 'error'): void {
    // 触发通知事件，由UI组件处理显示
    eventSystem.emit('notification:show', {
      message,
      type,
      duration: 3000,
      source: 'detach-handler'
    })
  }

  /**
   * 手动分离指定视图
   */
  async detachView(viewId: string, config?: Partial<DetachedWindowConfig>): Promise<DetachResult> {
    try {
      // 获取视图信息
      const viewInfo = await this.getViewInfo(viewId)
      if (!viewInfo) {
        return {
          success: false,
          error: '视图信息未找到'
        }
      }

      // 构建分离配置
      const detachConfig: DetachedWindowConfig = {
        title: config?.title || viewInfo.pluginName || '分离窗口',
        bounds: config?.bounds || {
          x: 100,
          y: 100,
          width: 800,
          height: 600
        },
        sourceViewId: viewId,
        showControlBar: config?.showControlBar !== false,
        metadata: {
          pluginPath: viewInfo.pluginPath,
          name: viewInfo.pluginName,
          ...config?.metadata
        }
      }

      // 调用主进程的分离API
      const result = await naimo.router.windowDetachNewView(viewId, detachConfig)

      if (result.success) {
        console.log('✅ 手动分离视图成功:', viewId)
      } else {
        console.error('❌ 手动分离视图失败:', result.error)
      }

      return result
    } catch (error) {
      console.error('❌ 手动分离视图时发生错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取视图信息
   */
  private async getViewInfo(viewId: string): Promise<{
    pluginPath?: string
    pluginName?: string
  } | null> {
    try {
      // TODO: 从插件管理器获取视图状态
      // const { pluginManager } = await import('../plugin/PluginManager')
      // const viewStates = pluginManager.getPluginViewStates()
      // const viewState = viewStates.get(viewId)

      // if (viewState?.pluginItem) {
      //   return {
      //     pluginPath: viewState.pluginItem.path,
      //     pluginName: viewState.pluginItem.name
      //   }
      // }

      // 临时返回当前插件视图信息
      if (this.currentPluginView.viewId === viewId) {
        return {
          pluginPath: this.currentPluginView.pluginPath,
          pluginName: this.currentPluginView.pluginName
        }
      }

      return null
    } catch (error) {
      console.error('❌ 获取视图信息失败:', error)
      return null
    }
  }

  /**
   * 重新附加分离的窗口
   */
  async reattachWindow(detachedWindowId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await naimo.router.windowReattachNewView(detachedWindowId)

      if (result.success) {
        console.log('✅ 窗口重新附加成功:', detachedWindowId)
        this.showDetachNotification('窗口已重新附加到主窗口', 'success')
      } else {
        console.error('❌ 窗口重新附加失败:', result.error)
        this.showDetachNotification(`重新附加失败: ${result.error}`, 'error')
      }

      return result
    } catch (error) {
      console.error('❌ 重新附加窗口时发生错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 获取当前活跃的插件视图
   */
  getCurrentPluginView(): typeof this.currentPluginView {
    return { ...this.currentPluginView }
  }

  /**
   * 检查是否可以分离当前视图
   */
  canDetachCurrentView(): boolean {
    return !!this.currentPluginView.viewId
  }

  /**
   * 注销分离快捷键
   */
  async unregisterDetachHotkey(): Promise<void> {
    try {
      // 移除热键事件监听器
      this.hotkeyManager.removeListener('app-hotkey-triggered', this.hotkeyEventListener)

      // 注销快捷键
      await this.hotkeyManager.unregister(this.detachHotkeyConfig.id)
      console.log('✅ Alt+D 分离快捷键已注销')
    } catch (error) {
      console.error('❌ 注销分离快捷键失败:', error)
    }
  }

  /**
   * 销毁分离处理器
   */
  async destroy(): Promise<void> {
    if (this.isInitialized) {
      await this.unregisterDetachHotkey()
      this.clearCurrentPluginView()
      this.isInitialized = false
      console.log('🗑️ DetachHandler 已销毁')
    }
  }
}

// 导出单例实例
export const detachHandler = DetachHandler.getInstance()
