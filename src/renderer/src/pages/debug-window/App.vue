<template>
  <div
    class="w-full h-full font-sans text-gray-200 select-none rounded-xl overflow-hidden"
  >
    <!-- 折叠状态 - 显示圆球 -->
    <DraggableArea
      v-if="!isExpanded"
      window-type="window"
      class="w-full h-full flex items-center justify-center"
      @click="toggleExpanded"
    >
      <div
        class="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg flex flex-col items-center justify-center gap-0.5 relative transition-transform duration-200 hover:scale-105"
      >
        <div class="scale-70">
          <div class="flex flex-col items-center gap-0">
            <div class="text-sm font-bold text-white leading-none">
              {{ debugInfo.performance.memoryUsage.toFixed(1) }}
            </div>
            <div class="text-[9px] text-white/80 leading-none">MB</div>
          </div>
          <div class="flex flex-col items-center gap-0">
            <div class="text-sm font-bold text-white leading-none">
              {{ debugInfo.performance.activeViewCount }}
            </div>
            <div class="text-[9px] text-white/80 leading-none">视图</div>
          </div>
        </div>
        <div
          class="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full border-2 border-white/90"
          :class="{
            'bg-green-500': statusClass === 'status-normal',
            'bg-orange-500': statusClass === 'status-warning',
            'bg-red-500': statusClass === 'status-critical',
          }"
        ></div>
      </div>
    </DraggableArea>

    <!-- 展开状态 - 显示详细面板 -->
    <div
      v-else
      class="w-full h-full bg-gray-900/98 backdrop-blur-lg flex flex-col"
      style="box-shadow: 0 1px 3px 0 rgba(60, 72, 120, 0.48)"
    >
      <!-- 头部 - 可拖拽区域 -->
      <div
        class="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 flex justify-between items-center border-b border-white/10 drag-region flex-shrink-0"
      >
        <h3 class="m-0 text-base font-semibold text-white select-none">
          系统调试
        </h3>
        <button
          class="bg-white/20 hover:bg-white/30 border-0 rounded w-6 h-6 flex items-center justify-center cursor-pointer text-white text-sm transition-colors duration-200 no-drag-region"
          @click="toggleExpanded"
        >
          ✕
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-hidden">
        <div class="h-full py-3 pl-3 pr-3 overflow-y-auto flex flex-col gap-3">
          <!-- 性能指标 -->
          <section class="bg-white/5 rounded-lg p-2.5">
            <h4 class="m-0 mb-2 text-[13px] font-semibold text-white/90">
              性能指标
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-white/8 rounded-md p-2 text-center">
                <div class="text-[10px] text-white/70 mb-1">内存使用</div>
                <div class="text-base font-bold text-white">
                  {{ debugInfo.performance.memoryUsage.toFixed(1) }} MB
                </div>
              </div>
              <div class="bg-white/8 rounded-md p-2 text-center">
                <div class="text-[10px] text-white/70 mb-1">CPU 使用</div>
                <div class="text-base font-bold text-white">
                  {{ debugInfo.performance.cpuUsage.toFixed(1) }}%
                </div>
              </div>
              <div class="bg-white/8 rounded-md p-2 text-center">
                <div class="text-[10px] text-white/70 mb-1">活跃视图</div>
                <div class="text-base font-bold text-white">
                  {{ debugInfo.performance.activeViewCount }}
                </div>
              </div>
              <div class="bg-white/8 rounded-md p-2 text-center">
                <div class="text-[10px] text-white/70 mb-1">切换时间</div>
                <div class="text-base font-bold text-white">
                  {{ debugInfo.performance.switchTime.toFixed(0) }} ms
                </div>
              </div>
            </div>
          </section>

          <!-- 窗口结构（含视图） -->
          <section class="bg-white/5 rounded-lg p-2.5">
            <h4 class="m-0 mb-2 text-[13px] font-semibold text-white/90">
              窗口结构 ({{ debugInfo.windows.length }} 窗口,
              {{ debugInfo.views.length }} 视图)
            </h4>
            <div
              class="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto scrollbar-container"
            >
              <div
                v-for="window in debugInfo.windows"
                :key="window.id"
                class="bg-white/8 rounded-md overflow-hidden"
              >
                <!-- 窗口头部（可点击展开） -->
                <div
                  class="p-2 flex flex-col gap-1 transition-colors"
                  :class="
                    window.viewIds && window.viewIds.length > 0
                      ? 'cursor-pointer hover:bg-white/10'
                      : ''
                  "
                  @click="
                    window.viewIds && window.viewIds.length > 0
                      ? toggleWindowExpand(window.id)
                      : null
                  "
                >
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-1.5">
                      <span
                        v-if="window.viewIds && window.viewIds.length > 0"
                        class="text-[10px] text-white/60 w-3"
                      >
                        {{ expandedWindows.has(window.id) ? "▼" : "▶" }}
                      </span>
                      <span class="text-[11px] font-semibold text-white">{{
                        formatWindowType(window.type)
                      }}</span>
                      <span
                        v-if="window.viewIds && window.viewIds.length > 0"
                        class="text-[9px] text-indigo-400"
                      >
                        {{ window.viewIds.length }}个视图
                      </span>
                    </div>
                    <span class="text-[9px] text-white/60"
                      >ID: {{ window.id }}</span
                    >
                  </div>
                  <div class="flex gap-1.5 items-center flex-wrap">
                    <span
                      class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70"
                      :class="{
                        '!bg-green-500/30 !text-green-500': window.isVisible,
                      }"
                    >
                      {{ window.isVisible ? "可见" : "隐藏" }}
                    </span>
                    <span
                      v-if="window.memoryUsage > 0"
                      class="text-[9px] text-white/60"
                    >
                      {{ window.memoryUsage.toFixed(1) }} MB
                    </span>
                    <span v-else class="text-[9px] text-white/40">(容器)</span>
                  </div>
                </div>

                <!-- 展开的视图列表 -->
                <div
                  v-if="
                    expandedWindows.has(window.id) &&
                    window.viewIds &&
                    window.viewIds.length > 0
                  "
                  class="bg-white/5 border-t border-white/10"
                >
                  <div
                    v-for="viewId in window.viewIds"
                    :key="viewId"
                    class="p-2 pl-8 flex justify-between items-center hover:bg-white/8 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <div class="flex flex-col min-w-0">
                      <div
                        class="text-[10px] font-medium text-white/90 truncate"
                      >
                        📄 {{ getViewById(viewId)?.id || viewId }}
                      </div>
                      <span class="text-[9px] text-white/50">{{
                        getViewById(viewId)?.category || "unknown"
                      }}</span>
                    </div>
                    <div class="flex gap-1.5 items-center flex-shrink-0">
                      <span
                        class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/70"
                        :class="{
                          '!bg-orange-500/30 !text-orange-500':
                            getViewById(viewId)?.isPaused,
                        }"
                      >
                        {{ getViewById(viewId)?.isPaused ? "暂停" : "活跃" }}
                      </span>
                      <span class="text-[9px] text-white/60 font-semibold">
                        {{ (getViewById(viewId)?.memoryUsage || 0).toFixed(1) }}
                        MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 其他进程 -->
          <section class="bg-white/5 rounded-lg p-2.5">
            <h4 class="m-0 mb-2 text-[13px] font-semibold text-white/90">
              其他进程 ({{ debugInfo.otherProcesses.length }})
            </h4>
            <div class="flex flex-col gap-2">
              <!-- 主进程 -->
              <div v-if="browserProcess">
                <div class="text-[10px] text-blue-400/80 mb-1 px-1">主进程</div>
                <div
                  class="flex justify-between items-center p-2 bg-blue-500/10 rounded-md border border-blue-500/20"
                >
                  <div class="flex flex-col">
                    <div class="text-[10px] font-medium text-blue-400">
                      {{ getProcessTypeName(browserProcess.type) }}
                    </div>
                    <span class="text-[9px] text-white/60"
                      >PID: {{ browserProcess.pid }}</span
                    >
                  </div>
                  <div class="flex gap-1.5 items-center">
                    <span class="text-[9px] text-blue-400/80">
                      {{ browserProcess.memoryUsage.toFixed(1) }} MB
                    </span>
                  </div>
                </div>
              </div>

              <!-- 工具进程 -->
              <div v-if="utilityProcesses.length > 0">
                <div class="text-[10px] text-white/50 mb-1 px-1">
                  工具进程 (Worker)
                </div>
                <div class="flex flex-col gap-1">
                  <div
                    v-for="process in utilityProcesses"
                    :key="process.pid"
                    class="flex justify-between items-center p-2 bg-white/8 rounded-md"
                  >
                    <div class="flex flex-col">
                      <div class="text-[10px] font-medium text-white/90">
                        {{ getProcessTypeName(process.type) }}
                      </div>
                      <span class="text-[9px] text-white/60"
                        >PID: {{ process.pid }}</span
                      >
                    </div>
                    <div class="flex gap-1.5 items-center">
                      <span class="text-[9px] text-white/60">
                        {{ process.memoryUsage.toFixed(1) }} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- GPU 进程（系统共享，不计入应用内存） -->
              <div v-if="gpuProcesses.length > 0">
                <div
                  class="text-[10px] text-gray-400/80 mb-1 px-1 flex items-center gap-1"
                >
                  <span>GPU 进程</span>
                  <span class="text-[9px] text-white/40">(系统共享)</span>
                </div>
                <div class="flex flex-col gap-1">
                  <div
                    v-for="process in gpuProcesses"
                    :key="process.pid"
                    class="flex justify-between items-center p-2 bg-gray-500/10 rounded-md border border-gray-500/20"
                  >
                    <div class="flex flex-col">
                      <div class="text-[10px] font-medium text-gray-400">
                        {{ getProcessTypeName(process.type) }}
                      </div>
                      <span class="text-[9px] text-white/60"
                        >PID: {{ process.pid }}</span
                      >
                    </div>
                    <div class="flex gap-1.5 items-center">
                      <span class="text-[9px] text-gray-400/80">
                        {{ process.memoryUsage.toFixed(1) }} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 未追踪的 Tab 进程 -->
              <div v-if="unknownTabProcesses.length > 0">
                <div
                  class="text-[10px] text-orange-400/80 mb-1 px-1 flex items-center gap-1"
                >
                  <span>⚠️ 未追踪进程</span>
                  <span class="text-[9px] text-white/40"
                    >(DevTools/开发工具)</span
                  >
                </div>
                <div class="flex flex-col gap-1">
                  <div
                    v-for="process in unknownTabProcesses"
                    :key="process.pid"
                    class="flex justify-between items-center p-2 bg-orange-500/10 rounded-md border border-orange-500/20"
                  >
                    <div class="flex flex-col">
                      <div class="text-[10px] font-medium text-orange-400">
                        {{ getProcessTypeName(process.type) }}
                      </div>
                      <span class="text-[9px] text-white/60"
                        >PID: {{ process.pid }}</span
                      >
                    </div>
                    <div class="flex gap-1.5 items-center">
                      <span class="text-[9px] text-orange-400/80">
                        {{ process.memoryUsage.toFixed(1) }} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 生命周期统计 -->
          <section class="bg-white/5 rounded-lg p-2.5">
            <h4 class="m-0 mb-2 text-[13px] font-semibold text-white/90">
              生命周期统计
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <div
                class="flex justify-between items-center px-2 py-1.5 bg-white/8 rounded-md"
              >
                <span class="text-[10px] text-white/70">总视图</span>
                <span class="text-xs font-bold text-white">{{
                  debugInfo.lifecycle.totalViews
                }}</span>
              </div>
              <div
                class="flex justify-between items-center px-2 py-1.5 bg-white/8 rounded-md"
              >
                <span class="text-[10px] text-white/70">活跃</span>
                <span class="text-xs font-bold text-white">{{
                  debugInfo.lifecycle.activeViews
                }}</span>
              </div>
              <div
                class="flex justify-between items-center px-2 py-1.5 bg-white/8 rounded-md"
              >
                <span class="text-[10px] text-white/70">暂停</span>
                <span class="text-xs font-bold text-white">{{
                  debugInfo.lifecycle.pausedViews
                }}</span>
              </div>
              <div
                class="flex justify-between items-center px-2 py-1.5 bg-white/8 rounded-md"
              >
                <span class="text-[10px] text-white/70">平均内存</span>
                <span class="text-xs font-bold text-white">
                  {{ debugInfo.lifecycle.averageMemoryPerView.toFixed(1) }} MB
                </span>
              </div>
            </div>
          </section>

          <!-- 系统信息 -->
          <section class="bg-white/5 rounded-lg p-2.5">
            <h4 class="m-0 mb-2 text-[13px] font-semibold text-white/90">
              系统信息
            </h4>
            <div class="flex flex-col gap-1">
              <div
                class="flex justify-between items-center py-1 border-b border-white/5"
              >
                <span class="text-[10px] text-white/70">平台</span>
                <span class="text-[10px] text-white font-medium">{{
                  debugInfo.system.platform
                }}</span>
              </div>
              <div
                class="flex justify-between items-center py-1 border-b border-white/5"
              >
                <span class="text-[10px] text-white/70">Electron</span>
                <span class="text-[10px] text-white font-medium">{{
                  debugInfo.system.electronVersion
                }}</span>
              </div>
              <div
                class="flex justify-between items-center py-1 border-b border-white/5"
              >
                <span class="text-[10px] text-white/70">Node</span>
                <span class="text-[10px] text-white font-medium">{{
                  debugInfo.system.nodeVersion
                }}</span>
              </div>
              <div
                class="flex justify-between items-center py-1 border-b border-white/5"
              >
                <span class="text-[10px] text-white/70">Chrome</span>
                <span class="text-[10px] text-white font-medium">{{
                  debugInfo.system.chromeVersion
                }}</span>
              </div>
              <div
                class="flex justify-between items-center py-1 border-b border-white/5"
              >
                <span class="text-[10px] text-white/70">应用版本</span>
                <span class="text-[10px] text-white font-medium">{{
                  debugInfo.system.appVersion
                }}</span>
              </div>
              <div class="flex justify-between items-center py-1">
                <span class="text-[10px] text-white/70">运行时间</span>
                <span class="text-[10px] text-white font-medium">{{
                  formatUptime(debugInfo.system.uptime)
                }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import DraggableArea from "@/components/DraggableArea/DraggableArea.vue";

interface DebugInfo {
  timestamp: number;
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    activeViewCount: number;
    switchTime: number;
  };
  windows: Array<{
    id: number;
    type: string;
    bounds: { x: number; y: number; width: number; height: number };
    isVisible: boolean;
    isFocused: boolean;
    memoryUsage: number;
    viewIds?: string[];
  }>;
  views: Array<{
    id: string;
    type: string;
    category: string;
    lifecycleType: string;
    isPaused: boolean;
    memoryUsage: number;
    lastAccessTime: number;
  }>;
  lifecycle: {
    totalViews: number;
    activeViews: number;
    pausedViews: number;
    totalMemoryUsage: number;
    averageMemoryPerView: number;
  };
  system: {
    platform: string;
    electronVersion: string;
    nodeVersion: string;
    chromeVersion: string;
    appVersion: string;
    uptime: number;
  };
  otherProcesses: Array<{
    type: string;
    pid: number;
    memoryUsage: number;
  }>;
}

