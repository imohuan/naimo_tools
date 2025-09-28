import { HotkeyManager } from "@/core/hotkey/HotkeyManager"
import { hotkeyConfig } from "../config/hotkey"
import type { HotkeyEventListener, HotkeyEventType } from "@/typings/hotkeyTypes"

export function useHotkeyManager() {
  const hotkeyManager = HotkeyManager.getInstance()

  const initializeHotkeys = async () => {
    await hotkeyManager.initialize(hotkeyConfig)
  }

  const useHotkeyListener = (eventType: HotkeyEventType, listener: HotkeyEventListener) => {
    onMounted(() => {
      hotkeyManager.addListener(eventType, listener)
    })
    onUnmounted(() => {
      hotkeyManager.removeListener(eventType, listener)
    })
  }

  const addHotKeyListener = (eventType: HotkeyEventType, listener: HotkeyEventListener) => {
    hotkeyManager.addListener(eventType, listener)
  }

  return {
    hotkeyManager,
    initializeHotkeys,
    useHotkeyListener,
    addHotKeyListener
  }
}