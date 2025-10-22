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
  /** 插件视图ID（可选，分离窗口中使用，如果不提供则自动构造） */
  viewId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pluginName: "插件",
  iconType: "dots",
  iconWidth: "20px",
});

const isDetachedWindow = computed(() => props.iconType === "menu");

// 插件设置选项
const pluginOptions = [
  { key: "autoSeparate" as keyof PluginSetting, label: "自动分离为独立窗口" },
  {
    key: "backgroundRun" as keyof PluginSetting,
    label: "退出到副窗口时继续运行",
  },
  {
    key: "followMainProgram" as keyof PluginSetting,
    label: "跟随主程序同时启动时运行",
  },
];

// 按钮标题
const buttonTitle = computed(() => `${props.pluginName}设置`);

/**
 * 获取插件视图信息
 * - 如果提供了 viewId prop（分离窗口），直接使用它
 * - 如果没有提供（主窗口），使用 plugin:pluginId 格式构造
 */
const getPluginViewInfo = async () => {
  try {
    // 优先使用 props 中的 viewId（分离窗口传入的插件视图 ID）
    if (props.viewId) {
      return {
        id: props.viewId,
      };
    }

    // 主窗口情况：使用标准的插件视图 ID 格式
    const pluginViewId = `plugin:${props.pluginId}`;
    return {
      id: pluginViewId,
    };
  } catch (error) {
    console.error("❌ 获取插件视图信息失败:", error);
    return null;
  }
};

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
      zoomFactor: settings?.zoomFactor ?? 1.0,
    };
  } catch (error) {
    console.error("❌ 获取插件设置失败:", error);
    return {
      autoSeparate: false,
      backgroundRun: false,
      followMainProgram: false,
      zoomFactor: 1.0,
    };
  }
};

/**
 * 保存插件设置
 */
const savePluginSettings = async (
  settings: Partial<PluginSetting>
): Promise<void> => {
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
 * 分离窗口
 */
const separateWindow = async () => {
  try {
    const viewInfo = await getPluginViewInfo();
    if (!viewInfo) {
      console.error("❌ 无法获取插件视图信息");
      return;
    }

    const result = await naimo.router.windowDetachNewView(viewInfo.id, {
      title: props.pluginName,
      showControlBar: true,
    });

    if (result.success) {
      console.log("✅ 窗口分离成功");
    } else {
      console.error("❌ 窗口分离失败:", result.error);
    }
  } catch (error) {
    console.error("❌ 分离窗口失败:", error);
  }
};

/**
 * 结束运行
 */
const terminatePlugin = async () => {
  try {
    const result = await naimo.router.windowClosePluginView(true);
    if (result.success) {
      console.log("✅ 已结束运行");
    } else {
      console.error("❌ 结束运行失败:", result.error);
    }
  } catch (error) {
    console.error("❌ 结束运行失败:", error);
  }
};

/**
 * 设置页面缩放
 */
const setZoomFactor = async (zoomFactor: number) => {
  try {
    const viewInfo = await getPluginViewInfo();
    if (!viewInfo) {
      console.error("❌ 无法获取插件视图信息");
      return;
    }

    // 通过 IPC 设置指定视图的缩放
    const result = await naimo.router.windowSetViewZoomFactor(
      viewInfo.id,
      zoomFactor
    );

    if (result.success) {
      // 保存到配置
      await savePluginSettings({ zoomFactor });
      console.log(`✅ 页面缩放已设置为: ${(zoomFactor * 100).toFixed(0)}%`);
    } else {
      console.error("❌ 设置页面缩放失败:", result.error);
    }
  } catch (error) {
    console.error("❌ 设置页面缩放失败:", error);
  }
};

/**
 * 显示插件菜单
 */
const showPluginMenu = async () => {
  try {
    // 获取当前设置
    const currentSettings = await getPluginSettings();

    // 生成缩放选项 (30% - 150%, 步进10%)
    const zoomOptions = [];
    const currentZoomPercentage = Math.round(
      (currentSettings.zoomFactor ?? 1.0) * 100
    );
    for (let zoom = 30; zoom <= 150; zoom += 10) {
      zoomOptions.push({
        label: `${zoom}%`,
        type: "radio" as const,
        checked: zoom === currentZoomPercentage,
        id: `zoom-${zoom}`,
      });
    }

    // 构建菜单项
    const menuItems = [];

    // 在非分离窗口中显示分离窗口选项
    if (!isDetachedWindow.value) {
      menuItems.push({
        label: "分离为独立窗口 ( Alt + D)",
        type: "normal" as const,
        id: "separate-window",
      });
    }

    // 插件应用设置（所有窗口都显示）
    menuItems.push({
      label: "插件应用设置",
      type: "normal" as const,
      submenu: pluginOptions.map((option) => ({
        label: option.label,
        type: "checkbox" as const,
        checked: currentSettings[option.key] as boolean,
        id: `setting-${option.key}`,
      })),
    });

    // 插件页面缩放（所有窗口都显示）
    menuItems.push({
      label: "插件页面缩放",
      type: "normal" as const,
      submenu: zoomOptions,
    });

    // 在非分离窗口中显示结束运行选项
    // if (!isDetachedWindow.value) {
    menuItems.push({
      label: "结束运行",
      type: "normal" as const,
      id: "terminate",
    });
    // }

    // 显示系统弹出菜单
    const selectedId: string | null = await naimo.router.windowShowPopupMenu({
      items: menuItems,
    });

    // 处理用户选择
    if (!selectedId) {
      return;
    }

    // 处理分离窗口
    if (selectedId === "separate-window") {
      await separateWindow();
      return;
    }

    // 处理结束运行
    if (selectedId === "terminate") {
      await terminatePlugin();
      return;
    }

    // 处理插件应用设置
    if (selectedId.startsWith("setting-")) {
      const settingKey = selectedId.replace(
        "setting-",
        ""
      ) as keyof PluginSetting;
      const newSettings = {
        ...currentSettings,
        [settingKey]: !currentSettings[settingKey],
      };
      await savePluginSettings(newSettings);
      return;
    }

    // 处理页面缩放
    if (selectedId.startsWith("zoom-")) {
      const zoomPercentage = parseInt(selectedId.replace("zoom-", ""));
      const zoomFactor = zoomPercentage / 100;
      await setZoomFactor(zoomFactor);
      return;
    }
  } catch (error) {
    console.error("❌ 显示插件菜单失败:", error);
  }
};

defineExpose({ showPluginMenu });
</script>
