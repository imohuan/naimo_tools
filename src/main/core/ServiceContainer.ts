/**
 * 服务容器 - 管理所有服务的依赖注入和生命周期
 * 使用依赖注入模式来管理各个服务之间的依赖关系
 */

import log from 'electron-log'

export interface ServiceDefinition {
  /** 服务名称 */
  name: string
  /** 工厂函数，接收 ServiceContainer 返回服务实例 */
  factory: (container: ServiceContainer) => any
  /** 是否为单例服务 */
  singleton?: boolean
  /** 依赖的服务名称数组 */
  dependencies?: string[]
}

export interface Service {
  /** 初始化服务（可选） */
  initialize?(): Promise<void>
  /** 清理服务（可选） */
  cleanup?(): void
}

/**
 * 简单的依赖注入容器
 */
export class ServiceContainer {
  /** 已创建的服务实例（单例缓存） */
  private services = new Map<string, any>()
  /** 服务定义（工厂、依赖等） */
  private definitions = new Map<string, ServiceDefinition>()
  /** 正在初始化的服务名称集合（用于检测循环依赖） */
  private initializing = new Set<string>()

  /**
   * 注册服务定义
   */
  register(definition: ServiceDefinition): void {
    this.definitions.set(definition.name, definition)
    log.debug(`服务已注册: ${definition.name}`)
  }

  /**
   * 获取服务实例
   */
  get<T = any>(name: string): T {
    // 如果已经创建过实例，直接返回
    if (this.services.has(name)) {
      return this.services.get(name)
    }

    // 检查是否正在初始化（防止循环依赖）
    if (this.initializing.has(name)) {
      throw new Error(`检测到循环依赖: ${name}`)
    }

    const definition = this.definitions.get(name)
    if (!definition) {
      throw new Error(`服务未注册: ${name}`)
    }

    this.initializing.add(name)

    try {
      // 先解析依赖
      if (definition.dependencies) {
        for (const dep of definition.dependencies) {
          this.get(dep)
        }
      }

      // 创建服务实例
      const instance = definition.factory(this)

      // 如果是单例，缓存实例
      if (definition.singleton !== false) {
        this.services.set(name, instance)
      }

      log.debug(`服务已创建: ${name}`)
      return instance
    } finally {
      this.initializing.delete(name)
    }
  }

  /**
   * 检查服务是否已注册
   */
  has(name: string): boolean {
    return this.definitions.has(name)
  }

  /**
   * 获取所有已创建的服务实例
   */
  getAllServices(): Map<string, any> {
    return new Map(this.services)
  }

  /**
   * 初始化所有服务
   */
  async initializeAll(): Promise<void> {
    log.info('开始初始化所有服务...')

    const services = Array.from(this.services.values())

    for (const service of services) {
      if (service && typeof service.initialize === 'function') {
        try {
          await service.initialize()
          log.debug(`服务初始化完成: ${service.constructor.name}`)
        } catch (error) {
          log.error(`服务初始化失败: ${service.constructor.name}`, error)
          throw error
        }
      }
    }

    log.info('所有服务初始化完成')
  }

  /**
   * 清理所有服务
   */
  cleanup(): void {
    log.info('开始清理所有服务...')

    const services = Array.from(this.services.values()).reverse()

    for (const service of services) {
      if (service && typeof service.cleanup === 'function') {
        try {
          service.cleanup()
          log.debug(`服务已清理: ${service.constructor.name}`)
        } catch (error) {
          log.error(`服务清理失败: ${service.constructor.name}`, error)
        }
      }
    }

    this.services.clear()
    log.info('所有服务清理完成')
  }
}
