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
    if (window.electronAPI && window.electronAPI.showNotification) {
      window.electronAPI.showNotification(message);
    }
  },

  // 获取插件信息
  getPluginInfo: () => {
    return {
      id: "example-plugin",
      name: "示例插件",
      version: "1.0.0",
      author: "Naimo Tools",
      description: "这是一个示例插件，展示了插件的基本结构和最新功能"
    };
  },

  // 获取当前时间
  getCurrentTime: () => {
    return new Date().toLocaleString('zh-CN');
  },

  // 测试文件操作
  testFileOperation: async (filePath) => {
    console.log("测试文件操作:", filePath);
    // 这里可以调用主进程的文件操作API
    if (window.electronAPI && window.electronAPI.readFile) {
      try {
        const content = await window.electronAPI.readFile(filePath);
        return content;
      } catch (error) {
        console.error("文件读取失败:", error);
        return null;
      }
    }
    return null;
  },

  // 搜索功能测试
  testSearch: (searchText) => {
    console.log("搜索测试:", searchText);
    const results = [];

    // 模拟搜索结果
    if (searchText.includes("记事本")) {
      results.push({
        name: "记事本",
        path: "notepad.exe",
        icon: "📝",
        description: "系统记事本应用"
      });
    }

    if (searchText.includes("计算器")) {
      results.push({
        name: "计算器",
        path: "calc.exe",
        icon: "🧮",
        description: "系统计算器应用"
      });
    }

    return results;
  },

  // 插件状态检查
  checkPluginStatus: () => {
    return {
      loaded: true,
      version: "1.0.0",
      features: [
        "自定义代码执行",
        "文件搜索处理",
        "插件搜索模式",
        "动态内容生成",
        "多搜索模式支持"
      ],
      searchModes: ["normal", "attachment", "plugin"]
    };
  },

  // 动态内容生成
  generateDynamicContent: (data) => {
    const timestamp = new Date().toLocaleString('zh-CN');
    return `
      <div style="padding: 20px; border: 1px solid #ccc; border-radius: 8px; margin: 10px 0;">
        <h3>🚀 动态内容生成</h3>
        <p><strong>时间:</strong> ${timestamp}</p>
        <p><strong>数据:</strong> ${JSON.stringify(data, null, 2)}</p>
        <p><strong>插件状态:</strong> 正常运行 ✅</p>
      </div>
    `;
  }
};
