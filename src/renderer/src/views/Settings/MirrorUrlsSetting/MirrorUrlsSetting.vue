<template>
  <div class="space-y-3 text-xs text-gray-700">
    <!-- 当前 mirrorUrl 模板预览 + 测试当前模板按钮 -->
    <CurrentMirrorUrlPreview
      :current-mirror-url="currentMirrorUrl"
      :copied-field="copiedField"
      :testing="testing"
      :disable-test-all="internalList.length === 0"
      :on-copy-current="handleCopyCurrent"
      :preview-results="currentMirrorTestResults"
      :is-copied="isCopied"
      :on-copy="copyToClipboard"
      :on-test-all="testCurrentMirrorTemplates"
    />

    <div class="space-y-3 pr-1">
      <div v-if="internalList.length === 0" class="text-gray-400 text-[11px]">
        暂无配置，点击下方"添加镜像"开始配置。
      </div>
      <MirrorItemCard
        v-for="(item, index) in internalList"
        :key="index"
        :item="item"
        :index="index"
        :result-layout="resultLayout"
        :mode-options="modeOptions"
        :template-options="templateOptions"
        :testing-single="testingSingle"
        :actions="itemActions"
      />
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-[11px] border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
        @click="addItem"
      >
        添加镜像
      </button>
      <button
        type="button"
        class="px-2 py-1 text-[11px] rounded text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
        :disabled="internalList.length === 0 || testing"
        @click="handleTestAll"
      >
        <IconMdiRefresh v-if="testing" class="w-3 h-3 animate-spin" />
        {{ testing ? "测试中..." : "测试所有镜像" }}
      </button>
      <div class="ml-auto flex items-center gap-2 text-[11px] text-gray-500">
        <span>结果布局</span>
        <div
          class="relative inline-flex items-center bg-gray-200 rounded-lg p-0.5"
        >
          <div
            class="absolute left-0 top-0 h-full w-1/2 p-[2px] rounded-md transition-transform duration-200"
            :style="{
              transform:
                resultLayout === 'grid' ? 'translateX(0)' : 'translateX(100%)',
            }"
          >
            <div class="w-full h-full bg-white rounded-md"></div>
          </div>
          <button
            type="button"
            class="relative z-10 px-3 py-0.5 transition-colors text-gray-700 text-[11px]"
            :class="resultLayout === 'grid' ? 'text-blue-600 font-medium' : ''"
            @click="resultLayout = 'grid'"
          >
            网格
          </button>
          <button
            type="button"
            class="relative z-10 px-3 py-0.5 transition-colors text-gray-700 text-[11px]"
            :class="resultLayout === 'list' ? 'text-blue-600 font-medium' : ''"
            @click="resultLayout = 'list'"
          >
            列表
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
import MirrorItemCard from "./components/MirrorItemCard.vue";
import CurrentMirrorUrlPreview from "./components/CurrentMirrorUrlPreview.vue";
import { useMirrorUrlsSetting } from "./hooks/useMirrorUrlsSetting";
import type { MirrorUrlsSettingEmits, MirrorUrlsSettingProps } from "./types";

const props = defineProps<MirrorUrlsSettingProps>();
const emit = defineEmits<MirrorUrlsSettingEmits>();

const {
  internalList,
  testing,
  testingSingle,
  addItem,
  handleTestAll,
  modeOptions,
  templateOptions,
  itemActions,
  resultLayout,
  currentMirrorUrl,
  currentMirrorTestResults,
  copyToClipboard,
  isCopied,
  testCurrentMirrorTemplates,
} = useMirrorUrlsSetting(props, emit);

type MirrorTemplateField =
  | "searchUrlTemplate"
  | "downloadUrlTemplate"
  | "rawFileUrlTemplate";

const copiedField = ref<MirrorTemplateField | null>(null);

const handleCopyCurrent = async (
  text: string,
  field: MirrorTemplateField
): Promise<void> => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = field;
    setTimeout(() => {
      if (copiedField.value === field) {
        copiedField.value = null;
      }
    }, 1500);
  } catch (error) {
    console.error("复制镜像模板失败:", error);
  }
};
</script>
