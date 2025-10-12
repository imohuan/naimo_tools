/**
 * 调试服务 - 提供系统性能监控和调试信息
 * 在右下角显示一个可展开的调试面板，监控窗口状态、生命周期、性能等信息
 */

import { BrowserWindow, screen, app } from 'electron'
import log from 'electron-log'
import { resolve } from 'path'
import type { Service } from '../core/ServiceContainer'
import type { NewWindowManager } from '../window/NewWindowManager'
import { getDirname } from '@main/utils'
import { readFileSync } from 'fs'
import { OPEN_DEVTOOLS } from '@shared/constants'

/**
 * 调试服务配置
 */
export interface DebugServiceConfig {
  /** 是否启用调试窗口 */
  enabled?: boolean
  /** 更新间隔（毫秒） */
  updateInterval?: number
  /** 窗口位置偏移 */
  position?: {
    offsetX?: number
    offsetY?: number
  }
}

/**
 * 调试信息数据结构
 */
export interface DebugInfo {
  /** 时间戳 */
  timestamp: number
  /** 性能指标 */
  performance: {
    memoryUsage: number
    cpuUsage: number
    activeViewCount: number
    switchTime: number
  }
  /** 窗口信息 */
  windows: Array<{
    id: number
    type: string
    bounds: { x: number; y: number; width: number; height: number }
    isVisible: boolean
    isFocused: boolean
    memoryUsage: number // 内存使用量 (MB)，对于 BaseWindow 是 0（容器）
    viewIds?: string[] // BaseWindow 包含的 view ID 列表
  }>
  /** 视图信息 */
  views: Array<{
    id: string
    type: string
    category: string
    lifecycleType: string
    isPaused: boolean
    memoryUsage: number
    lastAccessTime: number
  }>
  /** 生命周期统计 */
  lifecycle: {
    totalViews: number
    activeViews: number
    pausedViews: number
    totalMemoryUsage: number
    averageMemoryPerView: number
  }
  /** 系统信息 */
  system: {
    platform: string
    electronVersion: string
    nodeVersion: string
    chromeVersion: string
    appVersion: string
    uptime: number
  }
  /** 其他进程（主进程、GPU、Worker等） */
  otherProcesses: Array<{
    type: string
    pid: number
    memoryUsage: number
  }>
}

/**
 * 调试服务类
 */
export class DebugService implements Service {
  private config: DebugServiceConfig
  private debugWindow: BrowserWindow | null = null
  private windowManager: NewWindowManager | null = null
  private updateTimer?: NodeJS.Timeout
  private isExpanded: boolean = false

  constructor(config: DebugServiceConfig = {}) {
    this.config = {
      enabled: true, // 默认启用调试窗口
      updateInterval: 1000, // 每秒更新一次
      position: {
        offsetX: 20,
        offsetY: 20
      },
      ...config
    }
  }

  /**
   * 初始化调试服务
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      log.info('调试服务已禁用')
      return
    }
    log.info('初始化调试服务...')
  }


  /**
   * 设置窗口管理器引用
   */
  setWindowManager(windowManager: NewWindowManager): void {
    this.windowManager = windowManager
    log.info('调试服务：已设置窗口管理器引用', {
      hasWindowManager: !!windowManager,
      hasLifecycleManager: !!(windowManager as any)?.lifecycleManager
    })

    // 立即发送一次调试信息
    setTimeout(() => {
      this.sendDebugInfo()
    }, 1000)
  }

