<template>
  <!-- GitHub 镜像 URL 配置 -->
  <div class="space-y-3 text-xs text-gray-700">
    <div class="max-h-96 overflow-y-auto space-y-3 pr-1">
      <div v-if="internalList.length === 0" class="text-gray-400 text-[11px]">
        暂无配置，点击下方"添加镜像"开始配置。
      </div>
      <div
        v-for="(item, index) in internalList"
        :key="index"
        class="p-3 border border-gray-200 rounded-md bg-gray-50 space-y-2"
      >
        <!-- 模式和模板选择（同一行） -->
        <div class="flex items-center gap-1">
          <label class="text-xs font-medium text-gray-700 min-w-[40px]"
            >模式</label
          >
          <CustomSelect
            :options="modeOptions"
            :model-value="item.mode"
            class="w-24"
            @update:model-value="
              (value) => updateMode(index, String(value) as 'prefix' | 'base')
            "
          />
          <label class="text-xs font-medium text-gray-700 min-w-[40px] ml-1"
            >模板</label
          >
          <CustomSelect
            :options="templateOptions"
            :model-value="getTemplateSelectValue(item.mode, item.templates)"
            :multiple="item.mode === 'prefix'"
            class="flex-1"
            @update:model-value="
              (value) =>
                updateTemplatesFromCustomSelect(index, item.mode, value)
            "
          />
          <button
            type="button"
            class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
            @click="removeItem(index)"
            title="删除"
          >
            <IconMdiDeleteOutline class="w-4 h-4" />
          </button>
        </div>

        <!-- 前缀模式：前缀 URL 输入 -->
        <div v-if="item.mode === 'prefix'" class="flex items-center gap-1">
          <label class="text-xs font-medium text-gray-700 min-w-[40px]"
            >前缀</label
          >
          <input
            :value="item.prefix || ''"
            type="text"
            spellcheck="false"
            placeholder="例如：https://ghproxy.site/https://"
            class="flex-1 px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            @input="updatePrefix(index, $event)"
          />
          <button
            type="button"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            @click="setDefaultPrefix(index)"
            title="设置默认前缀"
          >
            <IconMdiRestore class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="testSingleItem(index)"
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

        <!-- 测试结果展示（前缀模式） -->
        <div
          v-if="item.mode === 'prefix' && getItemTestResults(index).length > 0"
          class="grid grid-cols-3 gap-2 w-full min-w-0"
        >
          <div
            v-for="(result, idx) in getItemTestResults(index)"
            :key="`${index}-${result.template}-${idx}`"
            class="flex flex-col gap-1 px-2 py-1.5 bg-white rounded border border-gray-200 min-w-0 overflow-hidden"
          >
            <span class="text-[10px] font-medium text-gray-600">
              {{ result.templateLabel }}
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
                @click="copyToClipboard(result.url)"
                :title="'复制: ' + result.url"
              >
                <IconMdiCheck v-if="isCopied(result.url)" class="w-3 h-3" />
                <IconMdiContentCopy v-else class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <!-- 基础模式：URL 输入 -->
        <div v-if="item.mode === 'base'" class="flex items-center gap-1.5">
          <label class="text-xs font-medium text-gray-700 min-w-[40px]"
            >URL</label
          >
          <input
            :value="item.baseUrl || ''"
            type="text"
            spellcheck="false"
            placeholder="例如：https://ghproxy.site/https://api.github.com/search/repositories?q={{queryPrefix}}{{search}}&page={{page}}"
            class="flex-1 px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            @input="updateBaseUrl(index, $event)"
          />
          <button
            type="button"
            class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            @click="setDefaultBaseUrl(index)"
            title="设置默认 URL"
          >
            <IconMdiRestore class="w-4 h-4" />
          </button>
          <button
            type="button"
            class="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="testSingleItem(index)"
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

        <!-- 测试结果展示（基础模式） -->
        <div
          v-if="item.mode === 'base' && getItemTestResults(index).length > 0"
          class="grid grid-cols-3 gap-2 w-full min-w-0"
        >
          <div
            v-for="(result, idx) in getItemTestResults(index)"
            :key="`${index}-${result.template}-${idx}`"
            class="flex flex-col gap-1 px-2 py-1.5 bg-white rounded border border-gray-200 min-w-0 overflow-hidden"
          >
            <span class="text-[10px] font-medium text-gray-600">
              {{ result.templateLabel }}
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
                @click="copyToClipboard(result.url)"
                :title="'复制: ' + result.url"
              >
                <IconMdiCheck v-if="isCopied(result.url)" class="w-3 h-3" />
                <IconMdiContentCopy v-else class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import {
  useUrlTester,
  type UrlTestResult,
  buildMirrorUrl,
} from "@/composables/useUrlTester";
import type { MirrorUrlItem } from "@shared/typings/appTypes";
import CustomSelect from "@/components/Common/CustomSelect.vue";
import { GithubUrlBuilder } from "@/core/utils/githubUrlBuilder";
/** @ts-ignore */
import IconMdiDeleteOutline from "~icons/mdi/delete-outline";
/** @ts-ignore */
import IconMdiNetwork from "~icons/mdi/network";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiRestore from "~icons/mdi/restore";
/** @ts-ignore */
import IconMdiContentCopy from "~icons/mdi/content-copy";
/** @ts-ignore */
import IconMdiCheck from "~icons/mdi/check";

