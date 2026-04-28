<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :append-to-body="appendToBody"
    :close-on-click-modal="!loading"
    :show-close="!loading"
    v-bind="$attrs"
    @open="handleOpen"
  >
    <div class="confirm-dialog-body">
      <div class="confirm-icon" :class="[`icon-${type}`]">
        <slot name="icon">
          <el-icon v-if="type === 'warning'" :size="48" color="#E6A23C"><WarningFilled /></el-icon>
          <el-icon v-else-if="type === 'danger'" :size="48" color="#F56C6C"><CircleCloseFilled /></el-icon>
          <el-icon v-else-if="type === 'success'" :size="48" color="#67C23A"><CircleCheckFilled /></el-icon>
          <el-icon v-else :size="48" color="#409EFF"><InfoFilled /></el-icon>
        </slot>
      </div>

      <div class="confirm-content">
        <h4 v-if="title || $slots.title" class="confirm-title">
          <slot name="title">{{ title }}</slot>
        </h4>
        
        <p class="confirm-message">
          <slot>{{ message }}</slot>
        </p>

        <p v-if="subMessage" class="confirm-sub-message">{{ subMessage }}</p>
        
        <div v-if="detail" class="confirm-detail">
          <slot name="detail">
            <el-alert :title="detail" type="warning" :closable="false" show-icon />
          </slot>
        </div>
      </div>
    </div>

    <template #footer>
      <slot name="footer" :loading="loading" :confirm="handleConfirm" :cancel="handleCancel">
        <div class="dialog-footer">
          <el-button :disabled="loading" @click="handleCancel">
            {{ cancelText }}
          </el-button>
          <el-button
            :type="confirmButtonType"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </el-button>
        </div>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { WarningFilled, CircleCloseFilled, CircleCheckFilled, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  subMessage: {
    type: String,
    default: ''
  },
  detail: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'warning',
    validator: (val) => ['info', 'success', 'warning', 'danger'].includes(val)
  },
  width: {
    type: [String, Number],
    default: '420px'
  },
  appendToBody: {
    type: Boolean,
    default: true
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  confirmButtonType: {
    type: String,
    default: 'primary'
  },
  beforeConfirm: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'open', 'confirm', 'cancel', 'closed'])

const visible = ref(false)
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    emit('closed')
  }
})

const handleOpen = () => {
  emit('open')
}

const handleConfirm = async () => {
  if (props.beforeConfirm) {
    const shouldContinue = await props.beforeConfirm()
    if (!shouldContinue) return
  }

  loading.value = true
  
  try {
    await emit('confirm')
    visible.value = false
  } catch (error) {
    console.error('ConfirmDialog confirm error:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  if (!loading.value) {
    visible.value = false
    emit('cancel')
  }
}

defineExpose({
  loading,
  open: () => { visible.value = true },
  close: () => { visible.value = false }
})
</script>

<style scoped>
.confirm-dialog-body {
  display: flex;
  gap: 16px;
  padding: 10px 0;
}

.confirm-icon {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 4px;
}

.icon-warning { color: #E6A23C; }
.icon-danger { color: #F56C6C; }
.icon-success { color: #67C23A; }
.icon-info { color: #409EFF; }

.confirm-content {
  flex: 1;
  min-width: 0;
}

.confirm-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.confirm-message {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  word-break: break-word;
}

.confirm-sub-message {
  margin: 0;
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.confirm-detail {
  margin-top: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
