const { app, BaseWindow, WebContentsView, globalShortcut } = require('electron')

let mainWindow
let views = []
let detachedWindows = []

app.whenReady().then(() => {
  mainWindow = new BaseWindow({
    width: 800,
    height: 400,
    webPreferences: {
      nodeIntegration: true
    }
  })

  const view1 = new WebContentsView()
  mainWindow.contentView.addChildView(view1)
  view1.webContents.loadURL('https://electronjs.org')
  view1.setBounds({ x: 0, y: 0, width: 400, height: 400 })
  views.push({ view: view1, bounds: { x: 0, y: 0, width: 400, height: 400 } })

  const view2 = new WebContentsView()
  mainWindow.contentView.addChildView(view2)
  view2.webContents.loadURL('https://github.com/electron/electron')
  view2.setBounds({ x: 400, y: 0, width: 400, height: 400 })
  views.push({ view: view2, bounds: { x: 400, y: 0, width: 400, height: 400 } })

  // 注册 Alt+D 快捷键
  globalShortcut.register('Alt+D', () => {
    detachFocusedView()
  })

  // 监听窗口焦点变化，跟踪当前活跃的 view
  mainWindow.on('focus', () => {
    // 当主窗口获得焦点时，可以在这里处理逻辑
  })
})

// 分离当前焦点所在的 WebContentsView
function detachFocusedView() {
  // 找到当前鼠标位置对应的 view
  const mousePos = require('electron').screen.getCursorScreenPoint()
  const winBounds = mainWindow.getBounds()
  const relativeX = mousePos.x - winBounds.x
  const relativeY = mousePos.y - winBounds.y

  let targetViewData = null
  for (let viewData of views) {
    const bounds = viewData.bounds
    if (relativeX >= bounds.x && relativeX <= bounds.x + bounds.width &&
      relativeY >= bounds.y && relativeY <= bounds.y + bounds.height) {
      targetViewData = viewData
      break
    }
  }

  if (targetViewData) {
    detachView(targetViewData)
  }
}

// 分离指定的 WebContentsView
function detachView(viewData) {
  const view = viewData.view
  const currentURL = view.webContents.getURL()

  // 从主窗口移除 view
  mainWindow.contentView.removeChildView(view)

  // 创建新的独立窗口
  const detachedWindow = new BaseWindow({
    width: viewData.bounds.width,
    height: viewData.bounds.height,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // 创建新的 WebContentsView 并加载相同的 URL
  const newView = new WebContentsView()
  detachedWindow.contentView.addChildView(newView)
  newView.webContents.loadURL(currentURL)
  newView.setBounds({ x: 0, y: 0, width: viewData.bounds.width, height: viewData.bounds.height })

  // 保存分离的窗口引用
  detachedWindows.push(detachedWindow)

  // 从主窗口的 views 数组中移除
  const index = views.indexOf(viewData)
  if (index > -1) {
    views.splice(index, 1)
  }

  // 重新调整主窗口中剩余 views 的布局
  rearrangeViews()

  // 监听分离窗口的关闭事件
  detachedWindow.on('closed', () => {
    const windowIndex = detachedWindows.indexOf(detachedWindow)
    if (windowIndex > -1) {
      detachedWindows.splice(windowIndex, 1)
    }
  })
}

// 重新排列主窗口中剩余的 views
function rearrangeViews() {
  const totalViews = views.length
  if (totalViews === 0) return

  const windowBounds = mainWindow.getBounds()
  const viewWidth = windowBounds.width / totalViews

  views.forEach((viewData, index) => {
    const newBounds = {
      x: index * viewWidth,
      y: 0,
      width: viewWidth,
      height: windowBounds.height
    }
    viewData.view.setBounds(newBounds)
    viewData.bounds = newBounds
  })
}

// 应用退出时清理快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
 