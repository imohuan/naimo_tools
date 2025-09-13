/**
 * electron-store 的 TypeScript 类型声明
 * 基于 electron-store 官方文档
 * 
 * electron-store 是一个为 Electron 应用提供简单数据持久化的模块
 * 用于保存和加载用户设置、应用状态、缓存等数据
 * 数据保存在 app.getPath('userData') 目录下的 JSON 文件中
 */

declare module 'electron-store' {
  import { JSONSchema7 } from 'json-schema';

  /**
   * 迁移上下文对象
   * 包含版本迁移过程中的相关信息
   */
  interface MigrationContext {
    /** 迁移起始版本 */
    fromVersion: string;
    /** 迁移目标版本 */
    toVersion: string;
    /** 所有迁移完成后的最终版本 */
    finalVersion: string;
    /** 所有包含迁移步骤的版本列表 */
    versions: string[];
  }

  /**
   * 迁移处理函数类型
   * 用于定义版本升级时需要执行的操作
   * @param store Store 实例，用于执行数据迁移操作
   */
  type MigrationHandler<T = any> = (store: Store<T>) => void;

  /**
   * 每次迁移前的回调函数类型
   * 在每次迁移步骤执行前调用，可用于日志记录、数据准备等
   * @param store Store 实例
   * @param context 迁移上下文信息
   */
  type BeforeEachMigrationCallback<T = any> = (
    store: Store<T>,
    context: MigrationContext
  ) => void;

  /**
   * 特定键值变化回调函数类型
   * 当指定键的值发生变化时触发
   * @param newValue 新值
   * @param oldValue 旧值
   */
  type ChangeCallback<T = any, K extends keyof T = keyof T> = (
    newValue: T[K] | undefined,
    oldValue: T[K] | undefined
  ) => void;

  /**
   * 任意键值变化回调函数类型
   * 当整个配置对象发生任何变化时触发
   * @param newValue 新的配置对象
   * @param oldValue 旧的配置对象
   */
  type AnyChangeCallback<T = any> = (
    newValue: T,
    oldValue: T
  ) => void;

  /**
   * 取消订阅函数类型
   * 用于取消对配置变化的监听
   */
  type Unsubscribe = () => void;

  /**
   * Store 构造函数选项
   * 用于配置 Store 实例的行为和存储方式
   */
  interface StoreOptions<T = any> {
    /**
     * 存储项的默认值
     * 当配置文件中不存在某个键时，将使用此默认值
     * 注意：此选项会覆盖 schema 中的 default 值
     */
    defaults?: Partial<T>;

    /**
     * JSON Schema 用于验证配置数据
     * 使用 JSON Schema draft-2020-12 标准
     * 底层使用 ajv 进行验证
     * 每个键对应一个 JSON Schema 用于验证该属性
     */
    schema?: {
      [K in keyof T]?: JSONSchema7;
    };

    /**
     * 版本升级迁移对象
     * 键为版本号（支持 semver 范围），值为迁移处理函数
     * 当检测到版本升级时，会按顺序执行相应的迁移操作
     * 注意：此功能存在已知 bug，作者不提供支持
     */
    migrations?: Record<string, MigrationHandler<T>>;

    /**
     * 每次迁移步骤执行前的回调函数
     * 用于日志记录、数据准备等目的
     * 接收 store 实例和迁移上下文作为参数
     */
    beforeEachMigration?: BeforeEachMigrationCallback<T>;

    /**
     * 存储文件名（不包含扩展名）
     * 默认为 'config'，最终文件名为 config.json
     * 如果应用需要多个存储文件，可以设置不同的名称
     * 对于可重用的 Electron 模块，不应使用 'config' 作为名称
     * @default 'config'
     */
    name?: string;

    /**
     * 存储文件位置
     * 默认为 app.getPath('userData') 目录
     * 除非绝对必要，否则不建议指定此选项
     * 如果指定相对路径，则相对于默认 cwd
     * @default app.getPath('userData')
     */
    cwd?: string;

    /**
     * 配置文件加密密钥
     * 用于混淆配置文件内容，不是用于安全目的
     * 当用户查看配置目录时，加密后的文件可以阻止随意修改
     * 使用 aes-256-cbc 加密算法
     * 支持字符串、Buffer、TypedArray 或 DataView 类型
     */
    encryptionKey?: string | Buffer | TypedArray | DataView;

    /**
     * 配置文件扩展名
     * 默认为 'json'
     * 通常不需要修改，但可用于自定义文件扩展名
     * 例如设置为 'yaml' 以支持 YAML 格式
     * @default 'json'
     */
    fileExtension?: string;

    /**
     * 当读取配置文件出现语法错误时是否清除配置
     * 默认为 false
     * 对于不重要的数据，设置为 true 是好的行为
     * 如果允许用户直接编辑配置文件，建议设置为 false
     * @default false
     */
    clearInvalidConfig?: boolean;

    /**
     * 序列化函数
     * 将配置对象序列化为 UTF-8 字符串
     * 默认为 JSON.stringify(value, null, '\t')
     * 可用于支持其他格式如 YAML
     * @default value => JSON.stringify(value, null, '\t')
     */
    serialize?: (value: T) => string;

    /**
     * 反序列化函数
     * 从 UTF-8 字符串反序列化配置对象
     * 默认为 JSON.parse
     * 必须与 serialize 函数配对使用
     * @default JSON.parse
     */
    deserialize?: (text: string) => T;

    /**
     * 是否支持点号访问嵌套属性
     * 默认为 true
     * 启用后可以使用 'foo.bar' 访问嵌套属性
     * 设置为 false 时，整个字符串被视为一个键
     * @default true
     */
    accessPropertiesByDotNotation?: boolean;

