<template>
  <div class="w-full h-full overflow-y-auto p-4 space-y-4">
    <div v-for="category in categories" :key="category.id" class="category-section">
      <!-- 分类标题 -->
      <div class="flex items-center justify-between mb-2 px-1">
        <h3 class="text-sm font-medium text-gray-700">{{ category.name }}</h3>
        <div class="flex items-center space-x-2">
          <!-- 显示数量 -->
          <!-- <span class="text-xs text-gray-500">
            {{ category.items.length }}
          </span> -->
          <!-- 展开/收起按钮 -->
          <button
            v-if="category.items.length > category.maxDisplayCount"
            @click="handleCategoryToggle(category.id)"
            class="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {{
              category.isExpanded
                ? `收起(${category.items.length})`
                : `展开(${category.items.length})`
            }}
          </button>
        </div>
      </div>

      <!-- 分类内容 -->
      <VueDraggable
        v-model="category.items"
        :disabled="!category.isDragEnabled"
        @end="() => onDragEnd(category.id)"
        item-key="path"
        class="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9 gap-2 min-h-0"
        ghost-class="sortable-ghost"
        chosen-class="sortable-chosen"
        drag-class="sortable-drag"
      >
        <AppItem
          v-for="app in getDisplayItems(category)"
          :key="`${category.id}-${app.path}`"
          :app="app"
          :category-id="category.id"
          :is-selected="isItemSelected(app, category.id)"
          @app-click="handleAppClick"
          @context-menu="handleContextMenu"
        />
      </VueDraggable>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      :visible="contextMenuVisible"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      :items="contextMenuItems"
      @close="closeContextMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus";
import { ref, computed } from "vue";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu.vue";
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
  if (category.contextMenu?.enableDelete !== false) {
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
  padding-bottom: 1rem;
}

.category-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* VueDraggable 拖拽样式 - 亮色主题 */
.sortable-ghost {
  opacity: 1 !important;
  background: rgba(59, 130, 246, 0.1) !important;
  border: 2px dashed #3b82f6 !important;
  border-radius: 8px !important;
  box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.2) !important;
  transform: none !important;
}

.sortable-ghost * {
  opacity: 0 !important;
  visibility: hidden !important;
}

.sortable-chosen {
  background: #dbeafe !important;
  border: 2px solid #3b82f6 !important;
  transform: scale(1.02) !important;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3) !important;
  border-radius: 8px !important;
  z-index: 1000 !important;
  transition: transform 0.2s ease !important;
}

.sortable-drag {
  opacity: 0.95 !important;
  background: #eff6ff !important;
  border: 2px solid #3b82f6 !important;
  transform: rotate(2deg) scale(1.05) !important;
  z-index: 1001 !important;
  box-shadow: 0 15px 30px rgba(59, 130, 246, 0.4) !important;
  transition: none !important;
}

/* 确保拖拽结束后清除所有变换 */
.draggable-item {
  transform: none !important;
  transition: all 0.2s ease !important;
}

.draggable-item:not(.sortable-chosen):not(.sortable-drag):not(.sortable-ghost) {
  transform: none !important;
}
</style>
