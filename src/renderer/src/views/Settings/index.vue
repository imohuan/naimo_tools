<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-3 text-gray-600">
        <div class="animate-spin text-2xl">⏳</div>
        <span>加载设置中...</span>
      </div>
    </div>

    <!-- 主要内容 -->
    <div v-else class="h-full flex-1 flex flex-col">
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
          :class="
            saveFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'
          "
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

      <!-- 无设置提示 -->
      <div
        v-if="settingsList.length === 0"
        class="flex-1 flex items-center justify-center"
      >
        <div
          class="flex flex-col items-center justify-center text-center text-gray-500"
        >
          <div class="text-6xl mb-4">⚙️</div>
          <p class="text-lg mb-2">暂无可配置项</p>
          <p class="text-sm mb-4">没有可用的设置项</p>
        </div>
      </div>

      <!-- 右侧内容区域：flex 布局 -->
      <div v-if="settingsList.length > 0" class="flex-1 flex flex-col min-h-0">
        <!-- 顶部区域：操作按钮（固定，不滚动） -->
        <div
          class="flex-shrink-0 px-3 py-2 bg-white border border-gray-200 rounded-lg mb-2 mr-2"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-700">设置管理</span>
              <span class="text-xs text-gray-500"
                >({{ settingsList.length }} 个设置组)</span
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
                :disabled="!hasChanges"
                :class="[
                  'px-3 py-1.5 text-sm rounded-md transition-all duration-200',
                  hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                ]"
              >
                保存所有设置
              </button>
            </div>
          </div>
        </div>

        <!-- 设置列表（可滚动区域） -->
        <div class="flex-1 overflow-auto pb-2 min-h-0 pr-1">
          <div class="grid grid-cols-1 gap-2">
            <div
              v-for="settingGroup in settingsList"
              :key="settingGroup.id"
              class="bg-white rounded-lg border border-gray-200 p-2 transition-all duration-200"
            >
              <!-- 设置组头部信息 -->
              <div
                class="flex items-start gap-2 cursor-pointer hover:bg-gray-50 rounded-md p-2 -m-2 transition-colors"
                @click="toggleCollapse(settingGroup.id)"
              >
                <div class="w-8 h-8 flex-shrink-0">
                  <IconDisplay
                    :src="settingGroup.icon"
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
                        {{ settingGroup.name }}
                        <!-- <span
                        v-if="settingGroup.type === 'plugin'"
                        class="bg-gray-100 px-2 py-1 rounded text-xs transform scale-75 origin-center-left inline-block"
                        >v1.0.0</span
                      > -->
                      </h3>
                    </div>
                    <!-- 折叠/展开图标 -->
                    <div class="p-1.5 text-gray-400">
                      <svg
                        :class="[
                          'w-4 h-4 transition-transform duration-200',
                          isCollapsed(settingGroup.id)
                            ? 'rotate-0'
                            : 'rotate-180',
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
                  <p
                    v-if="settingGroup.description"
                    class="text-xs text-gray-500"
                  >
                    {{ settingGroup.description }}
                  </p>
                </div>
              </div>

              <!-- 设置项 -->
              <div
                v-show="!isCollapsed(settingGroup.id)"
                class="overflow-hidden transition-all duration-300 ease-in-out px-2"
              >
                <div class="space-y-1">
                  <SettingItemComponent
                    v-for="setting in settingGroup.settings"
                    :key="setting.name"
                    :setting="setting"
                    :setting-id="settingGroup.id"
                    :value="settingValues[settingGroup.id][setting.name]"
                    @update:value="
                      updateSettingValue(settingGroup.id, setting.name, $event)
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, toRaw, computed } from "vue";
import { useApp } from "@/core";
import { storeUtils } from "@/core/utils/store";
import type { SettingConfig, SettingItem } from "@/typings";
import { appSettingsConfig } from "@/config/appSettings";
import SettingItemComponent from "./SettingItem.vue";
import IconDisplay from "@/components/Common/IconDisplay.vue";

