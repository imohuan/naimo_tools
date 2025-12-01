<template>
  <div class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2">
    <div class="flex items-center gap-1">
      <label class="text-xs font-medium text-gray-700 min-w-[40px]">模式</label>
      <CustomSelect
        :options="modeOptions"
        :model-value="item.mode"
        class="w-24"
        @update:model-value="
          (value) =>
            actions.updateMode(index, String(value) as 'prefix' | 'base')
        "
      />
      <label class="text-xs font-medium text-gray-700 min-w-[40px] ml-1">
        模板
      </label>
      <CustomSelect
        :options="templateOptions"
        :model-value="actions.getTemplateSelectValue(item.mode, item.templates)"
        :multiple="item.mode === 'prefix'"
        class="flex-1"
        @update:model-value="
          (value) =>
            actions.updateTemplatesFromCustomSelect(index, item.mode, value)
        "
      />
      <button
        type="button"
        class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        @click="actions.duplicateItem(index)"
        title="复制配置"
      >
        <IconMdiContentCopy class="w-3 h-3" />
      </button>
      <button
        type="button"
        class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        @click="actions.removeItem(index)"
        title="删除"
      >
        <IconMdiDeleteOutline class="w-4 h-4" />
      </button>
    </div>

    <div v-if="item.mode === 'prefix'" class="space-y-1">
      <div class="flex items-start gap-1">
        <label class="text-xs font-medium text-gray-700 min-w-[40px] pt-2"
          >前缀</label
        >
        <div class="flex-1 space-y-1">
          <textarea
            :value="item.prefix || ''"
            spellcheck="false"
            placeholder="例如：https://ghproxy.site/https://&#10;使用 | 或换行分割多个前缀"
            :class="[
              'w-full px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px]',
              actions.getWordWrap(index)
                ? 'whitespace-normal break-words'
                : 'whitespace-pre overflow-x-auto',
            ]"
            @input="actions.updatePrefix(index, $event)"
            @keydown="actions.handleTextareaKeydown(index, 'prefix', $event)"
          />
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="text-[10px] text-gray-500 ml-[44px]">
          提示：使用 | 或换行分割多个前缀，# + 空格可禁用
        </div>
        <div class="flex items-center gap-1 justify-end">
          <button
            type="button"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            @click="actions.toggleWordWrap(index)"
            :title="
              actions.getWordWrap(index) ? '关闭自动换行' : '开启自动换行'
            "
          >
            <IconMdiWrap v-if="actions.getWordWrap(index)" class="w-4 h-4" />
            <IconMdiWrapDisabled v-else class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            @click="actions.setDefaultPrefix(index)"
            title="设置默认前缀"
          >
            <IconMdiRestore class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="actions.testSingleItem(index)"
            :disabled="
              testingSingle === index ||
              !item.prefix ||
              !item.templates ||
              (Array.isArray(item.templates) && item.templates.length === 0)
            "
            :title="
              testingSingle === index
                ? '测试中...'
                : !item.templates ||
                    (Array.isArray(item.templates) &&
                      item.templates.length === 0)
                  ? '请先选择模板'
                  : '测试此镜像'
            "
          >
            <IconMdiNetwork
              v-if="testingSingle !== index"
              class="w-4 h-4 transition-transform hover:scale-110"
            />
            <IconMdiRefresh v-else class="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="
        item.mode === 'prefix' && actions.getItemTestResults(index).length > 0
      "
      class="space-y-1"
    >
      <TestResultList
        :results="actions.getItemTestResults(index)"
        :layout="resultLayout"
        :is-copied="actions.isCopied"
        :on-copy="actions.copyToClipboard"
      />
      <div class="flex items-center justify-between mt-1">
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-2 py-1 text-[10px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            @click="actions.sortEntriesByTestResults(index)"
          >
            根据测试结果排序
          </button>
          <button
            type="button"
            class="px-2 py-1 text-[10px] rounded border border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            @click="actions.clearAllDisabled(index)"
          >
            取消所有 #
          </button>
        </div>
        <label class="inline-flex items-center gap-1 text-[10px] text-gray-500">
          <input
            type="checkbox"
            class="w-3 h-3"
            :checked="actions.getDisableUnavailable(index)"
            @change="actions.handleDisableToggle(index, $event)"
          />
          禁用不可用 URL
        </label>
      </div>
    </div>

    <div v-if="item.mode === 'base'" class="space-y-1">
      <div class="flex items-start gap-1.5">
        <label class="text-xs font-medium text-gray-700 min-w-[40px] pt-2"
          >URL</label
        >
        <div class="flex-1 space-y-1">
          <textarea
            :value="item.baseUrl || ''"
            spellcheck="false"
            placeholder="例如：https://ghproxy.site/...&#10;使用 | 或换行分割多个 URL"
            :class="[
              'w-full px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px]',
              actions.getWordWrap(index)
                ? 'whitespace-normal break-words'
                : 'whitespace-pre overflow-x-auto',
            ]"
            @input="actions.updateBaseUrl(index, $event)"
            @keydown="actions.handleTextareaKeydown(index, 'baseUrl', $event)"
          />
          <div class="flex items-center gap-1 justify-end">
            <button
              type="button"
              class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              @click="actions.toggleWordWrap(index)"
              :title="
                actions.getWordWrap(index) ? '关闭自动换行' : '开启自动换行'
              "
            >
              <IconMdiWrap v-if="actions.getWordWrap(index)" class="w-4 h-4" />
              <IconMdiWrapDisabled v-else class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              @click="actions.setDefaultBaseUrl(index)"
              title="设置默认 URL"
            >
              <IconMdiRestore class="w-4 h-4" />
            </button>
            <button
              type="button"
              class="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="actions.testSingleItem(index)"
              :disabled="
                testingSingle === index ||
                !item.baseUrl ||
                !item.templates ||
                (Array.isArray(item.templates) && item.templates.length === 0)
              "
              :title="
                testingSingle === index
                  ? '测试中...'
                  : !item.templates ||
                      (Array.isArray(item.templates) &&
                        item.templates.length === 0)
                    ? '请先选择模板'
                    : '测试此镜像'
              "
            >
              <IconMdiNetwork
                v-if="testingSingle !== index"
                class="w-4 h-4 transition-transform hover:scale-110"
              />
              <IconMdiRefresh v-else class="w-4 h-4 animate-spin" />
            </button>
          </div>
        </div>
      </div>
      <div class="text-[10px] text-gray-500 ml-[44px]">
        提示：使用 | 或换行分割多个 URL，# + 空格可禁用
      </div>
    </div>

    <div
      v-if="
        item.mode === 'base' && actions.getItemTestResults(index).length > 0
      "
    >
      <TestResultList
        :results="actions.getItemTestResults(index)"
        :layout="resultLayout"
        :is-copied="actions.isCopied"
        :on-copy="actions.copyToClipboard"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CustomSelect from "@/components/Common/CustomSelect.vue";
import type { MirrorUrlItem } from "@shared/typings/appTypes";
import type { MirrorItemActions } from "../types";
/** @ts-ignore */
import IconMdiContentCopy from "~icons/mdi/content-copy";
/** @ts-ignore */
import IconMdiDeleteOutline from "~icons/mdi/delete-outline";
/** @ts-ignore */
import IconMdiNetwork from "~icons/mdi/network";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiRestore from "~icons/mdi/restore";
/** @ts-ignore */
import IconMdiWrap from "~icons/mdi/wrap";
/** @ts-ignore */
import IconMdiWrapDisabled from "~icons/mdi/wrap-disabled";
import TestResultList from "./TestResultList.vue";

interface Props {
  item: MirrorUrlItem;
  index: number;
  resultLayout: "grid" | "list";
  modeOptions: { label: string; value: "prefix" | "base" }[];
  templateOptions: {
    label: string;
    value: "searchUrlTemplate" | "downloadUrlTemplate" | "rawFileUrlTemplate";
  }[];
  testingSingle: number | null;
  actions: MirrorItemActions;
}

defineProps<Props>();
</script>
