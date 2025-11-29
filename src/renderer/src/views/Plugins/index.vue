<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 错误提示 -->
    <div
      v-if="pluginStore.error"
      class="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
    >
      <span class="text-red-500 text-lg">❌</span>
      <span class="text-red-700 flex-1">{{ pluginStore.error }}</span>
      <button
        @click="pluginStore.clearError"
        class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
      >
        清除
      </button>
    </div>

    <!-- 主要内容 -->
    <div class="flex-1 flex flex-col">
      <!-- 详情页面 -->
      <PluginDetail
        v-if="selectedPlugin"
        :plugin="selectedPlugin as PluginConfig"
        :is-installed="isPluginInstalled(selectedPlugin.id)"
        :is-loading="isPluginLoading(selectedPlugin.id)"
        :has-update="hasPluginUpdate(selectedPlugin.id)"
        :installed-version="getInstalledPluginVersion(selectedPlugin.id)"
        @close="closePluginDetail"
        @install="installPlugin"
        @uninstall="uninstallPlugin"
        @update="updatePlugin"
      />

      <!-- 插件列表页面 -->
      <template v-else>
        <!-- 顶部区域：搜索框、分类列表、分页 -->
        <div class="px-3 py-1.5 bg-white/95 border border-gray-200 rounded">
          <div class="flex items-center justify-between gap-2">
            <div class="flex-1 flex items-center gap-2">
              <!-- 搜索框 -->
              <div class="relative w-56">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索插件"
                  class="w-full pl-8 pr-3 h-8 text-xs rounded-md border border-gray-200 bg-gray-100/70 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 placeholder-gray-400"
                />
                <div
                  class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <IconMdiMagnify class="w-3.5 h-3.5" />
                </div>
              </div>

              <!-- 分类列表 -->
              <div class="flex items-center gap-1.5">
                <label
                  class="text-xs font-medium text-gray-700 whitespace-nowrap"
                  >分类:</label
                >
                <select
                  v-model="categoryFilter"
                  class="px-2 py-1 border border-gray-200 rounded-md text-xs bg-gray-100/70 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all duration-200 cursor-pointer"
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
            <div class="flex items-center gap-1">
              <button
                @click="previousPage"
                :disabled="currentPage === 1"
                class="p-1 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
                title="上一页"
              >
                <IconMdiChevronLeft
                  class="w-4 h-4 text-gray-600 group-hover:text-gray-800"
                />
              </button>
              <span
                class="px-1.5 py-0.5 text-[11px] text-gray-600 bg-gray-50 rounded-full font-medium"
              >
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="p-1 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
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
          <!-- 空状态 -->
          <div
            v-if="filteredPlugins.length === 0 && !pluginStore.listLoading"
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

          <!-- 插件网格 -->
          <div
            v-else-if="filteredPlugins.length > 0"
            class="grid grid-cols-2 gap-2"
          >
            <PluginCard
              v-for="plugin in paginatedPlugins"
              :key="plugin.id"
              :plugin="plugin as PluginConfig"
              :is-installed="isPluginInstalled(plugin.id)"
              :is-loading="isPluginLoading(plugin.id)"
              :has-update="hasPluginUpdate(plugin.id)"
              @click="showPluginDetail"
              @install="installPlugin"
              @uninstall="uninstallPlugin"
              @update="updatePlugin"
            />
          </div>

          <!-- GitHub插件加载占位符 -->
          <div
            v-if="pluginStore.listLoading"
            class="flex items-center justify-center w-full py-1 animate-fade-in"
          >
            <div class="w-full flex items-center justify-center">
              <div class="flex-1 border-t border-gray-200"></div>
              <span class="mx-4 text-gray-500 text-sm flex items-center gap-2">
                <svg
                  class="animate-spin h-4 w-4 text-blue-400"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                加载GitHub插件中...
              </span>
              <div class="flex-1 border-t border-gray-200"></div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useEventListener } from "@vueuse/core";
import { useApp } from "@/core";
import type { PluginConfig } from "@/typings/pluginTypes";
import {
  PluginCategoryType,
  PLUGIN_CATEGORY_CONFIG,
} from "@/typings/pluginTypes";
import PluginCard from "./PluginCard.vue";
import PluginDetail from "./PluginDetail.vue";
/** @ts-ignore */
import IconMdiChevronLeft from "~icons/mdi/chevron-left";
/** @ts-ignore */
import IconMdiChevronRight from "~icons/mdi/chevron-right";
/** @ts-ignore */
import IconMdiMagnify from "~icons/mdi/magnify";
import { uniqueArrayByProperty } from "@/core/utils/unique";

const app = useApp();
const pluginStore = app.plugin;
const searchQuery = ref("");
const categoryFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 6;
const selectedPlugin = ref<PluginConfig | null>(null);

// 加载状态管理（安装和更新都使用此状态）
const loadingPlugins = ref<Set<string>>(new Set());

// 检查插件是否已安装
const isPluginInstalled = (pluginId: string) => {
  return pluginStore.installedPlugins.some((p) => p.id === pluginId);
};

// 检查插件是否有更新
const hasPluginUpdate = (pluginId: string): boolean => {
  return pluginStore.needUpdatePlugins.some((p) => p.id === pluginId);
};

