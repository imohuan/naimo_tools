<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 错误提示 -->
    <div
      v-if="error"
      class="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
    >
      <span class="text-red-500 text-lg">❌</span>
      <span class="text-red-700 flex-1">{{ error }}</span>
      <button
        @click="clearError"
        class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
      >
        清除
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-600">
        <div class="animate-spin text-2xl">⏳</div>
        <span>加载插件中...</span>
      </div>
    </div>

    <!-- 主要内容 -->
    <div v-else class="flex-1 flex flex-col">
      <!-- 详情页面 -->
      <PluginDetail
        v-if="selectedPlugin"
        :plugin="selectedPlugin"
        :is-installed="isPluginInstalled(selectedPlugin.id)"
        @close="closePluginDetail"
        @install="installExamplePlugin"
        @uninstall="uninstallPlugin"
      />

      <!-- 插件列表页面 -->
      <template v-else>
        <!-- 顶部区域：搜索框、分类列表、分页 -->
        <div class="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 flex items-center gap-3">
              <!-- 搜索框 -->
              <div class="relative w-48">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索插件"
                  class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 placeholder-gray-500"
                />
                <div
                  class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"
                >
                  🔍
                </div>
              </div>

              <!-- 分类列表 -->
              <div class="flex items-center gap-1.5">
                <label class="text-xs font-medium text-gray-700 whitespace-nowrap"
                  >分类:</label
                >
                <select
                  v-model="categoryFilter"
                  class="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 cursor-pointer"
                >
                  <option value="all">全部</option>
                  <option value="installed">已安装</option>
                  <option value="available">可安装</option>
                  <option
                    v-for="(config, category) in PLUGIN_CATEGORY_CONFIG"
                    :key="category"
                    :value="category"
                  >
                    {{ config.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 分页控件 -->
            <div class="flex items-center gap-1.5">
              <button
                @click="previousPage"
                :disabled="currentPage === 1"
                class="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                title="上一页"
              >
                <IconMdiChevronLeft
                  class="w-4 h-4 text-gray-600 group-hover:text-gray-800"
                />
              </button>
              <span
                class="px-2 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-md font-medium"
              >
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                title="下一页"
              >
                <IconMdiChevronRight
                  class="w-4 h-4 text-gray-600 group-hover:text-gray-800"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- 插件列表 -->
        <div class="flex-1 pt-2 flex flex-col pb-2">
          <div
            v-if="filteredPlugins.length === 0"
            class="flex-1 flex items-center justify-center"
          >
            <div
              class="flex flex-col items-center justify-center text-center text-gray-500"
            >
              <div class="text-6xl mb-4">📦</div>
              <p class="text-lg mb-2">暂无插件</p>
              <p class="text-sm mb-4">
                {{ searchQuery ? "没有找到匹配的插件" : "还没有安装任何插件" }}
              </p>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <PluginCard
              v-for="plugin in paginatedPlugins"
              :key="plugin.id"
              :plugin="plugin"
              :is-installed="isPluginInstalled(plugin.id)"
              @click="showPluginDetail"
              @install="installExamplePlugin"
              @uninstall="uninstallPlugin"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { usePluginManager } from "../index";
import { examplePlugins } from "../index";
import type { PluginConfig } from "@/typings/plugin-types";
import { PluginCategoryType, PLUGIN_CATEGORY_CONFIG } from "@/typings/plugin-types";
import PluginCard from "./PluginCard.vue";
import PluginDetail from "./PluginDetail.vue";

const {
  plugins,
  loading,
  error,
  loadPlugins,
  installPlugin,
  uninstallPlugin,
  isPluginInstalled,
  clearError,
} = usePluginManager();

const searchQuery = ref("");
const categoryFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 6; // 每页显示6个项目（3行2列）

// 详情页面状态
const selectedPlugin = ref<PluginConfig | null>(null);

// 计算过滤后的插件列表
const filteredPlugins = computed(() => {
  // 获取已安装插件的ID集合
  const installedPluginIds = new Set(plugins.value.map((p) => p.id));

  // // 合并插件列表，避免重复
  // let result = [...plugins.value]; // 先添加已安装的插件
  // // 添加未安装的示例插件
  // const availablePlugins = examplePlugins.filter(
  //   (plugin) => !installedPluginIds.has(plugin.id)
  // );
  // result = [...result, ...availablePlugins];

  // 直接使用examplePlugins作为基础列表，保持固定顺序
  let result = [...examplePlugins];

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (plugin) =>
        plugin.name.toLowerCase().includes(query) ||
        plugin.description?.toLowerCase().includes(query) ||
        plugin.author?.toLowerCase().includes(query)
    );
  }

  // 分类过滤
  if (categoryFilter.value !== "all") {
    result = result.filter((plugin) => {
      const isInstalled = installedPluginIds.has(plugin.id);

      // 按安装状态过滤
      if (categoryFilter.value === "installed") {
        return isInstalled;
      } else if (categoryFilter.value === "available") {
        return !isInstalled;
      }

      // 按插件类型过滤
      const category = getPluginCategory(plugin);
      return category === categoryFilter.value;
    });
  }

  return result;
});

