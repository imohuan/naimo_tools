<template>
  <div class="w-full h-full p-[4px]" @keydown="handleKeyNavigation" tabindex="0">
    <!-- 主应用容器 -->
    <div
      class="w-full bg-transparent relative shadow-lg rounded-xl overflow-hidden"
      style="box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5)"
    >
      <!-- 搜索框区域 -->
      <DraggableArea
        class="w-full flex items-center justify-center"
        :style="{ height: headerHeight + 'px' }"
        @click="handleClick"
        @dragover="handleDragOver"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div
          class="w-full h-full relative flex items-center bg-white border border-gray-200 transition-all duration-200"
          :class="{ 'bg-indigo-50 border-indigo-400': isDragOver }"
        >
          <!-- 拖拽图标 -->
          <div
            class="h-full aspect-square flex items-center justify-center text-gray-400 transition-colors duration-200"
            :class="{ 'text-indigo-500': isDragOver }"
          >
            <IconMdiFileUpload v-if="isDragOver" class="w-5 h-5" />
            <IconMdiMagnify v-else class="w-5 h-5" />
          </div>

          <!-- 搜索输入框组件 -->
          <SearchInput
            ref="searchInputRef"
            v-model="searchText"
            @enter="handleSearch"
            @input="debouncedHandleSearch"
            :placeholder="
              isDragOver ? '释放文件以搜索...' : '搜索应用和指令 / 拖拽文件到此处...'
            "
          />

          <!-- 内容切换按钮 -->
          <div class="h-full aspect-square">
            <button
              class="w-full h-full p-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
              title="切换内容区域"
              @click="toggleContentArea"
            >
              <IconMdiCog class="w-5 h-5 hover:text-gray-700" />
            </button>
          </div>
        </div>
      </DraggableArea>

      <!-- 内容呈现区域 -->
      <div
        ref="contentAreaRef"
        class="flex-1 w-full overflow-hidden transition-all duration-300 bg-white"
        :style="{ height: contentAreaVisible ? contentAreaHeight + 'px' : '0px' }"
        v-if="contentAreaVisible"
      >
        <div id="content-scroll-container" class="w-full h-full overflow-y-auto">
          <!-- 搜索结果 -->
          <SearchCategories
            v-if="searchCategories.length > 0"
            :categories="searchCategories"
            :selected-index="selectedIndex"
            :flat-items="flatItems"
            @app-click="launchApp"
            @category-toggle="handleCategoryToggle"
            @category-drag-end="handleCategoryDragEnd"
            @app-delete="handleAppDelete"
            @app-pin="handleAppPin"
          />
          <!-- 设置内容 -->
          <HotkeyDemo v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DraggableArea from "./components/DraggableArea.vue";
import SearchInput from "./components/SearchInput.vue";
import SearchCategories from "./components/SearchCategories.vue";
import { useWindowSize } from "./composables/useWindowSize";
import type { AppItem } from "../../shared/types";

// 本地配置常量
const headerHeight = 50;

// ==================== 窗口大小管理 ====================
const {
  contentAreaRef,
  contentAreaVisible,
  contentAreaHeight,
  updateWindowSize,
  toggleContentArea,
  showContentArea,
  hideContentArea,
  initializeWindowSize,
} = useWindowSize({
  /** 窗口头部高度 */
  headerHeight: headerHeight,
  /** 头部上下内边距 */
  headerPadding: 6,
  /** 内容区域最大高度 */
  maxContentHeight: 400,
  /** 内容区域默认高度 */
  defaultContentHeight: 100,
});

// ==================== 类型定义 ====================
interface SearchCategory {
  id: string;
  name: string;
  items: AppItem[];
  isDragEnabled: boolean;
  maxDisplayCount: number;
  isExpanded: boolean;
  customSearch?: (searchText: string, items: AppItem[]) => AppItem[];
}

// ==================== 响应式数据 ====================
let appApps: AppItem[] = [];
const searchText = ref("");
const searchInputRef = ref<InstanceType<typeof SearchInput>>();
const searchCategories = ref<SearchCategory[]>([]);
const originalCategories = ref<SearchCategory[]>([]); // 存储原始分类数据
const isSearching = ref(false);
const isDragOver = ref(false);

// 键盘导航状态
const selectedIndex = ref(0); // 当前选中的项目索引
const flatItems = ref<Array<AppItem & { categoryId: string }>>([]); // 扁平化的所有项目列表，包含分类信息