// 状态
const isExpanded = ref(false);
const expandedWindows = ref<Set<number>>(new Set()); // 展开的窗口 ID 集合
const debugInfo = ref<DebugInfo>({
  timestamp: Date.now(),
  performance: {
    memoryUsage: 0,
    cpuUsage: 0,
    activeViewCount: 0,
    switchTime: 0,
  },
  windows: [],
  views: [],
  lifecycle: {
    totalViews: 0,
    activeViews: 0,
    pausedViews: 0,
    totalMemoryUsage: 0,
    averageMemoryPerView: 0,
  },
  system: {
    platform: "",
    electronVersion: "",
    nodeVersion: "",
    chromeVersion: "",
    appVersion: "",
    uptime: 0,
  },
  otherProcesses: [],
});

// 计算属性：状态类
const statusClass = computed(() => {
  const memory = debugInfo.value.performance.memoryUsage;
  if (memory > 500) return "status-critical";
  if (memory > 300) return "status-warning";
  return "status-normal";
});

// 计算属性：分离不同类型的进程
const browserProcess = computed(() => {
  return debugInfo.value.otherProcesses.find((p) => p.type === "Browser");
});

const utilityProcesses = computed(() => {
  return debugInfo.value.otherProcesses.filter((p) => p.type === "Utility");
});

