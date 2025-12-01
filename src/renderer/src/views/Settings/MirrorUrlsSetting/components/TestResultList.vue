<template>
  <div
    :class="[
      layout === 'grid'
        ? 'grid grid-cols-3 gap-2 w-full min-w-0'
        : 'flex flex-col gap-2 w-full min-w-0',
    ]"
  >
    <div
      v-for="(result, idx) in results"
      :key="`${result.itemIndex}-${result.template}-${result.urlIndex}-${idx}`"
      class="flex flex-col gap-1 px-2 py-1.5 rounded border min-w-0 overflow-hidden transition-colors"
      :class="
        isCurrentMirrorResult && isCurrentMirrorResult(result)
          ? 'border-blue-400 bg-blue-50/80'
          : 'border-gray-200 bg-gray-50 '
      "
    >
      <div class="flex items-center justify-between gap-1 min-w-0">
        <span
          class="text-[10px] font-medium text-gray-600 truncate"
          :title="result.sourceValue"
        >
          {{ result.templateLabel }}
        </span>
        <button
          v-if="showApplyButton !== false"
          type="button"
          class="p-0.5 rounded transition-colors flex-shrink-0"
          :class="
            isCurrentMirrorResult && isCurrentMirrorResult(result)
              ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
              : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
          "
          @click.stop="onApplyMirrorUrl(result)"
          :title="
            isCurrentMirrorResult && isCurrentMirrorResult(result)
              ? '当前已作为 mirrorUrl 模板'
              : '将此结果设为 mirrorUrl 模板'
          "
        >
          <IconMdiStar
            v-if="isCurrentMirrorResult && isCurrentMirrorResult(result)"
            class="w-3 h-3"
          />
          <IconMdiStarOutline v-else class="w-3 h-3" />
        </button>
      </div>
      <span class="text-[10px] text-gray-400 truncate" :title="result.url">
        {{ result.url }}
      </span>
      <div
        v-if="result.testing"
        class="inline-flex items-center gap-1 text-[10px] text-blue-600"
      >
        <IconMdiRefresh class="w-3 h-3 animate-spin" />
        测试中...
      </div>
      <div
        v-else-if="result.result"
        class="flex items-center justify-between gap-2 min-w-0"
      >
        <span
          class="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all flex-shrink-0"
          :class="
            result.result.ok
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          "
        >
          <span>{{ result.result.ok ? "✓ 可用" : "✗ 不可用" }}</span>
          <span class="text-[10px] text-gray-500">
            {{ result.result.time.toFixed(0) }}ms
          </span>
        </span>
        <button
          type="button"
          class="p-0.5 transition-colors flex-shrink-0"
          :class="
            isCopied(result.url)
              ? 'text-green-500'
              : 'text-gray-400 hover:text-gray-600'
          "
          @click="onCopy(result.url)"
          :title="'复制: ' + result.url"
        >
          <IconMdiCheck v-if="isCopied(result.url)" class="w-3 h-3" />
          <IconMdiContentCopy v-else class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TestResultByItem } from "../types";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiContentCopy from "~icons/mdi/content-copy";
/** @ts-ignore */
import IconMdiCheck from "~icons/mdi/check";
/** @ts-ignore */
import IconMdiStarOutline from "~icons/mdi/star-outline";
/** @ts-ignore */
import IconMdiStar from "~icons/mdi/star";

interface Props {
  results: TestResultByItem[];
  layout: "grid" | "list";
  isCopied: (url: string) => boolean;
  onCopy: (text: string) => void;
  onApplyMirrorUrl: (result: TestResultByItem) => void;
  isCurrentMirrorResult?: (result: TestResultByItem) => boolean;
  showApplyButton?: boolean;
}

const props = defineProps<Props>();
</script>
