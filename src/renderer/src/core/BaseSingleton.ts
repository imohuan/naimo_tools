/**
 * 基础单例类
 * 提供通用的单例模式实现
 */
export abstract class BaseSingleton {
  constructor() {
    // 子类构造函数
  }

  /**
   * 获取单例实例
   * 每个子类都有自己独立的静态实例
   * @returns 单例实例
   */
  public static getInstance<T extends BaseSingleton>(this: new () => T): T {
    // 使用类名作为键来存储每个类的独立实例
    const className = this.name
    if (!(this as any)._instances) {
      (this as any)._instances = new Map()
    }

    if (!(this as any)._instances.has(className)) {
      (this as any)._instances.set(className, new this())
    }

    return (this as any)._instances.get(className) as T
  }

  /**
   * 销毁单例实例
   */
  public static destroyInstance<T extends BaseSingleton>(this: new () => T): void {
    const className = this.name
    if ((this as any)._instances) {
      (this as any)._instances.delete(className)
    }
  }
}