const gpuProcesses = computed(() => {
  return debugInfo.value.otherProcesses.filter((p) => p.type === "GPU");
});

const unknownTabProcesses = computed(() => {
  return debugInfo.value.otherProcesses.filter((p) => p.type === "Tab");
});

// 切换展开/折叠
const toggleExpanded = async () => {
  const naimo = (window as any).naimo;
  if (naimo?.router?.debugToggleDebugWindow) {
    await naimo.router.debugToggleDebugWindow();
  }
};

// 切换窗口展开状态
const toggleWindowExpand = (windowId: number) => {
  if (expandedWindows.value.has(windowId)) {
    expandedWindows.value.delete(windowId);
  } else {
    expandedWindows.value.add(windowId);
  }
  // 触发响应式更新
  expandedWindows.value = new Set(expandedWindows.value);
};

// 根据 ID 获取视图信息
const getViewById = (viewId: string) => {
  return debugInfo.value.views.find((v) => v.id === viewId);
};

// 格式化进程类型
const getProcessTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    Browser: "主进程",
    GPU: "GPU 进程",
    Utility: "工具进程 (Worker)",
    Tab: "标签页进程",
    Zygote: "Zygote 进程",
    "Sandbox helper": "沙盒助手",
    "Pepper Plugin": "插件进程",
    "Pepper Plugin Broker": "插件代理",
    Unknown: "未知进程",
  };
  return typeMap[type] || type;
};

