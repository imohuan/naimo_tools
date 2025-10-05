<template>
  <div class="w-full h-full overflow-y-auto p-2 space-y-2">
    <div v-for="category in categories" :key="category.id" class="category-section">
      <!-- 分类标题 -->
      <div class="flex items-center justify-between mb-1 px-1">
        <h3 class="text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-gray-900">
          {{ category.name }}
        </h3>
        <div class="flex items-center space-x-2">
          <!-- 显示数量 -->
          <!-- <span class="text-xs text-gray-500">
            {{ category.items.length }}
          </span> -->
          <!-- 展开/收起按钮 -->
          <button v-if="category.items.length > category.maxDisplayCount" @click="handleCategoryToggle(category.id)"
            class="text-xs text-blue-600 hover:text-blue-800 transition-all duration-200 hover:bg-blue-50 px-2 py-1 rounded-md hover:scale-105 active:scale-95">
            <span class="transition-all duration-200" :class="{ 'rotate-180': category.isExpanded }">
              {{
                category.isExpanded
                  ? `收起(${category.items.length})`
                  : `展开(${category.items.length})`
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- 分类内容 -->
      <div class="category-content overflow-hidden transition-all duration-300 ease-in-out">
        <VueDraggable v-model="category.items" :disabled="!category.isDragEnabled" @end="() => onDragEnd(category.id)"
          item-key="path"
          class="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9 gap-1 min-h-0 transition-all duration-300"
          ghost-class="sortable-ghost" chosen-class="sortable-chosen" drag-class="sortable-drag">
          <AppItem v-for="app in getDisplayItems(category)" :key="`${category.id}-${app.path}`" :app="app"
            :category-id="category.id" :is-selected="isItemSelected(app, category.id)" @app-click="handleAppClick"
            @context-menu="handleContextMenu" />
        </VueDraggable>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu :visible="contextMenuVisible" :x="contextMenuPosition.x" :y="contextMenuPosition.y"
      :items="contextMenuItems" @close="closeContextMenu" />
  </div>
</template>

<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";
import { ref, computed } from "vue";
import ContextMenu, { type ContextMenuItem } from "@/components/ContextMenu/ContextMenu.vue";
import AppItem from "./AppItem.vue";
/** @ts-ignore */
import IconMdiCog from "~icons/mdi/cog";
/** @ts-ignore */
import IconMdiApplication from "~icons/mdi/application";


interface AppItem {
  name: string;
  path: string;
  icon: string | null;
}

interface SearchCategory {
  id: string;
  name: string;
  items: AppItem[];
  isDragEnabled: boolean;
  maxDisplayCount: number;
  isExpanded: boolean;
  customSearch?: (searchText: string, items: AppItem[]) => AppItem[];
  // 是否禁用删除功能
  disableDelete?: boolean;
  // 右键菜单配置
  contextMenu?: {
    enableDelete?: boolean; // 是否启用删除功能
    enablePin?: boolean; // 是否启用固定功能
  };
}

interface Props {
  categories: SearchCategory[];
  selectedIndex: number;
  flatItems: Array<AppItem & { categoryId: string }>;
}

interface Emits {
  (e: "app-click", app: AppItem): void;
  (e: "category-toggle", categoryId: string): void;
  (e: "category-drag-end", categoryId: string, items: AppItem[]): void;
  (e: "app-delete", app: AppItem, categoryId: string): void;
  (e: "app-pin", app: AppItem, categoryId: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 检查项目是否被选中
const isItemSelected = (app: AppItem, categoryId: string): boolean => {
  // 只有当前选中的索引对应的项目才被选中，并且要匹配分类
  const selectedItem = props.flatItems[props.selectedIndex];
  return selectedItem?.path === app.path && selectedItem?.categoryId === categoryId;
};

// 右键菜单状态
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const currentApp = ref<AppItem | null>(null);
const currentCategoryId = ref<string>("");

// 获取分类中应该显示的项目（考虑展开/收起状态）
const getDisplayItems = (category: SearchCategory): AppItem[] => {
  if (category.isExpanded || category.items.length <= category.maxDisplayCount) {
    return category.items;
  }
  return category.items.slice(0, category.maxDisplayCount);
};

const handleAppClick = (app: AppItem) => {
  emit("app-click", app);
};

const handleCategoryToggle = (categoryId: string) => {
  emit("category-toggle", categoryId);
};

const onDragEnd = (categoryId: string) => {
  // 拖拽结束后，将新的顺序发送给父组件
  const category = props.categories.find((cat) => cat.id === categoryId);
  if (category) {
    emit("category-drag-end", categoryId, category.items);
  }
};

// 右键菜单项目
const contextMenuItems = computed((): ContextMenuItem[] => {
  if (!currentApp.value || !currentCategoryId.value) return [];

  const category = props.categories.find(cat => cat.id === currentCategoryId.value);
  if (!category) return [];

  const items: ContextMenuItem[] = [];

  // 固定功能
  if (category.contextMenu?.enablePin !== false) {
    items.push({
      key: 'pin',
      label: '固定到顶部',
      icon: IconMdiCog, // 使用导入的图标组件
      action: () => handleAppPin(currentApp.value!, currentCategoryId.value)
    });
  }

  // 删除功能
  if (category.disableDelete !== true) {
    items.push({
      key: 'delete',
      label: '删除',
      icon: IconMdiApplication, // 使用导入的图标组件
      danger: true,
      action: () => handleAppDelete(currentApp.value!, currentCategoryId.value)
    });
  }

  return items;
});

// 处理右键菜单
const handleContextMenu = (event: MouseEvent, app: AppItem, categoryId: string) => {
  event.preventDefault();
  event.stopPropagation();

  currentApp.value = app;
  currentCategoryId.value = categoryId;
  contextMenuPosition.value = { x: event.clientX, y: event.clientY };
  contextMenuVisible.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  contextMenuVisible.value = false;
  currentApp.value = null;
  currentCategoryId.value = "";
};

// 处理应用删除
const handleAppDelete = (app: AppItem, categoryId: string) => {
  emit("app-delete", app, categoryId);
};

// 处理应用固定
const handleAppPin = (app: AppItem, categoryId: string) => {
  emit("app-pin", app, categoryId);
};
</script>

<style scoped>
.category-section {
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.category-section:hover {
  background: rgba(249, 250, 251, 0.5);
  border-radius: 8px;
}

.category-content {
  position: relative;
}

/* 分类标题悬停效果 */
.category-section:hover h3 {
  color: #1f2937;
  /* transform: translateX(2px); */
}

/* 应用项目的入场动画 */
.draggable-item {
  animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 分类展开时的动画 */
.category-content {
  animation: expandCategory 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes expandCategory {
  from {
    opacity: 0.8;
    transform: scale(0.98);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* VueDraggable 拖拽样式 - 现代化设计 */
.sortable-ghost {
  opacity: 0.3 !important;
  background: rgba(243, 244, 246, 0.8) !important;
  border: 2px dashed rgba(156, 163, 175, 0.6) !important;
  border-radius: 8px !important;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.1) !important;
  transform: scale(0.95) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.sortable-ghost * {
  opacity: 0.5 !important;
  visibility: visible !important;
}

.sortable-chosen {
  background: rgba(243, 244, 246, 0.9) !important;
  border: 2px solid rgba(156, 163, 175, 0.8) !important;
  transform: scale(1.02) translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(156, 163, 175, 0.1) !important;
  border-radius: 8px !important;
  z-index: 1000 !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.sortable-drag {
  opacity: 0.95 !important;
  background: rgba(243, 244, 246, 0.95) !important;
  border: 2px solid rgba(156, 163, 175, 0.9) !important;
  transform: rotate(2deg) scale(1.05) translateY(-2px) !important;
  z-index: 1001 !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(156, 163, 175, 0.15) !important;
  border-radius: 8px !important;
  transition: none !important;
  filter: brightness(1.05) !important;
}

/* 拖拽时的其他项目动画 */
.sortable-chosen~.draggable-item {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 确保拖拽结束后清除所有变换 */
.draggable-item {
  transform: none !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.draggable-item:not(.sortable-chosen):not(.sortable-drag):not(.sortable-ghost) {
  transform: none !important;
}

/* 拖拽时的网格动画 */
.grid {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 拖拽开始时的微妙动画 */
@keyframes dragStart {
  0% {
    transform: scale(1);
  }

  100% {
    transform: scale(1.05) translateY(-2px);
  }
}

.sortable-chosen {
  animation: dragStart 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
}
</style>