// ==================== 方法 ====================
const handleClick = () => {
  searchInputRef.value?.focus();
};

// 更新扁平化项目列表
const updateFlatItems = () => {
  const items: Array<AppItem & { categoryId: string }> = [];
  for (const category of searchCategories.value) {
    // 根据展开状态决定显示的项目数量
    const displayItems =
      category.isExpanded || category.items.length <= category.maxDisplayCount
        ? category.items
        : category.items.slice(0, category.maxDisplayCount);

    // 为每个项目添加分类信息
    const itemsWithCategory = displayItems.map((item) => ({
      ...item,
      categoryId: category.id,
    }));
    items.push(...itemsWithCategory);
  }
  flatItems.value = items;

  // 确保选中索引在有效范围内
  if (selectedIndex.value >= items.length) {
    selectedIndex.value = Math.max(0, items.length - 1);
  }
};

// 滚动到选中的项目（现在由AppItem组件自动处理）
const scrollToSelectedItem = () => {
  // 滚动逻辑现在由AppItem组件处理，这里只需要确保DOM更新
  nextTick(() => {
    // AppItem组件会监听isSelected变化并自动滚动
  });
};

// 智能键盘导航处理
const handleKeyNavigation = (event: KeyboardEvent) => {
  if (flatItems.value.length === 0) return;

  // 根据响应式设计，动态计算每行项目数
  const getItemsPerRow = () => {
    const container = document.getElementById("content-scroll-container");
    if (!container) return 8; // 默认值

    const containerWidth = container.clientWidth;
    // 根据容器宽度估算每行项目数（考虑gap和padding）
    if (containerWidth < 640) return 6; // sm:grid-cols-6
    if (containerWidth < 768) return 7; // sm:grid-cols-7
    if (containerWidth < 1024) return 8; // md:grid-cols-8
    return 9; // lg:grid-cols-9
  };

  const itemsPerRow = getItemsPerRow();
  const currentItem = flatItems.value[selectedIndex.value];
  if (!currentItem) return;

  // 找到当前项目所在的分类和位置
  const currentCategory = searchCategories.value.find(
    (cat) => cat.id === currentItem.categoryId
  );
  if (!currentCategory) return;

  // 计算当前项目在分类中的位置
  const categoryStartIndex = flatItems.value.findIndex(
    (item) => item.categoryId === currentItem.categoryId
  );
  const categoryItemIndex = selectedIndex.value - categoryStartIndex;
  const categoryRow = Math.floor(categoryItemIndex / itemsPerRow);
  const categoryCol = categoryItemIndex % itemsPerRow;
  const categoryTotalRows = Math.ceil(currentCategory.items.length / itemsPerRow);

  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      if (categoryRow > 0) {
        // 在同一分类内向上移动
        const newIndex =
          categoryStartIndex + (categoryRow - 1) * itemsPerRow + categoryCol;
        if (newIndex >= 0 && newIndex < flatItems.value.length) {
          selectedIndex.value = newIndex;
          scrollToSelectedItem();
        }
      } else {
        // 尝试移动到上一个分类
        const currentCategoryIndex = searchCategories.value.findIndex(
          (cat) => cat.id === currentItem.categoryId
        );
        if (currentCategoryIndex > 0) {
          const prevCategory = searchCategories.value[currentCategoryIndex - 1];
          const prevCategoryStartIndex = flatItems.value.findIndex(
            (item) => item.categoryId === prevCategory.id
          );
          if (prevCategoryStartIndex >= 0) {
            // 计算目标位置：上一分类的对应列位置
            const targetIndex =
              prevCategoryStartIndex +
              Math.min(
                categoryCol,
                Math.floor(prevCategory.items.length / itemsPerRow) * itemsPerRow +
                  (prevCategory.items.length % itemsPerRow) -
                  1
              );
            if (targetIndex < flatItems.value.length) {
              selectedIndex.value = targetIndex;
              scrollToSelectedItem();
            }
          }
        }
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      if (categoryRow < categoryTotalRows - 1) {
        // 在同一分类内向下移动
        const newIndex =
          categoryStartIndex + (categoryRow + 1) * itemsPerRow + categoryCol;
        if (newIndex < flatItems.value.length) {
          selectedIndex.value = newIndex;
          scrollToSelectedItem();
        }
      } else {
        // 尝试移动到下一个分类
        const currentCategoryIndex = searchCategories.value.findIndex(
          (cat) => cat.id === currentItem.categoryId
        );
        if (currentCategoryIndex < searchCategories.value.length - 1) {
          const nextCategory = searchCategories.value[currentCategoryIndex + 1];
          const nextCategoryStartIndex = flatItems.value.findIndex(
            (item) => item.categoryId === nextCategory.id
          );
          if (nextCategoryStartIndex >= 0) {
            // 移动到下一分类的第一行对应列
            const targetIndex =
              nextCategoryStartIndex + Math.min(categoryCol, itemsPerRow - 1);
            if (targetIndex < flatItems.value.length) {
              selectedIndex.value = targetIndex;
              scrollToSelectedItem();
            }
          }
        }
      }
      break;
    case "ArrowLeft":
      event.preventDefault();
      if (categoryCol > 0) {
        // 在同一行内向左移动
        selectedIndex.value = selectedIndex.value - 1;
      } else if (categoryRow > 0) {
        // 如果已经在行的最左侧，移动到上一行的最右侧
        const newIndex =
          categoryStartIndex + (categoryRow - 1) * itemsPerRow + (itemsPerRow - 1);
        if (newIndex >= 0) {
          selectedIndex.value = newIndex;
        }
      }
      scrollToSelectedItem();
      break;
    case "ArrowRight":
      event.preventDefault();
      const categoryItemsInRow = Math.min(
        itemsPerRow,
        currentCategory.items.length - categoryRow * itemsPerRow
      );
      if (categoryCol < categoryItemsInRow - 1) {
        // 在同一行内向右移动
        selectedIndex.value = selectedIndex.value + 1;
      } else if (categoryRow < categoryTotalRows - 1) {
        // 如果已经在行的最右侧，移动到下一行的最左侧
        const newIndex = categoryStartIndex + (categoryRow + 1) * itemsPerRow;
        if (newIndex < flatItems.value.length) {
          selectedIndex.value = newIndex;
        }
      }
      scrollToSelectedItem();
      break;
    case "Enter":
      event.preventDefault();
      if (flatItems.value[selectedIndex.value]) {
        launchApp(flatItems.value[selectedIndex.value]);
      }
      break;
    case "Escape":
      event.preventDefault();
      searchText.value = "";
      performSearch();
      break;
  }
};