const app = useApp();

// 响应式数据
const loading = ref(true);
const settingsList = ref<SettingItem[]>([]);
const settingValues = ref<Record<string, Record<string, any>>>({});
const initialValues = ref<Record<string, Record<string, any>>>({});

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
const collapsedSettings = ref<Set<string>>(new Set());

// 深度比较两个对象是否相等
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  if (typeof obj1 !== typeof obj2) return false;

  // 处理数组
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    return obj1.every((val, index) => deepEqual(val, obj2[index]));
  }

  // 处理对象
  if (typeof obj1 === "object" && typeof obj2 === "object") {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
  }

  // 基本类型比较
  return obj1 === obj2;
};

// 检测是否有变化
const hasChanges = computed(() => {
  return !deepEqual(settingValues.value, initialValues.value);
});

// 切换折叠状态
const toggleCollapse = (id: string) => {
  if (collapsedSettings.value.has(id)) {
    collapsedSettings.value.delete(id);
  } else {
    collapsedSettings.value.add(id);
  }
};

// 检查是否折叠
const isCollapsed = (id: string) => {
  return collapsedSettings.value.has(id);
};

// 更新设置值
const updateSettingValue = (id: string, settingName: string, value: any) => {
  if (!settingValues.value[id]) {
    settingValues.value[id] = {};
  }
  settingValues.value[id][settingName] = value;
};

