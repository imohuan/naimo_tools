import type { AppItem } from "@shared/typings";

/** 搜索模式枚举 */
export enum SearchMode {
  /** 普通搜索 - 搜索 AppItem 的 name（包括匿名搜索） */
  NORMAL = 'normal',
  /** 附件搜索 - 根据自定义的 onSearch 方法 */
  ATTACHMENT = 'attachment',
  /** 插件搜索 - 将搜索内容提供给插件 */
  PLUGIN = 'plugin'
}

/** 搜索分类 */
export interface SearchCategory {
  /** 分类唯一标识 */
  id: string;
  /** 分类名称 */
  name: string;
  /** 分类下的应用项目列表 */
  items: AppItem[];
  /** 是否允许拖拽 */
  isDragEnabled: boolean;
  /** 最大显示数量 */
  maxDisplayCount: number;
  /** 是否展开显示全部 */
  isExpanded: boolean;
  /** 是否为插件分类 */
  isPluginCategory?: boolean;
  /** 插件ID（仅插件分类有效） */
  pluginId?: string;
  /** 是否允许子项删除 */
  disableDelete?: boolean;
}

/** 搜索状态 */
export interface SearchState {
  /** 当前搜索文本 */
  searchText: string;
  /** 当前显示的分类列表 */
  searchCategories: SearchCategory[];
  /** 是否处于搜索中 */
  isSearching: boolean;
}
