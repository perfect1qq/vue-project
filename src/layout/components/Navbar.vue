<template>
  <!-- 顶部导航栏整体容器 -->
  <div class="navbar">
    <!-- 左侧面包屑导航 -->
    <div class="breadcrumb-container">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item>首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ pageTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 右侧功能菜单区 (消息通知、用户头像) -->
    <div class="right-menu">
      <template v-if="device !== 'mobile'">
        <!-- 消息通知下拉框 -->
        <el-dropdown class="right-menu-item hover-effect" trigger="click" @command="handleNoticeClick">
          <div class="notice-box" :class="{ 'has-unread': unreadApprovalCount > 0 }">
            <div v-if="unreadApprovalCount > 0" class="notice-glow"></div>
            <el-badge :value="unreadApprovalCount" :max="99" :hidden="unreadApprovalCount === 0" class="custom-badge">
              <el-icon class="notice-icon" :class="{ 'is-ringing': isBellRinging }"><Bell /></el-icon>
            </el-badge>
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
      </template>

      <el-dropdown class="avatar-container right-menu-item hover-effect" trigger="click">
        <!-- 用户头像与名称展示 -->
        <div class="avatar-wrapper">
          <el-avatar :size="32" class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</el-avatar>
          <span class="user-name">{{ userName }}</span>
          <el-icon class="el-icon-caret-bottom"><CaretBottom /></el-icon>
        </div>
        <!-- 用户下拉菜单项 -->
        <template #dropdown>
          <el-dropdown-menu>
            <router-link to="/">
              <el-dropdown-item>首页</el-dropdown-item>
            </router-link>
            <el-dropdown-item @click="changePassDialog.visible = true">
              <span style="display:block;">修改密码</span>
            </el-dropdown-item>
            <el-dropdown-item divided @click="logout">
              <span style="display:block;">退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import request from '@/utils/request'
import { Bell, InfoFilled, CircleCheckFilled, CaretBottom } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userName = ref('管理员')
const userRole = ref('user')
const unreadApprovalCount = ref(0)
const noticeList = ref([])
const isBellRinging = ref(false)
const device = ref('desktop')

const pageTitle = computed(() => route.meta?.title || '首页')

const triggerBellRing = () => {
  if (isBellRinging.value) return
  isBellRinging.value = true
  setTimeout(() => { isBellRinging.value = false }, 1000)
}

const isInitialLoad = ref(true)

/**
 * 获取未读通知数量和最新通知列表
 * 使用 async/await 替换 Promise，并保持简练优雅
 */
const fetchUnreadCount = async () => {
  try {
    const resCount = await request.get('/api/notifications/unread-count')
    const newCount = resCount.data?.count ?? 0
    const oldCount = unreadApprovalCount.value
    
    if (newCount > oldCount) {
      triggerBellRing()
      const resList = await request.get('/api/notifications')
      const latest = resList.data?.list?.[0]
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
      const resList = await request.get('/api/notifications')
      noticeList.value = (resList.data.list || []).slice(0, 10)
    }
    unreadApprovalCount.value = newCount
    isInitialLoad.value = false
  } catch (err) {
    console.warn('获取通知失败')
  }
}

const handleNoticeClick = async (notice) => {
  if (!notice?.id) return
  try {
    await request.put(`/api/notifications/${notice.id}/read`)
    await fetchUnreadCount()
    
    // 使用三元进行跳转简化
    const targetPath = notice.type === 'quotation_submitted' 
      ? `/approval/${notice.relatedId}?mode=edit` 
      : '/quotation'
    router.push(targetPath)
  } catch (err) {
    console.error('处理通知失败', err)
  }
}

const markAllAsRead = async (e) => {
  if (e) e.stopPropagation()
  try {
    await request.post('/api/notifications/read-all')
    await fetchUnreadCount()
    ElMessage.success('已全部标记为已读')
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

const goNoticePage = () => {
  if (userRole.value === 'admin') router.push('/approval')
  else router.push('/quotation')
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
    ElMessage.success('密码修改成功，请重新登录')
    changePassDialog.visible = false
    logout()
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '修改失败')
  } finally {
    changePassDialog.loading = false
  }
}

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
      // ignore
    }
  }
  fetchUnreadCount()
  notificationTimer = setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  if (notificationTimer) clearInterval(notificationTimer)
})
</script>

<style scoped>
.navbar {
  height: 60px;
  overflow: hidden;
  position: relative;
  background: rgba(255, 255, 255, 0.85); /* Glass effect */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  z-index: 10;
}

.breadcrumb-container {
  display: flex;
  align-items: center;
}
:deep(.el-breadcrumb__inner) {
  font-weight: 500;
  color: #64748b;
}

.right-menu {
  height: 100%;
  display: flex;
  align-items: center;
}

.right-menu:focus {
  outline: none;
}

.right-menu-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  height: 100%;
  font-size: 18px;
  color: #5a5e66;
}

.right-menu-item.hover-effect {
  cursor: pointer;
  transition: background .3s;
}

.right-menu-item.hover-effect:hover {
  background: rgba(0, 0, 0, .025);
}

.avatar-container {
  margin-right: 15px;
  height: 100%;
  display: flex;
  align-items: center;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.avatar-wrapper:hover {
  background: #f1f5f9;
}

.user-avatar {
  cursor: pointer;
  border-radius: 8px; /* Square with rounded corners */
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.el-icon-caret-bottom {
  cursor: pointer;
  font-size: 12px;
  color: #94a3b8;
}

/* 通知下拉框动画及样式继承自原版，配合靛蓝主题微调 */
.notice-box { cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; position: relative; border-radius: 50%; height: 100%; }
.notice-icon { font-size: 20px; color: #5a5e66; line-height: 1; display: flex; align-items: center; }
.has-unread .notice-icon { color: #818cf8; } /* 靛蓝色未读图标 */
.notice-box:hover .notice-icon { color: #6366f1; transform: scale(1.1); transition: all 0.3s;}
.active-dot { position: absolute; top: 12px; right: 12px; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 6px #ef4444; animation: strobe 0.8s infinite; }
@keyframes strobe { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
.is-ringing { animation: bell-ring 1s both; }
@keyframes bell-ring { 0%, 100% { transform: rotate(0); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-8deg); } 20%, 40%, 60%, 80% { transform: rotate(8deg); } }

/* 消息下拉内容框保持若依风格 */
.notice-dropdown { width: 300px; padding: 0; background: #fff; }
.notice-head { padding: 10px 15px; border-bottom: 1px solid #ebeef5; display: flex; justify-content: space-between; align-items: center; }
.notice-head .title { font-weight: bold; font-size: 14px; color: #303133; }
.notice-item { padding: 10px 15px; display: flex; gap: 10px; cursor: pointer; border-bottom: 1px solid #ebeef5; }
.notice-item:hover { background-color: #f5f7fa; }
.notice-content { flex: 1; min-width: 0; }
.notice-text { font-size: 13px; color: #606266; margin-bottom: 4px; line-height: 1.4; word-break: break-all; }
.notice-time { font-size: 12px; color: #909399; }
.notice-footer { padding: 10px 0; text-align: center; color: #409EFF; font-size: 13px; cursor: pointer; }
.notice-footer:hover { background-color: #f5f7fa; }
</style>
