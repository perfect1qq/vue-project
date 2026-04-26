<!--
  @file layout/components/Sidebar.vue
  @description 侧边导航栏组件（左侧菜单）

  功能说明：
  - 展示系统所有功能模块的导航菜单
  - 支持多级菜单（父菜单 + 子菜单）
  - 高亮当前激活的菜单项
  - 自动展开当前路由所在的父级菜单
  - 点击 Logo 区域返回首页
  - 深色主题设计

  组件结构：
  ┌──────────────────────────────────────┐
  │  Sidebar (侧边栏)                     │
  │                                      │
  │  ┌────────────────────────────────┐  │
  │  │ Logo 区域                       │  │
  │  │ [Q] 倍力特管理平台             │  │
  │  │ (点击跳转首页)                 │  │
  │  ├────────────────────────────────┤  │
  │  │ 菜单区域 (el-scrollbar)        │  │
  │  │                                │  │
  │  │ 🏠 首页                        │  │
  │  │ 📄 报价单 ▸                    │  │
  │  │   ├── 报价单列表               │  │
  │  │   └── 报价单历史               │  │
  │  │ 📋 横梁载重单 ▸                │  │
  │  │   ├── 横梁列表                │  │
  │  │   └── 历史记录                 │  │
  │  │ 📊 审批管理 ▸                  │  │
  │  │   ├── 待审批                   │  │
  │  │   └── 审批历史                 │  │
  │  │ ...                            │  │
  │  └────────────────────────────────┘  │
  └──────────────────────────────────────┘

  数据来源：
  - menuList: 从 userStore.menu 获取动态菜单配置
  - 支持后端根据权限返回不同的菜单项

  图标映射规则：
  ┌─────────────────────┬──────────────────┐
  │  路径前缀            │  图标组件         │
  ├─────────────────────┼──────────────────┤
  │  /approval           │  Monitor (监控)  │
  │  /quotation          │  Document (文档) │
  │  /beam-quotation     │  List (列表)     │
  │  /quotation-statistics│ DataAnalysis    │
  │  /medium-shelf-weight│ Histogram        │
  │  /user-management    │  User            │
  │  /usd-conversion     │  Money           │
  │  /message            │  ChatLineSquare  │
  │  /home               │  House           │
  │  /*/history          │  Clock           │
  │  其他                │  Menu (默认)     │
  └─────────────────────┴──────────────────┘

  菜单高亮逻辑：
  - activeMenu: 根据当前路由路径计算高亮项
  - openMenus: 自动展开包含当前路由的父菜单
  - menuKey: 强制刷新菜单（当 activeMenu 或 openMenus 变化时）

  样式特点：
  - 深色背景 (#0b1220)
  - 圆角菜单项 (border-radius: 10px)
  - 激活状态蓝色高亮 + 内边框阴影
  - Hover 状态半透明背景变化
-->

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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
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
const userStore = useUserStore()
const menuList = computed(() => userStore.menu || [])
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
