/**
 * 示例插件 Preload 脚本
 * 展示懒加载架构的完整用法
 */

const { contextBridge, ipcRenderer } = require('electron');

// ==================== 工具函数 ====================

/**
 * 显示通知
 */
function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMiIgZmlsbD0iIzEwQjk4MSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjM2IiBmaWxsPSJ3aGl0ZSI+8J+OrzwvdGV4dD4KPC9zdmc+'
    });
  }
}

/**
 * 处理文本
 */
function processText(text) {
  return {
    length: text.length,
    words: text.split(/\s+/).filter(w => w).length,
    lines: text.split('\n').length,
    uppercase: text.toUpperCase(),
    lowercase: text.toLowerCase()
  };
}

// ==================== 暴露插件 API ====================

contextBridge.exposeInMainWorld('examplePluginAPI', {
  showNotification,
  processText,

  // 工具方法
  getTimestamp: () => Date.now(),
  formatDate: (timestamp) => new Date(timestamp).toLocaleString('zh-CN')
});

// ==================== 暴露 Electron API（用于接收主进程消息）====================

contextBridge.exposeInMainWorld('electronAPI', {
  // 监听事件
  on: (channel, callback) => {
    const validChannels = ['plugin-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // 移除事件监听
  off: (channel, callback) => {
    const validChannels = ['plugin-message'];
    if (validChannels.includes(channel)) {
      ipcRenderer.off(channel, callback);
    }
  }
});

// ==================== 懒加载架构：功能处理器导出 ====================

module.exports = {
  /**
   * Hello World 功能
   * 最简单的示例：只打开 UI，不执行额外逻辑
   */
  'hello-world': {
    onEnter: async (params, api) => {
      console.log('🎯 [示例插件] Hello World 功能被触发');
      console.log('参数:', params);

      // manifest.json 配置了 main，窗口会自动打开
      // 这里可以做一些初始化工作

      // 获取插件设置
      const settings = await api.getSettingValue();
      console.log('当前设置:', settings);

      // 如果启用了通知
      if (settings.enableNotification) {
        showNotification('示例插件', 'Hello World 功能已启动！');
      }
    }
  },

  /**
   * 文本处理器功能
   * 演示如何处理搜索文本
   */
  'text-processor': {
    onEnter: async (params, api) => {
      console.log('📝 [示例插件] 文本处理器被触发');

      const { searchText } = params;

      if (!searchText || !searchText.trim()) {
        console.log('没有输入文本');
        showNotification('文本处理器', '请输入要处理的文本');
        return;
      }

      // 处理文本
      const result = processText(searchText);
      console.log('处理结果:', result);

      // 获取设置
      const settings = await api.getSettingValue();

      // 显示结果通知
      if (settings.enableNotification) {
        showNotification(
          '文本处理完成',
          `字符数: ${result.length}, 单词数: ${result.words}, 行数: ${result.lines}`
        );
      }
    }
  },

  /**
   * 文件计数器功能
   * 演示如何处理附件文件
   */
  'file-counter': {
    onEnter: async (params, api) => {
      console.log('📊 [示例插件] 文件计数器被触发');

      const { files } = params;

      if (!files || files.length === 0) {
        console.log('没有附件文件');
        showNotification('文件计数器', '请添加文件');
        return;
      }

      // 统计文件信息
      const fileStats = {
        total: files.length,
        byType: {},
        totalSize: 0
      };

      files.forEach(file => {
        // 按类型分类
        const ext = file.name.split('.').pop() || 'unknown';
        fileStats.byType[ext] = (fileStats.byType[ext] || 0) + 1;

        // 累计大小
        fileStats.totalSize += file.size || 0;
      });

      console.log('文件统计:', fileStats);

      // 获取设置
      const settings = await api.getSettingValue();

      // 显示结果
      if (settings.enableNotification) {
        const sizeInMB = (fileStats.totalSize / (1024 * 1024)).toFixed(2);
        showNotification(
          '文件统计完成',
          `共 ${fileStats.total} 个文件，总大小 ${sizeInMB} MB`
        );
      }
    }
  }
};

// ==================== 初始化 ====================

// 请求通知权限
if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
  Notification.requestPermission();
}

// 页面加载完成后的初始化
window.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 [示例插件] Preload 脚本已初始化');

  // 添加快捷键支持
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + W 关闭窗口
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      naimo.router.windowCloseWindow();
    }
  });
});

