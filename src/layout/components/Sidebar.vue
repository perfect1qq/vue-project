<template>
  <!-- 侧边栏整体容器 -->
  <div class="sidebar-container has-logo">
    <!-- 顶部 Logo 区域，点击返回首页 -->
    <div class="sidebar-logo-container" @click="router.push('/')">
      <transition name="sidebarLogoFade">
        <router-link key="expand" class="sidebar-logo-link" to="/">
          <!-- Logo 占位图或图标 -->
          <div class="logo-icon">Q</div>
          <!-- 侧边栏主副标题 -->
          <h1 class="sidebar-title">倍力特管理平台</h1>
        </router-link>
      </transition>
    </div>

    <!-- 侧边栏菜单区域，带滚动条适配 -->
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="variables.menuBg"
        :text-color="variables.menuText"
        :active-text-color="variables.menuActiveText"
        :unique-opened="false"
        :collapse-transition="false"
        mode="vertical"
        router
      >
        <!-- 遍历生成侧边栏导航列表 -->
        <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path">
          <el-icon><component :is="iconMap[item.path] || iconMap.default" /></el-icon>
          <template #title>
             <span>{{ item.name }}</span>
          </template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import {
  Monitor, Document, List, Histogram, DataAnalysis, User, Menu as IconMenu
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([])

/**
 * 侧边栏样式变量配置 (现代深靛蓝配色)
 * @type {Object}
 */
const variables = {
  menuBg: '#0f172a', // Slate 900
  menuText: '#94a3b8', // Slate 400
  menuActiveText: '#60a5fa' // Blue 400
}

// 模拟折叠状态
const isCollapse = ref(false)

/**
 * 路由路径与图标的映射关系
 * @type {Object}
 */
const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/medium-shelf-weight': Histogram,
  '/quotation-statistics': DataAnalysis,
  '/user-management': User,
  default: IconMenu
}

/**
 * 计算当前激活的菜单项，特殊处理审批详情路径归属到 /approval
 * @returns {string} active path
 */
const activeMenu = computed(() => route.path.startsWith('/approval/') ? '/approval' : route.path)

/**
 * 获取侧边栏动态路由菜单，适配权限数据
 */
const fetchMenu = async () => {
  try {
    const res = await request.get('/api/menu')
    menuList.value = res.data || []
  } catch (error) {
    if (error?.response?.status === 401) {
      localStorage.clear()
      router.replace('/login')
    }
  }
}

onMounted(() => {
  fetchMenu()
})
</script>

<style scoped>
.sidebar-container {
  background-color: #0f172a;
}
.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 56px;
  background: #0f172a;
  text-align: center;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.sidebar-logo-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-decoration: none;
}
.logo-icon {
  width: 32px;
  height: 32px;
  color: #fff;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  margin-right: 12px;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);
}
.sidebar-title {
  margin: 0;
  color: #f8fafc;
  font-weight: 600;
  font-size: 16px;
  line-height: 1;
  font-family: 'Inter', system-ui, sans-serif;
  letter-spacing: 0.5px;
}
.scrollbar-wrapper {
  overflow-x: hidden !important;
}
.el-menu {
  border: none;
  height: 100%;
  width: 100% !important;
  background-color: transparent !important;
  padding-top: 12px;
}
/* 选中态样式：更通透的呼吸态及指示条 */
:deep(.el-menu-item) {
  margin: 4px 12px;
  border-radius: 8px;
  height: 48px;
  line-height: 48px;
  color: #94a3b8 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.el-menu-item.is-active) {
  background: rgba(59, 130, 246, 0.15) !important;
  color: #60a5fa !important;
  font-weight: 600;
  border: none;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2) inset;
}
:deep(.el-menu-item.is-active .el-icon) {
  color: #60a5fa !important;
}
/* hover 状态的高亮优化 */
:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #f8fafc !important;
}
</style>