// 序列化应用项目，确保只包含可序列化的属性（不保存图标数据）
const serializeAppItems = (items: AppItem[]): AppItem[] => {
  return items.map((item) => ({
    name: item.name,
    path: item.path,
    icon: null, // 不保存图标数据，使用时重新获取
    ...(item.lastUsed && { lastUsed: item.lastUsed }),
    ...(item.usageCount && { usageCount: item.usageCount }),
  }));
};

// 辅助函数：同时更新原始数据和搜索结果中的分类
const updateCategoryInBoth = (
  categoryId: string,
  updater: (category: SearchCategory) => void
) => {
  // 更新原始数据
  const originalCategory = originalCategories.value.find((cat) => cat.id === categoryId);
  if (originalCategory) {
    updater(originalCategory);
  }

  // 更新搜索结果
  const searchCategory = searchCategories.value.find((cat) => cat.id === categoryId);
  if (searchCategory) {
    updater(searchCategory);
  }
};

// 拖拽处理方法
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = "copy";
};

const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  // 只有当离开整个拖拽区域时才设置为false
  if (!(event.currentTarget as Element)?.contains(event.relatedTarget as Node)) {
    isDragOver.value = false;
  }
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    console.log("拖入文件:", file.name);

    // 获取文件的实际路径
    const filePath = webUtils.getPathForFile(file);
    console.log("文件路径:", filePath);
    console.log("webUtils 可用:", typeof webUtils.getPathForFile === "function");

    // 创建文件项
    const fileItem: AppItem = {
      name: file.name,
      path: filePath, // 使用实际的文件路径
      icon: null, // 初始设置为 null，稍后提取图标
      lastUsed: Date.now(),
      usageCount: 1,
    };

    // 提取文件图标
    try {
      console.log("开始提取文件图标:", filePath);
      const icon = await api.ipcRouter.appExtractFileIcon(filePath);
      if (icon) {
        fileItem.icon = icon;
        console.log("文件图标提取成功");
      } else {
        console.log("文件图标提取失败，使用默认图标");
      }
    } catch (error) {
      console.error("提取文件图标时出错:", error);
    }

    // 添加到文件列表
    updateCategoryInBoth("files", (filesCategory) => {
      // 检查是否已存在相同文件
      const existingIndex = filesCategory.items.findIndex(
        (item) => item.path === fileItem.path
      );
      if (existingIndex >= 0) {
        // 更新已存在文件的使用次数和最后使用时间
        filesCategory.items[existingIndex].lastUsed = Date.now();
        filesCategory.items[existingIndex].usageCount =
          (filesCategory.items[existingIndex].usageCount || 0) + 1;
      } else {
        // 添加新文件到列表开头
        filesCategory.items.unshift(fileItem);
        // 限制文件列表长度
        if (filesCategory.items.length > filesCategory.maxDisplayCount) {
          filesCategory.items = filesCategory.items.slice(
            0,
            filesCategory.maxDisplayCount
          );
        }
      }
    });

    // 保存到 electron-store
    const originalFilesCategory = originalCategories.value.find(
      (cat) => cat.id === "files"
    );
    if (originalFilesCategory) {
      try {
        await api.ipcRouter.storeSet(
          "fileList",
          serializeAppItems(originalFilesCategory.items)
        );
        console.log("文件列表已保存到 electron-store");
      } catch (error) {
        console.error("保存文件列表失败:", error);
      }
    }

    // 将文件名设置到搜索框中
    searchText.value = file.name;
    // 执行搜索
    await handleSearch(file.name);
  }
};

