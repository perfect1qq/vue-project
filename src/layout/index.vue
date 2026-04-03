<template>
  <div class="app-wrapper" :class="{ hideSidebar: !sidebar.opened }">
    <Sidebar class="sidebar-container" />
    <div class="main-container">
      <div class="fixed-header">
        <Navbar />
      </div>
      <AppMain />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Navbar from './components/Navbar.vue'
import AppMain from './components/AppMain.vue'

const sidebar = computed(() => ({
  opened: true,
  withoutAnimation: false
}))
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
</style>
