// 插件预加载脚本
// 这个文件在插件窗口创建时会被加载，可以扩展插件窗口的功能

console.log("示例插件预加载脚本已加载");

// 可以在这里添加插件特定的功能
// 例如：自定义事件监听器、UI增强等

// 示例：监听窗口事件
window.addEventListener('DOMContentLoaded', () => {
  console.log("插件窗口DOM已加载");

  // 可以在这里添加自定义的DOM操作
  // 例如：添加自定义按钮、修改样式等
});

// 示例：暴露插件特定的API
window.pluginAPI = {
  // 自定义方法
  showNotification: (message) => {
    console.log("插件通知:", message);
    // 可以调用主进程的API来显示通知
  },

  // 获取插件信息
  getPluginInfo: () => {
    return {
      id: "example-plugin",
      name: "示例插件",
      version: "1.0.0"
    };
  }
};