// 处理搜索
const handleSearch = async (_value: string) => {
  // 重置选中索引
  selectedIndex.value = 0;
  await performSearch();
};

const debouncedHandleSearch = useDebounceFn(() => handleSearch(searchText.value), 100);

// 为应用项目重新获取图标
const loadAppIcons = async (items: AppItem[]): Promise<AppItem[]> => {
  const itemsWithIcons = await Promise.all(
    items.map(async (item) => {
      if (item.icon) {
        // 如果已经有图标，直接返回
        return item;
      }

      try {
        // 重新获取图标
        const icon = await api.ipcRouter.appExtractFileIcon(item.path);
        return { ...item, icon };
      } catch (error) {
        console.warn(`获取应用图标失败: ${item.name}`, error);
        return { ...item, icon: null };
      }
    })
  );

  return itemsWithIcons;
};

const initAppApps = async () => {
  appApps = await api.ipcRouter.appSearchApps();

  // 从 electron-store 获取存储的数据
  const recentApps = (await api.ipcRouter.storeGet("recentApps")) || [];
  const pinnedApps = (await api.ipcRouter.storeGet("pinnedApps")) || [];
  const fileList = (await api.ipcRouter.storeGet("fileList")) || [];

  // 为存储的应用重新获取图标
  const recentAppsWithIcons = await loadAppIcons(recentApps);
  const pinnedAppsWithIcons = await loadAppIcons(pinnedApps);
  const fileListWithIcons = await loadAppIcons(fileList);

  // 初始化原始分类数据
  originalCategories.value = [
    {
      id: "recent",
      name: "最近使用",
      items: recentAppsWithIcons,
      isDragEnabled: false,
      maxDisplayCount: 16,
      isExpanded: false,
    },
    {
      id: "pinned",
      name: "已固定",
      items: pinnedAppsWithIcons,
      isDragEnabled: true,
      maxDisplayCount: 16,
      isExpanded: false,
    },
    {
      id: "files",
      name: "文件",
      items: fileListWithIcons,
      isDragEnabled: true,
      maxDisplayCount: 16,
      isExpanded: false,
      customSearch: (searchText: string, items: AppItem[]) => {
        // 自定义文件搜索逻辑，可以按文件名、扩展名等搜索
        return items.filter((item) => {
          const name = item.name.toLowerCase();
          const query = searchText.toLowerCase();
          return name.includes(query) || name.split(".").pop()?.includes(query);
        });
      },
    },
    {
      id: "applications",
      name: "应用",
      items: [...appApps],
      isDragEnabled: false,
      maxDisplayCount: 24,
      isExpanded: false,
    },
  ];
};

