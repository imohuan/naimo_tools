<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="menuRef"
      class="context-menu"
      :style="menuStyle"
      @click.stop
      @contextmenu.prevent
    >
      <div class="context-menu-content">
        <div
          v-for="item in items"
          :key="item.key"
          class="context-menu-item"
          :class="{
            'context-menu-item--disabled': item.disabled,
            'context-menu-item--danger': item.danger,
          }"
          @click="handleItemClick(item)"
        >
          <component v-if="item.icon" :is="item.icon" class="context-menu-item__icon" />
          <span class="context-menu-item__text">{{ item.label }}</span>
          <span v-if="item.shortcut" class="context-menu-item__shortcut">
            {{ item.shortcut }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: any; // 可以是字符串或组件
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  action: () => void;
}

interface Props {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const menuRef = ref<HTMLElement>();

const menuStyle = computed(() => {
  const { x, y } = props;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const menuWidth = 200; // 预估菜单宽度
  const menuHeight = props.items.length * 32 + 8; // 预估菜单高度

  let adjustedX = x;
  let adjustedY = y;

  // 防止菜单超出右边界
  if (x + menuWidth > viewportWidth) {
    adjustedX = viewportWidth - menuWidth - 10;
  }

  // 防止菜单超出下边界
  if (y + menuHeight > viewportHeight) {
    adjustedY = viewportHeight - menuHeight - 10;
  }

  // 确保菜单不会超出左边界和上边界
  adjustedX = Math.max(10, adjustedX);
  adjustedY = Math.max(10, adjustedY);

  return {
    left: `${adjustedX}px`,
    top: `${adjustedY}px`,
  };
});

const handleItemClick = (item: ContextMenuItem) => {
  if (item.disabled) return;

  item.action();
  emit("close");
};

const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit("close");
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    emit("close");
  }
};

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleKeydown);
    } else {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  min-width: 180px;
  max-width: 250px;
  overflow: hidden;
}

.context-menu-content {
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 14px;
  color: #374151;
}

.context-menu-item:hover:not(.context-menu-item--disabled) {
  background-color: #f3f4f6;
}

.context-menu-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9ca3af;
}

.context-menu-item--danger {
  color: #dc2626;
}

.context-menu-item--danger:hover:not(.context-menu-item--disabled) {
  background-color: #fef2f2;
}

.context-menu-item__icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  flex-shrink: 0;
}

.context-menu-item__text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-menu-item__shortcut {
  font-size: 12px;
  color: #9ca3af;
  margin-left: 8px;
  font-family: monospace;
}
</style>
