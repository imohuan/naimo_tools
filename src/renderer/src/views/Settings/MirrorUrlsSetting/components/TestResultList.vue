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
      class="flex flex-col gap-1 px-2 py-1.5 bg-white rounded border border-gray-200 min-w-0 overflow-hidden"
    >
      <span
        class="text-[10px] font-medium text-gray-600 truncate"
        :title="result.sourceValue"
      >
        {{ result.templateLabel }} · {{ result.sourceValue }}
      </span>
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

interface Props {
  results: TestResultByItem[];
  layout: "grid" | "list";
  isCopied: (url: string) => boolean;
  onCopy: (text: string) => void;
}

defineProps<Props>();
</script>

