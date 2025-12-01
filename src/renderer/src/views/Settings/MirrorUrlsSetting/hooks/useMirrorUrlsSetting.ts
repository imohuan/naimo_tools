import { computed, nextTick, ref } from "vue";
import {
  useHttpClient,
  type UrlTestResult,
  buildMirrorUrl,
} from "@/composables/useHttpClient";
import type { MirrorUrlItem } from "@shared/typings/appTypes";
import { GithubUrlBuilder } from "@/core/utils/githubUrlBuilder";
import type {
  MirrorItemActions,
  MirrorUrlsSettingEmits,
  MirrorUrlsSettingProps,
  TestResultByItem,
} from "../types";

export const modeOptions = [
  {
    label: "前缀",
    value: "prefix" as const,
  },
  {
    label: "基础",
    value: "base" as const,
  },
];

export const templateOptions = [
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

interface ParsedEntry {
  value: string;
  disabled: boolean;
  order: number;
}

interface BuiltTestUrl {
  url: string;
  sourceValue: string;
}

export const useMirrorUrlsSetting = (
  props: MirrorUrlsSettingProps,
  emit: MirrorUrlsSettingEmits
) => {
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

  const { testing, testUrls } = useHttpClient();
  const testingSingle = ref<number | null>(null);
  const wordWrapStates = ref<Map<number, boolean>>(new Map());
  const disableUnavailableStates = ref<Map<number, boolean>>(new Map());
  const autoDisabledEntries = ref<Map<number, Set<string>>>(new Map());
  const resultLayout = ref<"grid" | "list">("grid");
  const testResultsByItem = ref<TestResultByItem[]>([]);
  const copyButtonStates = ref<Map<string, boolean>>(new Map());

  const urlBuilder = new GithubUrlBuilder({
    branch: "main",
    queryPrefix: "naimo_tools-",
  });

  const addItem = () => {
    const list = [...internalList.value];
    list.push({
      mode: "prefix",
      prefix: "",
      templates: [],
    });
    internalList.value = list;
  };

  const removeItem = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    internalList.value = list;
  };

  const duplicateItem = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];

    const duplicatedItem: MirrorUrlItem = {
      mode: item.mode,
      ...(item.prefix !== undefined ? { prefix: item.prefix } : {}),
      ...(item.baseUrl !== undefined ? { baseUrl: item.baseUrl } : {}),
      ...(item.templates !== undefined
        ? {
            templates: Array.isArray(item.templates)
              ? [...item.templates]
              : item.templates,
          }
        : {}),
    };

    list.splice(index + 1, 0, duplicatedItem);
    internalList.value = list;
  };

  const getDisableUnavailable = (index: number): boolean => {
    return disableUnavailableStates.value.get(index) ?? false;
  };

  const setDisableUnavailable = (index: number, value: boolean) => {
    disableUnavailableStates.value.set(index, value);
  };

  const ensureAutoDisabledSet = (index: number): Set<string> => {
    let set = autoDisabledEntries.value.get(index);
    if (!set) {
      set = new Set();
      autoDisabledEntries.value.set(index, set);
    }
    return set;
  };

  const applyDisableState = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];
    if (!item) return;

    const shouldDisable = getDisableUnavailable(index);
    const field = item.mode === "prefix" ? "prefix" : "baseUrl";
    const text = (field === "prefix" ? item.prefix : item.baseUrl) || "";

    if (!text) {
      autoDisabledEntries.value.delete(index);
      return;
    }

    const entries = splitEntries(text, { includeDisabled: true });
    if (entries.length === 0) {
      autoDisabledEntries.value.delete(index);
      return;
    }

    const rawResults = testResultsByItem.value.filter(
      (result) => result.itemIndex === index
    );
    const successMap = new Map<string, boolean>();
    rawResults.forEach((result) => {
      if (result.result?.ok) {
        successMap.set(result.sourceValue, true);
      } else if (!successMap.has(result.sourceValue)) {
        successMap.set(result.sourceValue, false);
      }
    });

    const previousAutoSet = ensureAutoDisabledSet(index);
    const newAutoSet = new Set<string>();

    const updatedEntries = entries.map((entry) => {
      const key = entryKeyOf(entry);
      let disabled = entry.disabled;
      const hasSuccess = successMap.get(entry.value) ?? false;

      if (shouldDisable) {
        if (!hasSuccess) {
          disabled = true;
          newAutoSet.add(key);
        } else if (previousAutoSet.has(key)) {
          disabled = false;
        }
      } else if (previousAutoSet.has(key) && disabled) {
        disabled = false;
      }

      return {
        value: entry.value,
        disabled,
        order: entry.order,
      };
    });

    if (shouldDisable) {
      autoDisabledEntries.value.set(index, newAutoSet);
    } else if (newAutoSet.size === 0) {
      autoDisabledEntries.value.delete(index);
    }

    const newText = updatedEntries
      .map((entry) => `${entry.disabled ? "# " : ""}${entry.value}`)
      .join("\n");

    list[index] = {
      ...item,
      ...(field === "prefix" ? { prefix: newText } : { baseUrl: newText }),
    };

    internalList.value = list;
  };

  const splitEntries = (
    text: string | undefined,
    options?: { includeDisabled?: boolean }
  ): ParsedEntry[] => {
    if (!text) return [];
    const includeDisabled = options?.includeDisabled ?? false;
    const segments = text
      .split(/(?:\r?\n|\|)/)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    const entries: ParsedEntry[] = [];
    segments.forEach((segment, index) => {
      const disabled = segment.startsWith("# ");
      const value = disabled ? segment.slice(2).trim() : segment;
      if (!value) return;
      if (!includeDisabled && disabled) {
        return;
      }
      entries.push({
        value,
        disabled,
        order: index,
      });
    });
    return entries;
  };

  const entryKeyOf = (entry: ParsedEntry): string => {
    return `${entry.value}@@${entry.order}`;
  };

  const toggleWordWrap = (index: number) => {
    const current = wordWrapStates.value.get(index) || false;
    wordWrapStates.value.set(index, !current);
  };

  const getWordWrap = (index: number): boolean => {
    return wordWrapStates.value.get(index) || false;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      copyButtonStates.value.set(text, true);
      setTimeout(() => {
        copyButtonStates.value.set(text, false);
      }, 1500);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  const isCopied = (url: string): boolean => {
    return copyButtonStates.value.get(url) || false;
  };

  const displayResultsByItem = computed(() => {
    const map = new Map<number, TestResultByItem[]>();

    const enabledSets = internalList.value.map((item, idx) => {
      const hideDisabled = disableUnavailableStates.value.get(idx) ?? false;
      if (!hideDisabled) return null;
      const sourceText =
        item.mode === "prefix" ? item.prefix || "" : item.baseUrl || "";
      const enabledEntries = splitEntries(sourceText, {
        includeDisabled: false,
      });
      return new Set(enabledEntries.map((entry) => entry.value));
    });

    for (const result of testResultsByItem.value) {
      const allowedSet = enabledSets[result.itemIndex];
      if (allowedSet && !allowedSet.has(result.sourceValue)) {
        continue;
      }
      const list = map.get(result.itemIndex) || [];
      list.push(result);
      map.set(result.itemIndex, list);
    }

    return map;
  });

  const getItemTestResults = (itemIndex: number): TestResultByItem[] => {
    return displayResultsByItem.value.get(itemIndex) || [];
  };

  const updateMode = (index: number, mode: "prefix" | "base") => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const currentItem = list[index];

    let templates: typeof currentItem.templates;
    if (mode === "prefix") {
      templates = Array.isArray(currentItem.templates)
        ? currentItem.templates
        : currentItem.templates
          ? [currentItem.templates as any]
          : [];
    } else {
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
      ...(mode === "prefix" ? { baseUrl: undefined } : { prefix: undefined }),
    };
    internalList.value = list;
  };

  const reapplyAllDisableStates = () => {
    internalList.value.forEach((_, idx) => {
      if (getDisableUnavailable(idx)) {
        applyDisableState(idx);
      }
    });
  };

  const getTemplateSelectValue = (
    mode: "prefix" | "base",
    templates?: MirrorUrlItem["templates"]
  ): string | string[] => {
    if (!templates) {
      return mode === "prefix" ? [] : "";
    }

    if (mode === "prefix") {
      return Array.isArray(templates) ? templates : [templates];
    }
    return Array.isArray(templates) ? templates[0] || "" : templates;
  };

  const updateTemplatesFromCustomSelect = (
    index: number,
    mode: "prefix" | "base",
    value: string | number | (string | number)[]
  ) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;

    if (mode === "prefix") {
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

  const getOriginalTestUrl = (
    templateType:
      | "searchUrlTemplate"
      | "downloadUrlTemplate"
      | "rawFileUrlTemplate"
  ): string => {
    if (templateType === "searchUrlTemplate") {
      return urlBuilder.getSearchUrl("", 1);
    } else if (templateType === "downloadUrlTemplate") {
      return urlBuilder.getDownloadUrlFromUserRepo("imohuan", "naimo_tools");
    } else if (templateType === "rawFileUrlTemplate") {
      return urlBuilder.getRawFileUrl("imohuan", "naimo_tools", ".npmrc");
    }
    return "";
  };

  const parseUserTemplate = (
    template: string,
    templateType:
      | "searchUrlTemplate"
      | "downloadUrlTemplate"
      | "rawFileUrlTemplate"
  ): string => {
    if (!template) return "";

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

    return urlBuilder.parse(template, params);
  };

  const buildTestUrls = (
    item: MirrorUrlItem,
    templateType:
      | "searchUrlTemplate"
      | "downloadUrlTemplate"
      | "rawFileUrlTemplate"
  ): BuiltTestUrl[] => {
    if (item.mode === "prefix") {
      if (!item.prefix) return [];
      const prefixes = splitEntries(item.prefix);
      const originalUrl = getOriginalTestUrl(templateType);
      return prefixes
        .map((prefix) => ({
          url: buildMirrorUrl(prefix.value, originalUrl),
          sourceValue: prefix.value,
        }))
        .filter((entry) => Boolean(entry.url));
    }

    if (!item.baseUrl) return [];
    const baseUrls = splitEntries(item.baseUrl);
    return baseUrls
      .map((baseUrl) => ({
        url: parseUserTemplate(baseUrl.value, templateType),
        sourceValue: baseUrl.value,
      }))
      .filter((entry) => Boolean(entry.url));
  };

  const testSingleItem = async (index: number) => {
    const item = internalList.value[index];
    if (!item) return;

    testResultsByItem.value = testResultsByItem.value.filter(
      (r) => r.itemIndex !== index
    );

    testingSingle.value = index;

    const selectedTemplates = Array.isArray(item.templates)
      ? item.templates
      : item.templates
        ? [item.templates]
        : [];

    if (selectedTemplates.length === 0) {
      testingSingle.value = null;
      return;
    }

    const results: TestResultByItem[] = [];

    for (const template of selectedTemplates) {
      const templateLabel =
        template === "searchUrlTemplate"
          ? "搜索 API"
          : template === "downloadUrlTemplate"
            ? "下载 ZIP"
            : "Raw 文件";

      const urls = buildTestUrls(item, template);

      urls.forEach((builtUrl, urlIndex) => {
        results.push({
          itemIndex: index,
          template,
          templateLabel,
          url: builtUrl.url,
          sourceValue: builtUrl.sourceValue,
          urlIndex,
          result: null,
          testing: true,
        });
      });
    }

    testResultsByItem.value = [...testResultsByItem.value, ...results];

    const shouldReapplyDisable = getDisableUnavailable(index);

    try {
      const testUrlsList: string[] = results.map((r) => r.url).filter(Boolean);

      if (testUrlsList.length === 0) {
        testingSingle.value = null;
        return;
      }

      const testResults = await testUrls(testUrlsList, {
        timeout: 3000,
        method: "HEAD",
      });

      const updatedResults = results.map((result) => {
        const testResult = testResults.find((r) => r.url === result.url);
        return {
          ...result,
          result: testResult || null,
          testing: false,
        };
      });

      testResultsByItem.value = [
        ...testResultsByItem.value.filter((r) => r.itemIndex !== index),
        ...updatedResults,
      ];

      const successCount = updatedResults.filter((r) => r.result?.ok).length;
      const totalCount = updatedResults.length;
      console.log(
        `✅ 镜像项 ${index + 1} 测试完成: ${successCount}/${totalCount} 个URL可用`
      );
    } catch (error) {
      console.error("测试镜像时出错:", error);
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
      if (shouldReapplyDisable) {
        applyDisableState(index);
      }
      testingSingle.value = null;
    }
  };

  const updatePrefix = (index: number, event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    list[index] = {
      ...list[index],
      prefix: target.value,
    };
    internalList.value = list;
  };

  const updateBaseUrl = (index: number, event: Event) => {
    const target = event.target as HTMLTextAreaElement;
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    list[index] = {
      ...list[index],
      baseUrl: target.value,
    };
    internalList.value = list;
  };

  const setDefaultPrefix = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    list[index] = {
      ...list[index],
      prefix: "https://ghproxy.site/",
    };
    internalList.value = list;
  };

  const setDefaultBaseUrl = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];

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
      defaultUrl =
        "https://ghproxy.site/https://api.github.com/search/repositories?q={{queryPrefix}}{{search}}&page={{page}}";
    }

    list[index] = {
      ...list[index],
      baseUrl: defaultUrl,
    };
    internalList.value = list;
  };

  const sortEntriesByTestResults = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];

    const sourceText =
      item.mode === "prefix" ? item.prefix || "" : item.baseUrl || "";
    const entries = splitEntries(sourceText, { includeDisabled: true });
    if (entries.length === 0) return;

    const results = getItemTestResults(index);
    if (results.length === 0) return;

    const shouldDisable = getDisableUnavailable(index);

    const scoredEntries = entries.map((entry) => {
      const relatedResults = results.filter(
        (result) => result.sourceValue === entry.value
      );
      const successfulResults = relatedResults.filter(
        (result) => result.result?.ok
      );
      const fastestTime = successfulResults.length
        ? Math.min(
            ...successfulResults.map(
              (result) => result.result?.time ?? Infinity
            )
          )
        : null;

      return {
        entry,
        hasResult: relatedResults.length > 0,
        hasSuccess: successfulResults.length > 0,
        fastestTime: fastestTime ?? Infinity,
      };
    });

    scoredEntries.sort((a, b) => {
      if (a.hasSuccess !== b.hasSuccess) {
        return a.hasSuccess ? -1 : 1;
      }
      if (a.hasSuccess && b.hasSuccess) {
        if (a.fastestTime !== b.fastestTime) {
          return a.fastestTime - b.fastestTime;
        }
      }
      if (a.hasResult !== b.hasResult) {
        return a.hasResult ? -1 : 1;
      }
      return a.entry.order - b.entry.order;
    });

    const reorderedText = scoredEntries
      .map(({ entry, hasSuccess }) => {
        const disabled = shouldDisable ? !hasSuccess : entry.disabled;
        return `${disabled ? "# " : ""}${entry.value}`;
      })
      .join("\n");

    list[index] = {
      ...item,
      ...(item.mode === "prefix"
        ? { prefix: reorderedText }
        : { baseUrl: reorderedText }),
    };

    internalList.value = list;

    // 同步更新测试结果顺序以匹配文本顺序
    const orderMap = new Map<string, number>();
    scoredEntries.forEach(({ entry }, idx) => {
      orderMap.set(entry.value, idx);
    });

    const currentResults = getItemTestResults(index);
    const otherResults = testResultsByItem.value.filter(
      (r) => r.itemIndex !== index
    );

    const sortedResults = [...currentResults].sort((a, b) => {
      const aOrder = orderMap.get(a.sourceValue) ?? 0;
      const bOrder = orderMap.get(b.sourceValue) ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.urlIndex - b.urlIndex;
    });

    testResultsByItem.value = [...otherResults, ...sortedResults];
  };

  const toggleLineDisable = (
    index: number,
    field: "prefix" | "baseUrl",
    textarea: HTMLTextAreaElement
  ) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];
    const value = field === "prefix" ? item.prefix || "" : item.baseUrl || "";
    if (!value) return;

    const selectionStart = textarea.selectionStart ?? 0;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const nextNewLineIndex = value.indexOf("\n", selectionEnd);
    const lineEnd = nextNewLineIndex === -1 ? value.length : nextNewLineIndex;
    const line = value.slice(lineStart, lineEnd);
    if (!line.trim()) return;

    const trimmedLine = line.trimStart();
    const leadingSpacesCount = line.length - trimmedLine.length;
    const alreadyDisabled = trimmedLine.startsWith("# ");

    let newLine: string;
    if (alreadyDisabled) {
      newLine = line.slice(0, leadingSpacesCount) + trimmedLine.slice(2);
    } else {
      newLine = line.slice(0, leadingSpacesCount) + "# " + trimmedLine;
    }

    const newValue = value.slice(0, lineStart) + newLine + value.slice(lineEnd);

    list[index] = {
      ...item,
      ...(field === "prefix" ? { prefix: newValue } : { baseUrl: newValue }),
    };
    internalList.value = list;

    const cursorDelta = newLine.length - line.length;
    nextTick(() => {
      const newCursorPos = Math.max(0, selectionStart + cursorDelta);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleTextareaKeydown = (
    index: number,
    field: "prefix" | "baseUrl",
    event: KeyboardEvent
  ) => {
    if (event.key === "/" && event.ctrlKey) {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement | null;
      if (target) {
        toggleLineDisable(index, field, target);
      }
    }
  };

  const handleDisableToggle = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement;
    setDisableUnavailable(index, target.checked);
    applyDisableState(index);
  };

  // 取消当前项中所有行首 "# " 注释
  const clearAllDisabled = (index: number) => {
    const list = [...internalList.value];
    if (index < 0 || index >= list.length) return;
    const item = list[index];

    const transform = (text?: string | null): string | undefined => {
      if (!text) return text ?? "";
      return text.replace(/^(\s*)#\s+/gm, "$1");
    };

    list[index] = {
      ...item,
      ...(item.prefix !== undefined ? { prefix: transform(item.prefix) } : {}),
      ...(item.baseUrl !== undefined
        ? { baseUrl: transform(item.baseUrl) }
        : {}),
    };

    internalList.value = list;

    disableUnavailableStates.value.set(index, false);
    autoDisabledEntries.value.delete(index);
  };

  const handleTestAll = async () => {
    testResultsByItem.value = [];

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

    const initialResults: TestResultByItem[] = [];

    for (const testItem of allTestItems) {
      const urls = buildTestUrls(testItem.item, testItem.template);
      urls.forEach((builtUrl, urlIndex) => {
        initialResults.push({
          itemIndex: testItem.itemIndex,
          template: testItem.template,
          templateLabel: testItem.templateLabel,
          url: builtUrl.url,
          sourceValue: builtUrl.sourceValue,
          urlIndex,
          result: null,
          testing: true,
        });
      });
    }

    testResultsByItem.value = initialResults;

    try {
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

      const testResults = await testUrls(testUrlsList, {
        timeout: 3000,
        method: "HEAD",
      });

      const updatedResults = initialResults.map((result) => {
        const testResult = testResults.find((r) => r.url === result.url);
        return {
          ...result,
          result: testResult || null,
          testing: false,
        };
      });

      testResultsByItem.value = updatedResults;

      reapplyAllDisableStates();

      const successCount = updatedResults.filter((r) => r.result?.ok).length;
      const totalCount = updatedResults.length;

      console.log(
        `✅ 所有镜像测试完成: ${successCount}/${totalCount} 个URL可用`
      );

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
      reapplyAllDisableStates();
    }
  };

  const itemActions: MirrorItemActions = {
    updateMode,
    getTemplateSelectValue,
    updateTemplatesFromCustomSelect,
    duplicateItem,
    removeItem,
    toggleWordWrap,
    getWordWrap,
    updatePrefix,
    updateBaseUrl,
    setDefaultPrefix,
    setDefaultBaseUrl,
    testSingleItem,
    getItemTestResults,
    copyToClipboard,
    isCopied,
    handleTextareaKeydown,
    sortEntriesByTestResults,
    getDisableUnavailable,
    handleDisableToggle,
    clearAllDisabled,
  };

  return {
    internalList,
    testing,
    testingSingle,
    addItem,
    handleTestAll,
    modeOptions,
    templateOptions,
    itemActions,
    resultLayout,
  };
};
