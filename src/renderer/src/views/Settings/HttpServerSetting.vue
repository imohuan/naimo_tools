<template>
  <div class="space-y-3 text-xs text-gray-700">
    <!-- 端口配置 -->
    <div class="flex items-center gap-2">
      <label class="text-xs font-medium text-gray-700 min-w-[50px]">端口</label>
      <input
        v-model.number="localPort"
        type="number"
        min="1024"
        max="65535"
        placeholder="请输入端口号 (1024-65535)"
        class="flex-1 px-2 py-1 border border-gray-300 rounded-md outline-none text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        :disabled="toggling || testing"
        @blur="handlePortChange"
      />
    </div>

    <!-- 状态显示 -->
    <div
      v-if="serverStatus || testResult !== null"
      :class="[
        'p-1.5 rounded border space-y-1',
        testResult !== null
          ? testResult.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
          : 'bg-gray-50 border-gray-200',
      ]"
    >
      <!-- 服务状态 -->
      <div
        v-if="serverStatus"
        class="flex items-center gap-2 text-[11px] text-gray-600"
      >
        <div
          :class="[
            'w-2 h-2 rounded-full flex-shrink-0',
            serverStatus.isRunning ? 'bg-green-500' : 'bg-gray-400',
          ]"
        ></div>
        <span>
          {{
            serverStatus.isRunning
              ? `服务运行中 (端口: ${serverStatus.port || localPort})`
              : "服务已停止"
          }}
        </span>
      </div>
      <!-- 测试结果 -->
      <div
        v-if="testResult !== null"
        class="flex items-center gap-2 text-[11px]"
        :class="testResult.success ? 'text-green-700' : 'text-red-700'"
      >
        <span class="text-[10px]">{{ testResult.success ? "✅" : "❌" }}</span>
        <span class="flex-1">
          {{ testResult.message }}
        </span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-2">
      <!-- 开启/关闭切换按钮 -->
      <button
        type="button"
        :disabled="toggling || testing || !isPortValid"
        :class="[
          'px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1',
          toggling || testing || !isPortValid
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : localEnabled
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-500 text-white hover:bg-green-600',
        ]"
        @click="handleToggle"
      >
        <IconMdiRefresh v-if="toggling" class="w-3 h-3 animate-spin" />
        <IconMdiPower v-else-if="localEnabled" class="w-3 h-3" />
        <IconMdiPowerOff v-else class="w-3 h-3" />
        <span>{{
          toggling ? "切换中..." : localEnabled ? "关闭服务" : "开启服务"
        }}</span>
      </button>

      <!-- 测试 URL 按钮 -->
      <button
        type="button"
        :disabled="testing || toggling"
        :class="[
          'px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1',
          testing || toggling
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600',
        ]"
        @click="handleTestUrl"
      >
        <IconMdiRefresh v-if="testing" class="w-3 h-3 animate-spin" />
        <IconMdiNetwork v-else class="w-3 h-3" />
        <span>{{ testing ? "测试中..." : "测试 URL" }}</span>
      </button>

      <!-- 复制 URL 按钮 -->
      <button
        type="button"
        :disabled="testing || toggling"
        :class="[
          'px-2 py-1 rounded text-[11px] transition-colors flex items-center gap-1',
          testing || toggling
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isCopied
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-500 text-white hover:bg-gray-600',
        ]"
        @click="copyToClipboard(currentTestUrl)"
      >
        <IconMdiCheck v-if="isCopied" class="w-3 h-3" />
        <IconMdiContentCopy v-else class="w-3 h-3" />
        <span>{{ isCopied ? "已复制" : "复制 URL" }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import type { AppConfig } from "@shared/typings/appTypes";
import { useHttpClient } from "@/composables/useHttpClient";
/** @ts-ignore */
import IconMdiPower from "~icons/mdi/power";
/** @ts-ignore */
import IconMdiPowerOff from "~icons/mdi/power-off";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiNetwork from "~icons/mdi/network";
/** @ts-ignore */
import IconMdiContentCopy from "~icons/mdi/content-copy";
/** @ts-ignore */
import IconMdiCheck from "~icons/mdi/check";

interface Props {
  /** HTTP 服务器配置 */
  modelValue: AppConfig["httpServer"] | any;
}

interface Emits {
  (e: "update:modelValue", value: AppConfig["httpServer"]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 使用 HTTP 客户端进行 URL 测试
const { testing, testUrls } = useHttpClient();

// 内部状态
const localPort = ref<number>(8080);
const localEnabled = ref<boolean>(false);
const toggling = ref<boolean>(false);
const serverStatus = ref<{
  isRunning: boolean;
  port: number | null;
  staticRoot: string | null;
} | null>(null);
const testResult = ref<{
  success: boolean;
  message: string;
  url?: string;
} | null>(null);
const isCopied = ref<boolean>(false);

// 端口是否有效
const isPortValid = computed(() => {
  return localPort.value >= 1024 && localPort.value <= 65535;
});

// 当前测试 URL
const currentTestUrl = computed(() => {
  const port = serverStatus.value?.port || localPort.value;
  return `http://localhost:${port}`;
});

// 从 props 初始化本地值
const initializeFromProps = () => {
  if (props.modelValue) {
    localPort.value = props.modelValue.port || 8080;
    localEnabled.value = props.modelValue.enabled || false;
  } else {
    localPort.value = 8080;
    localEnabled.value = false;
  }
};

// 更新父组件值
const updateValue = () => {
  emit("update:modelValue", {
    enabled: localEnabled.value,
    port: localPort.value,
  });
};

// 获取服务器状态
const fetchServerStatus = async () => {
  try {
    const status = await window.naimo.router.httpGetStatus();
    serverStatus.value = status;
    // 同步本地状态（仅当状态确实变化时）
    if (status.isRunning !== localEnabled.value) {
      localEnabled.value = status.isRunning;
      updateValue();
    }
    if (status.port && status.port !== localPort.value) {
      localPort.value = status.port;
      updateValue();
    }
  } catch (error) {
    console.error("获取服务器状态失败:", error);
  }
};

// 处理端口变更
const handlePortChange = async () => {
  if (!isPortValid.value) {
    return;
  }

  try {
    const success = await window.naimo.router.httpSetPort(localPort.value);
    if (success) {
      updateValue();
      // 如果服务正在运行，需要重启
      if (serverStatus.value?.isRunning) {
        await window.naimo.router.httpRestart();
      }
      await fetchServerStatus();
    }
  } catch (error) {
    console.error("设置端口失败:", error);
  }
};

// 处理开启/关闭切换
const handleToggle = async () => {
  if (toggling.value || !isPortValid.value) {
    return;
  }

  try {
    toggling.value = true;
    const newEnabled = !localEnabled.value;

    // 先设置端口（如果端口已变更）
    if (localPort.value !== serverStatus.value?.port) {
      const portPromise = window.naimo.router.httpSetPort(localPort.value);
      const portTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("设置端口超时")), 10000)
      );
      await Promise.race([portPromise, portTimeout]);
    }

    // 设置启用状态（添加超时保护）
    const enabledPromise = window.naimo.router.httpSetEnabled(newEnabled);
    const enabledTimeout = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("切换服务状态超时")), 15000)
    );

    const success = await Promise.race([enabledPromise, enabledTimeout]);

    if (success) {
      localEnabled.value = newEnabled;
      updateValue();

      // 等待一小段时间让服务器状态稳定
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 获取最新状态（添加超时保护）
      const statusPromise = fetchServerStatus();
      const statusTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("获取状态超时")), 5000)
      );
      await Promise.race([statusPromise, statusTimeout]);
    } else {
      console.error("切换服务状态失败");
    }
  } catch (error: any) {
    console.error("切换服务状态失败:", error);
    // 即使出错也尝试获取最新状态
    try {
      await fetchServerStatus();
    } catch (statusError) {
      console.error("获取状态失败:", statusError);
    }
  } finally {
    toggling.value = false;
  }
};

