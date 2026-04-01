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
          <!-- [新] 顶部通知中心 - 仿阿里巴巴/管理后台风格 -->
          <el-dropdown trigger="click" @command="handleNoticeClick">
            <div class="notice-box" :class="{ 'has-unread': unreadApprovalCount > 0 }">
              <div v-if="unreadApprovalCount > 0" class="notice-glow"></div>
              <el-badge :value="unreadApprovalCount" :max="99" :hidden="unreadApprovalCount === 0" class="custom-badge">
                <el-icon class="notice-icon" :class="{ 'is-ringing': isBellRinging }"><Bell /></el-icon>
              </el-badge>
              <!-- [新] 强提醒：动态待点 (仅当有未读消息时闪烁) -->
              <div v-if="unreadApprovalCount > 0" class="active-dot"></div>
            </div>
            <template #dropdown>
              <div class="notice-dropdown">
                <div class="notice-head">
                  <span class="title">系统消息</span>
                  <el-button v-if="noticeList.length" link type="primary" size="small" @click="markAllAsRead">全部忽略</el-button>
                </div>
                <el-scrollbar max-height="320px">
                  <div v-if="!noticeList.length" class="notice-empty">
                    <el-empty :image-size="40" description="暂无新消息" />
                  </div>
                  <transition-group name="staggered-list" tag="div">
                    <div v-for="(item, index) in noticeList" :key="item.id" class="notice-item" :class="{ 'is-read': item.isRead }" :style="{ '--delay': index * 0.05 + 's' }" @click="handleNoticeClick(item)">
                      <div class="notice-item-icon" :class="item.type">
                        <el-icon><InfoFilled v-if="item.type === 'quotation_submitted'" /><CircleCheckFilled v-else /></el-icon>
                      </div>
                      <div class="notice-content">
                        <div class="notice-text">{{ item.content }}</div>
                        <div class="notice-time">{{ new Date(item.createdAt).toLocaleString() }}</div>
                      </div>
                      <div v-if="!item.isRead" class="notice-dot pulse"></div>
                    </div>
                  </transition-group>
                </el-scrollbar>
                <div class="notice-footer">
                  <span @click="goNoticePage">查看全部流程通知</span>
                </div>
              </div>
            </template>
          </el-dropdown>

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
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import request from '@/utils/request'
import { 
  ArrowDown, DataAnalysis, Document, List, Menu, 
  Monitor, Operation, User, Bell, InfoFilled, CircleCheckFilled,Histogram, Money
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const menuList = ref([]) // 当前角色可见的菜单列表
const userName = ref('管理员') // 用户名展示
const userRole = ref('user') // 当前用户角色 (admin/user)
const unreadApprovalCount = ref(0) // 待处理审批总数
const noticeList = ref([]) // 详细通知列表
const isBellRinging = ref(false) // 是否正在震动铃铛

// 触发铃铛晃动动画
const triggerBellRing = () => {
  if (isBellRinging.value) return
  isBellRinging.value = true
  setTimeout(() => { isBellRinging.value = false }, 1000)
}

// 侧边栏图标映射表
const iconMap = {
  '/approval': Monitor,
  '/quotation': Document,
  '/beam-quotation': List,
  '/medium-shelf-weight': Histogram,
  '/quotation-statistics': DataAnalysis,
  '/user-management': User,
  '/usd-conversion': Money
}

// 自动计算当前激活的菜单项 (处理二级路由高亮)
const activePath = computed(() => (route.path.startsWith('/approval/') ? '/approval' : route.path))
// 动态页面标题
const pageTitle = computed(() => route.meta?.title || (route.path.startsWith('/approval/') ? '审批详情' : '首页'))

const isInitialLoad = ref(true) // 标记是否为初次加载过程

// [核心] 获取未读通知与消息列表
const fetchUnreadCount = async () => {
  try {
    const resCount = await request.get('/api/notifications/unread-count')
    const newCount = resCount.data.count || 0
    const oldCount = unreadApprovalCount.value
   
    
    // 如果有新消息（数量增加），且不是登录后的第一次全量同步，则触发提醒
    if (newCount > oldCount) {
      triggerBellRing()
      
      const resList = await request.get('/api/notifications')
      const latest = resList.data.list?.[0]
      
      // 核心逻辑：如果是 0 -> 1，或者是后续累加，只要不是刚刷页面的“初始化下载”，就弹窗
      if (latest && !isInitialLoad.value) {
        ElNotification({
          title: '系统消息待处理',
          message: latest.content,
          type: 'warning',
          position: 'top-right',
          duration: 4500,
          offset: 60,
          onClick: () => handleNoticeClick(latest)
        })
      }
      noticeList.value = (resList.data.list || []).slice(0, 10)
    } else {
      // 数量没变或减少（意味着已处理），仅静默更新列表
      const resList = await request.get('/api/notifications')
      noticeList.value = (resList.data.list || []).slice(0, 10)
    }
    
    unreadApprovalCount.value = newCount
    isInitialLoad.value = false // 第一次轮询结束后，标记为非初次加载
  } catch (err) {
    console.warn('获取通知失败')
  }
}

// [核心] 点击单条消息
const handleNoticeClick = async (notice) => {
  if (!notice || !notice.id) return
  
  try {
    // 标记为已读
    await request.put(`/api/notifications/${notice.id}/read`)
    await fetchUnreadCount()
    
    // 根据通知类型跳转
    if (notice.type === 'quotation_submitted') {
      router.push(`/approval/${notice.relatedId}?mode=edit`)
    } else {
      router.push('/quotation')
    }
  } catch (err) {
    console.error('处理通知失败')
  }
}

// [核心] 全部忽略
const markAllAsRead = async (e) => {
  e.stopPropagation()
  try {
    await request.post('/api/notifications/read-all')
    await fetchUnreadCount()
    ElMessage.success('已全部标记为已读')
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const goNoticePage = () => {
  // 跳转到历史记录或对应的管理页
  if (userRole.value === 'admin') router.push('/approval')
  else router.push('/quotation')
}

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

const changePassDialog = reactive({ visible: false, loading: false, form: { oldPassword: '', newPassword: '', confirmPassword: '' } })
const confirmChangePass = async () => {
  const { oldPassword, newPassword, confirmPassword } = changePassDialog.form
  if (!oldPassword || !newPassword) return ElMessage.warning('请填写必填项')
  if (newPassword !== confirmPassword) return ElMessage.warning('两次输入的新密码不一致')
  if (newPassword.length < 6) return ElMessage.warning('密码长度至少为 6 位')

  try {
    changePassDialog.loading = true
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

let notificationTimer = null

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
  fetchMenu()
  fetchUnreadCount()
  
  // 每 30 秒自动刷新一次通知 (原为 120 秒)
  notificationTimer = setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  if (notificationTimer) clearInterval(notificationTimer)
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
.menu-icon { width: 16px; height: 16px; margin-right: 10px; }
.right { min-width: 0; }
.header { height: 64px; background: rgba(255,255,255,.9); backdrop-filter: blur(14px); border-bottom: 1px solid #eef1f5; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; }
.header-left { display: flex; align-items: center; gap: 10px; color: #1f2937; }
.header-icon { color: #409eff; font-size: 18px; }
.header-title { font-size: 16px; font-weight: 700; }
.header-right { display: flex; align-items: center; gap: 18px; }
.status-tag { border: 0; padding: 0 10px; }

/* --- 通知中心 Premium 样式 --- */
.notice-box { cursor: pointer; display: flex; align-items: center; padding: 6px; position: relative; border-radius: 50%; transition: all 0.3s; }
.notice-icon { font-size: 22px; color: #64748b; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); z-index: 2; }

/* 激活状态：颜色变幻 */
.has-unread .notice-icon { color: #409eff; }
.notice-box:hover .notice-icon { color: #2563eb; transform: scale(1.1); }

/* 呼吸光晕效果 */
.notice-glow {
  position: absolute; width: 100%; height: 100%; top: 0; left: 0;
  background: rgba(64, 158, 255, 0.15); border-radius: 50%; z-index: 1;
  animation: breathing-glow 2.5s infinite ease-in-out;
}
@keyframes breathing-glow {
  0% { transform: scale(0.85); opacity: 0.1; }
  50% { transform: scale(1.4); opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* 顶部强提醒小红点 (闪烁) */
.active-dot {
  position: absolute; top: 4px; right: 4px; width: 6px; height: 6px;
  background: #f87171; border-radius: 50%; z-index: 3;
  box-shadow: 0 0 8px #ef4444; 
  animation: strobe 0.8s infinite;
}
@keyframes strobe { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

/* 铃铛震动动画 */
.is-ringing { animation: bell-ring 1s both; }
@keyframes bell-ring {
  0%, 100% { transform: rotate(0); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
  20%, 40%, 60%, 80% { transform: rotate(10deg); }
}

/* 消息下拉框 - 毛玻璃特效 */
.notice-dropdown { 
  width: 320px; 
  background: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(14px); 
  -webkit-backdrop-filter: blur(14px);
  border-radius: 16px; 
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.4);
  overflow: hidden;
}

.notice-head { padding: 14px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
.notice-head .title { font-weight: 700; font-size: 14px; color: #1e293b; }

.notice-empty { padding: 30px 0; }

.notice-item { 
  padding: 12px 16px; display: flex; gap: 12px; cursor: pointer; transition: all 0.25s; position: relative;
  border-bottom: 1px solid rgba(0,0,0,0.02);
}
.notice-item:hover { background: rgba(64,158,255, 0.05); }
.notice-item.is-read { opacity: 0.55; }

/* 消息项逐条滑入动画 */
.staggered-list-enter-active {
  animation: move-up 0.4s both;
  animation-delay: var(--delay);
}
@keyframes move-up {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

.notice-item-icon { 
  width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}
/* 渐变图标色系 */
.notice-item-icon.quotation_submitted { background: linear-gradient(135deg, #e0f2fe, #7dd3fc); color: #0369a1; }
.notice-item-icon.quotation_approved { background: linear-gradient(135deg, #f0fdf4, #86efac); color: #15803d; }
.notice-item-icon.quotation_rejected { background: linear-gradient(135deg, #fef2f2, #fca5a5); color: #b91c1c; }

.notice-content { flex: 1; min-width: 0; }
.notice-text { font-size: 13px; color: #334155; line-height: 1.5; margin-bottom: 3px; font-weight: 500; }
.notice-time { font-size: 11px; color: #94a3b8; }

/* 呼吸红点 */
.notice-dot.pulse { 
  width: 8px; height: 8px; background: #ef4444; border-radius: 50%; position: absolute; right: 16px; top: 22px; 
  box-shadow: 0 0 0 rgba(239, 68, 68, 0.7);
  animation: pulse-red 2s infinite;
}
@keyframes pulse-red {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.notice-footer { 
  padding: 12px; text-align: center; border-top: 1px solid rgba(0,0,0,0.05); font-size: 12px; color: #64748b; font-weight: 500;
}
.notice-footer:hover { color: #409eff; background: rgba(255,255,255,0.5); }

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