  /**
   * 创建调试窗口
   */
  private async createDebugWindow(): Promise<void> {
    try {
      if (this.debugWindow && !this.debugWindow.isDestroyed()) {
        log.info('调试窗口已存在')
        return
      }

      log.info('创建调试窗口')

      // 获取屏幕尺寸
      const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

      // 计算位置（右下角）
      const windowWidth = 80 // 未展开时的宽度
      const windowHeight = 80 // 未展开时的高度

      // 确保位置在屏幕内
      let x = screenWidth - windowWidth - (this.config.position?.offsetX || 20)
      let y = screenHeight - windowHeight - (this.config.position?.offsetY || 20)

      // 边界检查
      if (x < 0) x = 0
      if (y < 0) y = 0
      if (x + windowWidth > screenWidth) x = screenWidth - windowWidth
      if (y + windowHeight > screenHeight) y = screenHeight - windowHeight

      log.info(`调试窗口位置: x=${x}, y=${y}, 窗口尺寸: ${windowWidth}x${windowHeight}, 屏幕尺寸: ${screenWidth}x${screenHeight}`)

      // 创建窗口
      this.debugWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x,
        y,
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        focusable: true, // 改为 true，允许交互
        hasShadow: false,
        backgroundColor: '#00000000', // 完全透明背景
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          webSecurity: true,
          preload: resolve(getDirname(import.meta.url), './preloads/basic.js')
        }
      })

      // 加载页面
      if (process.env.NODE_ENV === 'development') {
        const devConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')).config?.dev || {}
        const port = devConfig.rendererPort || 5173
        const host = devConfig.rendererHost || 'localhost'
        const url = `http://${host}:${port}/src/pages/debug-window/`
        log.debug(`加载调试窗口页面: ${url}`)
        await this.debugWindow.loadURL(url)
      } else {
        const debugWindowPath = resolve(getDirname(import.meta.url), '../renderer/debug-window.html')
        log.debug(`加载调试窗口页面: ${debugWindowPath}`)
        await this.debugWindow.loadFile(debugWindowPath)
      }

      // 显示窗口
      this.debugWindow.once('ready-to-show', () => {
        if (this.debugWindow && !this.debugWindow.isDestroyed()) {
          const bounds = this.debugWindow.getBounds()
          log.info(`调试窗口准备显示，当前位置: x=${bounds.x}, y=${bounds.y}, size=${bounds.width}x${bounds.height}`)

          this.debugWindow.show()
          log.info('调试窗口已显示')

          // 发送初始数据和状态
          this.sendDebugInfo()
          // 同步展开状态
          this.debugWindow.webContents.send('debug:toggle-expanded', this.isExpanded)
        }
      })

      // 设置窗口忽略鼠标事件（点击穿透）
      this.debugWindow.setIgnoreMouseEvents(false)

      // 监听窗口关闭
      this.debugWindow.on('closed', () => {
        log.info('调试窗口已关闭')
        this.debugWindow = null
      })

      // 打开开发者工具（开发环境）
      if (process.env.NODE_ENV === 'development') {
        this.debugWindow.webContents.openDevTools({ mode: 'detach' })
      }

      log.info(`调试窗口创建成功，ID: ${this.debugWindow.id}`)
    } catch (error) {
      log.error('创建调试窗口失败:', error)
      throw error
    }
  }

  /**
   * 切换展开/折叠状态
   */
  toggleExpanded(): void {
    if (!this.debugWindow || this.debugWindow.isDestroyed()) {
      return
    }

    this.isExpanded = !this.isExpanded

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    const currentBounds = this.debugWindow.getBounds()

    if (this.isExpanded) {
      // 展开
      const expandedWidth = 400
      const expandedHeight = 600

      // 计算理想位置（从右下角往左上扩展）
      let x = currentBounds.x + currentBounds.width - expandedWidth
      let y = currentBounds.y + currentBounds.height - expandedHeight

      // 边界检查：确保窗口不会超出屏幕左边和上边
      if (x < 0) {
        x = 0
      }
      if (y < 0) {
        y = 0
      }

      // 边界检查：确保窗口不会超出屏幕右边和下边
      if (x + expandedWidth > screenWidth) {
        x = screenWidth - expandedWidth
      }
      if (y + expandedHeight > screenHeight) {
        y = screenHeight - expandedHeight
      }

      this.debugWindow.setBounds({
        x,
        y,
        width: expandedWidth,
        height: expandedHeight
      }, true) // 添加 animate 参数
    } else {
      // 折叠
      const collapsedWidth = 80
      const collapsedHeight = 80

      // 计算理想位置（保持当前右下角位置不变）
      let x = currentBounds.x + currentBounds.width - collapsedWidth
      let y = currentBounds.y + currentBounds.height - collapsedHeight

      // 边界检查：确保窗口不会超出屏幕
      if (x < 0) {
        x = 0
      }
      if (y < 0) {
        y = 0
      }
      if (x + collapsedWidth > screenWidth) {
        x = screenWidth - collapsedWidth
      }
      if (y + collapsedHeight > screenHeight) {
        y = screenHeight - collapsedHeight
      }

      this.debugWindow.setBounds({
        x,
        y,
        width: collapsedWidth,
        height: collapsedHeight
      }, true) // 添加 animate 参数
    }

    // 通知渲染进程状态改变
    this.debugWindow.webContents.send('debug:toggle-expanded', this.isExpanded)

    log.info(`调试窗口${this.isExpanded ? '已展开' : '已折叠'}`)
  }

  /**
   * 收集调试信息
   */
  private async collectDebugInfo(): Promise<DebugInfo> {
    const debugInfo: DebugInfo = {
      timestamp: Date.now(),
      performance: {
        memoryUsage: 0,
        cpuUsage: 0,
        activeViewCount: 0,
        switchTime: 0
      },
      windows: [],
      views: [],
      lifecycle: {
        totalViews: 0,
        activeViews: 0,
        pausedViews: 0,
        totalMemoryUsage: 0,
        averageMemoryPerView: 0
      },
      system: {
        platform: process.platform,
        electronVersion: process.versions.electron || '',
        nodeVersion: process.versions.node || '',
        chromeVersion: process.versions.chrome || '',
        appVersion: app.getVersion(),
        uptime: process.uptime()
      },
      otherProcesses: []
    }

    // 收集窗口管理器信息
    if (this.windowManager) {
      try {
        // 获取 lifecycleManager 并强制更新性能指标
        const lifecycleManager = this.windowManager.getLifecycleManager()
        if (lifecycleManager && typeof lifecycleManager.updatePerformanceMetrics === 'function') {
          try {
            lifecycleManager.updatePerformanceMetrics()
          } catch (e) {
            // 静默失败，继续获取数据
          }
        }

        // 直接使用 windowManager 的公开方法获取性能指标
        const metrics = this.windowManager.getPerformanceMetrics()
        debugInfo.performance = {
          memoryUsage: metrics.memoryUsage || 0,
          cpuUsage: metrics.cpuUsage || 0,
          activeViewCount: metrics.activeViewCount || 0,
          switchTime: metrics.switchTime || 0
        }

        // 获取统计信息
        const stats = this.windowManager.getStatistics()

        debugInfo.lifecycle = {
          totalViews: stats.views.total,
          activeViews: stats.views.active,
          pausedViews: stats.views.paused,
          totalMemoryUsage: 0, // 稍后更新
          averageMemoryPerView: 0 // 稍后更新
        }

        // 先获取所有应用进程的内存信息
        const appMetrics = app.getAppMetrics()
        const pidMemoryMap = new Map<number, number>()
        const processTypeMap = new Map<number, string>() // 记录每个 PID 的进程类型

        // 使用 app.getAppMetrics() 的 memory 字段获取所有进程内存
        // 注意：对于 Windows，使用 privateBytes（对应任务管理器的"内存"列）
        for (const metric of appMetrics) {
          processTypeMap.set(metric.pid, metric.type)
          if (metric.memory) {
            // Windows 使用 privateBytes（私有字节），其他系统使用 workingSetSize
            const memoryMB = process.platform === 'win32' && 'privateBytes' in metric.memory
              ? (metric.memory as any).privateBytes / 1024
              : metric.memory.workingSetSize / 1024
            pidMemoryMap.set(metric.pid, memoryMB)
          }
        }

        log.debug(`收集到 ${appMetrics.length} 个进程记录, 去重后 ${processTypeMap.size} 个唯一进程`)
        log.debug(`进程类型:`, Array.from(processTypeMap.entries()).map(([pid, type]) => `${type}(PID:${pid})`).join(', '))
        log.debug(`进程内存 (privateBytes):`, Array.from(pidMemoryMap.entries()).map(([pid, mem]) => `${processTypeMap.get(pid)}(PID:${pid}, ${mem.toFixed(1)}MB)`).join(', '))

        // 统计每种类型的进程数量
        const processTypeCounts = new Map<string, number>()
        for (const type of processTypeMap.values()) {
          processTypeCounts.set(type, (processTypeCounts.get(type) || 0) + 1)
        }
        log.debug(`进程类型统计:`, Array.from(processTypeCounts.entries()).map(([type, count]) => `${type}=${count}`).join(', '))

        // 使用 Set 记录已统计的进程 ID，避免重复计算内存
        const countedPids = new Set<number>()

        // 收集所有窗口信息（包括 BaseWindow 和 BrowserWindow）
        const windowIdSet = new Set<number>()

        // 创建一个 Map 来存储每个窗口包含的 View 的内存总和
        const windowViewMemoryMap = new Map<number, number>()

        // 1. 收集主窗口 (BaseWindow)
        const mainWindow = this.windowManager.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          windowIdSet.add(mainWindow.id)
          const bounds = mainWindow.getBounds()

          // BaseWindow 没有直接的 webContents，其内存等于其包含的所有 View 的内存
          // 这里先初始化为 0，稍后在收集 View 时累加
          windowViewMemoryMap.set(mainWindow.id, 0)

          debugInfo.windows.push({
            id: mainWindow.id,
            type: 'main-base',
            bounds,
            isVisible: mainWindow.isVisible(),
            isFocused: mainWindow.isFocused(),
            memoryUsage: 0, // BaseWindow 是容器，不单独占用内存
            viewIds: [] // 稍后添加包含的 view ID
          })
        }

        // 2. 收集分离窗口 (BaseWindow)
        const detachedWindows = this.windowManager.getDetachManager().getAllDetachedWindows()
        detachedWindows.forEach(window => {
          if (!window.window.isDestroyed() && !windowIdSet.has(window.window.id)) {
            windowIdSet.add(window.window.id)
            const bounds = window.window.getBounds()

            // BaseWindow 没有直接的 webContents，其内存等于其包含的所有 View 的内存
            windowViewMemoryMap.set(window.window.id, 0)

            debugInfo.windows.push({
              id: window.window.id,
              type: 'detached-base',
              bounds,
              isVisible: window.window.isVisible(),
              isFocused: window.window.isFocused(),
              memoryUsage: 0, // BaseWindow 是容器，不单独占用内存
              viewIds: [] // 稍后添加包含的 view ID
            })
          }
        })

        // 3. 收集所有 BrowserWindow（下载窗口、调试窗口等）
        const allBrowserWindows = BrowserWindow.getAllWindows()
        for (const win of allBrowserWindows) {
          if (!win.isDestroyed() && !windowIdSet.has(win.id)) {
            windowIdSet.add(win.id)

            const bounds = win.getBounds()
            let windowType = 'browser-other'

            // 判断 BrowserWindow 类型
            if (this.debugWindow && win.id === this.debugWindow.id) {
              windowType = 'browser-debug'
            } else {
              windowType = 'browser-other' // 下载窗口等
            }

            // 获取 BrowserWindow 的内存使用量（从 pidMemoryMap 中获取）
            let windowMemory = 0
            try {
              const pid = win.webContents.getOSProcessId()
              windowMemory = pidMemoryMap.get(pid) || 0

              // 调试日志：记录 BrowserWindow 的内存获取情况
              log.debug(`BrowserWindow ${windowType}:`, {
                id: win.id,
                pid,
                url: win.webContents.getURL(),
                title: win.getTitle(),
                bounds: bounds,
                isVisible: win.isVisible(),
                memoryMB: windowMemory.toFixed(2),
                hasLoadedURL: !!win.webContents.getURL()
              })

              if (windowMemory === 0) {
                log.warn(`BrowserWindow ${windowType} (ID:${win.id}, PID:${pid}) 内存为 0 - URL: ${win.webContents.getURL()}`)
              }
            } catch (error) {
              log.error(`获取 BrowserWindow ${windowType} (ID:${win.id}) 内存失败:`, error)
            }

            debugInfo.windows.push({
              id: win.id,
              type: windowType,
              bounds,
              isVisible: win.isVisible(),
              isFocused: win.isFocused(),
              memoryUsage: windowMemory
            })
          }
        }

        // 标记所有 BrowserWindow 的进程（用于区分窗口/视图进程和其他进程）
        for (const win of allBrowserWindows) {
          if (!win.isDestroyed()) {
            try {
              const pid = win.webContents.getOSProcessId()
              countedPids.add(pid)
            } catch (error) {
              // 忽略错误
            }
          }
        }

        // 获取所有视图信息
        const allViews = this.windowManager.getViewManager().getAllViews()
        log.debug(`开始收集 ${allViews.length} 个视图的信息`)
        log.debug(`当前窗口列表:`, debugInfo.windows.map(w => `${w.type}(ID:${w.id})`).join(', '))

        for (const viewInfo of allViews) {
          const lifecycleState = lifecycleManager?.getViewState(viewInfo.id)

          // 从进程 ID 获取内存使用量（从 pidMemoryMap 中获取）
          let actualMemoryUsage = 0
          try {
            if (viewInfo.view && !viewInfo.view.webContents.isDestroyed()) {
              const pid = viewInfo.view.webContents.getOSProcessId()
              actualMemoryUsage = pidMemoryMap.get(pid) || 0

              // 标记该进程（用于区分窗口/视图进程和其他进程）
              countedPids.add(pid)

              log.debug(`✓ 视图 ${viewInfo.id} - PID: ${pid}, 内存: ${actualMemoryUsage.toFixed(1)}MB, 已标记为窗口/视图进程`)

              // 累加到父窗口的内存总和（仅用于显示，不影响总内存计算）
              const parentWindowId = (viewInfo as any).parentWindowId
              if (parentWindowId && windowViewMemoryMap.has(parentWindowId)) {
                const currentMemory = windowViewMemoryMap.get(parentWindowId) || 0
                windowViewMemoryMap.set(parentWindowId, currentMemory + actualMemoryUsage)
              }
            } else {
              log.debug(`✗ 视图 ${viewInfo.id} - webContents 已销毁或不存在`)
            }
          } catch (error) {
            log.debug(`✗ 视图 ${viewInfo.id} - 获取内存失败:`, error)
          }

          // 将视图添加到 views 数组
          debugInfo.views.push({
            id: viewInfo.id,
            type: viewInfo.config.type || 'unknown',
            category: viewInfo.config.category || 'unknown',
            lifecycleType: viewInfo.config.lifecycle?.type || 'foreground',
            isPaused: lifecycleState?.isPaused || false,
            memoryUsage: actualMemoryUsage,
            lastAccessTime: lifecycleState?.lastAccessTime || 0
          })

          // 将 viewId 添加到对应的 BaseWindow 的 viewIds 列表中
          const parentWindowId = viewInfo.parentWindowId
          log.debug(`  视图 ${viewInfo.id}: parentWindowId=${parentWindowId}`)

          if (parentWindowId) {
            const parentWindow = debugInfo.windows.find(w => w.id === parentWindowId)
            if (parentWindow) {
              if (!parentWindow.viewIds) {
                parentWindow.viewIds = []
              }
              parentWindow.viewIds.push(viewInfo.id)
              log.debug(`  → ✓ 已将视图 ${viewInfo.id} 添加到窗口 ${parentWindowId} (${parentWindow.type}), 当前该窗口有 ${parentWindow.viewIds.length} 个视图`)
            } else {
              log.warn(`  → ⚠️ 未找到父窗口 ${parentWindowId} 用于视图 ${viewInfo.id}`)
              log.warn(`     可用窗口: ${debugInfo.windows.map(w => `${w.type}(${w.id})`).join(', ')}`)
            }
          } else {
            log.warn(`  → ⚠️ 视图 ${viewInfo.id} 没有 parentWindowId`)
          }
        }

        // 打印每个窗口包含的视图列表
        log.debug(``)
        log.debug(`窗口-视图关联总结:`)
        for (const window of debugInfo.windows) {
          const viewCount = window.viewIds?.length || 0
          if (viewCount > 0) {
            log.debug(`  ${window.type}(ID:${window.id}): ${viewCount} 个视图 - [${window.viewIds?.join(', ')}]`)
          } else {
            log.debug(`  ${window.type}(ID:${window.id}): 0 个视图`)
          }
        }
        log.debug(``)


        // BaseWindow 保持 memoryUsage = 0（它们是容器，实际内存在其包含的 view 中）

        // 计算窗口+视图的实际内存（从 countedPids 中累加）
        let windowViewMemory = 0
        for (const pid of countedPids) {
          windowViewMemory += pidMemoryMap.get(pid) || 0
        }

        log.debug(`窗口统计: 共 ${debugInfo.windows.length} 个窗口, ${countedPids.size} 个窗口/视图进程`)
        log.debug(`窗口类型分布:`, debugInfo.windows.map(w => {
          const viewCount = w.viewIds?.length || 0
          return `${w.type}(ID:${w.id}, ${w.memoryUsage.toFixed(1)}MB${viewCount > 0 ? `, ${viewCount}个view` : ''})`
        }).join(', '))

        // 更新生命周期统计的实际内存数据
        debugInfo.lifecycle.totalMemoryUsage = windowViewMemory
        debugInfo.lifecycle.averageMemoryPerView = debugInfo.views.length > 0
          ? windowViewMemory / debugInfo.views.length
          : 0

        // 统计其他进程（不属于窗口或视图的进程）
        // 分类：
        // 1. Browser 进程（主进程）- 计入应用内存
        // 2. GPU 进程 - 不计入应用内存（系统共享）
        // 3. Utility 进程（Worker）- 计入应用内存
        // 4. 未追踪的 Tab 进程 - 可能是 DevTools，不计入应用内存
        log.debug(``)
        log.debug(`检查其他进程 (总共 ${pidMemoryMap.size} 个进程, 已标记窗口/视图 ${countedPids.size} 个):`)

        // 使用去重后的 pidMemoryMap 来统计，避免重复
        for (const [pid, memoryMB] of pidMemoryMap.entries()) {
          if (!countedPids.has(pid)) {
            const processType = processTypeMap.get(pid) || 'Unknown'

            // 对于 Tab 类型，添加警告信息
            let extraInfo = ''
            if (processType === 'Tab') {
              extraInfo = ' ⚠️ (DevTools/开发工具?)'
            } else if (processType === 'GPU') {
              extraInfo = ' (系统共享，不计入应用内存)'
            }

            debugInfo.otherProcesses.push({
              type: processType,
              pid: pid,
              memoryUsage: memoryMB
            })
            log.debug(`  → 其他进程: ${processType.padEnd(15)} PID: ${pid} = ${memoryMB.toFixed(1)}MB${extraInfo}`)
          }
        }

        log.debug(``)
        log.debug(`已标记的窗口/视图进程 PID:`, Array.from(countedPids).join(', '))


        // 分别统计不同类型的进程
        const browserProcess = debugInfo.otherProcesses.find(p => p.type === 'Browser') // 主进程
        const gpuProcesses = debugInfo.otherProcesses.filter(p => p.type === 'GPU') // GPU 进程（不计入应用内存）
        const utilityProcesses = debugInfo.otherProcesses.filter(p => p.type === 'Utility') // Worker 进程
        const unknownTabProcesses = debugInfo.otherProcesses.filter(p => p.type === 'Tab') // 未追踪的 Tab（DevTools）

        const browserMemory = browserProcess ? browserProcess.memoryUsage : 0
        const gpuMemory = gpuProcesses.reduce((sum, p) => sum + p.memoryUsage, 0)
        const utilityMemory = utilityProcesses.reduce((sum, p) => sum + p.memoryUsage, 0)
        const unknownTabMemory = unknownTabProcesses.reduce((sum, p) => sum + p.memoryUsage, 0)

        // 计算总内存（所有进程，包括 GPU）
        let totalAppMemory = 0
        for (const memoryMB of pidMemoryMap.values()) {
          totalAppMemory += memoryMB
        }

        // 应用实际内存 = 窗口+视图 + 主进程 + Utility 进程
        // 排除：GPU 进程（系统共享）、未追踪的 Tab 进程（DevTools）
        const appActualMemory = windowViewMemory + browserMemory + utilityMemory

        debugInfo.performance.memoryUsage = appActualMemory
        debugInfo.performance.activeViewCount = debugInfo.views.filter(v => !v.isPaused).length

        log.debug(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        log.debug(`📊 内存统计总结 (使用 app.getAppMetrics + privateBytes):`)
        log.debug(``)
        log.debug(`  应用内存组成:`)
        log.debug(`  • 窗口+视图进程: ${windowViewMemory.toFixed(1)} MB (${countedPids.size} 个)`)
        log.debug(`  • 主进程 (Browser): ${browserMemory.toFixed(1)} MB`)
        log.debug(`  • 工具进程 (Utility): ${utilityMemory.toFixed(1)} MB (${utilityProcesses.length} 个)`)
        log.debug(`  ─────────────────────────────`)
        log.debug(`  ✅ 应用实际内存: ${appActualMemory.toFixed(1)} MB (与任务管理器一致)`)
        log.debug(``)
        log.debug(`  系统共享进程 (不计入应用内存):`)
        log.debug(`  • GPU 进程: ${gpuMemory.toFixed(1)} MB (${gpuProcesses.length} 个) - 系统共享`)
        if (unknownTabProcesses.length > 0) {
          log.debug(`  • 未追踪 Tab: ${unknownTabMemory.toFixed(1)} MB (${unknownTabProcesses.length} 个) - DevTools/开发工具`)
        }
        log.debug(``)
        log.debug(`  📊 Electron 总内存: ${totalAppMemory.toFixed(1)} MB (${pidMemoryMap.size} 个进程)`)
        log.debug(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      } catch (error) {
        log.error('收集调试信息失败:', error)
      }
    }

    return debugInfo
  }

  /**
   * 发送调试信息到窗口
   */
  private async sendDebugInfo(): Promise<void> {
    if (!this.debugWindow || this.debugWindow.isDestroyed()) {
      return
    }

    try {
      const debugInfo = await this.collectDebugInfo()

      // 调试日志
      log.debug('发送调试信息:', {
        memoryUsage: debugInfo.performance.memoryUsage,
        activeViewCount: debugInfo.performance.activeViewCount,
        totalViews: debugInfo.lifecycle.totalViews,
        windowsCount: debugInfo.windows.length,
        viewsCount: debugInfo.views.length
      })

      this.debugWindow.webContents.send('debug:update', debugInfo)
    } catch (error) {
      log.error('发送调试信息失败:', error)
    }
  }

  /**
   * 启动定期更新
   */
  private startPeriodicUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }

    this.updateTimer = setInterval(() => {
      this.sendDebugInfo()
    }, this.config.updateInterval || 1000)

    log.info(`调试信息定期更新已启动，间隔: ${this.config.updateInterval}ms`)
  }

  /**
   * 停止定期更新
   */
  private stopPeriodicUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = undefined
      log.info('调试信息定期更新已停止')
    }
  }

  /**
   * 打开调试窗口（如果不存在则创建）
   */
  async open(): Promise<void> {
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.show()
      log.info('调试窗口已显示')
      return
    }

    try {
      log.info('开始创建调试窗口...')
      await this.createDebugWindow()
      this.startPeriodicUpdate()
      log.info('调试窗口已打开')
    } catch (error) {
      log.error('打开调试窗口失败:', error)
      throw error
    }
  }

  /**
   * 关闭调试窗口（销毁窗口实例）
   */
  close(): void {
    if (!this.debugWindow || this.debugWindow.isDestroyed()) {
      log.warn('调试窗口不存在或已销毁')
      return
    }

    try {
      log.info('关闭调试窗口...')
      this.stopPeriodicUpdate()
      this.debugWindow.destroy()
      this.debugWindow = null
      log.info('调试窗口已关闭')
    } catch (error) {
      log.error('关闭调试窗口失败:', error)
    }
  }

  /**
   * 显示调试窗口
   */
  show(): void {
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.show()
    }
  }

  /**
   * 隐藏调试窗口
   */
  hide(): void {
    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.hide()
    }
  }

  /**
   * 检查调试窗口是否已打开
   */
  isOpen(): boolean {
    return this.debugWindow !== null && !this.debugWindow.isDestroyed()
  }

  /**
   * 获取调试窗口实例
   */
  getDebugWindow(): BrowserWindow | null {
    return this.debugWindow
  }

  /**
   * 获取调试窗口状态
   */
  getState(): { isExpanded: boolean } {
    return {
      isExpanded: this.isExpanded
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<DebugServiceConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.updateInterval) {
      this.startPeriodicUpdate()
    }

    log.info('调试服务配置已更新:', config)
  }

  /**
   * 清理调试服务
   */
  cleanup(): void {
    log.info('清理调试服务...')

    this.stopPeriodicUpdate()

    if (this.debugWindow && !this.debugWindow.isDestroyed()) {
      this.debugWindow.destroy()
      this.debugWindow = null
    }

    log.info('调试服务清理完成')
  }
}


