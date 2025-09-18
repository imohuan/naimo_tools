/**
 * 基础单例类
 * 提供通用的单例模式实现
 */
export abstract class BaseSingleton {
  private static instance: BaseSingleton | null = null

  constructor() {
    // 子类构造函数
  }

  /**
   * 获取单例实例
   * @returns 单例实例
   */
  public static getInstance<T extends BaseSingleton>(this: new () => T): T {
    if (!BaseSingleton.instance) {
      BaseSingleton.instance = new this()
    }
    return BaseSingleton.instance as T
  }

  /**
   * 销毁单例实例
   */
  public static destroyInstance(): void {
    BaseSingleton.instance = null
  }
}