    /**
     * 是否监听配置文件变化
     * 默认为 false
     * 启用后会自动监听文件变化并触发相应的回调
     * 适用于多进程同时修改同一配置文件的情况
     * @default false
     */
    watch?: boolean;
  }

  /**
   * 支持点号表示法的值类型获取
   * 用于类型安全的嵌套属性访问
   * 例如：DotNotation<{foo: {bar: string}}, 'foo.bar'> 返回 string
   */
  type DotNotation<T, K extends string> = K extends keyof T
    ? T[K]
    : K extends `${infer K1}.${infer K2}`
    ? K1 extends keyof T
    ? DotNotation<T[K1], K2>
    : unknown
    : unknown;

  /**
   * Store 类，支持泛型
   * 实现了 Iterable 接口，支持 for...of 循环遍历
   * 所有写入操作都是原子性的，确保进程崩溃时不会损坏现有配置
   */
  class Store<T = any> implements Iterable<[keyof T, T[keyof T]]> {
    /**
     * 创建新的 Store 实例
     * @param options 可选的配置选项
     */
    constructor(options?: StoreOptions<T>);

    /**
     * 设置单个或多个项目
     * 值必须是 JSON 可序列化的，不能是 undefined、function 或 symbol
     * 
     * @param key 键名（支持点号表示法访问嵌套属性）
     * @param value 要设置的值
     */
    set<K extends keyof T>(key: K, value: T[K]): void;
    set<K extends string>(key: K, value: DotNotation<T, K>): void;
    /**
     * 批量设置多个项目
     * @param object 包含多个键值对的对象
     */
    set(object: Partial<T>): void;

    /**
     * 获取项目值，如果不存在则返回默认值
     * 
     * @param key 键名（支持点号表示法访问嵌套属性）
     * @param defaultValue 可选的默认值
     * @returns 键对应的值或默认值
     */
    get<K extends keyof T>(key: K): T[K] | undefined;
    get<K extends keyof T>(key: K, defaultValue: T[K]): T[K];
    get<K extends string>(key: K): DotNotation<T, K> | undefined;
    get<K extends string, D>(key: K, defaultValue: D): DotNotation<T, K> | D;
    /**
     * 获取所有数据
     * @returns 完整的配置对象
     */
    get(): T;

    /**
     * 重置项目到默认值
     * 使用 defaults 或 schema 中定义的默认值
     * 使用 clear() 方法重置所有项目
     * 
     * @param keys 要重置的键名列表
     */
    reset<K extends keyof T>(...keys: K[]): void;

    /**
     * 检查项目是否存在
     * 
     * @param key 要检查的键名（支持点号表示法）
     * @returns 如果键存在返回 true，否则返回 false
     */
    has<K extends keyof T>(key: K): boolean;
    has<K extends string>(key: K): boolean;

    /**
     * 删除项目
     * 
     * @param key 要删除的键名（支持点号表示法）
     */
    delete<K extends keyof T>(key: K): void;
    delete<K extends string>(key: K): void;

    /**
     * 删除所有项目
     * 会将已知项目重置为默认值（如果在 defaults 或 schema 中定义了默认值）
     */
    clear(): void;

    /**
     * 监听指定键的变化
     * 当键的值发生变化时调用回调函数
     * 首次设置键时 oldValue 为 undefined
     * 删除键时 newValue 为 undefined
     * 
     * @param key 要监听的键名
     * @param callback 变化回调函数
     * @returns 取消订阅的函数
     */
    onDidChange<K extends keyof T>(
      key: K,
      callback: ChangeCallback<T, K>
    ): Unsubscribe;
    onDidChange<K extends string>(
      key: K,
      callback: (newValue: DotNotation<T, K> | undefined, oldValue: DotNotation<T, K> | undefined) => void
    ): Unsubscribe;

    /**
     * 监听整个配置对象的变化
     * 当配置对象发生任何变化时调用回调函数
     * oldValue 和 newValue 分别是变化前后的配置对象
     * 需要比较 oldValue 和 newValue 来找出具体变化
     * 
     * @param callback 变化回调函数
     * @returns 取消订阅的函数
     */
    onDidAnyChange(callback: AnyChangeCallback<T>): Unsubscribe;

    /**
     * 获取项目数量
     * 只读属性
     */
    readonly size: number;

    /**
     * 获取或设置所有数据
     * 可以获取完整的配置对象，也可以替换当前数据
     * 
     * 示例：
     * ```js
     * store.store = { hello: "world" };
     * ```
     */
    store: T;

    /**
     * 获取存储文件的路径
     * 只读属性
     */
    readonly path: string;

    /**
     * 在用户的编辑器中打开存储文件
     * 返回一个 Promise，成功时表示编辑器已打开，失败时表示打开失败
     * 
     * @returns Promise<void>
     */
    openInEditor(): Promise<void>;

    /**
     * 迭代器支持
     * 使 Store 实例可以在 for...of 循环中使用
     * 
     * @returns 迭代器
     */
    [Symbol.iterator](): Iterator<[keyof T, T[keyof T]]>;

    /**
     * 初始化渲染进程支持
     * 当在渲染进程中创建 Store 实例时，需要在主进程中调用此方法
     * 用于设置必要的 IPC 通信通道
     * 
     * 在主进程中调用：
     * ```js
     * Store.initRenderer();
     * ```
     * 
     * 然后在渲染进程中：
     * ```js
     * const store = new Store();
     * ```
     */
    static initRenderer(): void;
  }

  export = Store;
}
