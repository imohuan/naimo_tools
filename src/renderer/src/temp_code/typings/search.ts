import type { AttachedFile as AttachedFileFromComposableTypes } from "@/typings/composableTypes";

/**
 * 搜索分类接口
 */
export interface SearchCategory {
  /** 分类ID */
  id: string;
  /** 分类名称 */
  name: string;
  /** 分类项列表 */
  items: AppItem[];
  /** 是否展开 */
  isExpanded?: boolean;
  /** 是否允许拖拽 */
  isDragEnabled?: boolean;
  /** 最大显示数量 */
  maxDisplayCount?: number;
  /** 排序权重 */
  weight?: number;
}

/**
 * 搜索配置接口
 */
export interface SearchConfig {
  /** 搜索延迟（毫秒） */
  delay?: number;
  /** 最大结果数 */
  maxResults?: number;
}

/** 提供正则搜索 */
export interface RegexSearch {
  /** 类型 */
  type: "regex";
  /** 正则匹配 */
  match?: string;
  /** 排除条件 */
  exclude?: string;
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
}

/** 默认： 提供文本搜索 name，path，description，anonymousSearchFields */
export interface TextSearch {
  /** 类型 */
  type: "text";
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
}

/** 提供图片搜索 */
export interface ImgSearch {
  /** 类型 */
  type: "img";
}

/** 提供文件搜索 */
export interface FileSearch {
  /** 类型 */
  type: "files";
  /** 文件类型 */
  fileType: "file" | "directory" | "all";
  /** 文件扩展名 */
  extensions?: string[];
  /** 正则匹配文件名称 */
  match?: string;
  /** 最少文件数 (可选) */
  minLength?: number;
  /** 最多文件数 (可选) */
  maxLength?: number;
}

export interface SearchModule {
  /** 模块名称 */
  name: string;
  /** 排序权重 */
  weight: number;
  /** 是否允许拖拽 */
  isDragEnabled: boolean;
  /** 最大显示数量 */
  maxDisplayCount: number;

  /** 获取模块 */
  getItems: () => Promise<AppItem[]>;
  /** 删除项 */
  deleteItem: (item: AppItem) => Promise<void>;
  /** 添加项 */
  addItem: (item: AppItem) => Promise<void>;
  /** 批量设置项 */
  setItems: (items: AppItem[]) => Promise<void>;
}


export type AppItem = (RegexSearch | TextSearch | ImgSearch | FileSearch) & {
  /** 应用名称 */
  name: string;
  /** 应用路径 英文 */
  path: string;
  /** 应用图标，null 表示无图标 */
  icon: string | null;
  /** 分类 */
  category?: string;
  /** 应用平台 默认所有平台 */
  platform?: ("windows" | "macos" | "linux")[];
  /** 应用描述 */
  description?: string;
  /** 匿名搜索字段列表（用于匿名搜索匹配） */
  anonymousSearchFields?: string[];
  /** 不主动显示搜索框 */
  notVisibleSearch?: boolean;
  /** 排序权重 */
  weight?: number;
  /** (系统配置) 元数据配置 */
  __metadata?: {
    /** 是否启用删除功能 */
    enableDelete?: boolean;
    /** 是否启用固定功能 */
    enablePin?: boolean;
  };
};

export interface AttachedFile {
  type: "file";
  data: AttachedFileFromComposableTypes[];
}

export interface AttachedText {
  type: "text";
  data: string;
  /** 文件路径 */
  path: string;
}

export interface AttachedImg {
  type: "img";
  /** base64 图片 */
  data: string;
  /** 文件路径 */
  path: string;
}

export interface AttachedPlugin {
  type: "plugin";
  data: any;
}

export type AttachedInfo = AttachedFile | AttachedText | AttachedImg | AttachedPlugin;
