<!--
  @file layout/index.vue
  @description 主布局容器组件（应用主框架）

  功能说明：
  - 作为所有需要登录的页面的顶级容器
  - 组合 Sidebar（侧边栏）、Navbar（顶栏）、AppMain（内容区）
  - 提供响应式布局支持（桌面端 + 移动端）
  - 管理移动端侧边栏的显示/隐藏状态
  - 监听窗口尺寸变化自动调整布局模式

  布局结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  AppWrapper                                                   │
  │  ┌────────────┬─────────────────────────────────────────────┐ │
  │  │            │  Fixed Header                                │ │
  │  │  Sidebar   │  ┌─────────────────────────────────────────┐ │ │
  │  │  (固定)    │  │  Navbar (品牌 + 通知 + 用户)            │ │ │
  │  │            │  ├─────────────────────────────────────────┤ │ │
  │  │  240px     │  │  TagsView (标签页栏)                    │ │ │
  │  │            │  └─────────────────────────────────────────┘ │ │
  │  │            ├─────────────────────────────────────────────┤ │
  │  │            │                                              │ │
  │  │            │  Main Content Area                           │ │
  │  │            │  (AppMain - <router-view />)                 │ │
  │  │            │                                              │ │
  │  │            │  ┌────────────────────────────────────────┐  │ │
  │  │            │  │  当前页面内容                          │  │ │
  │  │            │  │  (QuotationList / UserManagement ...)  │  │ │
  │  │            │  └────────────────────────────────────────┘  │ │
  │  │            │                                              │ │
  │  └────────────┴─────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────────┘

  响应式断点：
  ┌─────────────────────┬─────────────────────────────────────────┐
  │  屏幕宽度            │  布局行为                               │
  ├─────────────────────┼─────────────────────────────────────────┤
  │  > 768px (Desktop)  │  侧边栏常驻显示，完整布局               │
  │  ≤ 768px (Mobile)   │  侧边栏默认隐藏，点击按钮弹出遮罩层     │
  └─────────────────────┴─────────────────────────────────────────┘

  移动端交互：
  1. 点击右下角 ☰ 按钮 → 打开侧边栏
  2. 侧边栏打开时显示半透明遮罩层
  3. 点击遮罩层或内容区域 → 关闭侧边栏
  4. 切换到桌面端时自动关闭移动端侧边栏

  CSS 自定义属性：
  --layout-topbar-height: 56px    (Navbar 高度)
  --layout-tags-height: 42px      (TagsView 高度)
  --layout-header-height: 98px    (顶部总高度 = topbar + tags)

  使用场景：
  - 所有需要登录认证的路由都使用此布局
  - 公开页面（登录/注册）不使用此布局
  - 通过 Vue Router 的嵌套路由实现
-->
<template>
  <div class="app-wrapper" :class="{ hideSidebar: !sidebar.opened, mobile: isMobile, mobileSidebarOpen: mobileSidebarOpen }">
    <div v-if="isMobile && mobileSidebarOpen" class="sidebar-mask" @click="closeMobileSidebar"></div>
    <Sidebar class="sidebar-container" />
    <div class="main-container">
      <div class="fixed-header">
        <Navbar @toggle-mobile-sidebar="toggleMobileSidebar" />
      </div>
      <AppMain />
    </div>
    <button
      v-if="isMobile && !mobileSidebarOpen"
      class="mobile-menu-btn"
      type="button"
      aria-label="打开菜单"
      @click="toggleMobileSidebar"
    >
      ☰
    </button>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import AppMain from './components/AppMain.vue'

const sidebar = computed(() => ({
  opened: true,
  withoutAnimation: false
}))

const isMobile = ref(false)
const mobileSidebarOpen = ref(false)

const updateViewportState = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) mobileSidebarOpen.value = false
}

const toggleMobileSidebar = () => {
  if (!isMobile.value) return
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

const closeMobileSidebar = () => {
  mobileSidebarOpen.value = false
}

onMounted(() => {
  updateViewportState()
  window.addEventListener('resize', updateViewportState)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportState)
})
</script>

<style scoped>
.app-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
  overflow-y: visible;
  --layout-topbar-height: 56px;
  --layout-tags-height: 42px;
  --layout-header-height: calc(var(--layout-topbar-height) + var(--layout-tags-height));
}

.sidebar-container {
  transition: width 0.28s;
  width: 240px !important;
  background-color: #0f172a;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  height: 100%;
  position: fixed;
  font-size: 0px;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 1001;
  overflow: hidden;
}

.main-container {
  min-height: 100%;
  min-width: 0;
  transition: margin-left .28s;
  margin-left: 240px;
  position: relative;
  background-color: #f5f7fb;
  overflow-x: hidden;
  overflow-y: visible;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - 240px);
  height: var(--layout-header-height);
  transition: width 0.28s;
}

.hideSidebar .sidebar-container {
  width: 54px !important;
}

.hideSidebar .main-container {
  margin-left: 54px;
}

.hideSidebar .fixed-header {
  width: calc(100% - 54px);
}

.sidebar-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
}

.mobile-menu-btn {
  position: fixed;
  right: 14px;
  bottom: 18px;
  z-index: 1003;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 21px;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.3);
}

@media (max-width: 768px) {
  .sidebar-container {
    width: 240px !important;
    transform: translateX(-100%);
    transition: transform .25s ease;
    z-index: 1002;
  }

  .mobileSidebarOpen .sidebar-container {
    transform: translateX(0);
  }

  .main-container {
    margin-left: 0 !important;
    width: 100%;
  }

  .fixed-header {
    width: 100% !important;
  }

  .hideSidebar .main-container,
  .hideSidebar .fixed-header {
    margin-left: 0;
    width: 100%;
  }
}
</style>
