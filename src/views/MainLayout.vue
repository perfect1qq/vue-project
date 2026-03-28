<template>
  <el-container class="layout">
    <el-aside class="aside" width="240px">
      <div class="logo-box">
        <div class="logo-icon">R</div>
        <div class="logo-text">
          <div class="title">仓储报价系统</div>
          <div class="sub">Quotation & Approval</div>
        </div>
      </div>

      <el-scrollbar class="menu-scroll">
        <el-menu
          class="menu"
          :default-active="activePath"
          router
          background-color="#1f2d3d"
          text-color="#cfd7e6"
          active-text-color="#ffffff"
        >
          <el-menu-item v-for="item in menuList" :key="item.path" :index="item.path">
            <component :is="iconMap[item.path] || Menu" class="menu-icon" />
            <span>{{ item.name }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container class="right">
      <el-header class="header">
        <div class="header-left">
          <el-icon class="header-icon"><Operation /></el-icon>
          <span class="header-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <el-tag effect="light" type="success" round class="status-tag">在线</el-tag>
          <el-dropdown trigger="click">
            <div class="user-box">
              <el-avatar :size="32" class="avatar">{{ userName.charAt(0).toUpperCase() }}</el-avatar>
              <span class="user-name">{{ userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="goHome">首页</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <div class="main-inner">
          <router-view v-slot="{ Component }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, DataAnalysis, Document, List, Menu, Monitor, Operation } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([])
const userName = ref('管理员')
const userRole = ref('user')

const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/quotation-statistics': DataAnalysis
}

const activePath = computed(() => (route.path.startsWith('/approval/') ? '/approval' : route.path))
const pageTitle = computed(() => route.meta?.title || (route.path.startsWith('/approval/') ? '审批详情' : '首页'))

const roleMenus = {
  admin: [
    { name: '审批管理', path: '/approval' },
    { name: '报价单', path: '/quotation' },
    { name: '横梁报价单', path: '/beam-quotation' },
    { name: '报价单统计', path: '/quotation-statistics' }
  ],
  user: [
    { name: '报价单', path: '/quotation' },
    { name: '横梁报价单', path: '/beam-quotation' },
    { name: '报价单统计', path: '/quotation-statistics' }
  ]
}

const goHome = () => router.push('/quotation')
const logout = () => {
  localStorage.clear()
  router.replace('/login')
}

onMounted(() => {
  const saved = localStorage.getItem('user')
  if (saved) {
    try {
      const user = JSON.parse(saved)
      userName.value = user.username || '管理员'
      userRole.value = user.role || 'user'
    } catch {
      userName.value = '管理员'
      userRole.value = 'user'
    }
  }
  menuList.value = roleMenus[userRole.value] || roleMenus.user
})
</script>

<style scoped>
.layout { height: 100vh; background: #f5f7fb; }
.aside { background: linear-gradient(180deg, #1f2d3d 0%, #172331 100%); box-shadow: 2px 0 16px rgba(15,23,42,.12); display: flex; flex-direction: column; overflow: hidden; }
.logo-box { height: 72px; display: flex; align-items: center; gap: 12px; padding: 0 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.logo-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 18px; background: linear-gradient(135deg, #409eff, #67c23a); box-shadow: 0 10px 22px rgba(64,158,255,.35); }
.logo-text .title { color: #fff; font-weight: 700; font-size: 16px; line-height: 1.2; }
.logo-text .sub { margin-top: 3px; color: rgba(255,255,255,.55); font-size: 12px; }
.menu-scroll { flex: 1; }
.menu { border-right: none; padding: 10px 8px 16px; }
.menu :deep(.el-menu-item) { height: 46px; border-radius: 12px; margin: 6px 6px; font-size: 14px; transition: all .2s ease; }
.menu :deep(.el-menu-item.is-active) { background: linear-gradient(135deg, #409eff, #5ab1ff); box-shadow: 0 10px 20px rgba(64,158,255,.22); }
.menu :deep(.el-menu-item:hover) { background: rgba(255,255,255,.08); }
.menu-icon { width: 16px; height: 16px; margin-right: 10px; }
.right { min-width: 0; }
.header { height: 64px; background: rgba(255,255,255,.9); backdrop-filter: blur(14px); border-bottom: 1px solid #eef1f5; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.header-left { display: flex; align-items: center; gap: 10px; color: #1f2937; }
.header-icon { color: #409eff; font-size: 18px; }
.header-title { font-size: 16px; font-weight: 700; }
.header-right { display: flex; align-items: center; gap: 14px; }
.status-tag { border: 0; padding: 0 10px; }
.user-box { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px 10px; border-radius: 999px; transition: background .2s ease; }
.user-box:hover { background: #f3f6fa; }
.avatar { background: linear-gradient(135deg, #409eff, #67c23a); color: #fff; font-weight: 700; }
.user-name { color: #374151; font-size: 14px; }
.main { padding: 18px; overflow: auto; }
.main-inner { min-height: calc(100vh - 64px - 36px); }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all .18s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(8px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
