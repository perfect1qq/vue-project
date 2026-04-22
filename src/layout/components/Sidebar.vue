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
        :key="menuKey"
        :default-active="activeMenu"
        :default-openeds="openMenus"
        :collapse="isCollapse"
        :background-color="variables.menuBg"
        :text-color="variables.menuText"
        :active-text-color="variables.menuActiveText"
        :unique-opened="false"
        :collapse-transition="false"
        mode="vertical"
        router
      >
        <template v-for="item in menuList" :key="item.index || item.path">
          <el-sub-menu v-if="hasChildren(item)" :index="item.index || `${item.path}-group`">
            <template #title>
              <el-icon><component :is="iconMap[item.path] || iconMap.default" /></el-icon>
              <span>{{ item.name }}</span>
            </template>

            <el-menu-item
              v-for="child in item.children"
              :key="child.index || child.path"
              :index="child.path"
            >
              <el-icon><component :is="iconMap[child.path] || iconMap[child.icon] || iconMap.default" /></el-icon>
              <template #title>
                <span>{{ child.name }}</span>
              </template>
            </el-menu-item>
          </el-sub-menu>

          <el-menu-item v-else :index="item.path">
            <el-icon><component :is="iconMap[item.path] || iconMap.default" /></el-icon>
            <template #title>
              <span>{{ item.name }}</span>
            </template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/utils/request'
import { readCurrentUser } from '@/utils/navigation'
import { handleAuthExpired } from '@/utils/authSession'
import {
  House,
  Money,
  Monitor,
  Document,
  List,
  Histogram,
  DataAnalysis,
  User,
  Menu as IconMenu,
  ChatLineSquare,
  Clock
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([])
const homeRoute = '/home'

const variables = {
  menuBg: '#0b1220',
  menuText: '#94a3b8',
  menuActiveText: '#60a5fa'
}

const isCollapse = ref(false)
const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/quotation-statistics': DataAnalysis,
  '/medium-shelf-weight': Histogram,
  '/user-management': User,
  '/usd-conversion': Money,
  '/message': ChatLineSquare,
  '/memo-management': ChatLineSquare,
  '/customer-management': User,
  '/home': House,
  '/quotation/history': Clock,
  '/beam-quotation/history': Clock,
  '/approval/history': Clock,
  default: IconMenu
}

const hasChildren = (item) => Array.isArray(item?.children) && item.children.length > 0

const activeMenu = computed(() => {
  const path = route.path
  if (path === '/' || path === '/home') return '/home'
  if (path === '/quotation' || path.startsWith('/quotation/')) return path
  if (path === '/beam-quotation' || path.startsWith('/beam-quotation/')) return path
  if (path.startsWith('/approval/history')) return '/approval/history'
  if (path.startsWith('/approval')) return '/approval'
  return path
})

const openMenus = computed(() => {
  const path = route.path
  if (path === '/quotation' || path.startsWith('/quotation/')) return ['/quotation-group']
  if (path === '/beam-quotation' || path.startsWith('/beam-quotation/')) return ['/beam-quotation-group']
  if (path === '/approval' || path.startsWith('/approval/')) return ['/approval-group']
  return []
})

const menuKey = computed(() => `${activeMenu.value}-${openMenus.value.join(',')}`)

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
      handleAuthExpired(error?.response?.data?.code)
    }
  }
}

onMounted(() => {
  fetchMenu()
})
</script>

<style scoped>
.sidebar-container {
  background-color: #0b1220;
}
.sidebar-logo-container {
  position: relative;
  width: 100%;
  height: 60px;
  background: linear-gradient(180deg, #0b1220 0%, #0f172a 100%);
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
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
  width: 30px;
  height: 30px;
  color: #fff;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 17px;
  margin-right: 10px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}
.sidebar-title {
  margin: 0;
  color: #f8fafc;
  font-weight: 650;
  font-size: 15px;
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
  padding-top: 8px;
}
:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  margin: 5px 10px;
  border-radius: 10px;
  height: 44px;
  line-height: 44px;
  color: #94a3b8 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
:deep(.el-sub-menu__title) {
  display: flex;
  align-items: center;
}
:deep(.el-menu-item.is-active) {
  background: rgba(37, 99, 235, 0.14) !important;
  color: #dbeafe !important;
  font-weight: 600;
  border: none;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2) inset;
}
:deep(.el-menu-item.is-active .el-icon) {
  color: #dbeafe !important;
}
:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(148, 163, 184, 0.08) !important;
  color: #f8fafc !important;
}
:deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #f8fafc !important;
}
:deep(.el-menu--inline) {
  background: transparent !important;
}
:deep(.el-sub-menu .el-menu-item) {
  margin: 4px 12px 4px 24px;
}
</style>
