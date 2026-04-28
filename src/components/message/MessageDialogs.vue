<template>
  <AsyncDialog
    v-model="viewVisibleProxy"
    :title="viewTitle"
    :width="560"
    class="message-view-dialog"
  >
    <div v-if="viewRow" class="message-view-body">
      <div class="view-field">
        <span class="view-label">提交时间</span>
        <span class="view-value">{{ formatTime(viewRow.createdAt) }}</span>
      </div>
      <div class="view-field">
        <span class="view-label">联系方式</span>
        <div class="view-value view-text-block">{{ viewRow.contactInfo || '—' }}</div>
      </div>
      <div class="view-field">
        <span class="view-label">留言内容</span>
        <div class="view-value view-text-block view-content">{{ viewRow.content || '—' }}</div>
      </div>
      <div v-if="viewRow.remark" class="view-field">
        <span class="view-label">跟进备注</span>
        <div class="view-value view-text-block">{{ viewRow.remark }}</div>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="viewVisibleProxy = false">关闭</el-button>
    </template>
  </AsyncDialog>

  <AsyncDialog
    ref="assignDialogRef"
    v-model="assignVisibleProxy"
    title="指派客户"
    :width="420"
  >
    <el-form :model="assignForm" label-width="90px">
      <el-form-item label="指派对象" required>
        <el-select v-model="assignForm.userId" placeholder="请选择业务员" filterable style="width: 100%">
          <el-option v-for="u in staffList" :key="u.id" :label="(u.name || '').trim() || u.username" :value="u.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer="{ loading }">
      <el-button @click="assignVisibleProxy = false">取消</el-button>
      <el-button type="primary" :loading="loading || assignLoading" @click="$emit('confirm-assign')">确认指派</el-button>
    </template>
  </AsyncDialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import AsyncDialog from '@/components/common/AsyncDialog.vue'

const props = defineProps({
  viewVisible: Boolean,
  viewTitle: String,
  viewRow: Object,
  assignVisible: Boolean,
  assignForm: Object,
  staffList: Array,
  assignLoading: Boolean,
  formatTime: Function
})
const emit = defineEmits(['update:viewVisible', 'update:assignVisible', 'confirm-assign'])

const assignDialogRef = ref(null)

const viewVisibleProxy = computed({
  get: () => props.viewVisible,
  set: (value) => emit('update:viewVisible', value)
})
const assignVisibleProxy = computed({
  get: () => props.assignVisible,
  set: (value) => emit('update:assignVisible', value)
})
</script>

<style scoped>
.message-view-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.view-field {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 8px;
  align-items: start;
}

.view-label {
  color: #64748b;
  font-size: 13px;
  line-height: 22px;
}

.view-value {
  color: #0f172a;
  font-size: 14px;
  line-height: 22px;
}

.view-text-block {
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.view-content {
  min-height: 86px;
}
</style>