// 处理测试 URL
const handleTestUrl = async () => {
  if (testing.value) {
    return;
  }

  try {
    testResult.value = null;

    const port = serverStatus.value?.port || localPort.value;
    const testUrl = `http://localhost:${port}`;

    // 使用 useUrlTester 测试 URL，超时时间 3s
    const results = await testUrls([testUrl], {
      timeout: 3000,
      method: "GET",
    });

    if (results && results.length > 0) {
      const result = results[0];
      if (result.ok) {
        testResult.value = {
          success: true,
          message: `连接成功！服务器运行正常 (端口: ${port}，耗时: ${Math.round(result.time)}ms)`,
          url: result.url,
        };
      } else {
        // 检查是否是连接失败的错误（如 Failed to fetch）
        const errorMsg = result.error || "";
        const isConnectionError =
          errorMsg.includes("Failed to fetch") ||
          errorMsg.includes("fetch failed") ||
          errorMsg.includes("ERR_CONNECTION_REFUSED") ||
          errorMsg.includes("ECONNREFUSED") ||
          (!result.status && errorMsg);

        if (isConnectionError) {
          testResult.value = {
            success: false,
            message: "服务测试失败，请开启服务",
            url: result.url,
          };
        } else {
          testResult.value = {
            success: false,
            message: result.error
              ? `测试失败: ${result.error}`
              : `连接失败 (端口: ${port}，状态码: ${result.status || "无响应"})`,
            url: result.url,
          };
        }
      }
    } else {
      testResult.value = {
        success: false,
        message: `测试失败: 未返回测试结果`,
        url: testUrl,
      };
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error || "");
    const isConnectionError =
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("fetch failed") ||
      errorMsg.includes("ERR_CONNECTION_REFUSED") ||
      errorMsg.includes("ECONNREFUSED");

    if (isConnectionError) {
      testResult.value = {
        success: false,
        message: "服务测试失败，请开启服务",
      };
    } else {
      testResult.value = {
        success: false,
        message: `测试失败: ${errorMsg || "未知错误"}`,
      };
    }
  }
};

// 复制到剪贴板
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // 设置复制成功状态
    isCopied.value = true;
    // 1.5秒后恢复
    setTimeout(() => {
      isCopied.value = false;
    }, 1500);
  } catch (error) {
    console.error("复制失败:", error);
  }
};

// 监听 props 变化
watch(
  () => props.modelValue,
  () => {
    initializeFromProps();
  },
  { deep: true }
);

// 定期刷新状态的定时器
let statusInterval: NodeJS.Timeout | null = null;

// 组件挂载时初始化
onMounted(() => {
  initializeFromProps();
  fetchServerStatus();
  // 定期刷新状态
  statusInterval = setInterval(fetchServerStatus, 3000);
});

// 组件卸载时清理
onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
});
</script>
