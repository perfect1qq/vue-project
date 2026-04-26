/**
 * @file utils/authRuntime.js
 * @description 认证过期运行时处理器
 *
 * 功能说明：
 * - 提供认证过期事件的发布/订阅机制
 * - 当 HTTP 请求返回 401 时，由 request.js 触发此事件
 * - 由 authSession.js 注册处理函数（跳转登录页等）
 *
 * 设计模式：
 * - 观察者模式（发布-订阅）
 * - 解耦 request.js 和路由导航逻辑
 *
 * 数据流：
 * ┌──────────────┐    401 错误     ┌──────────────────┐
 * │  request.js   │ ────────────▶  │ triggerAuthExpired│
 * │ (拦截器)      │                │ (发布事件)        │
 * └──────────────┘                └────────┬─────────┘
 *                                           │ 调用 handler
 *                                           ▼
 *                                  ┌──────────────────┐
 *                                  │ authExpiredHandler│
 *                                  │ (清除状态+跳转)   │
 *                                  └──────────────────┘
 */

/** 认证过期回调函数引用 */
let authExpiredHandler = null

/**
 * 注册认证过期处理函数
 *
 * 通常在应用初始化时由 authSession.js 调用一次
 *
 * @param {Function|null} handler - 处理函数，接收 reasonCode 参数
 *   @param {string} [handler.reasonCode] - 401 错误的业务错误码
 */
export const setAuthExpiredHandler = (handler) => {
  authExpiredHandler = typeof handler === 'function' ? handler : null
}

/**
 * 触发认证过期事件
 *
 * 当检测到 401 响应时由 request.js 调用，
 * 执行已注册的处理函数（如跳转登录页）
 *
 * @param {string} [reasonCode] - 导致过期的原因码（如 'TOKEN_EXPIRED'）
 */
export const triggerAuthExpired = (reasonCode) => {
  authExpiredHandler?.(reasonCode)
}