// 获取已安装插件的版本
const getInstalledPluginVersion = (pluginId: string): string | undefined => {
  const installedPlugin = pluginStore.installedPlugins.find(
    (p) => p.id === pluginId
  );
  return installedPlugin?.version;
};

// 计算过滤后的插件列表
const filteredPlugins = computed(() => {
  const installedPluginIds = new Set(
    pluginStore.installedPlugins.map((p) => p.id)
  );
  let result = [...pluginStore.availablePlugins];

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
      const category =
        plugin.category || getPluginCategory(plugin as PluginConfig);
      return category === categoryFilter.value;
    });
  }

  result = result.filter((plugin) => {
    return ["github", "local"].includes(plugin.options?.pluginType || "");
  });

  // 根据 id 去重
  result = uniqueArrayByProperty(result, "id");

  // 固定排序：按插件ID排序，确保顺序始终不变
  result.sort((a, b) => a.id.localeCompare(b.id));

  return result;
});

// 计算总页数和分页后的插件列表
const totalPages = computed(() =>
  Math.ceil(filteredPlugins.value.length / itemsPerPage)
);

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

// 加载状态相关方法（安装/更新）
const isPluginLoading = (pluginId: string): boolean => {
  return loadingPlugins.value.has(pluginId);
};

const setPluginLoading = (pluginId: string, loading: boolean) => {
  if (loading) {
    loadingPlugins.value.add(pluginId);
  } else {
    loadingPlugins.value.delete(pluginId);
  }
};

// 插件详情相关
const showPluginDetail = (plugin: PluginConfig) => {
  // 如果是已安装的插件，优先查找 GitHub 上的最新版本信息
  if (isPluginInstalled(plugin.id)) {
    const githubPlugin = pluginStore.githubPlugins.find(
      (p) => p.id === plugin.id
    );
    selectedPlugin.value = githubPlugin || plugin;
  } else {
    selectedPlugin.value = plugin;
  }
};

const closePluginDetail = () => {
  selectedPlugin.value = null;
};

// 安装插件
const installPlugin = async (pluginConfig: PluginConfig) => {
  // 防止重复安装
  if (isPluginLoading(pluginConfig.id)) {
    console.warn(`⚠️ 插件正在加载中: ${pluginConfig.id}`);
    return;
  }

  try {
    setPluginLoading(pluginConfig.id, true);

    if (pluginConfig.downloadUrl) {
      console.log(`📦 开始下载插件: ${pluginConfig.id}`);
      console.log(`🔗 下载地址: ${pluginConfig.downloadUrl}`);
      // 设置总超时（5分钟）
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error("插件下载超时（5分钟）"));
        }, 300000);
      });
      // 并发执行下载和超时检查
      await Promise.race([
        pluginStore.install(pluginConfig.downloadUrl),
        timeoutPromise,
      ]);
    } else {
      // 普通安装（无下载）
      await pluginStore.install(pluginConfig);
    }
  } catch (err) {
    console.error(`❌ 安装插件失败: ${pluginConfig.id}`, err);
    if (err instanceof Error) {
      console.error("错误详情:", err.message);
    }
  } finally {
    setPluginLoading(pluginConfig.id, false);
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

// 更新插件
const updatePlugin = async (pluginOldConfig: PluginConfig) => {
  // 防止重复更新
  if (isPluginLoading(pluginOldConfig.id)) {
    console.warn(`⚠️ 插件正在加载中: ${pluginOldConfig.id}`);
    return;
  }

  const pluginConfig = pluginStore.githubPlugins.find(
    (p) => p.id === pluginOldConfig.id
  );

  if (!pluginConfig) {
    console.warn(`⚠️ 插件未找到: ${pluginOldConfig.id}`);
    return;
  }

  try {
    setPluginLoading(pluginConfig.id, true);
    console.log(`🔄 开始更新插件: ${pluginConfig.id}`);
    await pluginStore.update(pluginConfig.id);
    console.log(`✅ 插件更新成功: ${pluginConfig.id}`);
  } catch (err) {
    console.error(`❌ 更新插件失败: ${pluginConfig.id}`, err);
    if (err instanceof Error) {
      console.error("错误详情:", err.message);
    }
  } finally {
    setPluginLoading(pluginConfig.id, false);
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

// 监听页码变化，如果当前页结果不足则加载更多
watch(currentPage, () => {
  // 检查当前页的插件数量是否不足
  if (
    paginatedPlugins.value.length < itemsPerPage &&
    paginatedPlugins.value.length > 0
  ) {
    console.log(
      `📄 当前页码: ${currentPage.value}, 插件数量: ${paginatedPlugins.value.length}, 加载更多...`
    );
    pluginStore.loadMoreGithubPlugins();
  }
});

useEventListener(document, "keydown", handleKeydown);

onMounted(async () => {
  // 确保先显示默认和本地插件，然后异步加载GitHub插件
  console.log("🔌 插件管理器已挂载");
  console.log("📋 当前已安装插件数量:", pluginStore.installedPlugins.length);
  console.log("📋 当前可用插件数量:", pluginStore.availablePlugins.length);

  // 异步加载GitHub插件列表（不阻塞UI）
  pluginStore.loadGithubPlugins();
});
</script>
