/**
 * @module composables/usePermissions
 * @description 权限控制组合式函数
 * 
 * 提供统一的权限判断逻辑，基于当前用户角色返回计算属性。
 * 所有需要根据角色控制 UI 显示/隐藏的地方都应使用此 composable。
 * 
 * 角色体系：
 * - admin:  管理员（拥有所有权限）
 * - user:   业务员（可编辑、删除、创建、导出）
 * - guest:  游客（只读，只能查看数据）
 * 
 * @example
 * // 在组件中使用
 * const { isGuest, canEdit, isAdmin } = usePermissions()
 * 
 * <el-button v-if="canEdit">编辑</el-button>
 * <span v-if="isGuest">只读模式</span>
 */

import { computed } from 'vue'
import { readCurrentUser } from '@/utils/navigation'

/**
 * 权限控制 composable
 * 
 * 返回一组计算属性，用于在模板中根据用户角色控制 UI 显示
 * 
 * @returns {Object} 权限状态对象
 * @returns {import('vue').ComputedRef<Object>} returns.currentUser - 当前登录用户信息
 * @returns {import('vue').ComputedRef<boolean>} returns.isAdmin - 是否为管理员
 * @returns {import('vue').ComputedRef<boolean>} returns.isGuest - 是否为游客（只读用户）
 * @returns {import('vue').ComputedRef<boolean>} returns.canEdit - 是否可编辑（非 guest 即可）
 * @returns {import('vue').ComputedRef<boolean>} returns.canDelete - 是否可删除（非 guest 且非 admin）
 * @returns {import('vue').ComputedRef<boolean>} returns.canCreate - 是否可创建新数据（非 guest 即可）
 * @returns {import('vue').ComputedRef<boolean>} returns.canExport - 是否可导出数据（非 guest 即可）
 */
export const usePermissions = () => {
  /** 当前登录用户信息（响应式） */
  const currentUser = computed(() => readCurrentUser())

  /** 管理员标识：拥有最高权限 */
  const isAdmin = computed(() => currentUser.value.role === 'admin')

  /** 游客标识：只读用户，无法进行任何修改操作 */
  const isGuest = computed(() => currentUser.value.role === 'guest')

  /** 编辑权限：游客无法编辑任何内容 */
  const canEdit = computed(() => !isGuest.value)

  /** 删除权限：游客不可删除，其他角色均可删除 */
  const canDelete = computed(() => !isGuest.value)

  /** 创建权限：游客无法创建新数据 */
  const canCreate = computed(() => !isGuest.value)

  /** 导出权限：游客无法导出数据 */
  const canExport = computed(() => !isGuest.value)

  return {
    currentUser,
    isAdmin,
    isGuest,
    canEdit,
    canDelete,
    canCreate,
    canExport
  }
}
