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
                <el-dropdown-item @click="changePassDialog.visible = true">修改密码</el-dropdown-item>
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

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="changePassDialog.visible"
      title="修改个人密码"
      width="420px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="changePassDialog.form" label-position="top">
        <el-form-item label="当前密码" required>
          <el-input v-model="changePassDialog.form.oldPassword" type="password" show-password placeholder="请输入当前旧密码" />
        </el-form-item>
        <el-form-item label="设置新密码" required>
          <el-input v-model="changePassDialog.form.newPassword" type="password" show-password placeholder="新密码建议包含字母数字组合" />
        </el-form-item>
        <el-form-item label="确认新密码" required>
          <el-input v-model="changePassDialog.form.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="changePassDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="changePassDialog.loading" @click="confirmChangePass">提 交</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { ArrowDown, DataAnalysis, Document, List, Menu, Monitor, Operation, User } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([]) // 当前角色可见的菜单列表
const userName = ref('管理员') // 用户名展示
const userRole = ref('user') // 当前用户角色 (admin/user)

// 侧边栏图标映射表
const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/quotation-statistics': DataAnalysis,
  '/user-management': User
}

// 自动计算当前激活的菜单项 (处理二级路由高亮)
const activePath = computed(() => (route.path.startsWith('/approval/') ? '/approval' : route.path))
// 动态页面标题
const pageTitle = computed(() => route.meta?.title || (route.path.startsWith('/approval/') ? '审批详情' : '首页'))

// [本地开发模式] 改为动态从后端获取菜单
const fetchMenu = async () => {
  try {
    const res = await request.get('/api/menu')
    menuList.value = res.data || []
  } catch (error) {
    ElMessage.error('无法同步菜单权限')
    if (error?.response?.status === 401) logout()
  }
}

// 修改密码对话框的状态管理
const changePassDialog = reactive({
  visible: false,
  loading: false,
  form: { oldPassword: '', newPassword: '', confirmPassword: '' }
})

// 执行个人密码修改请求
const confirmChangePass = async () => {
  const { oldPassword, newPassword, confirmPassword } = changePassDialog.form
  if (!oldPassword || !newPassword) return ElMessage.warning('请填写必填项')
  if (newPassword !== confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  if (newPassword.length < 6) return ElMessage.warning('密码长度至少为 6 位')

  try {
    changePassDialog.loading = true
    // 调用后端接口
    await request.post('/api/user/change-password', { oldPassword, newPassword })
    ElMessage.success('密码修改成功，请下次登录时使用新密码')
    changePassDialog.visible = false
    changePassDialog.form = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '修改失败')
  } finally {
    changePassDialog.loading = false
  }
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
  // 核心：启动时请求动态菜单
  fetchMenu()
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
