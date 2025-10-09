/// <reference path="../typings/naimo.d.ts" />

import './style.css';

// ==================== 类型定义 ====================

/**
 * Naimo API 类型
 * 从全局 window.naimo 获取
 */
type NaimoAPI = typeof window.naimo;

/**
 * 自定义插件 API 类型
 * 从 preload.ts 中暴露的 API
 */
type MyPluginAPI = typeof window.myPluginAPI;

// ==================== 主逻辑 ====================

/**
 * 应用初始化
 */
async function initApp(): Promise<void> {
  console.log('应用初始化...');

  // 获取 Naimo API
  const naimo: NaimoAPI = window.naimo;

  // 获取自定义插件 API
  const myAPI: MyPluginAPI = window.myPluginAPI;

  // 设置按钮点击事件
  const testBtn = document.getElementById('testBtn');
  const output = document.getElementById('output');

  if (testBtn && output) {
    testBtn.addEventListener('click', async () => {
      try {
        // 使用 Naimo API
        naimo.log.info('按钮被点击了！');

        // 使用自定义 API
        const time = myAPI.getCurrentTime();
        const formatted = myAPI.formatText('hello world');

        // 显示结果
        output.innerHTML = `
          <div class="result">
            <p><strong>当前时间：</strong>${time}</p>
            <p><strong>格式化文本：</strong>${formatted}</p>
          </div>
        `;

        // 发送通知
        await naimo.system.notify('测试完成！', '我的插件');
      } catch (error) {
        console.error('操作失败:', error);
        naimo.log.error('操作失败', error);
      }
    });
  }

  // 记录初始化完成
  naimo.log.info('应用初始化完成');
}

// ==================== 入口 ====================

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

