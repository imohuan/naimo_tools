<template>
  <!-- 字符串数组（如镜像 URL 列表） -->
  <div class="space-y-2 text-xs text-gray-700">
    <div class="max-h-40 overflow-y-auto space-y-1.5 pr-1">
      <div v-if="internalList.length === 0" class="text-gray-400 text-[11px]">
        暂无数据，点击下方“添加 URL”开始配置。
      </div>
      <div
        v-for="(item, index) in internalList"
        :key="index"
        class="flex items-center gap-1.5"
      >
        <input
          :value="item"
          type="text"
          placeholder="例如：https://mirror.example.com/{url}"
          class="flex-1 px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          @input="onInput(index, $event)"
        />
        <button
          type="button"
          class="px-2 py-1 text-[11px] text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors flex-shrink-0"
          @click="removeItem(index)"
        >
          删除
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-[11px] border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
        @click="addItem"
      >
        添加 URL
      </button>
      <button
        type="button"
        class="px-2 py-1 text-[11px] rounded text-white bg-blue-500 hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="internalList.length === 0 || testing"
        @click="handleTestAll"
      >
        {{ testing ? "测试中..." : "测试所有镜像" }}
      </button>
    </div>

    <div v-if="testResults.length > 0" class="mt-1 space-y-0.5">
      <div class="text-[11px] text-gray-500">
        测试结果（仅镜像本身连通性）：
      </div>
      <div
        v-for="result in testResults"
        :key="result.url"
        class="flex items-center justify-between gap-2"
      >
        <div class="flex-1 truncate" :title="result.url">
          {{ result.url }}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px]"
            :class="
              result.ok
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            "
          >
            {{ result.ok ? "可用" : "不可用" }}
          </span>
          <span class="text-[10px] text-gray-500 min-w-[70px] text-right">
            {{ result.time.toFixed(0) }} ms
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useUrlTester, type UrlTestResult } from "@/composables/useUrlTester";

interface Props {
  /** 字符串数组值 */
  modelValue: string[] | any;
}

interface Emits {
  (e: "update:modelValue", value: string[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 内部列表，始终保证为字符串数组
const internalList = computed<string[]>({
  get: () => {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue as string[];
    }
    return [];
  },
  set: (val) => {
    emit("update:modelValue", val);
  },
});

const { testing, testUrls, getFastestAvailable } = useUrlTester();
const testResults = ref<UrlTestResult[]>([]);

const addItem = () => {
  const list = [...internalList.value];
  list.push("");
  internalList.value = list;
};

const removeItem = (index: number) => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  internalList.value = list;
};

const onInput = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list[index] = target.value;
  internalList.value = list;
};

// 测试当前列表的所有 URL（仅测试镜像本身连通性）
const handleTestAll = async () => {
  const list = internalList.value
    .map((item) => (item || "").trim())
    .filter((item) => !!item);

  if (list.length === 0) {
    testResults.value = [];
    return;
  }

  const results = await testUrls(list, {
    timeout: 8000,
    method: "HEAD",
  });

  testResults.value = results;

  const fastest = getFastestAvailable(results);
  if (fastest) {
    console.log(
      "✅ 镜像 URL 测试完成，最快可用镜像:",
      fastest.url,
      "耗时:",
      fastest.time.toFixed(2),
      "ms"
    );
  } else {
    console.warn("⚠️ 镜像 URL 测试完成，但没有可用的镜像");
  }
};
</script>