// 获取所有设置列表（应用设置 + 插件设置）
const getAllSettings = async () => {
  try {
    loading.value = true;
    const allSettings: SettingItem[] = [];

    // 1. 加载应用设置
    console.log("🔍 加载应用设置配置...");
    for (const appSetting of appSettingsConfig) {
      allSettings.push({
        id: appSetting.id,
        name: appSetting.name,
        icon: appSetting.icon,
        description: appSetting.description,
        settings: appSetting.settings,
        type: "app",
      });
    }

    // 初始化应用设置值 - 直接从 AppConfig 读取对应字段
    for (const appSetting of appSettingsConfig) {
      if (!settingValues.value[appSetting.id]) {
        settingValues.value[appSetting.id] = {};
      }

      for (const setting of appSetting.settings) {
        if (settingValues.value[appSetting.id][setting.name] === undefined) {
          // 从 AppConfig 读取对应字段的值
          const savedValue = await storeUtils.get(setting.name as any);

          if (savedValue !== undefined) {
            settingValues.value[appSetting.id][setting.name] = savedValue;
          } else {
            // 使用默认值
            settingValues.value[appSetting.id][setting.name] =
              getDefaultValue(setting);
          }
        }
      }
    }

    console.log("🔍 已加载的应用设置:", settingValues.value);

    // 2. 加载插件设置
    console.log("🔍 加载插件设置...");
    const installedPlugins = app.plugin.installedPlugins;
    console.log("🔍 已安装的插件数量:", installedPlugins.length);

    // 从存储中加载已保存的插件设置
    const savedPluginSettings =
      ((await storeUtils.get("pluginSettings")) as Record<
        string,
        Record<string, any>
      >) || {};
    console.log("🔍 已保存的插件设置:", savedPluginSettings);

    for (const plugin of installedPlugins) {
      // 检查插件是否有设置项
      if (plugin.settings && plugin.settings.length > 0) {
        console.log(`✅ 插件 ${plugin.id} 有设置项，添加到列表`);
        allSettings.push({
          id: plugin.id,
          name: plugin.name,
          icon: plugin.icon,
          settings: plugin.settings,
          type: "plugin",
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
              savedPluginSettings[plugin.id] &&
              savedPluginSettings[plugin.id][setting.name] !== undefined
            ) {
              settingValues.value[plugin.id][setting.name] =
                savedPluginSettings[plugin.id][setting.name];
            } else {
              // 使用默认值
              settingValues.value[plugin.id][setting.name] =
                getDefaultValue(setting);
            }
          }
        }
      }
    }

    console.log("🔍 最终设置列表:", allSettings);
    settingsList.value = allSettings;

    // 默认全部折叠
    collapsedSettings.value = new Set(allSettings.map((item) => item.id));

    // 保存初始值用于变化检测
    initialValues.value = JSON.parse(JSON.stringify(settingValues.value));
  } catch (error) {
    console.error("获取设置失败:", error);
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
    console.log("保存所有设置:", toRaw(settingValues.value));

    let appSettingsCount = 0;
    let pluginSettingsSuccess = false;

    // 保存应用设置 - 直接设置到 AppConfig 对应字段
    for (const settingGroup of settingsList.value) {
      if (settingGroup.type === "app") {
        for (const setting of settingGroup.settings) {
          const value = settingValues.value[settingGroup.id][setting.name];
          // 使用 JSON 序列化/反序列化确保保存的是纯对象，去除所有 Vue 响应式代理
          const rawValue =
            Array.isArray(value) || (value && typeof value === "object")
              ? JSON.parse(JSON.stringify(value))
              : value;
          await storeUtils.set(setting.name as any, rawValue);
          appSettingsCount++;
        }
      }
    }

    // 保存插件设置
    const pluginSettings: Record<string, Record<string, any>> = {};
    for (const settingGroup of settingsList.value) {
      if (settingGroup.type === "plugin") {
        pluginSettings[settingGroup.id] = toRaw(
          settingValues.value[settingGroup.id]
        );
      }
    }

    if (Object.keys(pluginSettings).length > 0) {
      pluginSettingsSuccess = await storeUtils.set(
        "pluginSettings",
        pluginSettings
      );
    } else {
      pluginSettingsSuccess = true; // 没有插件设置时认为成功
    }

    if (pluginSettingsSuccess) {
      console.log("✅ 所有设置保存成功");
      // 通知主窗口设置已更新
      try {
        await window.naimo.router.appForwardMessageToMainView(
          "settings-updated",
          {
            appSettingsCount,
            pluginSettingsCount: Object.keys(pluginSettings).length,
            timestamp: Date.now(),
          }
        );
        console.log("📡 [Settings] 已通知主窗口设置更新");
      } catch (error) {
        console.error("❌ [Settings] 通知主窗口失败:", error);
      }
      // 更新初始值，表示已保存
      initialValues.value = JSON.parse(JSON.stringify(settingValues.value));
      showSaveFeedback(
        true,
        `所有设置保存成功 (${appSettingsCount} 项应用设置, ${
          Object.keys(pluginSettings).length
        } 个插件)`
      );
    } else {
      console.error("❌ 保存设置失败");
      showSaveFeedback(false, "保存设置失败");
    }
  } catch (error) {
    console.error("❌ 保存设置失败:", error);
    showSaveFeedback(false, `保存设置失败: ${error}`);
  }
};

// 重置所有设置
const resetAllSettings = async () => {
  try {
    // 重置所有设置为默认值
    for (const settingGroup of settingsList.value) {
      for (const setting of settingGroup.settings) {
        const defaultValue = getDefaultValue(setting);
        settingValues.value[settingGroup.id][setting.name] = defaultValue;

        // 应用设置：直接删除 AppConfig 对应字段，让其恢复默认值
        if (settingGroup.type === "app") {
          await storeUtils.delete(setting.name as any);
        }
      }
    }

    // 清空插件设置存储
    await storeUtils.set("pluginSettings", {});

    // 更新初始值，表示已重置
    initialValues.value = JSON.parse(JSON.stringify(settingValues.value));

    showSaveFeedback(
      true,
      `所有设置已重置为默认值 (${settingsList.value.length} 个设置组)`
    );
  } catch (error) {
    console.error("❌ 重置所有设置失败:", error);
    showSaveFeedback(false, `重置所有设置失败: ${error}`);
  }
};

// 组件挂载时获取设置
onMounted(() => {
  setTimeout(() => {
    getAllSettings();
  }, 10);
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
