<template>
  <div class="app-container">
    <!-- 左侧菜单栏 -->
    <el-aside class="aside-menu" width="240px">
      <div class="logo">倍力特管理系统</div>
      <el-menu
        :default-active="activeMenu"
        class="menu-vertical"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/quotation">
          <el-icon><Document /></el-icon>
          <span>客户报价单</span>
        </el-menu-item>
        <el-menu-item index="/beam-quotation">
          <el-icon><Grid /></el-icon>
          <span>横梁载重表</span>
        </el-menu-item>
             <el-menu-item index="/Quotation-statistics">
              <el-icon><Grid /></el-icon>
              <span>统计报价单</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区域 -->
    <el-main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </el-main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Document, Grid } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const activeMenu = computed(() => route.path)

const handleMenuSelect = (index) => {
  router.push(index)
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
.aside-menu {
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 16px;
}
.menu-vertical {
  border-right: none;
  background-color: transparent;
}
.main-content {
  flex: 1;
  background-color: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>