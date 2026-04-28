<!--
  @file layout/components/Navbar.vue
  @description 顶部导航栏组件

  功能说明：
  - 显示系统品牌标识（Logo + 名称）
  - 通知中心入口（铃铛图标 + 未读数量角标）
  - 用户信息展示（头像 + 姓名）
  - 用户操作下拉菜单（首页、修改密码、退出登录）
  - 标签页视图（TagsView）显示已打开的页面
  - 移动端侧边栏切换按钮
  - 密码修改对话框

  组件结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  Navbar (顶部导航栏)                                         │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ [☰] [BT] 倍力特管理平台    [🔔(3)] [👤 张三 ▾]      │  │
  │  └────────────────────────────────────────────────────────┘  │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ TagsView (标签页栏)                                   │  │
  │  │ [首页] [报价单] [用户管理] ×                          │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  功能模块：

  1️⃣ 通知中心 (Notice Dropdown)
  ┌─────────────────────────────────────────────┐
  │  🔔 系统消息                    [全部已读]  │
  │  最近 10 条通知                              │
  │                                             │
  │  📝 新报价单待审批...        [未读]  →      │
  │  ⏰ 备忘录提醒: 完成任务X      [未读]  →      │
  │  ✓ 已读的通知...                      →      │
  │                                             │
  │              [查看全部流程通知]              │
  └─────────────────────────────────────────────┘

  2️⃣ 用户菜单 (User Dropdown)
  - 首页 → /home
  - 修改密码 → 弹出密码修改对话框
  - 退出登录 → 清除会话并跳转登录页

  3️⃣ 标签页 (TagsView)
  - 显示最近访问的页面标签
  - 支持关闭单个/关闭其他/关闭左侧/右侧
  - 点击标签快速切换页面

  响应式适配：
  - Desktop (>768px): 显示完整导航栏
  - Mobile (≤768px): 显示汉堡菜单按钮，隐藏部分元素

  交互特性：
  - 新消息到达时铃铛动画 + 角标数字更新
  - 点击通知项自动标记已读并跳转
  - 未读消息红色角标提示（最多显示 99+）
-->

<template>
  <div class="navbar-shell">
    <div class="navbar-top">
      <button class="mobile-nav-trigger" type="button" @click="emit('toggle-mobile-sidebar')">
        <el-icon>
          <Menu />
        </el-icon>
      </button>
      <div class="brand-area">
        <div class="brand-mark">BT</div>
        <div class="brand-copy">
          <span class="brand-title">倍力特管理平台</span>
        </div>
      </div>

      <div class="right-menu">
        <template v-if="device !== 'mobile'">
          <el-dropdown class="right-menu-item hover-effect" trigger="click" @command="handleNoticeClick">
            <div class="notice-box" :class="{ 'has-unread': unreadApprovalCount > 0 }">
              <div v-if="unreadApprovalCount > 0" class="notice-glow"></div>
              <el-badge :value="unreadApprovalCount" :max="99" :hidden="unreadApprovalCount === 0" class="custom-badge">
                <el-icon class="notice-icon" :class="{ 'is-ringing': isBellRinging }">
                  <Bell />
                </el-icon>
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
                  <el-button v-if="noticeList.length" link type="primary" size="small"
                    @click="markAllAsRead">全部已读</el-button>
                </div>
                <el-scrollbar max-height="320px">
                  <div v-if="!noticeList.length" class="notice-empty">
                    <el-empty :image-size="40" description="暂无新消息" />
                  </div>
                  <transition-group name="staggered-list" tag="div">
                    <div v-for="(item, index) in noticeList" :key="item.id" class="notice-item"
                      :class="{ 'is-read': item.isRead }" :style="{ '--delay': index * 0.05 + 's' }"
                      @click="handleNoticeClick(item)">
                      <div class="notice-item-icon" :class="item.type">
                        <el-icon>
                          <InfoFilled v-if="item.type === 'quotation_submitted'" />
                          <Bell v-else-if="item.type === 'memo_reminder'" />
                          <CircleCheckFilled v-else />
                        </el-icon>
                      </div>
                      <div class="notice-content">
                        <div class="notice-text">{{ item.content }}</div>
                        <div class="notice-time">{{ new Date(item.createdAt).toLocaleString() }}</div>
                      </div>
                      <div class="notice-meta">
                        <el-tag v-if="!item.isRead" size="small" type="danger" effect="plain" round>未读</el-tag>
                        <el-icon class="notice-arrow">
                          <ArrowRight />
                        </el-icon>
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
            <el-avatar :size="32" class="user-avatar">{{ userInitial }}</el-avatar>
            <span class="user-name">{{ userName }}</span>
            <el-icon class="el-icon-caret-bottom">
              <CaretBottom />
            </el-icon>
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

    <AsyncDialog ref="changePassDialogRef" v-model="changePassDialog.visible" title="修改个人密码" :width="420"
      :append-to-body="true">
      <el-form :model="changePassDialog.form" label-position="top">
        <el-form-item label="当前密码" required>
          <el-input v-model="changePassDialog.form.oldPassword" type="password" show-password placeholder="请输入当前密码" />
        </el-form-item>
        <el-form-item label="设置新密码" required>
          <el-input v-model="changePassDialog.form.newPassword" type="password" show-password
            placeholder="新密码建议包含字母和数字组合" />
        </el-form-item>
        <el-form-item label="确认新密码" required>
          <el-input v-model="changePassDialog.form.confirmPassword" type="password" show-password
            placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer="{ loading }">
        <el-button @click="changePassDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="confirmChangePass">提交</el-button>
      </template>
    </AsyncDialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { useUserStore } from '@/stores/user'
