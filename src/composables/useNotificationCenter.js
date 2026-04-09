import { onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import request from '@/utils/request'

const NOTICE_LIMIT = 10
const POLL_INTERVAL = 30_000

const readUserProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

const formatNoticeTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

/**
 * 顶栏通知中心：负责读取当前登录人、轮询通知、通知已读和批量已读。
 * 业务逻辑被收敛后，Navbar 只保留展示和修改密码弹窗，体积会小很多。
 */
export function useNotificationCenter(router) {
  const userName = ref('管理员')
  const userRole = ref('user')
  const unreadApprovalCount = ref(0)
  const noticeList = ref([])
  const isBellRinging = ref(false)
  const isInitialLoad = ref(true)
  const actionLoading = ref(false)

  let timerId = null

  const triggerBellRing = () => {
    if (isBellRinging.value) return
    isBellRinging.value = true
    window.setTimeout(() => {
      isBellRinging.value = false
    }, 1000)
  }

  const loadUserProfile = () => {
    const profile = readUserProfile()
    userName.value = profile.username || '管理员'
    userRole.value = profile.role || 'user'
  }

  const loadNoticeList = async () => {
    const res = await request.get('/api/notifications')
    const list = Array.isArray(res.data?.list) ? res.data.list : []
    noticeList.value = list.slice(0, NOTICE_LIMIT)
  }

  const fetchUnreadCount = async () => {
    try {
      const res = await request.get('/api/notifications/unread-count')
      const nextCount = Number(res.data?.count || 0)
      const prevCount = unreadApprovalCount.value

      if (nextCount > prevCount) {
        triggerBellRing()
        await loadNoticeList()

        const latest = noticeList.value[0]
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
      } else {
        await loadNoticeList()
      }

      unreadApprovalCount.value = nextCount
      isInitialLoad.value = false
    } catch {
      // 网络波动时不打断页面，其余逻辑继续运行。
    }
  }

  const handleNoticeClick = async (notice) => {
    if (!notice?.id) return

    try {
      unreadApprovalCount.value = Math.max(0, unreadApprovalCount.value - 1)
      noticeList.value = noticeList.value.map((item) => (
        item.id === notice.id ? { ...item, isRead: true } : item
      ))
      await request.put(`/api/notifications/${notice.id}/read`)
      await fetchUnreadCount()

      const targetPath = notice.type === 'quotation_submitted'
        ? `/approval/${notice.relatedId}?mode=edit`
        : '/quotation'

      router.push(targetPath)
    } catch (error) {
      await fetchUnreadCount()
      console.error('处理通知失败', error)
    }
  }

  const markAllAsRead = async (event) => {
    event?.stopPropagation?.()
    if (actionLoading.value) return

    const previousCount = unreadApprovalCount.value
    const previousList = [...noticeList.value]
    unreadApprovalCount.value = 0
    noticeList.value = noticeList.value.map((item) => ({ ...item, isRead: true }))
    try {
      actionLoading.value = true
      await request.post('/api/notifications/read-all')
      await fetchUnreadCount()
      ElMessage.success('已全部标记为已读')
    } catch {
      unreadApprovalCount.value = previousCount
      noticeList.value = previousList
      ElMessage.error('操作失败')
    } finally {
      actionLoading.value = false
    }
  }

  const goNoticePage = () => {
    router.push(userRole.value === 'admin' ? '/approval' : '/quotation')
  }

  const startPolling = () => {
    if (timerId) return
    timerId = window.setInterval(fetchUnreadCount, POLL_INTERVAL)
  }

  const stopPolling = () => {
    if (!timerId) return
    window.clearInterval(timerId)
    timerId = null
  }

  onMounted(async () => {
    loadUserProfile()
    await fetchUnreadCount()
    startPolling()
  })

  onUnmounted(stopPolling)

  return {
    userName,
    unreadApprovalCount,
    noticeList,
    isBellRinging,
    actionLoading,
    handleNoticeClick,
    markAllAsRead,
    goNoticePage,
    formatNoticeTime
  }
}
