import type { SearchCategory } from "@/typings/searchTypes"

export const categoryConfig: Record<string, Omit<SearchCategory, 'items'>> = {
  recent: {
    id: 'recent',
    name: '最近使用',
    isDragEnabled: false,
    maxDisplayCount: 16,
    isExpanded: false,
  },
  pinned: {
    id: 'pinned',
    name: '已固定',
    isDragEnabled: true,
    maxDisplayCount: 16,
    isExpanded: false,
  },
  files: {
    id: 'files',
    name: '文件',
    isDragEnabled: true,
    maxDisplayCount: 16,
    isExpanded: false,
  },
  applications: {
    id: 'applications',
    name: '应用',
    isDragEnabled: false,
    maxDisplayCount: 24,
    isExpanded: false,
    disableDelete: true,
  },
}
