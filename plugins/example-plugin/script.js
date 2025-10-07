// 示例插件脚本 - 演示如何接收参数

console.log('示例插件已加载')

// 监听来自主进程的参数消息
if (window.electronAPI && window.electronAPI.on) {
  window.electronAPI.on('plugin-message', (event, messageData) => {
    console.log('====================================')
    console.log('收到主进程传递的参数:')
    console.log('====================================')
    console.log('插件路径:', messageData.fullPath)
    console.log('视图ID:', messageData.viewId)
    console.log('时间戳:', new Date(messageData.timestamp).toLocaleString())
    console.log('接收的数据:', messageData.data)
    console.log('====================================')

    // 将参数显示在页面上
    displayData(messageData)
  })

  console.log('✅ 已注册 plugin-message 事件监听器')
} else {
  console.warn('⚠️ electronAPI 不可用，无法接收参数')
}

// 在页面上显示接收到的数据
function displayData(messageData) {
  const container = document.getElementById('data-container') || createDataContainer()

  const dataItem = document.createElement('div')
  dataItem.className = 'data-item'
  dataItem.innerHTML = `
    <div class="data-header">
      <span class="timestamp">${new Date(messageData.timestamp).toLocaleTimeString()}</span>
      <span class="view-id">${messageData.viewId}</span>
    </div>
    <div class="data-content">
      <pre>${JSON.stringify(messageData.data, null, 2)}</pre>
    </div>
  `

  container.insertBefore(dataItem, container.firstChild)

  // 最多保留 10 条记录
  while (container.children.length > 10) {
    container.removeChild(container.lastChild)
  }
}

function createDataContainer() {
  const container = document.createElement('div')
  container.id = 'data-container'
  container.style.cssText = `
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  `

  const title = document.createElement('h2')
  title.textContent = '接收到的参数历史'
  title.style.cssText = `
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
    margin-bottom: 20px;
  `

  container.appendChild(title)
  document.body.appendChild(container)

  // 添加样式
  const style = document.createElement('style')
  style.textContent = `
    .data-item {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    
    .data-item:hover {
      transform: translateX(5px);
      border-color: #007bff;
    }
    
    .data-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #dee2e6;
    }
    
    .timestamp {
      font-weight: bold;
      color: #007bff;
    }
    
    .view-id {
      color: #6c757d;
      font-size: 0.9em;
      font-family: monospace;
    }
    
    .data-content pre {
      background: white;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #e9ecef;
      overflow-x: auto;
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  `
  document.head.appendChild(style)

  return container
}

// 页面加载完成后添加测试按钮
window.addEventListener('DOMContentLoaded', () => {
  const testButton = document.createElement('button')
  testButton.textContent = '测试：模拟接收参数'
  testButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    z-index: 1000;
  `

  testButton.onclick = () => {
    // 模拟接收参数用于测试
    displayData({
      fullPath: 'example-plugin',
      viewId: 'plugin:example-plugin',
      timestamp: Date.now(),
      data: {
        message: '这是一个测试消息',
        userId: 'user-' + Math.floor(Math.random() * 1000),
        action: 'test',
        metadata: {
          source: 'manual-test',
          priority: 'high'
        }
      }
    })
  }

  document.body.appendChild(testButton)
})

