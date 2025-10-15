<!--
  插件设置按钮组件
  提供插件设置菜单功能，通过 IPC 读写设置
-->
<template>
  <div
    class="h-full overflow-hidden flex items-center justify-center"
    :style="{ width: iconWidth }"
    @click="showPluginMenu"
  >
    <button
      class="aspect-square h-full py-3 text-gray-500 transition-colors duration-200 rounded-lg flex items-center justify-center"
      :title="buttonTitle"
    >
      <!-- 三个点图标 - 用于主渲染进程 -->
      <IconMdiDotsVertical
        v-if="iconType === 'dots'"
        class="w-5 h-5 hover:text-gray-700"
      />
      <!-- 横线菜单图标 - 用于分离窗口 -->
      <IconMdiMenu
        v-else-if="iconType === 'menu'"
        class="w-5 h-5 hover:text-gray-700"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PluginSetting } from "@/core/typings/plugin";
// @ts-ignore
import IconMdiDotsVertical from "~icons/mdi/dots-vertical";
// @ts-ignore
import IconMdiMenu from "~icons/mdi/menu";

/** 组件属性 */
interface Props {
  /** 插件ID（必需） */
  pluginId: string;
  /** 插件名称（可选，用于按钮标题） */
  pluginName?: string;
  /** 图标类型：dots - 三个点图标, menu - 横线菜单图标 */
  iconType?: "dots" | "menu";
  /** 图标宽度 */
  iconWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pluginName: "插件",
  iconType: "dots",
  iconWidth: "20px",
});

// 插件设置选项
const pluginOptions = [
  { key: "autoSeparate" as keyof PluginSetting, label: "自动分离为独立窗口" },
  {
    key: "backgroundRun" as keyof PluginSetting,
    label: "退出到副窗口时继续运行",
  },
  {
    key: "followMainProgram" as keyof PluginSetting,
    label: "跟随主程序同时启动",
  },
];

// 按钮标题
const buttonTitle = computed(() => `${props.pluginName}设置`);

/**
 * 获取插件设置
 */
const getPluginSettings = async (): Promise<PluginSetting> => {
  try {
    const allSettings = (await naimo.router.storeGet(
      "pluginSetting"
    )) as Record<string, PluginSetting> | null;
    const settings = allSettings?.[props.pluginId];

    return {
      autoSeparate: settings?.autoSeparate ?? false,
      backgroundRun: settings?.backgroundRun ?? false,
      followMainProgram: settings?.followMainProgram ?? false,
    };
  } catch (error) {
    console.error("❌ 获取插件设置失败:", error);
    return {
      autoSeparate: false,
      backgroundRun: false,
      followMainProgram: false,
    };
  }
};

/**
 * 保存插件设置
 */
const savePluginSettings = async (settings: PluginSetting): Promise<void> => {
  try {
    const allSettings = (await naimo.router.storeGet(
      "pluginSetting"
    )) as Record<string, PluginSetting> | null;
    const updatedSettings = {
      ...allSettings,
      [props.pluginId]: {
        ...(allSettings?.[props.pluginId] || {}),
        ...settings,
      },
    };
    await naimo.router.storeSet("pluginSetting", updatedSettings);
    console.log(`✅ 已保存插件设置: ${props.pluginId}`, settings);
  } catch (error) {
    console.error("❌ 保存插件设置失败:", error);
  }
};

/**
 * 显示插件菜单
 */
const showPluginMenu = async () => {
  try {
    // 获取当前设置
    const currentSettings = await getPluginSettings();

    // 构建菜单项
    const menuItems = pluginOptions.map((option) => ({
      label: option.label,
      checked: currentSettings[option.key],
      enabled: true,
    }));

    // 显示系统弹出菜单
    const selectedIndex = await naimo.router.windowShowPopupMenu({
      items: menuItems,
    });

    // 处理用户选择
    if (selectedIndex !== null && selectedIndex !== undefined) {
      const selectedKey = pluginOptions[selectedIndex].key;
      const newSettings = {
        ...currentSettings,
        [selectedKey]: !currentSettings[selectedKey],
      };

      // 保存设置
      await savePluginSettings(newSettings);
    }
  } catch (error) {
    console.error("❌ 显示插件菜单失败:", error);
  }
};

defineExpose({ showPluginMenu });
</script>
