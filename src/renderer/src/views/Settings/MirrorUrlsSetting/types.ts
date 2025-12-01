import type { MirrorUrlItem } from "@shared/typings/appTypes";

export interface MirrorUrlsSettingProps {
  modelValue: MirrorUrlItem[] | any;
}

export interface MirrorUrlsSettingEmits {
  (e: "update:modelValue", value: MirrorUrlItem[]): void;
}

export interface MirrorItemActions {
  updateMode: (index: number, mode: "prefix" | "base") => void;
  getTemplateSelectValue: (
    mode: "prefix" | "base",
    templates?: MirrorUrlItem["templates"]
  ) => string | string[];
  updateTemplatesFromCustomSelect: (
    index: number,
    mode: "prefix" | "base",
    value: string | number | (string | number)[]
  ) => void;
  duplicateItem: (index: number) => void;
  removeItem: (index: number) => void;
  toggleWordWrap: (index: number) => void;
  getWordWrap: (index: number) => boolean;
  updatePrefix: (index: number, event: Event) => void;
  updateBaseUrl: (index: number, event: Event) => void;
  setDefaultPrefix: (index: number) => void;
  setDefaultBaseUrl: (index: number) => void;
  testSingleItem: (index: number) => Promise<void>;
  getItemTestResults: (itemIndex: number) => TestResultByItem[];
  copyToClipboard: (text: string) => Promise<void>;
  isCopied: (url: string) => boolean;
  handleTextareaKeydown: (
    index: number,
    field: "prefix" | "baseUrl",
    event: KeyboardEvent
  ) => void;
  sortEntriesByTestResults: (index: number) => void;
  getDisableUnavailable: (index: number) => boolean;
  handleDisableToggle: (index: number, event: Event) => void;
  clearAllDisabled: (index: number) => void;
  /** 将某个测试结果对应的镜像 URL 应用为全局 mirrorUrl 模板 */
  applyAsMirrorUrl: (index: number, result: TestResultByItem) => Promise<void>;
  /** 判断某个测试结果是否为当前已应用的 mirrorUrl 对应项（用于选中高亮） */
  isCurrentMirrorResult: (result: TestResultByItem) => boolean;
}

export interface TestResultByItem {
  itemIndex: number;
  template: string;
  templateLabel: string;
  url: string;
  sourceValue: string;
  urlIndex: number;
  result: import("@/composables/useHttpClient").UrlTestResult | null;
  testing: boolean;
}
