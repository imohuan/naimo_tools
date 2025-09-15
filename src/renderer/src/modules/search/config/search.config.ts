export const categoryConfig = {
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
    customSearch: (searchText: string, items: any[]) => {
      return items.filter((item) => {
        const name = item.name.toLowerCase()
        const query = searchText.toLowerCase()
        return name.includes(query) || name.split('.').pop()?.includes(query)
      })
    },
  },
  applications: {
    id: 'applications',
    name: '应用',
    isDragEnabled: false,
    maxDisplayCount: 24,
    isExpanded: false,
  },
}