interface Props {
  /** 镜像 URL 配置数组 */
  modelValue: MirrorUrlItem[] | any;
}

interface Emits {
  (e: "update:modelValue", value: MirrorUrlItem[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 模式选项
const modeOptions = [
  {
    label: "前缀",
    value: "prefix" as const,
  },
  {
    label: "基础",
    value: "base" as const,
  },
];

// 模板选项
const templateOptions = [
  {
    label: "搜索 API",
    value: "searchUrlTemplate" as const,
  },
  {
    label: "下载 ZIP",
    value: "downloadUrlTemplate" as const,
  },
  {
    label: "Raw 文件",
    value: "rawFileUrlTemplate" as const,
  },
];

// 内部列表，始终保证为 MirrorUrlItem 数组
const internalList = computed<MirrorUrlItem[]>({
  get: () => {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue as MirrorUrlItem[];
    }
    return [];
  },
  set: (val) => {
    emit("update:modelValue", val);
  },
});

const { testing, testUrls } = useUrlTester();
const testingSingle = ref<number | null>(null);

// 创建 GithubUrlBuilder 实例用于生成测试 URL
const urlBuilder = new GithubUrlBuilder({
  branch: "main",
  queryPrefix: "naimo_tools-",
});

// 测试结果按配置项和模板分类
interface TestResultByItem {
  itemIndex: number;
  template: string;
  templateLabel: string;
  url: string;
  result: UrlTestResult | null;
  testing: boolean;
}

const testResultsByItem = ref<TestResultByItem[]>([]);

// 复制按钮状态：记录每个URL的复制状态
const copyButtonStates = ref<Map<string, boolean>>(new Map());

// 获取指定配置项的测试结果
const getItemTestResults = (itemIndex: number): TestResultByItem[] => {
  return testResultsByItem.value.filter((r) => r.itemIndex === itemIndex);
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // 设置复制成功状态
    copyButtonStates.value.set(text, true);
    // 1.5秒后恢复
    setTimeout(() => {
      copyButtonStates.value.set(text, false);
    }, 1500);
  } catch (error) {
    console.error("复制失败:", error);
  }
};

// 检查复制按钮状态
const isCopied = (url: string): boolean => {
  return copyButtonStates.value.get(url) || false;
};

// 添加新项
const addItem = () => {
  const list = [...internalList.value];
  list.push({
    mode: "prefix",
    prefix: "",
    templates: [],
  });
  internalList.value = list;
};

// 删除项
const removeItem = (index: number) => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  internalList.value = list;
};

// 更新模式
const updateMode = (index: number, mode: "prefix" | "base") => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  const currentItem = list[index];

  // 切换模式时，如果从基础模式切换到前缀模式，保留 templates 的第一个值作为数组
  // 如果从前缀模式切换到基础模式，保留 templates 的第一个值作为单个值
  let templates: typeof currentItem.templates;
  if (mode === "prefix") {
    // 切换到前缀模式：如果有 templates，保持数组；否则为空数组
    templates = Array.isArray(currentItem.templates)
      ? currentItem.templates
      : currentItem.templates
        ? [currentItem.templates as any]
        : [];
  } else {
    // 切换到基础模式：如果有 templates，取第一个；否则为 undefined
    if (
      Array.isArray(currentItem.templates) &&
      currentItem.templates.length > 0
    ) {
      templates = [currentItem.templates[0]] as any;
    } else if (currentItem.templates) {
      templates = [currentItem.templates as any] as any;
    } else {
      templates = undefined;
    }
  }

  list[index] = {
    ...list[index],
    mode,
    templates,
    // 切换模式时清理另一个模式的字段
    ...(mode === "prefix" ? { baseUrl: undefined } : { prefix: undefined }),
  };
  internalList.value = list;
};

