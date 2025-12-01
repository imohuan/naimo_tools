<template>
  <div
    class="border border-blue-100 rounded-md bg-blue-50/60 px-3 py-2 space-y-1 text-[11px]"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-col">
        <span class="font-medium text-blue-700">当前生效模板</span>
        <span class="text-[10px] text-blue-500">
          当开启「自动镜像访问」时，将优先使用此处的模板
        </span>
      </div>
      <button
        type="button"
        class="px-2 py-0.5 text-[11px] rounded text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
        :disabled="disableTestAll || testing"
        @click="onTestAll"
      >
        <IconMdiRefresh v-if="testing" class="w-3 h-3 animate-spin" />
        {{ testing ? "测试中..." : "测试当前模板" }}
      </button>
    </div>

    <div v-if="currentMirrorUrl" class="space-y-0.5">
      <div class="flex items-center gap-1">
        <div class="flex-1 truncate">
          <span class="font-semibold text-blue-700">搜索 API：</span>
          <span class="text-gray-700">
            {{ currentMirrorUrl.searchUrlTemplate }}
          </span>
        </div>
        <button
          type="button"
          class="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
          @click="
            onCopyCurrent(
              currentMirrorUrl.searchUrlTemplate || '',
              'searchUrlTemplate'
            )
          "
          :title="
            copiedField === 'searchUrlTemplate' ? '已复制' : '复制搜索 API URL'
          "
        >
          <IconMdiCheck
            v-if="copiedField === 'searchUrlTemplate'"
            class="w-3 h-3 text-green-500"
          />
          <IconMdiContentCopy v-else class="w-3 h-3" />
        </button>
      </div>

      <div class="flex items-center gap-1">
        <div class="flex-1 truncate">
          <span class="font-semibold text-blue-700">下载 ZIP：</span>
          <span class="text-gray-700">
            {{ currentMirrorUrl.downloadUrlTemplate }}
          </span>
        </div>
        <button
          type="button"
          class="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
          @click="
            onCopyCurrent(
              currentMirrorUrl.downloadUrlTemplate || '',
              'downloadUrlTemplate'
            )
          "
          :title="
            copiedField === 'downloadUrlTemplate'
              ? '已复制'
              : '复制下载 ZIP URL'
          "
        >
          <IconMdiCheck
            v-if="copiedField === 'downloadUrlTemplate'"
            class="w-3 h-3 text-green-500"
          />
          <IconMdiContentCopy v-else class="w-3 h-3" />
        </button>
      </div>

      <div class="flex items-center gap-1">
        <div class="flex-1 truncate">
          <span class="font-semibold text-blue-700">Raw 文件：</span>
          <span class="text-gray-700">
            {{ currentMirrorUrl.rawFileUrlTemplate }}
          </span>
        </div>
        <button
          type="button"
          class="p-0.5 text-gray-400 hover:text-gray-700 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
          @click="
            onCopyCurrent(
              currentMirrorUrl.rawFileUrlTemplate || '',
              'rawFileUrlTemplate'
            )
          "
          :title="
            copiedField === 'rawFileUrlTemplate'
              ? '已复制'
              : '复制 Raw 文件 URL'
          "
        >
          <IconMdiCheck
            v-if="copiedField === 'rawFileUrlTemplate'"
            class="w-3 h-3 text-green-500"
          />
          <IconMdiContentCopy v-else class="w-3 h-3" />
        </button>
      </div>

      <TestResultList
        v-if="previewResults.length > 0"
        class="mt-2"
        :results="previewResults"
        layout="grid"
        :is-copied="isCopied"
        :on-copy="onCopy"
        :on-apply-mirror-url="() => {}"
        :show-apply-button="false"
      />
    </div>
    <div v-else class="text-[11px] text-gray-500">
      未配置 mirrorUrl，将使用 GitHub 官方地址（或下方默认模板）。
      你可以在下方测试镜像后，点击某一项右侧的「设为 mirrorUrl」快速应用。
    </div>
  </div>
</template>

<script setup lang="ts">
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiContentCopy from "~icons/mdi/content-copy";
/** @ts-ignore */
import IconMdiCheck from "~icons/mdi/check";
import TestResultList from "./TestResultList.vue";
import type { TestResultByItem } from "../types";

type MirrorTemplateField =
  | "searchUrlTemplate"
  | "downloadUrlTemplate"
  | "rawFileUrlTemplate";

interface CurrentMirrorUrl {
  searchUrlTemplate?: string;
  downloadUrlTemplate?: string;
  rawFileUrlTemplate?: string;
}

interface Props {
  currentMirrorUrl: CurrentMirrorUrl | null;
  copiedField: MirrorTemplateField | null;
  testing: boolean;
  disableTestAll: boolean;
  onCopyCurrent: (text: string, field: MirrorTemplateField) => void;
  previewResults: TestResultByItem[];
  isCopied: (url: string) => boolean;
  onCopy: (text: string) => void;
  onTestAll: () => void;
}

defineProps<Props>();
</script>
