/**
 * @file router/guards/authGuard.js
 * @description 路由导航守卫（认证与权限控制）
 *
 * 功能说明：
 * - 在每次路由跳转前执行权限检查
 * - 管理公开页面和受保护页面的访问控制
 * - 处理未登录用户的重定向逻辑
 * - 检查用户是否拥有访问特定路由所需的权限
 *
 * 执行流程：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  beforeEach 守卫执行流程                                    │
 * ├─────────────────────────────────────────────────────────────┤
 * │                                                             │
 * │  1️⃣  目标路由是公开页面？                                   │
 * │     ├── 是 → 检查特殊规则（注册页面开关）                   │
 * │     │       ├── 已登录 + 访问登录/注册 → 重定向到首页      │
 * │     │       └── 否则 → 允许访问                            │
 * │     └── 否 → 继续步骤 2                                     │
 * │                                                             │
 * │  2️⃣  尝试恢复用户会话                                       │
 * │     ├── 成功 → 获取到 currentUser                          │
 * │     └── 失败 → currentUser = null                          │
 * │                                                             │
 * │  3️⃣  用户已登录？                                           │
 * │     ├── 是 → 继续步骤 4                                     │
 * │     └── 否 → 重定向到 /login                               │
 * │                                                             │
 * │  4️⃣  需要特定权限？                                         │
 * │     ├── 不需要 → 允许访问                                  │
 * │     ├── 有权限 → 允许访问                                  │
 * │     └── 无权限 → 重定向到备用页面或首页                    │
 * │                                                             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 权限回退映射：
 * 当用户缺少所需权限时，根据权限类型重定向到不同的备用页面：
 * - quotation:write → /quotation/history (只读历史记录)
 * - beam:write → /beam-quotation/history (只读历史记录)
 * - 其他权限 → / (首页)
 *
 * 特殊处理：
 * - 注册页面：检查 isPublicRegisterEnabled 配置，关闭时禁止访问
 * - 公开页面失败：即使 restoreSession 失败也允许访问（容错）
 * - 已登录用户：访问 login/register 时自动跳转首页
 */

import { useUserStore } from '@/stores/user'
import { pinia } from '@/stores'
import { isPublicRegisterEnabled } from '@/utils/runtimeConfig'

const PERMISSION_FALLBACKS = {
  'quotation:write': '/quotation/history',
  'beam:write': '/beam-quotation/history'
}

export const applyAuthGuard = async (to) => {
  const userStore = useUserStore(pinia)

  if (to.meta.public) {
    if (to.path === '/register' && !isPublicRegisterEnabled) {
      return '/login'
    }

    try {
      await userStore.restoreSession()
    } catch {
      // keep public routes accessible when profile probing fails
    }

    if (userStore.isLoggedIn && (to.path === '/login' || to.path === '/register')) {
      return '/'
    }
    return true
  }

  let currentUser = null
  try {
    currentUser = await userStore.restoreSession()
  } catch {
    currentUser = null
  }

  if (!currentUser) {
    return '/login'
  }

  const requiredPermission = to.meta?.requiresPermission
  if (requiredPermission && !userStore.hasPermission(requiredPermission)) {
    return PERMISSION_FALLBACKS[requiredPermission] || '/'
  }

  return true
}
