<template>
  <div class="h-full flex flex-col bg-gray-50">
    <!-- 下载管理主界面 -->
    <div v-show="!showAddDownloadDialog" class="h-full flex flex-col">
      <!-- Header 区域 -->
      <div class="bg-white border-b border-gray-200 px-3 py-2">
        <div class="flex items-center justify-between">
          <!-- 左侧：网速和下载统计 -->
          <div class="flex items-center space-x-3">
            <!-- 当前网速 -->
            <div class="flex items-center space-x-1">
              <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span class="text-xs text-gray-600">网速:</span>
              <span class="text-xs font-medium text-gray-900">{{ formatSpeed(currentSpeed) }}</span>
            </div>

            <!-- 下载统计 -->
            <div class="flex items-center space-x-2">
              <div class="text-xs text-gray-600">
                下载中: <span class="font-medium text-blue-600">{{ activeCount }}</span>
              </div>
              <div class="text-xs text-gray-600 pl-2">
                总计: <span class="font-medium text-gray-900">{{ totalCount }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧：添加下载按钮 -->
          <button @click="showAddDownloadDialog = true"
            class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors">
            <IconMdiPlus class="w-3 h-3 mr-1 inline" />
            添加下载
          </button>
        </div>
      </div>

      <!-- Tab 切换区域 -->
      <div class="bg-white border-b border-gray-200">
        <div class="flex space-x-1 px-3">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
            'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
            activeTab === tab.id
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
          ]">
            {{ tab.label }}
            <span v-if="tab.count.value > 0" :class="[
              'ml-1 px-1.5 py-0.5 text-xs rounded-full',
              activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            ]">
              {{ tab.count.value }}
            </span>
          </button>
        </div>
      </div>

      <!-- 下载列表区域 -->
      <div class="flex-1 overflow-auto">
        <div v-if="currentDownloads.length === 0" class="flex-1 flex items-center justify-center h-full">
          <div class="text-center text-gray-500">
            <IconMdiDownload class="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p class="text-sm mb-1">暂无下载任务</p>
            <p class="text-xs">点击"添加下载"开始新的下载任务</p>
          </div>
        </div>

        <div v-else class="space-y-1 py-2">
          <DownloadItem v-for="download in currentDownloads" :key="download.id" :download="download"
            @pause="pauseDownload" @resume="resumeDownload" @cancel="cancelDownload" @retry="retryDownload"
            @open-folder="openDownloadFolder" @delete="deleteDownload" />
        </div>
      </div>
    </div>

    <!-- 添加下载界面 -->
    <div v-show="showAddDownloadDialog" class="h-full flex flex-col">
      <AddDownloadDialog @close="showAddDownloadDialog = false" @add="handleAddDownload" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import DownloadItem from './DownloadItem.vue';
import AddDownloadDialog from './AddDownloadDialog.vue';
/** @ts-ignore */
import IconMdiPlus from "~icons/mdi/plus";
/** @ts-ignore */
import IconMdiDownload from "~icons/mdi/download";

// 下载状态类型定义
interface DownloadStatus {
  id: string;
  url: string;
  filePath: string;
  filename: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'cancelled' | 'error' | 'interrupted';
  bytesReceived: number;
  totalBytes: number;
  downloadRate: number;
  estimatedTimeRemaining: number;
  metadata?: any;
}

// 响应式数据
const downloads = ref<DownloadStatus[]>([]);
const activeTab = ref('all');
const showAddDownloadDialog = ref(false);
const currentSpeed = ref(0);

// Tab 配置
const tabs = [
  { id: 'all', label: '全部下载', count: computed(() => downloads.value.length) },
  { id: 'downloading', label: '下载中', count: computed(() => downloads.value.filter(d => d.status === 'downloading').length) },
  { id: 'completed', label: '已完成', count: computed(() => downloads.value.filter(d => d.status === 'completed').length) },
  { id: 'waiting', label: '等待中', count: computed(() => downloads.value.filter(d => d.status === 'pending').length) },
  { id: 'failed', label: '失败', count: computed(() => downloads.value.filter(d => d.status === 'error').length) }
];

