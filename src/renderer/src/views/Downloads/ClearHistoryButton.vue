<template>
  <div ref="wrapperRef" class="relative inline-block">
    <button
      type="button"
      class="flex items-center px-3 py-1.5 text-xs font-medium rounded border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      :disabled="!hasDownloads || isClearing"
      @click.stop="toggleConfirm"
    >
      <IconMdiDeleteSweep class="w-3 h-3 mr-1" />
      清空历史
    </button>

    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isConfirmVisible"
        class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-20 p-3 text-left"
      >
        <p class="text-xs text-gray-700 leading-5">
          是否清空所有下载记录？此操作仅删除记录，不会移除已下载的文件。
        </p>
        <div class="flex justify-end space-x-2 mt-3">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            @click="hideConfirm"
          >
            取消
          </button>
          <button
            type="button"
            class="px-3 py-1 text-xs rounded text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors"
            :disabled="isClearing"
            @click="handleConfirm"
          >
            {{ isClearing ? "清理中..." : "立即清空" }}
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useEventListener, useDebounceFn } from "@vueuse/core";
import { chunk, uniq } from "lodash-es";
/** @ts-ignore */
import IconMdiDeleteSweep from "~icons/mdi/delete-sweep-outline";

const props = defineProps<{
  downloadIds: string[];
}>();

const emit = defineEmits<{
  (e: "cleared"): void;
}>();

const isConfirmVisible = ref(false);
const isClearing = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);

// 使用 lodash 去重，避免重复 ID 导致多次删除
const uniqueIds = computed(() => uniq(props.downloadIds));
const hasDownloads = computed(() => uniqueIds.value.length > 0);

const hideConfirm = () => {
  isConfirmVisible.value = false;
};

const toggleConfirmInner = () => {
  if (!hasDownloads.value || isClearing.value) return;
  isConfirmVisible.value = !isConfirmVisible.value;
};

// 使用 vueuse 的防抖，避免用户快速连续点击导致状态闪烁
const toggleConfirm = useDebounceFn(toggleConfirmInner, 120);

// 使用 vueuse 统一管理事件监听
useEventListener(document, "click", (event: MouseEvent) => {
  if (
    !isConfirmVisible.value ||
    !wrapperRef.value ||
    wrapperRef.value.contains(event.target as Node)
  ) {
    return;
  }
  hideConfirm();
});

const handleConfirm = async () => {
  if (!hasDownloads.value) return;
  isClearing.value = true;
  try {
    // 使用 lodash.chunk 分批次删除，避免一次性并发过多请求
    const idChunks = chunk(uniqueIds.value, 20);
    for (const group of idChunks) {
      // 只删除记录，不删除实际文件
      await Promise.all(
        group.map((id) => naimo.download.deleteDownload(id, false))
      );
    }
    emit("cleared");
    hideConfirm();
  } catch (error) {
    console.error("清空下载历史失败:", error);
  } finally {
    isClearing.value = false;
  }
};

watch(
  () => props.downloadIds.length,
  (count) => {
    if (count === 0) {
      hideConfirm();
    }
  }
);
</script>
