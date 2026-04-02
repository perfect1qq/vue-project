<template>
  <!-- 主页面容器结构，包含了侧边栏和主内容区 -->
  <div class="app-wrapper" :class="{ hideSidebar: !sidebar.opened }">
    <!-- 侧边栏菜单组件 -->
    <Sidebar class="sidebar-container" />
    <!-- 主内容区 -->
    <div class="main-container">
      <div class="fixed-header">
        <!-- 顶部导航栏，包含面包屑、消息通知和用户下拉菜单 -->
        <Navbar />
      </div>
      <!-- 路由内容区组件 -->
      <AppMain />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import AppMain from './components/AppMain.vue'

// 简单的侧边栏收缩状态 mock
const sidebar = computed(() => ({
  opened: true,
  withoutAnimation: false
}))
</script>

<style scoped>
.app-wrapper {
  position: relative;
  height: 100vh;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
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
  transition: margin-left .28s;
  margin-left: 240px;
  position: relative;
  background-color: #f1f5f9;
  overflow-x: hidden;
  box-sizing: border-box;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - 240px);
  transition: width 0.28s;
  overflow: hidden;
  box-sizing: border-box;
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
</style>