<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-600">
        <div class="animate-spin text-2xl">⏳</div>
        <span>加载插件设置中...</span>
      </div>
    </div>

    <!-- 主要内容 -->
    <div v-else class="flex-1 flex flex-col">
      <!-- 保存反馈提示 -->
      <div
        v-if="saveFeedback.show"
        :class="[
          'fixed bottom-4 right-4 z-50 p-3 rounded-lg flex items-center gap-3 transition-all duration-300 shadow-lg max-w-sm',
          saveFeedback.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700',
        ]"
      >
        <span
          :class="saveFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'"
        >
          {{ saveFeedback.type === "success" ? "✅" : "❌" }}
        </span>
        <span class="flex-1 text-sm">{{ saveFeedback.message }}</span>
        <button
          @click="saveFeedback.show = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- 无插件设置提示 -->
      <div
        v-if="pluginSettingsList.length === 0"
        class="flex-1 flex items-center justify-center"
      >
        <div class="flex flex-col items-center justify-center text-center text-gray-500">
          <div class="text-6xl mb-4">⚙️</div>
          <p class="text-lg mb-2">暂无插件设置</p>
          <p class="text-sm mb-4">已安装的插件还没有提供可配置的设置项</p>
        </div>
      </div>

      <!-- 顶部区域：操作按钮 -->
      <div
        v-if="pluginSettingsList.length > 0"
        class="px-3 py-2 bg-white border border-gray-200 rounded-lg"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-gray-700">插件设置管理</span>
            <span class="text-xs text-gray-500"
              >({{ pluginSettingsList.length }} 个插件)</span
            >
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="resetAllSettings"
              class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-all duration-200 border border-gray-300"
            >
              重置所有设置
            </button>
            <button
              @click="saveAllSettings"
              class="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-all duration-200"
            >
              保存所有设置
            </button>
          </div>
        </div>
      </div>

      <!-- 插件设置列表 -->
      <div v-if="pluginSettingsList.length > 0" class="flex-1 pt-2 flex flex-col pb-2">
        <div class="grid grid-cols-1 gap-2">
          <div
            v-for="pluginSetting in pluginSettingsList"
            :key="pluginSetting.pluginId"
            class="bg-white rounded-lg border border-gray-200 p-2 transition-all duration-200"
          >
            <!-- 插件头部信息 -->
            <div
              class="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
              @click="toggleCollapse(pluginSetting.pluginId)"
            >
              <div class="w-8 h-8 flex-shrink-0">
                <IconDisplay
                  :src="pluginSetting.icon"
                  container-class="w-full h-full bg-gray-100 rounded"
                  fallback-class="w-full h-full flex items-center justify-center bg-gray-100 rounded"
                >
                  <template #fallback>
                    <span class="text-blue-600 text-sm">🔧</span>
                  </template>
                </IconDisplay>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <h3 class="text font-semibold text-gray-900">
                      {{ pluginSetting.pluginName }}
                      <span
                        class="bg-gray-100 px-2 py-1 rounded text-xs transform scale-75 origin-center-left inline-block"
                        >v1.0.0</span
                      >
                    </h3>
                  </div>
                  <!-- 折叠/展开图标 -->
                  <div class="p-1.5 text-gray-400">
                    <svg
                      :class="[
                        'w-4 h-4 transition-transform duration-200',
                        isCollapsed(pluginSetting.pluginId) ? 'rotate-0' : 'rotate-180',
                      ]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <!-- 设置项 -->
            <div
              v-show="!isCollapsed(pluginSetting.pluginId)"
              class="overflow-hidden transition-all duration-300 ease-in-out px-2"
            >
              <div class="space-y-1">
                <SettingItem
                  v-for="setting in pluginSetting.settings"
                  :key="setting.name"
                  :setting="setting"
                  :plugin-id="pluginSetting.pluginId"
                  :value="settingValues[pluginSetting.pluginId][setting.name]"
                  @update:value="
                    updateSettingValue(pluginSetting.pluginId, setting.name, $event)
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, toRaw } from "vue";
import { useApp } from "@/temp_code";
import { ElectronStoreBridge } from "@/core/store/ElectronStoreBridge";
import type { SettingConfig } from "@/typings/pluginTypes";
import SettingItem from "./SettingItem.vue";
import IconDisplay from "@/components/IconDisplay.vue";

const app = useApp();

// 插件设置项接口
interface PluginSettingItem {
  pluginId: string;
  pluginName: string;
  icon?: string;
  settings: SettingConfig[];
}

// 响应式数据
const loading = ref(true);
const pluginSettingsList = ref<PluginSettingItem[]>([]);
const settingValues = ref<Record<string, Record<string, any>>>({});
const storeBridge = ElectronStoreBridge.getInstance();

// 保存反馈状态
const saveFeedback = ref<{
  show: boolean;
  type: "success" | "error";
  message: string;
}>({
  show: false,
  type: "success",
  message: "",
});

// 折叠状态管理
const collapsedPlugins = ref<Set<string>>(new Set());

// 切换折叠状态
const toggleCollapse = (pluginId: string) => {
  if (collapsedPlugins.value.has(pluginId)) {
    collapsedPlugins.value.delete(pluginId);
  } else {
    collapsedPlugins.value.add(pluginId);
  }
};

// 检查是否折叠
const isCollapsed = (pluginId: string) => {
  return collapsedPlugins.value.has(pluginId);
};

// 更新设置值
const updateSettingValue = (pluginId: string, settingName: string, value: any) => {
  if (!settingValues.value[pluginId]) {
    settingValues.value[pluginId] = {};
  }
  settingValues.value[pluginId][settingName] = value;
};

