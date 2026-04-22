/**
 * @module router/guards/authGuard
 * @description 全局路由鉴权守卫（v3 - 基于 JWT Token）
 *
 * 统一处理页面访问权限：
 * - 公开页面（登录/注册）无需认证
 * - 已登录用户访问登录页时重定向到首页
 * - 管理员专属页面做角色校验（基于 JWT Token）
 * - 未登录用户重定向到登录页
 *
 * 核心改进（v3）：
 * - 直接从 JWT Token 解析角色（最可靠的数据源）
 * - 解决 localStorage/Pinia Store 缓存延迟问题
 * - 无需等待异步 API 调用
 */

import { readCurrentUser } from '@/utils/navigation'

/**
 * 解析 JWT Token 并提取用户角色
 *
 * 工作原理：
 * 1. 从 localStorage 读取 JWT Token
 * 2. Base64 解码 Token 的 Payload 部分
 * 3. 提取 role 字段并返回
 *
 * 为什么使用 JWT Token？
 * - ✅ 登录时签发，包含最新的角色信息
 * - ✅ 同步操作，无需等待 API 响应
 * - ✅ 不受 localStorage 缓存影响
 * - ✅ 在路由守卫执行时立即可用
 *
 * JWT Token 格式：header.payload.signature
 * Payload 是 Base64 编码的 JSON，包含 { userId, username, role, ... }
 *
 * @returns {string|null} 用户角色 ('admin'|'user'|'guest') 或 null
 */
const getRoleFromToken = () => {
  try {
    const token = localStorage.getItem('token')

    /** 没有 token 说明未登录 */
    if (!token) return null

    /**
     * JWT Token 结构：xxxxx.yyyyy.zzzzz
     * - 第一部分：Header（算法信息）
     * - 第二部分：Payload（用户数据）← 我们需要这个
     * - 第三部分：Signature（签名验证）
     */
    const parts = token.split('.')

    /** JWT 必须有 3 个部分 */
    if (parts.length !== 3) return null

    /**
     * 解码 Payload（第二部分）
     *
     * 注意：
     * - JWT 使用 Base64Url 编码（不是标准 Base64）
     * - 需要将 '-' 替换为 '+'，'_' 替换为 '/'
     * - 然后使用 atob() 解码
     */
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    /** 解析 JSON 并返回角色 */
    const payload = JSON.parse(jsonPayload)
    return payload?.role || null
  } catch (error) {
    /**
     * 解析失败处理
     *
     * 可能原因：
     * - Token 格式不正确
     * - Token 已被篡改
     * - 浏览器不支持 atob()
     *
     * 回退方案：尝试从 localStorage 读取
     */
    try {
      const user = readCurrentUser()
      return user?.role || null
    } catch {
      return null
    }
  }
}

/**
 * 应用全局鉴权守卫
 * @param {Object} to - 目标路由对象
 * @returns {string|boolean} 重定向路径或允许访问（true）
 */
export const applyAuthGuard = (to) => {
  const token = localStorage.getItem('token')

  /** 公开页面处理 */
  if (to.meta.public) {
    if (token && (to.path === '/login' || to.path === '/register')) {
      return '/'
    }
    return true
  }

  /** 未登录拦截 */
  if (!token) {
    return '/login'
  }

  /**
   * 管理员权限校验（基于 JWT Token）
   *
   * v3 改进：直接从 JWT Token 解析角色
   *
   * 优势对比：
   * ┌─────────────────┬──────────────┬──────────────┐
   * │ 数据源          │ 可靠性       │ 实时性       │
   * ├─────────────────┼──────────────┼──────────────┤
   * │ localStorage    │ ❌ 可能过期   │ ❌ 需要手动更新│
   * │ Pinia Store     │ ⚠️ 需要初始化 │ ⚠️ 异步加载   │
   * │ API /profile    │ ✅ 最准确    │ ❌ 异步调用   │
   * │ **JWT Token**   │ ✅ 登录时签发 │ ✅ **立即可用**│
   * └─────────────────┴──────────────┴──────────────┘
   */
  if (to.meta.adminOnly) {
    const userRole = getRoleFromToken()

    if (userRole !== 'admin') {
      /**
       * 拒绝访问管理员页面
       *
       * 拒绝的场景：
       * 1. 用户确实不是管理员 → 正确拦截 ✅
       * 2. Token 过期或无效 → 会触发重新登录 ♻️
       * 3. 角色已变更但未重新登录 → 需要重新登录获取新 Token ♻️
       *
       * 注意：
       * - 如果用户刚被提升为管理员，需要重新登录
       * - 这样会签发包含新角色的 JWT Token
       * - 之后就能正常访问管理员页面了
       */
      return '/'
    }
  }

  return true
}
