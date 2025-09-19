<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 错误提示 -->
    <div v-if="pluginStore.error"
      class="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
      <span class="text-red-500 text-lg">❌</span>
      <span class="text-red-700 flex-1">{{ pluginStore.error }}</span>
      <button @click="pluginStore.clearError"
        class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors">
        清除
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="pluginStore.loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-600">
        <div class="animate-spin text-2xl">⏳</div>
        <span>加载插件中...</span>
      </div>
    </div>

    <!-- 主要内容 -->
    <div v-else class="flex-1 flex flex-col">
      <!-- 详情页面 -->
      <PluginDetail v-if="selectedPlugin" :plugin="selectedPlugin as PluginConfig"
        :is-installed="pluginStore.isPluginInstalled(selectedPlugin.id)" @close="closePluginDetail"
        @install="installPlugin" @uninstall="uninstallPlugin" />

      <!-- 插件列表页面 -->
      <template v-else>
        <!-- 顶部区域：搜索框、分类列表、分页 -->
        <div class="px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 flex items-center gap-3">
              <!-- 搜索框 -->
              <div class="relative w-48">
                <input v-model="searchQuery" type="text" placeholder="搜索插件"
                  class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 placeholder-gray-500" />
                <div class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  🔍
                </div>
              </div>

              <!-- 分类列表 -->
              <div class="flex items-center gap-1.5">
                <label class="text-xs font-medium text-gray-700 whitespace-nowrap">分类:</label>
                <select v-model="categoryFilter"
                  class="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 cursor-pointer">
                  <option value="all">全部</option>
                  <option value="installed">已安装</option>
                  <option value="available">可安装</option>
                  <option v-for="(config, category) in PLUGIN_CATEGORY_CONFIG" :key="category" :value="category">
                    {{ config.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- 分页控件 -->
            <div class="flex items-center gap-1.5">
              <button @click="previousPage" :disabled="currentPage === 1"
                class="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                title="上一页">
                <IconMdiChevronLeft class="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
              </button>
              <span class="px-2 py-1.5 text-xs text-gray-600 bg-gray-50 rounded-md font-medium">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button @click="nextPage" :disabled="currentPage === totalPages"
                class="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                title="下一页">
                <IconMdiChevronRight class="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
              </button>
            </div>
          </div>
        </div>

        <!-- 插件列表 -->
        <div class="flex-1 pt-2 flex flex-col pb-2">
          <div v-if="filteredPlugins.length === 0" class="flex-1 flex items-center justify-center">
            <div class="flex flex-col items-center justify-center text-center text-gray-500">
              <div class="text-6xl mb-4">📦</div>
              <p class="text-lg mb-2">暂无插件</p>
              <p class="text-sm mb-4">
                {{ searchQuery ? "没有找到匹配的插件" : "还没有安装任何插件" }}
              </p>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 gap-2">
            <PluginCard v-for="plugin in paginatedPlugins" :key="plugin.id" :plugin="plugin as PluginConfig"
              :is-installed="pluginStore.isPluginInstalled(plugin.id)" @click="showPluginDetail"
              @install="installPlugin" @uninstall="uninstallPlugin" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { usePluginStore } from "@/store/modules/plugin";
import type { PluginConfig } from "@/typings/plugin-types";
import { PluginCategoryType, PLUGIN_CATEGORY_CONFIG } from "@/typings/plugin-types";
import PluginCard from "./PluginCard.vue";
import PluginDetail from "./PluginDetail.vue";

const pluginStore = usePluginStore();

const searchQuery = ref("");
const categoryFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 6;
const selectedPlugin = ref<PluginConfig | null>(null);

// 计算过滤后的插件列表
const filteredPlugins = computed(() => {
  const installedPluginIds = new Set(pluginStore.installedPlugins.map((p) => p.id));
  let result = [...pluginStore.pluginList];

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

      if (categoryFilter.value === "installed") {
        return isInstalled;
      } else if (categoryFilter.value === "available") {
        return !isInstalled;
      }

      // 按插件类型过滤
      const category = plugin.category || getPluginCategory(plugin as PluginConfig);
      return category === categoryFilter.value;
    });
  }

  return result;
});

// 计算总页数和分页后的插件列表
const totalPages = computed(() => Math.ceil(filteredPlugins.value.length / itemsPerPage));
const paginatedPlugins = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredPlugins.value.slice(start, start + itemsPerPage);
});

// 分页方法
const previousPage = () => currentPage.value > 1 && currentPage.value--;
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

// 获取插件分类
const getPluginCategory = (plugin: PluginConfig): string => {
  if (plugin.category) return plugin.category;

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

// 插件详情相关
const showPluginDetail = (plugin: PluginConfig) => {
  selectedPlugin.value = plugin;
};
const closePluginDetail = () => {
  selectedPlugin.value = null;
};

// 安装插件
const installPlugin = async (pluginConfig: PluginConfig) => {
  try {
    const success = await pluginStore.install(pluginConfig);
    if (success) {
      console.log(`✅ 插件安装成功: ${pluginConfig.id}`);
    }
  } catch (err) {
    console.error(`❌ 安装插件失败: ${pluginConfig.id}`, err);
  }
};

// 卸载插件
const uninstallPlugin = async (pluginId: string) => {
  try {
    const success = await pluginStore.uninstall(pluginId);
    if (success) {
      console.log(`✅ 插件卸载成功: ${pluginId}`);
    }
  } catch (err) {
    console.error(`❌ 卸载插件失败: ${pluginId}`, err);
  }
};

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && selectedPlugin.value) {
    event.preventDefault();
    closePluginDetail();
    return;
  }

  if (selectedPlugin.value) return;

  if (event.key === "ArrowLeft" || event.key === "Numpad4") {
    event.preventDefault();
    previousPage();
  } else if (event.key === "ArrowRight" || event.key === "Numpad6") {
    event.preventDefault();
    nextPage();
  }
};

// 监听过滤条件变化，重置分页
watch([searchQuery, categoryFilter], () => {
  currentPage.value = 1;
});

useEventListener(document, "keydown", handleKeydown);
</script>