// 计算总页数
const totalPages = computed(() => {
  return Math.ceil(filteredPlugins.value.length / itemsPerPage);
});

// 计算分页后的插件列表
const paginatedPlugins = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredPlugins.value.slice(start, end);
});

// 分页方法
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// 获取插件分类
const getPluginCategory = (plugin: PluginConfig): string => {
  // 优先使用插件配置的分类字段
  if (plugin.category) return plugin.category;

  // 如果没有分类字段，则根据插件ID和名称进行推断
  if (plugin.id.includes("system") || plugin.name.includes("系统")) {
    return PluginCategoryType.SYSTEM_TOOLS;
  } else if (
    plugin.id.includes("web") ||
    plugin.name.includes("网页") ||
    plugin.name.includes("Web")
  ) {
    return PluginCategoryType.DEVELOPER_ESSENTIALS;
  } else {
    return PluginCategoryType.OTHER;
  }
};

// 显示插件详情
const showPluginDetail = (plugin: PluginConfig) => {
  selectedPlugin.value = plugin;
};

// 关闭插件详情
const closePluginDetail = () => {
  selectedPlugin.value = null;
};

// 安装示例插件
const installExamplePlugin = async (pluginConfig: PluginConfig): Promise<void> => {
  try {
    const success = await installPlugin(pluginConfig);
    if (success) {
      console.log(`✅ 示例插件安装成功: ${pluginConfig.id}`);
    }
  } catch (err) {
    console.error(`❌ 安装示例插件失败: ${pluginConfig.id}`, err);
  }
};

// 键盘事件处理函数
const handleKeydown = (event: KeyboardEvent) => {
  // 如果详情页面打开，ESC键关闭详情页面
  if (event.key === "Escape" && selectedPlugin.value) {
    event.preventDefault();
    closePluginDetail();
    return;
  }

  // 如果详情页面打开，不处理分页快捷键
  if (selectedPlugin.value) {
    return;
  }

  // 检查是否按下了小键盘的左右键
  if (event.key === "ArrowLeft" || event.key === "Numpad4") {
    // 小键盘4或左箭头键 - 上一页
    event.preventDefault();
    previousPage();
  } else if (event.key === "ArrowRight" || event.key === "Numpad6") {
    // 小键盘6或右箭头键 - 下一页
    event.preventDefault();
    nextPage();
  }
};

// 监听过滤条件变化，重置分页
watch([searchQuery, categoryFilter], () => {
  currentPage.value = 1;
});

// 组件挂载时加载插件和添加键盘事件监听
onMounted(() => {
  loadPlugins();
  // 添加键盘事件监听器
  document.addEventListener("keydown", handleKeydown);
});

// 组件卸载时移除键盘事件监听器
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
});
</script>
