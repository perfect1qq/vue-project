<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import userApi from '@/api/user'

/**
 * 应用根组件
 *
 * 功能：
 * - 渲染当前路由对应的页面
 * - 应用启动时自动同步用户信息到 localStorage
 *
 * 解决的问题：
 * - 用户被提升为管理员后，localStorage 缓存旧角色
 * - 导致访问管理员页面时被错误拦截
 * - 通过启动时调用 /api/profile 获取最新信息并更新缓存
 */
onMounted(async () => {
  await syncUserInfo()
})

/**
 * 同步用户信息到 localStorage
 *
 * 执行时机：应用挂载后立即执行
 *
 * 工作流程：
 * 1. 检查是否有有效的 token
 * 2. 如果有，调用 /api/profile 获取最新用户信息
 * 3. 将最新信息保存到 localStorage 和 Pinia store
 * 4. 确保后续的路由守卫能获取到正确的角色
 */
const syncUserInfo = async () => {
  const token = localStorage.getItem('token')

  /** 没有 token 说明未登录，无需同步 */
  if (!token) return

  try {
    /**
     * 调用后端 API 获取最新的用户信息
     *
     * 返回数据格式：
     * {
     *   user: {
     *     id: number,
     *     username: string,
     *     name: string,
     *     role: 'admin' | 'user' | 'guest'
     *   }
     * }
     */
    const res = await userApi.getCurrentUser()

    if (res?.data?.user) {
      const latestUser = res.data.user

      /** 更新 localStorage（用于 authGuard 等非组件代码） */
      localStorage.setItem('user', JSON.stringify({
        username: latestUser.username,
        role: latestUser.role,
        name: latestUser.name
      }))

      /** 更新 Pinia store（用于组件内部使用） */
      try {
        const userStore = useUserStore()
        if (userStore) {
          userStore.user = latestUser
        }
      } catch (error) {
        // Pinia store 不可用时忽略
      }
    }
  } catch (error) {
    /**
     * API 调用失败处理
     *
     * 可能原因：
     * - Token 过期或无效
     * - 网络问题
     * - 后端服务异常
     *
     * 处理策略：
     * - 不显示错误提示（避免干扰用户体验）
     * - 保持现有的 localStorage 数据不变
     * - 如果 token 真的过期了，后续请求会自然触发登录跳转
     */
  }
}
</script>
