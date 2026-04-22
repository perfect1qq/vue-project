<template>
  <el-table-column :label="label" :fixed="fixed" :width="calcWidth" align="center">
    <template #default="{ row }">
      <div class="action-btns">
        <el-button
          v-for="(action, index) in filteredActions"
          :key="index"
          :type="action.type || 'primary'"
          :size="size"
          :plain="action.plain !== false"
          :round="!action.plain"
          :loading="action.loading?.(row)"
          :disabled="action.disabled?.(row)"
          :icon="action.icon"
          @click="handleClick(action, row)"
        >
          {{ action.label }}
        </el-button>
      </div>
    </template>
  </el-table-column>
</template>

<script setup>
import { computed, ElMessageBox } from 'element-plus'

const props = defineProps({
  /** 操作按钮配置数组 */
  actions: {
    type: Array,
    required: true,
    default: () => []
  },
  /** 列标题，默认 '操作' */
  label: {
    type: String,
    default: '操作'
  },
  /** 列固定方式：'left' | 'right' | false */
  fixed: {
    type: [String, Boolean],
    default: 'right'
  },
  /** 按钮大小 */
  size: {
    type: String,
    default: 'small'
  },
  /** 是否自动计算列宽（根据按钮数量） */
  autoWidth: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['action'])

/**
 * 过滤掉隐藏的操作按钮
 */
const filteredActions = computed(() => {
  return props.actions.filter(action => {
    if (typeof action.visible === 'function') {
      return action.visible()
    }
    return action.visible !== false
  })
})

/**
 * 根据按钮数量计算合适的列宽
 */
const calcWidth = computed(() => {
  if (!props.autoWidth) return undefined

  const btnCount = filteredActions.value.length
  if (btnCount === 0) return undefined

  // 每个按钮基础宽度 + 间距
  const btnBaseWidth = 80
  const gap = 6
  const padding = 20

  const totalWidth = (btnCount * btnBaseWidth) + ((btnCount - 1) * gap) + padding

  // 返回合理的最小宽度
  return Math.max(totalWidth, 120)
})

/**
 * 处理按钮点击事件
 * @param {Object} action - 操作配置对象
 * @param {Object} row - 当前行数据
 */
const handleClick = async (action, row) => {
  // 如果需要确认弹窗
  if (action.confirm) {
    try {
      await ElMessageBox.confirm(
        action.confirmText || `确定要${action.label}吗？`,
        action.confirmTitle || '确认',
        {
          type: 'warning',
          confirmButtonText: action.confirmButtonText || '确定',
          cancelButtonText: action.cancelButtonText || '取消',
          ...action.confirmOptions
        }
      )
    } catch {
      // 用户取消操作
      if (action.onCancel) action.onCancel(row)
      return
    }
  }

  // 触发回调或 emit
  if (action.handler) {
    await action.handler(row)
  }

  emit('action', { action: action.key || action.label, row })
}
</script>

<style scoped>
.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.action-btns .el-button {
  padding: 5px 12px;
  border-radius: 16px;
  font-size: 13px;
  transition: all 0.2s ease;
}
</style>