// 执行搜索
const performSearch = async () => {
  try {
    isSearching.value = true;
    console.log("开始搜索应用...");

    const searchQuery = searchText.value.trim();
    const filteredCategories: SearchCategory[] = [];

    // 遍历原始分类数据进行搜索
    for (const category of originalCategories.value) {
      let filteredItems: AppItem[] = [];

      if (searchQuery.length === 0) {
        // 没有搜索条件时显示所有项目
        filteredItems = [...category.items];
      } else {
        // 有搜索条件时进行过滤
        if (category.customSearch) {
          // 使用自定义搜索逻辑
          filteredItems = category.customSearch(searchQuery, category.items);
        } else {
          // 使用默认搜索逻辑（名称包含搜索文本）
          filteredItems = category.items.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
      }

      // 只有当分类有搜索结果时才添加到结果中
      if (filteredItems.length > 0) {
        filteredCategories.push({
          ...category,
          items: filteredItems,
        });
      }
    }

    searchCategories.value = filteredCategories;

    // 更新扁平化项目列表并重置选中索引
    updateFlatItems();
    selectedIndex.value = 0; // 重置为第一项

    showContentArea();

    // 滚动到选中的项目
    scrollToSelectedItem();

    console.log(`搜索完成，找到 ${filteredCategories.length} 个分类`);
  } catch (error) {
    console.error("搜索失败:", error);
    searchCategories.value = [];
    flatItems.value = [];
    selectedIndex.value = 0;
  } finally {
    isSearching.value = false;
  }
};

// 启动应用
const launchApp = async (app: AppItem) => {
  try {
    console.log("启动应用:", app.name, app.path);
    // 调用主进程的启动应用 API
    const success = await api.ipcRouter.appLaunchApp(app.path);
    if (success) {
      console.log("应用启动成功");

      // 更新最近使用记录
      await updateRecentApps(app);

      // 启动成功后可以关闭窗口或清空搜索结果
      searchCategories.value = [];
    } else {
      console.error("应用启动失败");
    }
  } catch (error) {
    console.error("启动应用失败:", error);
  }
};

// 更新最近使用应用记录
const updateRecentApps = async (app: AppItem) => {
  try {
    // 创建应用项副本，添加使用信息
    const appWithUsage: AppItem = {
      ...app,
      lastUsed: Date.now(),
      usageCount: 1,
    };

    updateCategoryInBoth("recent", (recentCategory) => {
      // 检查是否已存在于最近使用列表中
      const existingIndex = recentCategory.items.findIndex(
        (item) => item.path === app.path
      );
      if (existingIndex >= 0) {
        // 更新已存在应用的使用信息
        recentCategory.items[existingIndex].lastUsed = Date.now();
        recentCategory.items[existingIndex].usageCount =
          (recentCategory.items[existingIndex].usageCount || 0) + 1;

        // 移动到列表开头
        const updatedApp = recentCategory.items.splice(existingIndex, 1)[0];
        recentCategory.items.unshift(updatedApp);
      } else {
        // 添加新应用到列表开头
        recentCategory.items.unshift(appWithUsage);
      }

      // 限制最近使用列表长度
      if (recentCategory.items.length > recentCategory.maxDisplayCount) {
        recentCategory.items = recentCategory.items.slice(
          0,
          recentCategory.maxDisplayCount
        );
      }
    });

    // 保存到 electron-store
    const originalRecentCategory = originalCategories.value.find(
      (cat) => cat.id === "recent"
    );
    if (originalRecentCategory) {
      await api.ipcRouter.storeSet(
        "recentApps",
        serializeAppItems(originalRecentCategory.items)
      );
      console.log("最近使用应用记录已更新");
    }
  } catch (error) {
    console.error("更新最近使用应用记录失败:", error);
  }
};

// 处理分类展开/收起
const handleCategoryToggle = (categoryId: string) => {
  updateCategoryInBoth(categoryId, (category) => {
    category.isExpanded = !category.isExpanded;
  });
  // 更新扁平化项目列表
  updateFlatItems();
};

// 处理分类内拖拽排序
const handleCategoryDragEnd = async (categoryId: string, newItems: AppItem[]) => {
  updateCategoryInBoth(categoryId, (category) => {
    category.items = newItems;
  });

  // 根据分类类型保存到对应的 electron-store 字段
  try {
    const serializableItems = serializeAppItems(newItems);

    switch (categoryId) {
      case "pinned":
        await api.ipcRouter.storeSet("pinnedApps", serializableItems);
        console.log("已固定应用排序已保存到 electron-store");
        break;
      case "recent":
        await api.ipcRouter.storeSet("recentApps", serializableItems);
        console.log("最近使用应用排序已保存到 electron-store");
        break;
      case "files":
        await api.ipcRouter.storeSet("fileList", serializableItems);
        console.log("文件列表排序已保存到 electron-store");
        break;
      default:
        console.log(`分类 ${categoryId} 排序已更新，但无需保存到存储`);
    }
  } catch (error) {
    console.error(`保存分类 ${categoryId} 排序失败:`, error);
  }
};

// 处理应用删除
const handleAppDelete = async (app: AppItem, categoryId: string) => {
  updateCategoryInBoth(categoryId, (category) => {
    const index = category.items.findIndex((item) => item.path === app.path);
    if (index > -1) {
      category.items.splice(index, 1);
    }
  });

  // 根据分类类型保存到对应的 electron-store 字段
  try {
    const category = originalCategories.value.find((cat) => cat.id === categoryId);
    if (category) {
      const serializableItems = serializeAppItems(category.items);

      switch (categoryId) {
        case "pinned":
          await api.ipcRouter.storeSet("pinnedApps", serializableItems);
          console.log("已固定应用删除后已保存到 electron-store");
          break;
        case "recent":
          await api.ipcRouter.storeSet("recentApps", serializableItems);
          console.log("最近使用应用删除后已保存到 electron-store");
          break;
        case "files":
          await api.ipcRouter.storeSet("fileList", serializableItems);
          console.log("文件列表删除后已保存到 electron-store");
          break;
        default:
          console.log(`分类 ${categoryId} 删除后已更新，但无需保存到存储`);
      }
    }
  } catch (error) {
    console.error(`保存分类 ${categoryId} 删除后状态失败:`, error);
  }

  // 删除后重新执行搜索，以更新显示的分类（隐藏空分类）
  await performSearch();
};

// 处理应用固定
const handleAppPin = async (app: AppItem, _categoryId: string) => {
  // 创建应用的深拷贝，避免克隆错误
  const appCopy = {
    name: app.name,
    path: app.path,
    icon: app.icon,
    // 只复制可序列化的属性
    ...(app.lastUsed && { lastUsed: app.lastUsed }),
    ...(app.usageCount && { usageCount: app.usageCount }),
  };

  // 添加到固定分类（不移除原分类中的应用）
  updateCategoryInBoth("pinned", (pinnedCategory) => {
    // 检查是否已经固定
    const existingIndex = pinnedCategory.items.findIndex(
      (item) => item.path === app.path
    );
    if (existingIndex === -1) {
      pinnedCategory.items.unshift(appCopy);
    }
  });

  // 保存到 electron-store
  try {
    const pinnedCategory = originalCategories.value.find((cat) => cat.id === "pinned");
    if (pinnedCategory) {
      const serializableItems = serializeAppItems(pinnedCategory.items);
      await api.ipcRouter.storeSet("pinnedApps", serializableItems);
      console.log("应用固定后已保存到 electron-store");
    }
  } catch (error) {
    console.error("保存应用固定状态失败:", error);
  }

  // 固定后重新执行搜索，以更新显示的分类
  await performSearch();
};

// ==================== 监听器 ====================
// 监听搜索结果变化，自动调整窗口大小
watchDebounced(
  () => searchCategories.value.length,
  () => {
    const hasResults = searchCategories.value.some(
      (category) => category.items.length > 0
    );
    if (!hasResults) {
      hideContentArea();
    } else {
      showContentArea();
    }

    if (contentAreaVisible.value) {
      nextTick(() => {
        updateWindowSize();
      });
    }
  },
  { debounce: 100 }
);

// 监听搜索文本变化，如果搜索文本为空，则隐藏内容区域
// watchDebounced(searchText, () => {
//   if (searchText.value.trim().length === 0) {
//     hideContentArea();
//     nextTick(() => {
//       updateWindowSize();
//     });
//   }
// });
// ==================== 窗口焦点管理 ====================
// 处理窗口获得焦点时的行为
const handleWindowFocus = () => {
  // 当窗口获得焦点时，自动聚焦到搜索输入框
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

// ==================== 生命周期 ====================
onMounted(async () => {
  await initAppApps();
  console.log("应用已挂载");
  initializeWindowSize();

  searchText.value = "";
  performSearch();

  // 监听窗口焦点事件
  window.addEventListener("focus", handleWindowFocus);

  // 确保容器可以获得焦点以接收键盘事件
  nextTick(() => {
    const container = document.querySelector(".w-full.h-full.p-\\[4px\\]") as HTMLElement;
    if (container) {
      container.focus();
    }
  });
});

onUnmounted(() => {
  // 清理事件监听器
  window.removeEventListener("focus", handleWindowFocus);
});
</script>

<style scoped>
/* 只保留特殊的样式，如 -webkit-app-region 等无法通过 TailwindCSS 实现的样式 */
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