// 格式化窗口类型
const formatWindowType = (type: string): string => {
  const typeMap: Record<string, string> = {
    "main-base": "主窗口 (Base)",
    "detached-base": "分离窗口 (Base)",
    "browser-debug": "调试窗口",
    "browser-other": "下载窗口",
    main: "主窗口",
    detached: "分离窗口",
    debug: "调试窗口",
    other: "其他窗口",
  };
  return typeMap[type] || type;
};

// 格式化运行时间
const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
};

// 监听调试信息更新
const handleDebugUpdate = (_event: any, data: DebugInfo) => {
  console.log("[Debug Window] 收到调试信息:", data);
  debugInfo.value = data;
};

// 监听展开状态切换
const handleToggleExpanded = (_event: any, expanded: boolean) => {
  isExpanded.value = expanded;
};

onMounted(async () => {
  console.log("[Debug Window] 组件已挂载");
  const naimo = (window as any).naimo;
  if (naimo) {
    // 监听事件
    naimo.on("debug:update", handleDebugUpdate);
    naimo.on("debug:toggle-expanded", handleToggleExpanded);
    console.log("[Debug Window] 已注册事件监听器");

    // 获取初始状态（处理刷新情况）
    if (naimo.router?.debugGetDebugWindowState) {
      const state = await naimo.router.debugGetDebugWindowState();
      console.log("[Debug Window] 获取到初始状态:", state);
      if (state) {
        isExpanded.value = state.isExpanded;
      }
    }
  }
});

onUnmounted(() => {
  const naimo = (window as any).naimo;
  if (naimo) {
    naimo.off("debug:update", handleDebugUpdate);
    naimo.off("debug:toggle-expanded", handleToggleExpanded);
  }
});
</script>

<style scoped>
/* Electron 拖拽区域 */
.drag-region {
  -webkit-app-region: drag;
}

.no-drag-region {
  -webkit-app-region: no-drag;
}

/* 滚动条容器 - 为滚动条预留内部空间 */
.scrollbar-container {
  padding-right: 8px;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  margin: 2px 0;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 移除之前的全局样式，不再需要 */
</style>
