/**
 * @module composables/useNavbarNotifications
 * @description 顶栏通知中心组合式函数
 *
 * 功能说明：
 * - 管理顶栏铃铛图标的通知状态
 * - 轮询获取未读消息数量
 * - 新消息到达时触发铃铛动画和系统通知
 * - 支持单条消息已读标记和全部已读
 * - 根据消息类型智能跳转到对应页面
 *
 * 通知类型与跳转规则：
 * ┌─────────────────────┬──────────────────────────────────────────┐
 * │  type                │  跳转目标                                 │
 * ├─────────────────────┼──────────────────────────────────────────┤
 * │  quotation_submitted │  /approval/:id?mode=edit (审批页面)      │
 * │  memo_reminder       │  /memo-management?highlight=:id (备忘录)  │
 * │  其他                 │  /quotation (报价单列表)                  │
 * └─────────────────────┴──────────────────────────────────────────┘
 *
 * 数据流：
 * ┌──────────────┐    轮询     ┌──────────────────┐
 * │  后端 API     │ ◀───────── │  fetchUnreadCount  │
 * │              │            │                    │
 * │  /api/        │ ─────────▶ │  unreadApprovalCount│
 * │  notifications│   返回数据  │  noticeList         │
 * └──────────────┘            └────────┬───────────┘
 *                                     │ 新消息时
 *                                     ▼
 *                            ┌──────────────────┐
 *                            │  triggerBellRing   │
 *                            │  ElNotification    │
 *                            └──────────────────┘
 *
 * @example
 * // 在 Navbar 组件中使用
 * const { unreadApprovalCount, isBellRinging, fetchUnreadCount } =
 *   useNavbarNotifications({ request, router, userRole })
 *
 * // 定时轮询（建议间隔 30-60 秒）
 * setInterval(fetchUnreadCount, 30000)
 */

import { ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { to } from '@/utils/async'

/**
 * 创建通知中心管理实例
 *
 * @param {Object} deps - 依赖注入对象
 * @param {Object} deps.request - HTTP 请求实例（axios 或封装后的 request）
 * @param {Object} deps.router - Vue Router 实例
 * @param {import('vue').Ref<string>} deps.userRole - 当前用户角色响应式引用
 * @returns {Object} 通知管理状态和方法集合
 * @returns {import('vue').Ref<number>} returns.unreadApprovalCount - 未读消息数量
 * @returns {import('vue').Ref<Array>} returns.noticeList - 最近 10 条通知列表
 * @returns {import('vue').Ref<boolean>} returns.isBellRinging - 铃铛是否正在晃动
 * @returns {Function} returns.fetchUnreadCount - 拉取未读数量和通知列表
 * @returns {Function} returns.handleNoticeClick - 处理通知点击事件（标记已读+跳转）
 * @returns {Function} returns.markAllAsRead - 标记所有通知为已读
 * @returns {Function} returns.goNoticePage - 跳转到通知对应的功能页面
 */
export const useNavbarNotifications = ({ request, router, userRole }) => {
  /** 未读消息总数 */
  const unreadApprovalCount = ref(0)

  /** 通知列表（最多保留 10 条） */
  const noticeList = ref([])

  /** 铃铛动画状态标识 */
  const isBellRinging = ref(false)

  /** 是否为首次加载（首次不弹窗提示） */
  const isInitialLoad = ref(true)

  /**
   * 触发铃铛晃动动画
   *
   * 动画持续 1 秒，期间重复调用会被忽略
   * 用于新消息到达时的视觉反馈
   */
  const triggerBellRing = () => {
    if (isBellRinging.value) return
    isBellRinging.value = true
    setTimeout(() => { isBellRinging.value = false }, 1000)
  }

  /**
   * 拉取未读消息数量和通知列表
   *
   * 完整流程：
   * 1. 调用 /api/notifications/unread-count 获取未读数
   * 2. 调用 /api/notifications 获取最近 10 条通知
   * 3. 对比新旧未读数，若有新增则：
   *    - 触发铃铛动画
   *    - 弹出系统通知（非首次加载时）
   * 4. 更新本地状态
   *
   * 调用时机：
   * - 页面初始化时
   * - 定时轮询（建议 30-60 秒间隔）
   * - 用户手动刷新时
   */
  const fetchUnreadCount = async () => {
    const [countErr, resCount] = await to(request.get('/api/notifications/unread-count'))
    if (countErr) return

    const newCount = resCount.data?.count ?? 0
    const oldCount = unreadApprovalCount.value

    const [listErr, resList] = await to(request.get('/api/notifications'))
    if (listErr) return
    noticeList.value = (resList.data.list || []).slice(0, 10)

    if (newCount > oldCount) {
      triggerBellRing()
      const latest = noticeList.value?.[0]
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
    }
    unreadApprovalCount.value = newCount
    isInitialLoad.value = false
  }

  /**
   * 处理通知点击事件
   *
   * 流程：
   * 1. 将该通知标记为已读（PUT /api/notifications/:id/read）
   * 2. 刷新未读计数
   * 3. 根据通知类型跳转到对应页面
   *
   * @param {Object} notice - 通知对象
   * @param {number} notice.id - 通知 ID
   * @param {string} notice.type - 通知类型
   * @param {number} notice.relatedId - 关联的业务记录 ID
   */
  const handleNoticeClick = async (notice) => {
    if (!notice?.id) return
    const [err] = await to(request.put(`/api/notifications/${notice.id}/read`))
    if (err) return
    await fetchUnreadCount()
    const targetPath = notice.type === 'quotation_submitted'
      ? `/approval/${notice.relatedId}?mode=edit`
      : notice.type === 'memo_reminder'
        ? `/memo-management?highlight=${notice.relatedId}`
        : '/quotation'
    router.push(targetPath)
  }

  /**
   * 标记所有通知为已读
   *
   * 调用 POST /api/notifications/read-all 接口
   * 成功后自动刷新未读计数
   *
   * @param {Event} [e] - 点击事件（用于阻止冒泡）
   */
  const markAllAsRead = async (e) => {
    if (e) e.stopPropagation()
    const [err] = await to(request.post('/api/notifications/read-all'))
    if (err) {
      ElMessage.error('操作失败')
      return
    }
    await fetchUnreadCount()
    ElMessage.success('已全部标记为已读')
  }

  /**
   * 跳转到通知管理页面
   *
   * 根据用户角色决定跳转目标：
   * - admin → /approval（审批管理页面）
   * - 其他 → /quotation（报价单列表）
   */
  const goNoticePage = () => {
    if (userRole.value === 'admin') router.push('/approval')
    else router.push('/quotation')
  }

  return {
    unreadApprovalCount,
    noticeList,
    isBellRinging,
    fetchUnreadCount,
    handleNoticeClick,
    markAllAsRead,
    goNoticePage
  }
}