// 获取模板选择框的值
const getTemplateSelectValue = (
  mode: "prefix" | "base",
  templates?:
    | ("searchUrlTemplate" | "downloadUrlTemplate" | "rawFileUrlTemplate")[]
    | "searchUrlTemplate"
    | "downloadUrlTemplate"
    | "rawFileUrlTemplate"
): string | string[] => {
  if (!templates) {
    return mode === "prefix" ? [] : "";
  }

  if (mode === "prefix") {
    // 前缀模式：返回数组
    return Array.isArray(templates) ? templates : [templates];
  } else {
    // 基础模式：返回单个值
    return Array.isArray(templates) ? templates[0] || "" : templates;
  }
};

// 从自定义下拉框更新模板选择
const updateTemplatesFromCustomSelect = (
  index: number,
  mode: "prefix" | "base",
  value: string | number | (string | number)[]
) => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;

  if (mode === "prefix") {
    // 前缀模式：多选，返回数组
    const selectedValues = (Array.isArray(value) ? value : [value]).map(
      (v) =>
        String(v) as
          | "searchUrlTemplate"
          | "downloadUrlTemplate"
          | "rawFileUrlTemplate"
    );
    list[index] = {
      ...list[index],
      templates: selectedValues,
    };
  } else {
    // 基础模式：单选，返回数组（但只包含一个值）
    const selectedValue = String(value) as
      | "searchUrlTemplate"
      | "downloadUrlTemplate"
      | "rawFileUrlTemplate";
    list[index] = {
      ...list[index],
      templates: selectedValue ? [selectedValue] : undefined,
    };
  }
  internalList.value = list;
};

// 根据模板类型生成原始测试URL（用于前缀模式）
// 使用 GithubUrlBuilder 生成测试 URL
const getOriginalTestUrl = (
  templateType:
    | "searchUrlTemplate"
    | "downloadUrlTemplate"
    | "rawFileUrlTemplate"
): string => {
  if (templateType === "searchUrlTemplate") {
    // 使用空搜索词和第一页进行测试
    return urlBuilder.getSearchUrl("", 1);
  } else if (templateType === "downloadUrlTemplate") {
    // 使用测试用的 user/repo
    return urlBuilder.getDownloadUrlFromUserRepo("imohuan", "naimo_tools");
  } else if (templateType === "rawFileUrlTemplate") {
    // 使用测试用的 user/repo/path
    return urlBuilder.getRawFileUrl("imohuan", "naimo_tools", ".npmrc");
  }
  return "";
};

// 解析用户提供的模板（用于基础模式）
const parseUserTemplate = (
  template: string,
  templateType:
    | "searchUrlTemplate"
    | "downloadUrlTemplate"
    | "rawFileUrlTemplate"
): string => {
  if (!template) return "";

  // 根据模板类型提供测试参数
  const params: Record<string, string | number> = {};

  if (templateType === "searchUrlTemplate") {
    params.queryPrefix = "naimo_tools-";
    params.search = "";
    params.page = 1;
  } else if (templateType === "downloadUrlTemplate") {
    params.user = "imohuan";
    params.repo = "naimo_tools";
    params.branch = "main";
  } else if (templateType === "rawFileUrlTemplate") {
    params.user = "imohuan";
    params.repo = "naimo_tools";
    params.branch = "main";
    params.path = ".npmrc";
  }

  // 使用 GithubUrlBuilder 的 parse 方法
  return urlBuilder.parse(template, params);
};

