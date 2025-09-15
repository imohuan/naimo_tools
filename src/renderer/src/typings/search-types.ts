import type { AppItem } from "@shared/types";

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
  /** 自定义搜索方法 */
  customSearch?: (searchText: string, items: AppItem[]) => AppItem[];
  /** 是否为插件分类 */
  isPluginCategory?: boolean;
  /** 插件ID（仅插件分类有效） */
  pluginId?: string;
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