import TagsView from './TagsView.vue'
import { logoutByUser } from '@/utils/authSession'
import { Bell, InfoFilled, CircleCheckFilled, CaretBottom, ArrowRight, Menu } from '@element-plus/icons-vue'
import { useNavbarPasswordDialog } from '@/composables/useNavbarPasswordDialog'
import { useNavbarNotifications } from '@/composables/useNavbarNotifications'
import AsyncDialog from '@/components/common/AsyncDialog.vue'

const router = useRouter()
const userStore = useUserStore()
const emit = defineEmits(['toggle-mobile-sidebar'])
const changePassDialogRef = ref(null)
const userName = computed(() => userStore.displayName || '管理员')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase() || 'A')
const userRole = computed(() => userStore.role || 'guest')
const device = ref('desktop')
const homeRoute = '/home'
const {
  unreadApprovalCount,
  noticeList,
  isBellRinging,
  fetchUnreadCount,
  handleNoticeClick,
  markAllAsRead,
  goNoticePage
} = useNavbarNotifications({ request, router, userRole })

const { changePassDialog, confirmChangePass } = useNavbarPasswordDialog({
  request,
  onSuccess: () => logout(),
  dialogRef: changePassDialogRef
})

const goHome = () => router.push(homeRoute)
const logout = async () => {
  await logoutByUser()
}

let notificationTimer = null

onMounted(() => {
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

.mobile-nav-trigger {
  display: none;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  align-items: center;
  justify-content: center;
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

.navbar-tags {
  background: #fff;
  overflow: hidden;
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
  0% {
    transform: scale(0.9);
    opacity: 0.12;
  }

  50% {
    transform: scale(1.25);
    opacity: 0.32;
  }

  100% {
    transform: scale(1.55);
    opacity: 0;
  }
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

@keyframes strobe {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.2;
  }
}

.is-ringing {
  animation: bell-ring 1s both;
}

@keyframes bell-ring {

  0%,
  100% {
    transform: rotate(0);
  }

  10%,
  30%,
  50%,
  70%,
  90% {
    transform: rotate(-10deg);
  }

  20%,
  40%,
  60%,
  80% {
    transform: rotate(10deg);
  }
}

.notice-dropdown {
  width: 360px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
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
  align-items: center;
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

.notice-item-icon.memo_reminder {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
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

@media (max-width: 768px) {
  .navbar-top {
    padding: 0 10px;
    gap: 10px;
  }

  .mobile-nav-trigger {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    font-size: 13px;
  }

  .brand-title {
    font-size: 13px;
  }

  .right-menu {
    gap: 8px;
  }

  .user-name {
    display: none;
  }

  .notice-dropdown {
    width: min(92vw, 360px);
  }
}
</style>
