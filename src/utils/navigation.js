/**
 * 导航与展示文案辅助工具。
 * 目标：
 * 1. 统一读取当前登录账号信息；
 * 2. 为“留言管理”这类按角色变化的页面提供动态标题；
 * 3. 给面包屑、标签页、侧栏等位置共用，避免各处写重复判断。
 */
export function readCurrentUser() {
  if (typeof window === 'undefined') return { id: null, username: '', role: 'user' }

  try {
    const raw = window.localStorage.getItem('user')
    if (!raw) return { id: null, username: '', role: 'user' }
    const parsed = JSON.parse(raw)
    return {
      id: parsed?.id ?? null,
      username: parsed?.username || '',
      role: parsed?.role || 'user'
    }
  } catch {
    return { id: null, username: '', role: 'user' }
  }
}

/**
 * 获取“留言管理”页面在当前角色下应该显示的标题。
 * @param {string} role - 当前登录账号角色
 */
export function getMessagePageTitle(role) {
  return role === 'admin' ? '官方留言板' : '我的指派'
}

/**
 * 根据路由和当前账号角色，生成可展示标题。
 * @param {object} route - vue-router 路由对象
 */
export function resolveRouteDisplayTitle(route) {
  const path = route?.path || ''
  const role = readCurrentUser().role

  if (path === '/message') return getMessagePageTitle(role)
  if (path === '/memo-management') return '备忘录'

  const matchedTitle = [...(route?.matched || [])]
    .reverse()
    .find(record => record?.meta?.title)?.meta?.title

  return String(route?.meta?.title || matchedTitle || route?.name || route?.path || '未命名页面')
}

/**
 * 格式化日期时间，统一页面展示风格。
 * @param {string|Date|number} value - 时间值
 */
export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