// 获取插件设置列表
const getPluginSettings = async () => {
  try {
    loading.value = true;
    const settingsList: PluginSettingItem[] = [];

    // 获取所有已安装的插件
    const installedPlugins = app.plugin.installedPlugins;
    console.log("🔍 已安装的插件数量:", installedPlugins.length);
    console.log(
      "🔍 已安装的插件列表:",
      installedPlugins.map((p) => ({
        id: p.id,
        name: p.name,
        hasSettings: !!p.settings,
        settingsCount: p.settings?.length || 0,
      }))
    );

    // 从存储中加载已保存的插件设置
    const savedSettings =
      ((await storeBridge.get("pluginSettings")) as Record<
        string,
        Record<string, any>
      >) || {};
    console.log("🔍 已保存的插件设置:", savedSettings);

    for (const plugin of installedPlugins) {
      console.log(`🔍 检查插件 ${plugin.id}:`, {
        hasSettings: !!plugin.settings,
        settingsCount: plugin.settings?.length || 0,
        settings: plugin.settings,
      });

      // 检查插件是否有设置项
      if (plugin.settings && plugin.settings.length > 0) {
        console.log(`✅ 插件 ${plugin.id} 有设置项，添加到列表`);
        settingsList.push({
          pluginId: plugin.id,
          pluginName: plugin.name,
          icon: plugin.icon,
          settings: plugin.settings,
        });

        // 初始化设置值
        if (!settingValues.value[plugin.id]) {
          settingValues.value[plugin.id] = {};
        }

        // 为每个设置项设置值（优先使用已保存的值，否则使用默认值）
        for (const setting of plugin.settings) {
          if (settingValues.value[plugin.id][setting.name] === undefined) {
            // 优先使用已保存的设置值
            if (
              savedSettings[plugin.id] &&
              savedSettings[plugin.id][setting.name] !== undefined
            ) {
              settingValues.value[plugin.id][setting.name] =
                savedSettings[plugin.id][setting.name];
            } else {
              // 使用默认值
              settingValues.value[plugin.id][setting.name] = getDefaultValue(setting);
            }
          }
        }
      } else {
        console.log(`❌ 插件 ${plugin.id} 没有设置项`);
      }
    }

    console.log("🔍 最终设置列表:", settingsList);
    pluginSettingsList.value = settingsList;

    // 默认全部折叠
    collapsedPlugins.value = new Set(settingsList.map((plugin) => plugin.pluginId));
  } catch (error) {
    console.error("获取插件设置失败:", error);
  } finally {
    loading.value = false;
  }
};

// 获取默认值
const getDefaultValue = (setting: SettingConfig): any => {
  if (setting.defaultValue !== undefined) {
    if (typeof setting.defaultValue === "function") {
      return setting.defaultValue();
    }
    return setting.defaultValue;
  }

  // 根据类型返回默认值
  switch (setting.type) {
    case "checkbox":
      return false;
    case "number":
    case "range":
      return 0;
    case "color":
      return "#000000";
    default:
      return "";
  }
};

// 显示保存反馈
const showSaveFeedback = (success: boolean, message: string) => {
  console.log("🔔 显示反馈:", { success, message });
  saveFeedback.value = {
    show: true,
    type: success ? "success" : "error",
    message,
  };

  // 3秒后自动隐藏
  setTimeout(() => {
    saveFeedback.value.show = false;
    console.log("🔔 反馈已隐藏");
  }, 3000);
};

// 保存所有设置
const saveAllSettings = async () => {
  try {
    console.log("保存所有插件设置:", toRaw(settingValues.value));

    // 获取当前已保存的所有插件设置
    const currentPluginSettings =
      ((await storeBridge.get("pluginSettings")) as Record<
        string,
        Record<string, any>
      >) || {};

    // 更新所有插件的设置
    for (const pluginId in settingValues.value) {
      currentPluginSettings[pluginId] = toRaw(settingValues.value[pluginId]);
    }

    // 保存到存储
    const success = await storeBridge.set("pluginSettings", toRaw(currentPluginSettings));

    if (success) {
      console.log("✅ 所有插件设置保存成功");
      showSaveFeedback(
        true,
        `所有插件设置保存成功 (${Object.keys(settingValues.value).length} 个插件)`
      );
    } else {
      console.error("❌ 保存所有插件设置失败");
      showSaveFeedback(false, "保存所有插件设置失败");
    }
  } catch (error) {
    console.error("❌ 保存所有插件设置失败:", error);
    showSaveFeedback(false, `保存所有插件设置失败: ${error}`);
  }
};

// 重置所有设置
const resetAllSettings = async () => {
  try {
    // 重置所有插件的设置为默认值
    for (const pluginSetting of pluginSettingsList.value) {
      const plugin = app.plugin.installedPlugins.find(
        (p) => p.id === pluginSetting.pluginId
      );
      if (plugin && plugin.settings) {
        for (const setting of plugin.settings) {
          settingValues.value[pluginSetting.pluginId][setting.name] = getDefaultValue(
            setting
          );
        }
      }
    }

    // 从存储中删除所有插件设置
    await storeBridge.set("pluginSettings", {});

    showSaveFeedback(
      true,
      `所有插件设置已重置为默认值 (${pluginSettingsList.value.length} 个插件)`
    );
  } catch (error) {
    console.error("❌ 重置所有插件设置失败:", error);
    showSaveFeedback(false, `重置所有插件设置失败: ${error}`);
  }
};

// 组件挂载时获取设置
onMounted(() => {
  getPluginSettings();
});
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