// 计算属性
const activeCount = computed(() => downloads.value.filter(d => d.status === 'downloading').length);
const totalCount = computed(() => downloads.value.length);

const currentDownloads = computed(() => {
  switch (activeTab.value) {
    case 'downloading':
      return downloads.value.filter(d => d.status === 'downloading');
    case 'completed':
      return downloads.value.filter(d => d.status === 'completed');
    case 'waiting':
      return downloads.value.filter(d => d.status === 'pending');
    case 'failed':
      return downloads.value.filter(d => d.status === 'error');
    default:
      return downloads.value;
  }
});

// 格式化速度
const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s';

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let size = bytesPerSecond;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// 下载操作
const pauseDownload = async (id: string) => {
  try {
    console.log(`前端：尝试暂停下载 ${id}`);

    // 检查当前状态，防止重复操作
    const currentDownload = downloads.value.find(d => d.id === id);
    if (currentDownload?.status !== 'downloading') {
      console.log(`下载 ${id} 当前状态为 ${currentDownload?.status}，无需暂停`);
      return;
    }

    const result = await naimo.download.pauseDownload(id);
    if (result) {
      console.log(`前端：下载 ${id} 暂停成功`);
      // 立即更新本地状态，提升响应性
      const index = downloads.value.findIndex(d => d.id === id);
      if (index !== -1) {
        downloads.value[index].status = 'paused';
      }
    } else {
      console.error(`前端：下载 ${id} 暂停失败`);
    }
  } catch (error) {
    console.error('暂停下载失败:', error);
  }
};

const resumeDownload = async (id: string) => {
  try {
    console.log(`前端：尝试恢复下载 ${id}`);

    // 检查是否已经在下载中，防止重复操作
    const currentDownload = downloads.value.find(d => d.id === id);
    if (currentDownload?.status === 'downloading') {
      console.log(`下载 ${id} 已经在进行中，跳过操作`);
      return;
    }

    const result = await naimo.download.resumeDownload(id);
    if (result) {
      console.log(`前端：下载 ${id} 恢复成功`);
      // 立即更新本地状态为下载中，提升响应性
      const index = downloads.value.findIndex(d => d.id === id);
      if (index !== -1) {
        downloads.value[index].status = 'downloading';
      }
    } else {
      console.error(`前端：下载 ${id} 恢复失败`);
    }
  } catch (error) {
    console.error('恢复下载失败:', error);
  }
};

const cancelDownload = async (id: string) => {
  try {
    console.log(`前端：尝试取消下载 ${id}`);
    const result = await naimo.download.cancelDownload(id);
    if (result) {
      console.log(`前端：下载 ${id} 取消成功`);
    } else {
      console.error(`前端：下载 ${id} 取消失败`);
    }
  } catch (error) {
    console.error('取消下载失败:', error);
  }
};

const retryDownload = async (download: DownloadStatus) => {
  try {
    console.log(`前端：尝试重试下载 ${download.id}`);

    // 首先尝试恢复下载（如果有恢复数据）
    if (download.metadata?.restoreData || download.metadata?.persistedRestoreData) {
      const result = await naimo.download.resumeDownload(download.id);
      if (result) {
        console.log(`前端：下载 ${download.id} 恢复成功`);
        return;
      }
    }

    // 如果恢复失败，重新开始下载
    console.log(`前端：恢复失败，重新开始下载 ${download.id}`);
    await naimo.download.startDownload({
      url: download.url,
      saveAsFilename: download.filename,
      directory: download.filePath ? download.filePath.substring(0, download.filePath.lastIndexOf('/')) : undefined
    });
  } catch (error) {
    console.error('重试下载失败:', error);
  }
};

const openDownloadFolder = async (filePath: string) => {
  await naimo.download.openDownloadFolder(filePath);
};

