/**
 * 设置页面路由配置
 */
import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

/**
 * 懒加载路由组件
 * 所有页面统一放在 @/views 目录下
 * 每个页面独立一个目录，主组件命名为 index.vue
 * hooks 放在对应页面目录的 hooks/ 子目录中
 */
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/plugins",
  },
  {
    path: "/plugins",
    name: "plugins",
    component: () => import("@/views/Plugins/index.vue"),
    meta: {
      title: "插件",
      description: "管理插件，扩展应用程序功能",
      icon: "mdi:puzzle",
      keepAlive: true, // 启用页面缓存
    },
  },
  {
    path: "/hotkeys",
    name: "hotkeys",
    component: () => import("@/views/Hotkeys/index.vue"),
    meta: {
      title: "快捷键",
      description: "配置应用程序的快捷键，提高操作效率",
      icon: "mdi:keyboard",
      keepAlive: true,
    },
  },
  {
    path: "/custom",
    name: "custom",
    component: () => import("@/views/CustomHotkeys/index.vue"),
    meta: {
      title: "自定义快捷键",
      description: "创建和管理您的自定义快捷键",
      icon: "mdi:cog",
      keepAlive: true,
    },
  },
  {
    path: "/settings",
    name: "settings",
    component: () => import("@/views/Settings/index.vue"),
    meta: {
      title: "设置",
      description: "配置应用程序和插件的个性化设置",
      icon: "mdi:settings",
      keepAlive: true,
    },
  },
  {
    path: "/downloads",
    name: "downloads",
    component: () => import("@/views/Downloads/index.vue"),
    meta: {
      title: "下载",
      description: "管理文件下载任务，监控下载进度",
      icon: "mdi:download",
      keepAlive: true,
    },
  },
  {
    path: "/about",
    name: "about",
    component: () => import("@/views/About/index.vue"),
    meta: {
      title: "关于",
      description: "了解 Naimo 应用程序的详细信息",
      icon: "mdi:information",
      keepAlive: true,
    },
  },
];

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
