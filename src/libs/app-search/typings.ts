/** 应用路径 */
export interface AppPath {
  /** 应用名称 */
  name: string;
  /** 应用路径 */
  path: string;
  /** 应用图标 */
  icon?: string | null;
  /** 描述信息 */
  description?: string;
  /** 执行命令（用于系统功能） */
  command?: string;
}