const deleteDownload = async (id: string) => {
  try {
    // 调用后端删除API
    await (naimo.download as any).deleteDownload(id);
    // 从本地列表中移除
    const index = downloads.value.findIndex(d => d.id === id);
    if (index !== -1) {
      downloads.value.splice(index, 1);
      calculateTotalSpeed();
    }
  } catch (error) {
    console.error('删除下载任务失败:', error);
  }
};

const handleAddDownload = async (params: {
  url: string;
  saveAsFilename?: string;
  directory?: string;
  persistOnAppClose?: boolean;
  overwrite?: boolean;
}) => {
  try {
    console.log('添加下载参数:', params);
    await naimo.download.startDownload(params);
    showAddDownloadDialog.value = false;
  } catch (error) {
    console.error('添加下载失败:', error);
  }
};

// 加载下载列表
const loadDownloads = async () => {
  try {
    console.log('开始加载下载列表...');
    const loadedDownloads = await naimo.download.getAllDownloads();
    console.log('从后端获取的下载列表:', loadedDownloads);
    downloads.value = loadedDownloads;
    console.log('前端下载列表已更新，当前数量:', downloads.value.length);
  } catch (error) {
    console.error('加载下载列表失败:', error);
  }
};

// 计算总下载速度
const calculateTotalSpeed = () => {
  const totalSpeed = downloads.value
    .filter(d => d.status === 'downloading')
    .reduce((sum, d) => sum + (d.downloadRate || 0), 0);
  currentSpeed.value = totalSpeed;
};

// 事件监听器
const setupEventListeners = () => {
  // 监听下载开始
  naimo.download.onDownloadStarted((data) => {
    console.log('下载开始:', data);
    loadDownloads();
  });

  // 监听下载进度
  naimo.download.onDownloadProgress((data) => {
    console.log('前端收到下载进度更新:', data);
    const index = downloads.value.findIndex(d => d.id === data.id);
    if (index !== -1) {
      // 确保数据完整更新
      const updatedDownload = { ...downloads.value[index], ...data };
      downloads.value[index] = updatedDownload;
      console.log('更新后的下载项:', updatedDownload);
      calculateTotalSpeed();
    } else {
      console.warn('找不到对应的下载项:', data.id);
    }
  });

  // 监听下载完成
  naimo.download.onDownloadCompleted((data) => {
    console.log('下载完成:', data);
    loadDownloads();
    calculateTotalSpeed();
  });

  // 监听下载错误
  naimo.download.onDownloadError((data) => {
    console.log('下载错误:', data);
    loadDownloads();
    calculateTotalSpeed();
  });

  // 监听下载暂停
  naimo.download.onDownloadPaused((data) => {
    console.log('下载暂停:', data);
    loadDownloads();
    calculateTotalSpeed();
  });

  // 监听下载恢复
  naimo.download.onDownloadResumed((data) => {
    console.log('下载恢复:', data);
    loadDownloads();
    calculateTotalSpeed();
  });

  // 监听下载取消
  naimo.download.onDownloadCancelled((data) => {
    console.log('下载取消:', data);
    loadDownloads();
    calculateTotalSpeed();
  });

  // 监听下载删除
  (naimo.download as any).onDownloadDeleted((data: { id: string }) => {
    console.log('下载删除:', data);
    const index = downloads.value.findIndex(d => d.id === data.id);
    if (index !== -1) {
      downloads.value.splice(index, 1);
      calculateTotalSpeed();
    }
  });

  // 监听下载持久化
  (naimo.download as any).onDownloadPersisted((data: { id: string; persistedFilePath: string }) => {
    console.log('下载已持久化:', data);
    const index = downloads.value.findIndex(d => d.id === data.id);
    if (index !== -1) {
      // 更新状态，显示已持久化
      downloads.value[index].metadata = {
        ...downloads.value[index].metadata,
        persisted: true,
        persistedFilePath: data.persistedFilePath
      };
    }
  });
};

// 生命周期
onMounted(async () => {
  await loadDownloads();
  setupEventListeners();
  calculateTotalSpeed();
});

onUnmounted(() => {
  naimo.download.removeAllListeners();
});
</script>
