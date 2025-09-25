<template>
  <div class="bg-white rounded border border-gray-200 p-2 hover:shadow-sm transition-shadow">
    <div class="flex items-center justify-between">
      <!-- 左侧：文件信息 -->
      <div class="flex-1 min-w-0 mr-2">
        <div class="flex items-center space-x-2">
          <!-- 文件图标 -->
          <div class="flex-shrink-0">
            <IconMdiFile class="w-5 h-5 text-gray-400" />
          </div>

          <!-- 文件详情 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <h3 class="text-xs font-medium text-gray-900 truncate">{{ download.filename }}</h3>
              <span v-if="download.downloadRate > 0 && download.status === 'downloading'" class="text-xs text-gray-500">
                {{ formatSpeed(download.downloadRate) }}</span>
              <!-- 持久化状态指示 -->
              <span v-if="download.metadata?.persisted"
                class="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full" title="已启用持久化">
                💾
              </span>
              <span :class="getStatusBadgeClass(download.status)">
                {{ getStatusText(download.status) }}
              </span>
            </div>

            <!-- 进度条 -->
            <div v-if="['downloading', 'paused', 'pending'].includes(download.status)" class="mt-1">
              <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div class="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out" :style="{
                  width: `${Math.max(0, Math.min(100, Math.round(download.progress || 0)))}%`
                }"></div>
              </div>
              <!-- 进度文本 -->
              <div class="text-xs text-gray-500 mt-0.5 flex justify-between">
                <span>{{ Math.max(0, Math.round(download.progress || 0)) }}%</span>
                <div class="text-right flex items-center gap-2">
                  <div v-if="download.bytesReceived > 0 && download.totalBytes > 0">
                    {{ formatFileSize(download.bytesReceived) }} / {{ formatFileSize(download.totalBytes) }}
                  </div>
                  <div v-if="download.estimatedTimeRemaining > 0 && download.status === 'downloading'"
                    class="text-xs text-gray-400">
                    剩余 {{ formatTime(download.estimatedTimeRemaining) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 错误信息 -->
            <div v-if="download.status === 'error' && download.metadata?.error"
              class="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded">
              {{ download.metadata.error }}
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center space-x-1">
        <!-- 暂停/恢复按钮 -->
        <button v-if="download.status === 'downloading'" @click="$emit('pause', download.id)"
          class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="暂停下载">
          <IconMdiPause class="w-3 h-3" />
        </button>

        <button v-if="['paused', 'interrupted'].includes(download.status)" @click="$emit('resume', download.id)"
          class="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="恢复下载">
          <IconMdiPlay class="w-3 h-3" />
        </button>

        <!-- 重试按钮 -->
        <button v-if="download.status === 'error'" @click="$emit('retry', download)"
          class="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="重试下载">
          <IconMdiRefresh class="w-3 h-3" />
        </button>

        <!-- 取消按钮 -->
        <button v-if="['downloading', 'pending'].includes(download.status)" @click="$emit('cancel', download.id)"
          class="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors" title="取消下载">
          <IconMdiStop class="w-3 h-3" />
        </button>

        <!-- 打开文件夹按钮 -->
        <button v-if="download.status === 'completed' && download.filePath"
          @click="$emit('open-folder', download.filePath)"
          class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="打开文件夹">
          <IconMdiFolderOpen class="w-3 h-3" />
        </button>

        <!-- 删除按钮 -->
        <button @click="$emit('delete', download.id)"
          class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除任务">
          <IconMdiDelete class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
/** @ts-ignore */
import IconMdiFile from "~icons/mdi/file";
/** @ts-ignore */
import IconMdiPause from "~icons/mdi/pause";
/** @ts-ignore */
import IconMdiPlay from "~icons/mdi/play";
/** @ts-ignore */
import IconMdiRefresh from "~icons/mdi/refresh";
/** @ts-ignore */
import IconMdiStop from "~icons/mdi/stop";
/** @ts-ignore */
import IconMdiDelete from "~icons/mdi/delete";
/** @ts-ignore */
import IconMdiFolderOpen from "~icons/mdi/folder-open";

// Props
interface Props {
  download: DownloadStatus;
}

defineProps<Props>();

// Emits
interface Emits {
  (e: 'pause', id: string): void;
  (e: 'resume', id: string): void;
  (e: 'cancel', id: string): void;
  (e: 'retry', download: DownloadStatus): void;
  (e: 'open-folder', filePath: string): void;
  (e: 'delete', id: string): void;
}

defineEmits<Emits>();

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

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

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待中',
    'downloading': '下载中',
    'paused': '已暂停',
    'completed': '已完成',
    'error': '失败',
    'cancelled': '已取消',
    'interrupted': '已中断'
  };
  return statusMap[status] || status;
};

// 格式化时间
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes}分钟`;
  } else {
    const hours = Math.round(seconds / 3600);
    return `${hours}小时`;
  }
};

// 获取状态徽章样式
const getStatusBadgeClass = (status: string): string => {
  const baseClass = 'px-1.5 py-0.5 text-xs font-medium rounded-full';

  switch (status) {
    case 'downloading':
      return `${baseClass} bg-blue-100 text-blue-800`;
    case 'completed':
      return `${baseClass} bg-green-100 text-green-800`;
    case 'error':
      return `${baseClass} bg-red-100 text-red-800`;
    case 'paused':
      return `${baseClass} bg-yellow-100 text-yellow-800`;
    case 'pending':
      return `${baseClass} bg-gray-100 text-gray-800`;
    case 'cancelled':
      return `${baseClass} bg-gray-100 text-gray-800`;
    case 'interrupted':
      return `${baseClass} bg-orange-100 text-orange-800`;
    default:
      return `${baseClass} bg-gray-100 text-gray-800`;
  }
};
</script>
