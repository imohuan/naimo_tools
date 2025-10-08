export interface WindowControlAPI {
  minimize: () => Promise<boolean>
  maximize: () => Promise<boolean>
  close: () => Promise<boolean>
  reattach: () => Promise<boolean>
  isMaximized: () => Promise<boolean>
  isFullscreen: () => Promise<boolean>
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<boolean>
  isAlwaysOnTop: () => Promise<boolean>
  getCurrentViewInfo: () => Promise<{
    viewId: string | null
    windowId: number | null
    isDetached: boolean
  } | null>
}