// 构建测试URL（前缀模式或基础模式）
const buildTestUrl = (
  item: MirrorUrlItem,
  templateType:
    | "searchUrlTemplate"
    | "downloadUrlTemplate"
    | "rawFileUrlTemplate"
): string | null => {
  if (item.mode === "prefix") {
    if (!item.prefix) return null;
    const prefix = item.prefix.trim();
    const originalUrl = getOriginalTestUrl(templateType);
    // 使用 buildMirrorUrl 函数来构建镜像URL
    return buildMirrorUrl(prefix, originalUrl);
  } else {
    // 基础模式：使用用户提供的 baseUrl 模板
    if (!item.baseUrl) return null;
    const baseUrl = item.baseUrl.trim();
    // 使用 GithubUrlBuilder 解析用户模板
    return parseUserTemplate(baseUrl, templateType);
  }
};

// 测试单个镜像项（测试所有选中的模板）
const testSingleItem = async (index: number) => {
  const item = internalList.value[index];
  if (!item) return;

  // 先清空该配置项的测试结果
  testResultsByItem.value = testResultsByItem.value.filter(
    (r) => r.itemIndex !== index
  );

  testingSingle.value = index;

  // 获取选中的模板列表
  const selectedTemplates = Array.isArray(item.templates)
    ? item.templates
    : item.templates
      ? [item.templates]
      : [];

  if (selectedTemplates.length === 0) {
    testingSingle.value = null;
    return;
  }

  // 初始化测试结果（显示测试中状态）
  const results: TestResultByItem[] = selectedTemplates.map((template) => {
    const templateLabel =
      template === "searchUrlTemplate"
        ? "搜索 API"
        : template === "downloadUrlTemplate"
          ? "下载 ZIP"
          : "Raw 文件";
    return {
      itemIndex: index,
      template,
      templateLabel,
      url: buildTestUrl(item, template) || "",
      result: null,
      testing: true,
    };
  });

  // 更新测试结果（先显示测试中状态）
  testResultsByItem.value = [...testResultsByItem.value, ...results];

  try {
    // 构建所有需要测试的URL
    const testUrlsList: string[] = [];

    for (const result of results) {
      if (result.url) {
        testUrlsList.push(result.url);
      }
    }

    if (testUrlsList.length === 0) {
      testingSingle.value = null;
      return;
    }

    // 执行测试
    const testResults = await testUrls(testUrlsList, {
      timeout: 8000,
      method: "HEAD",
    });

    // 更新测试结果
    const updatedResults = results.map((result) => {
      const testResult = testResults.find((r) => r.url === result.url);
      return {
        ...result,
        result: testResult || null,
        testing: false,
      };
    });

    // 更新全局测试结果
    testResultsByItem.value = [
      ...testResultsByItem.value.filter((r) => r.itemIndex !== index),
      ...updatedResults,
    ];

    // 输出日志
    const successCount = updatedResults.filter((r) => r.result?.ok).length;
    const totalCount = updatedResults.length;
    console.log(
      `✅ 镜像项 ${index + 1} 测试完成: ${successCount}/${totalCount} 个模板可用`
    );
  } catch (error) {
    console.error("测试镜像时出错:", error);
    // 标记所有结果为测试失败
    const failedResults = results.map((result) => ({
      ...result,
      result: {
        url: result.url,
        ok: false,
        time: 0,
        error: String(error),
      },
      testing: false,
    }));
    testResultsByItem.value = [
      ...testResultsByItem.value.filter((r) => r.itemIndex !== index),
      ...failedResults,
    ];
  } finally {
    testingSingle.value = null;
  }
};

// 更新前缀
const updatePrefix = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list[index] = {
    ...list[index],
    prefix: target.value,
  };
  internalList.value = list;
};

// 更新基础 URL
const updateBaseUrl = (index: number, event: Event) => {
  const target = event.target as HTMLInputElement;
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list[index] = {
    ...list[index],
    baseUrl: target.value,
  };
  internalList.value = list;
};

// 设置默认前缀
const setDefaultPrefix = (index: number) => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  list[index] = {
    ...list[index],
    prefix: "https://ghproxy.site/",
  };
  internalList.value = list;
};

