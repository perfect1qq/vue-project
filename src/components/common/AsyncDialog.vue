<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :destroy-on-close="true"
    :append-to-body="appendToBody"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    v-bind="$attrs"
    @open="handleOpen"
  >
    <div v-loading="loading" class="async-dialog-content">
      <slot v-if="!loading || showContentWhenLoading" />
      <div v-if="loading && !showContentWhenLoading" class="async-dialog-loading">
        <slot name="loading">
          <p>加载中...</p>
        </slot>
      </div>
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" :loading="loading" />
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '对话框'
  },
  width: {
    type: [String, Number],
    default: '500px'
  },
  appendToBody: {
    type: Boolean,
    default: false
  },
  showContentWhenLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'open', 'loaded', 'error'])

const visible = ref(false)
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleOpen = () => {
  emit('open')
}

defineExpose({
  loading,
  startLoading: () => { loading.value = true },
  stopLoading: () => { loading.value = false },
  async load(asyncFn) {
    loading.value = true
    try {
      const result = await asyncFn()
      emit('loaded', result)
      return result
    } catch (error) {
      emit('error', error)
      throw error
    } finally {
      loading.value = false
    }
  }
})
</script>

<style scoped>
.async-dialog-content {
  min-height: 100px;
  position: relative;
}

.async-dialog-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: #909399;
}
</style>
