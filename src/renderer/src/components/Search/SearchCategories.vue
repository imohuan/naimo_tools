<template>
  <div class="w-full h-full overflow-y-auto p-2 space-y-2">
    <div
      v-for="category in categories"
      :key="category.id"
      class="category-section"
    >
      <!-- 分类标题 -->
      <div class="flex items-center justify-between mb-1 px-1">
        <h3 class="text-sm font-medium text-gray-700">
          {{ category.name }}
        </h3>
        <div class="flex items-center space-x-2">
          <!-- 显示数量 -->
          <!-- <span class="text-xs text-gray-500">
            {{ category.items.length }}
          </span> -->
          <!-- 展开/收起按钮 -->
          <button
            v-if="category.items.length > category.maxDisplayCount"
            @click="handleCategoryToggle(category.id)"
            class="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded-md"
          >
            <span :class="{ 'rotate-180': category.isExpanded }">
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
      <div class="category-content overflow-hidden">
        <VueDraggable
          v-model="category.items"
          :disabled="!category.isDragEnabled"
          @end="() => onDragEnd(category.id)"
          item-key="fullPath"
          class="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9 gap-1 min-h-0"
          ghost-class="sortable-ghost"
          chosen-class="sortable-chosen"
          drag-class="sortable-drag"
        >
          <AppItemComponent
            v-for="app in getDisplayItems(category)"
            :key="`${category.id}-${app.fullPath || app.path}`"
            :app="app"
            :category-id="category.id"
            :is-selected="isItemSelected(app, category.id)"
            @app-click="handleAppClick"
            @context-menu="handleContextMenu"
          />
        </VueDraggable>
      </div>
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
import ContextMenu, {
  type ContextMenuItem,
} from "@/components/ContextMenu/ContextMenu.vue";
import AppItemComponent from "./AppItem.vue";
import type { AppItem } from "@/core/typings/search";
import type { SearchCategory } from "@/typings/searchTypes";
import { usePluginStoreNew } from "@/core";
/** @ts-ignore */
import IconMdiCog from "~icons/mdi/cog";
/** @ts-ignore */
import IconMdiApplication from "~icons/mdi/application";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiClose from "~icons/mdi/close";
import type { PluginItem } from "@/typings";

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
const pluginStore = usePluginStoreNew();

// 检查项目是否被选中
const isItemSelected = (app: AppItem, categoryId: string): boolean => {
  // 只有当前选中的索引对应的项目才被选中，并且要匹配分类
  const selectedItem = props.flatItems[props.selectedIndex];

  // 使用 fullPath 作为唯一标识
  const appIdentifier = app.fullPath || app.path;
  const selectedIdentifier = selectedItem?.fullPath || selectedItem?.path;

  return (
    selectedIdentifier === appIdentifier &&
    selectedItem?.categoryId === categoryId
  );
};

// 右键菜单状态
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const currentApp = ref<AppItem | null>(null);
const currentCategoryId = ref<string>("");

// 获取分类中应该显示的项目（考虑展开/收起状态）
const getDisplayItems = (category: SearchCategory): AppItem[] => {
  if (
    category.isExpanded ||
    category.items.length <= category.maxDisplayCount
  ) {
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

// 检查是否是临时插件
const isTempPlugin = computed(() => {
  if (!currentApp.value?.fullPath) return false;
  return pluginStore.temporaryFullPaths.includes(currentApp.value.fullPath);
});

// 右键菜单项目
const contextMenuItems = computed((): ContextMenuItem[] => {
  if (!currentApp.value || !currentCategoryId.value) return [];

  const items: ContextMenuItem[] = [];

  // 临时插件刷新功能
  if (isTempPlugin.value) {
    items.push({
      key: "refresh",
      label: "刷新插件",
      icon: IconMdiRefresh,
      action: () => handlePluginRefresh(currentApp.value!),
    });
    items.push({
      key: "uninstall",
      label: "卸载插件",
      icon: IconMdiClose,
      danger: true,
      action: () => handlePluginUninstall(currentApp.value!),
    });
  }

  // 固定功能 - 基于 item 的 __metadata 配置
  if (
    currentApp.value.__metadata?.enablePin === true &&
    currentApp.value.type === "text"
  ) {
    items.push({
      key: "pin",
      label: "固定到顶部",
      icon: IconMdiCog, // 使用导入的图标组件
      action: () => handleAppPin(currentApp.value!, currentCategoryId.value),
    });
  }

  // 删除功能 - 基于 item 的 __metadata 配置
  if (currentApp.value.__metadata?.enableDelete === true) {
    items.push({
      key: "delete",
      label: "删除",
      icon: IconMdiApplication, // 使用导入的图标组件
      danger: true,
      action: () => handleAppDelete(currentApp.value!, currentCategoryId.value),
    });
  }

  return items;
});

// 处理右键菜单
const handleContextMenu = (
  event: MouseEvent,
  app: AppItem,
  categoryId: string
) => {
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

// 处理插件刷新
const handlePluginRefresh = (app: AppItem) => {
  console.log("刷新插件:", app.name, app.fullPath, app, pluginStore);
  if (!(app as PluginItem).pluginId) return;
  const pluginItem = pluginStore.getPlugin((app as PluginItem).pluginId!);
  if (!pluginItem || !pluginItem.options?.temporaryPath) return;
  pluginStore.install(pluginItem.options.temporaryPath, true);
};

// 处理插件卸载
const handlePluginUninstall = (app: AppItem) => {
  console.log("卸载插件:", app.name, app.fullPath);
  if (!(app as PluginItem).pluginId) return;
  pluginStore.uninstall((app as PluginItem).pluginId!);
};
</script>

<style scoped>
.category-section {
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 0.5rem;
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
}

/* VueDraggable 拖拽样式 - 简化版本，移除动画 */
.sortable-ghost {
  opacity: 0.3 !important;
  background: rgba(243, 244, 246, 0.8) !important;
  border: 2px dashed rgba(156, 163, 175, 0.6) !important;
  border-radius: 8px !important;
  box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.1) !important;
  transform: scale(0.95) !important;
}

.sortable-ghost * {
  opacity: 0.5 !important;
  visibility: visible !important;
}

.sortable-chosen {
  background: rgba(243, 244, 246, 0.9) !important;
  border: 2px solid rgba(156, 163, 175, 0.8) !important;
  transform: scale(1.02) translateY(-1px) !important;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.15),
    0 0 0 2px rgba(156, 163, 175, 0.1) !important;
  border-radius: 8px !important;
  z-index: 1000 !important;
}

.sortable-drag {
  opacity: 0.95 !important;
  background: rgba(243, 244, 246, 0.95) !important;
  border: 2px solid rgba(156, 163, 175, 0.9) !important;
  transform: rotate(2deg) scale(1.05) translateY(-2px) !important;
  z-index: 1001 !important;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.2),
    0 0 0 3px rgba(156, 163, 175, 0.15) !important;
  border-radius: 8px !important;
  filter: brightness(1.05) !important;
}

/* 确保拖拽结束后清除所有变换 */
.draggable-item {
  transform: none !important;
}

.draggable-item:not(.sortable-chosen):not(.sortable-drag):not(.sortable-ghost) {
  transform: none !important;
}
</style>