// 设置默认基础 URL
const setDefaultBaseUrl = (index: number) => {
  const list = [...internalList.value];
  if (index < 0 || index >= list.length) return;
  const item = list[index];

  // 根据模板类型设置不同的默认 URL
  let defaultUrl = "";
  const template = Array.isArray(item.templates)
    ? item.templates[0]
    : item.templates;

  if (template === "searchUrlTemplate") {
    defaultUrl =
      "https://ghproxy.site/https://api.github.com/search/repositories?q={{queryPrefix}}{{search}}&page={{page}}";
  } else if (template === "downloadUrlTemplate") {
    defaultUrl =
      "https://ghproxy.site/https://api.github.com/repos/{{user}}/{{repo}}/zipball/{{branch}}";
  } else if (template === "rawFileUrlTemplate") {
    defaultUrl =
      "https://ghproxy.site/https://raw.githubusercontent.com/{{user}}/{{repo}}/{{branch}}/{{path}}";
  } else {
    // 如果没有选择模板，使用搜索 API 作为默认
    defaultUrl =
      "https://ghproxy.site/https://api.github.com/search/repositories?q={{queryPrefix}}{{search}}&page={{page}}";
  }

  list[index] = {
    ...list[index],
    baseUrl: defaultUrl,
  };
  internalList.value = list;
};

// 测试所有镜像
const handleTestAll = async () => {
  // 先清空所有测试结果
  testResultsByItem.value = [];

  // 收集所有需要测试的配置项和模板
  const allTestItems: Array<{
    itemIndex: number;
    item: MirrorUrlItem;
    template:
      | "searchUrlTemplate"
      | "downloadUrlTemplate"
      | "rawFileUrlTemplate";
    templateLabel: string;
  }> = [];

  for (let i = 0; i < internalList.value.length; i++) {
    const item = internalList.value[i];
    const selectedTemplates = Array.isArray(item.templates)
      ? item.templates
      : item.templates
        ? [item.templates]
        : [];

    for (const template of selectedTemplates) {
      const templateLabel =
        template === "searchUrlTemplate"
          ? "搜索 API"
          : template === "downloadUrlTemplate"
            ? "下载 ZIP"
            : "Raw 文件";
      allTestItems.push({
        itemIndex: i,
        item,
        template,
        templateLabel,
      });
    }
  }

  if (allTestItems.length === 0) {
    return;
  }

  // 初始化测试结果（显示测试中状态）
  const initialResults: TestResultByItem[] = allTestItems.map((testItem) => {
    const url = buildTestUrl(testItem.item, testItem.template) || "";
    return {
      itemIndex: testItem.itemIndex,
      template: testItem.template,
      templateLabel: testItem.templateLabel,
      url,
      result: null,
      testing: true,
    };
  });

  testResultsByItem.value = initialResults;

  try {
    // 构建所有需要测试的URL
    const testUrlsList: string[] = [];

    for (const result of initialResults) {
      if (result.url) {
        testUrlsList.push(result.url);
      }
    }

    if (testUrlsList.length === 0) {
      testResultsByItem.value = [];
      return;
    }

    // 执行测试
    const testResults = await testUrls(testUrlsList, {
      timeout: 8000,
      method: "HEAD",
    });

    // 更新测试结果
    const updatedResults = initialResults.map((result) => {
      const testResult = testResults.find((r) => r.url === result.url);
      return {
        ...result,
        result: testResult || null,
        testing: false,
      };
    });

    testResultsByItem.value = updatedResults;

    // 统计结果
    const successCount = updatedResults.filter((r) => r.result?.ok).length;
    const totalCount = updatedResults.length;

    console.log(`✅ 所有镜像测试完成: ${successCount}/${totalCount} 个URL可用`);

    // 找出每个配置项最快的可用URL
    const fastestByItem = new Map<number, UrlTestResult>();
    for (const result of updatedResults) {
      if (result.result?.ok) {
        const existing = fastestByItem.get(result.itemIndex);
        if (!existing || result.result.time < existing.time) {
          fastestByItem.set(result.itemIndex, result.result);
        }
      }
    }

    if (fastestByItem.size > 0) {
      console.log(`✅ 找到 ${fastestByItem.size} 个配置项有可用镜像`);
    } else {
      console.warn("⚠️ 所有镜像测试完成，但没有可用的镜像");
    }
  } catch (error) {
    console.error("测试所有镜像时出错:", error);
    // 标记所有结果为测试失败
    const failedResults = initialResults.map((result) => ({
      ...result,
      result: {
        url: result.url,
        ok: false,
        time: 0,
        error: String(error),
      },
      testing: false,
    }));
    testResultsByItem.value = failedResults;
  }
};
</script>
