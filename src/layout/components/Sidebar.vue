<template>
  <div class="sidebar-container has-logo">
    <div class="sidebar-logo-container" @click="router.push(homeRoute)">
      <transition name="sidebarLogoFade">
        <router-link key="expand" class="sidebar-logo-link" :to="homeRoute">
          <div class="logo-icon">Q</div>
          <h1 class="sidebar-title">倍力特管理平台</h1>
        </router-link>
      </transition>
    </div>

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
import request from '@/utils/request'
import { readCurrentUser } from '@/utils/navigation'
import {
  House, Money, Monitor, Document, List, Histogram, DataAnalysis, User, Menu as IconMenu, ChatLineSquare
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([])
const homeRoute = '/home'

const variables = {
  menuBg: '#0f172a',
  menuText: '#94a3b8',
  menuActiveText: '#60a5fa'
}

const isCollapse = ref(false)
const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/medium-shelf-weight': Histogram,
  '/quotation-statistics': DataAnalysis,
  '/user-management': User,
  '/usd-conversion': Money,
  '/message': ChatLineSquare,
  '/memo-management': ChatLineSquare,
  '/home': House,
  default: IconMenu
}

const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '/home') return '/home'
  if (path.startsWith('/approval/')) return '/approval'
  if (path.startsWith('/beam-quotation/')) return '/beam-quotation'
  return path
})

const fetchMenu = async () => {
  try {
    const res = await request.get('/api/menu')
    const list = res.data || []
    if (!list.find(m => m.path === '/message')) {
      const currentUser = readCurrentUser()
      list.push({
        name: currentUser.role === 'admin' ? '官方留言板' : '我的指派',
        path: '/message'
      })
    }
    menuList.value = list
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
  height: 58px;
  background: #0f172a;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.sidebar-logo-link {
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
  margin-right: 10px;
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
  padding-top: 10px;
}
:deep(.el-menu-item) {
  margin: 4px 12px;
  border-radius: 8px;
  height: 46px;
  line-height: 46px;
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
:deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #f8fafc !important;
}
</style>
