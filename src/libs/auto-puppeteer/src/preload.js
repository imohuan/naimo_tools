const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const axios = require('axios');
const domparser = require("./domparser")


// 使用 cheerio 处理 HTML 的函数
async function fetchHTML(url, asyncConfig = null) {
  try {

    let html = ""
    if (asyncConfig) {
      asyncConfig.url = url
      html = await ipcRenderer.invoke('automate-with-json', asyncConfig)
    } else {
      html = await axios.get(url).then(res => res.data);
    }

    return {
      html,
      getConfig: (config) => domparser(config, html),
      getTitle: () => domparser({ cls: "title::text" }, html),
      getLinks: () => domparser({ cls: "@a::attr(href)", process: (relativeUrl) => new URL(relativeUrl, url).href }, html),
      getImages: () => domparser({ cls: "@img::attr(src)" }, html)
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
    throw error;
  }
}

async function fetchJSON(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching JSON:', error);
    throw error;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ({ arch: os.arch(), platform: os.platform() }),

  fetchJSON,
  fetchHTML,
  automateWithJson: (config) => ipcRenderer.invoke('automate-with-json', config),

  // 下载管理
  startDownload: (params) => ipcRenderer.invoke('start-download', params),
  pauseDownload: (id) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  getDownloadStatus: (id) => ipcRenderer.invoke('get-download-status', id),
  getAllDownloads: () => ipcRenderer.invoke('get-all-downloads'),
  selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),

  // 事件监听
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', (event, data) => callback(data)),
  onDownloadCompleted: (callback) =>
    ipcRenderer.on('download-completed', (event, data) => callback(data)),
  onDownloadError: (callback) =>
    ipcRenderer.on('download-error', (event, data) => callback(data)),
  onDownloadPaused: (callback) =>
    ipcRenderer.on('download-paused', (event, data) => callback(data)),
  onDownloadResumed: (callback) =>
    ipcRenderer.on('download-resumed', (event, data) => callback(data)),
  onDownloadCancelled: (callback) =>
    ipcRenderer.on('download-cancelled', (event, data) => callback(data)),

  // 移除事件监听
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.removeAllListeners('download-completed');
    ipcRenderer.removeAllListeners('download-error');
    ipcRenderer.removeAllListeners('download-paused');
    ipcRenderer.removeAllListeners('download-resumed');
    ipcRenderer.removeAllListeners('download-cancelled');
  },

  // 文件夹操作
  openDownloadFolder: (filePath) => ipcRenderer.invoke('open-download-folder', filePath),

  // 缓存管理
  getCacheData: (key) => ipcRenderer.invoke('get-cache-data', key),
  setCacheData: (key, data) => ipcRenderer.invoke('set-cache-data', key, data),
  clearCache: (key) => ipcRenderer.invoke('clear-cache', key)
});