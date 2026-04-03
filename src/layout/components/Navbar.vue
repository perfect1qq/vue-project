<template>
  <div class="navbar-shell">
    <div class="navbar-top">
      <div class="brand-area">
        <div class="brand-mark">BT</div>
        <div class="brand-copy">
          <span class="brand-title">倍力特管理平台</span>
          <!-- <span class="brand-subtitle">轻量模式 · 标签页导航</span> -->
        </div>
      </div>

      <div class="right-menu">
        <template v-if="device !== 'mobile'">
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
                  <div class="notice-head-left">
                    <span class="title">系统消息</span>
                    <span class="subtitle">最近 10 条通知</span>
                  </div>
                  <el-button v-if="noticeList.length" link type="primary" size="small" @click="markAllAsRead">全部忽略</el-button>
                </div>
                <el-scrollbar max-height="320px">
                  <div v-if="!noticeList.length" class="notice-empty">
                    <el-empty :image-size="40" description="暂无新消息" />
                  </div>
                  <transition-group name="staggered-list" tag="div">
                    <div
                      v-for="(item, index) in noticeList"
                      :key="item.id"
                      class="notice-item"
                      :class="{ 'is-read': item.isRead }"
                      :style="{ '--delay': index * 0.05 + 's' }"
                      @click="handleNoticeClick(item)"
                    >
                      <div class="notice-item-icon" :class="item.type">
                        <el-icon><InfoFilled v-if="item.type === 'quotation_submitted'" /><CircleCheckFilled v-else /></el-icon>
                      </div>
                      <div class="notice-content">
                        <div class="notice-text">{{ item.content }}</div>
                        <div class="notice-time">{{ new Date(item.createdAt).toLocaleString() }}</div>
                      </div>
                      <div class="notice-meta">
                        <el-tag v-if="!item.isRead" size="small" type="danger" effect="plain" round>未读</el-tag>
                        <el-icon class="notice-arrow"><ArrowRight /></el-icon>
                      </div>
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
          <div class="avatar-wrapper">
            <el-avatar :size="32" class="user-avatar">{{ userName.charAt(0).toUpperCase() }}</el-avatar>
            <span class="user-name">{{ userName }}</span>
            <el-icon class="el-icon-caret-bottom"><CaretBottom /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="goHome">首页</el-dropdown-item>
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
    </div>

    <div class="navbar-tags">
      <TagsView />
    </div>

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
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElNotification } from 'element-plus'
import request from '@/utils/request'
import TagsView from './TagsView.vue'
import { Bell, InfoFilled, CircleCheckFilled, CaretBottom, ArrowRight } from '@element-plus/icons-vue'

const router = useRouter()
const userName = ref('管理员')
const userRole = ref('user')
const unreadApprovalCount = ref(0)
const noticeList = ref([])
const isBellRinging = ref(false)
const device = ref('desktop')
const homeRoute = '/home'

const triggerBellRing = () => {
  if (isBellRinging.value) return
  isBellRinging.value = true
  setTimeout(() => { isBellRinging.value = false }, 1000)
}

const isInitialLoad = ref(true)

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
  } catch {
    // ignore
  }
}

const handleNoticeClick = async (notice) => {
  if (!notice?.id) return
  try {
    await request.put(`/api/notifications/${notice.id}/read`)
    await fetchUnreadCount()

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
  } catch {
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

const goHome = () => router.push(homeRoute)
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
.navbar-shell {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
}

.navbar-top {
  height: 56px;
  overflow: hidden;
  position: relative;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 18px 0 20px;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px rgba(59, 130, 246, 0.24);
  flex-shrink: 0;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}

.brand-title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.brand-subtitle {
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
}

.navbar-tags {
  background: #fff;
}

.right-menu {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
}
.right-menu-item {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-name {
  color: #334155;
}

.notice-box {
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px;
  position: relative;
  border-radius: 999px;
  transition: all 0.2s ease;
}
.notice-box:hover {
  background: #f3f6fb;
}
.notice-icon {
  font-size: 22px;
  color: #64748b;
  transition: all 0.35s ease;
  z-index: 2;
}
.has-unread .notice-icon {
  color: #3b82f6;
}
.notice-box:hover .notice-icon {
  color: #2563eb;
  transform: scale(1.08);
}
.notice-glow {
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.12);
  border-radius: 999px;
  z-index: 1;
  animation: breathing-glow 2.5s infinite ease-in-out;
}
@keyframes breathing-glow {
  0% { transform: scale(0.9); opacity: 0.12; }
  50% { transform: scale(1.25); opacity: 0.32; }
  100% { transform: scale(1.55); opacity: 0; }
}
.active-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  background: #f87171;
  border-radius: 50%;
  z-index: 3;
  box-shadow: 0 0 8px #ef4444;
  animation: strobe 0.8s infinite;
}
@keyframes strobe { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

.is-ringing {
  animation: bell-ring 1s both;
}
@keyframes bell-ring {
  0%, 100% { transform: rotate(0); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
  20%, 40%, 60%, 80% { transform: rotate(10deg); }
}

.notice-dropdown {
  width: 360px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 12px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(226, 232, 240, 0.9);
  overflow: hidden;
}

.notice-head {
  padding: 14px 16px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.95));
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.notice-head-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.notice-head .title {
  font-weight: 700;
  font-size: 14px;
  color: #0f172a;
}
.notice-head .subtitle {
  font-size: 12px;
  color: #94a3b8;
}

.notice-empty {
  padding: 26px 0 18px;
}

.notice-item {
  padding: 12px 14px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(241, 245, 249, 0.9);
  transition: all 0.2s ease;
}
.notice-item:hover {
  background: rgba(248, 250, 252, 0.95);
}
.notice-item.is-read {
  opacity: 0.72;
}
.notice-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.notice-item-icon.quotation_submitted {
  background: linear-gradient(135deg, #f59e0b, #f97316);
}
.notice-item-icon.default {
  background: linear-gradient(135deg, #22c55e, #14b8a6);
}
.notice-content {
  flex: 1;
  min-width: 0;
}
.notice-text {
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
  white-space: normal;
  word-break: break-word;
}
.notice-time {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}
.notice-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}
.notice-arrow {
  color: #cbd5e1;
  transition: transform 0.2s ease, color 0.2s ease;
}
.notice-item:hover .notice-arrow {
  color: #64748b;
  transform: translateX(2px);
}

.notice-footer {
  padding: 10px 14px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  text-align: center;
  background: rgba(248, 250, 252, 0.96);
}
.notice-footer span {
  color: #3b82f6;
  font-size: 13px;
  cursor: pointer;
}
.notice-footer span:hover {
  text-decoration: underline;
}
</style>
