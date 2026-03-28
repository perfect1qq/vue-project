<template>
  <div class="beam-quotation-page">
    <el-card shadow="never" class="editor-card full-width">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="addRow">添加一行</el-button>
        <el-button :icon="DocumentAdd" @click="handleSave" :disabled="isViewMode">提交</el-button>
        <el-button :icon="Delete" @click="deleteSelectedRows" :disabled="isViewMode || !selectedRows.length">批量删除</el-button>
        <el-button :icon="Refresh" @click="clearAll" :disabled="isViewMode">清空所有</el-button>
        <el-divider direction="vertical" />
        <el-button :icon="List" @click="openHistoryDialog">历史记录</el-button>
        <el-button v-if="isHistoryMode" type="info" :icon="HomeFilled" @click="backToHome">返回首页</el-button>
      </div>

      <el-table
        :data="items"
        border
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', fontWeight: 'bold', textAlign: 'center' }"
        :row-class-name="rowClassName"
      >
        <el-table-column type="selection" width="55" align="center" :selectable="() => !isViewMode" />
        <el-table-column prop="name" label="横梁名称" min-width="150" align="center">
          <template #default="{ row }">
            <el-input v-model="row.name" placeholder="请输入横梁名称" size="small" clearable :disabled="isViewMode" />
          </template>
        </el-table-column>
        <el-table-column prop="length" label="长度(mm)" min-width="120" align="center">
          <template #default="{ row }">
            <el-input v-model="row.length" placeholder="请输入长度" size="small" clearable :disabled="isViewMode" />
          </template>
        </el-table-column>
        <el-table-column prop="spec" label="规格(mm)" min-width="150" align="center">
          <template #default="{ row }">
            <el-input v-model="row.spec" placeholder="请输入规格" size="small" clearable :disabled="isViewMode" />
          </template>
        </el-table-column>
        <el-table-column prop="maxLoad" label="最大载重(kg)" min-width="130" align="center">
          <template #default="{ row }">
            <el-input v-model="row.maxLoad" placeholder="如 5000kg" size="small" clearable :disabled="isViewMode" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="deleteRow($index)" :disabled="isViewMode" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="historyDialogVisible" title="历史记录" width="700px">
      <template #header>
        <div class="history-header">
          <span>历史记录</span>
          <el-button type="danger" size="small" @click="clearAllHistory">一键删除</el-button>
        </div>
      </template>

      <div class="history-search">
        <el-input v-model="searchKeyword" placeholder="按名称模糊搜索" clearable :prefix-icon="Search" style="width: 250px" />
      </div>

      <el-table :data="filteredHistoryList" stripe max-height="400px">
        <el-table-column prop="name" label="记录名称" min-width="180" show-overflow-tooltip align="center" />
        <el-table-column prop="createDate" label="创建时间" width="120" align="center" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewHistory(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="editHistory(row)">修改</el-button>
            <el-button link type="danger" size="small" @click="deleteHistory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Refresh, DocumentAdd, List, HomeFilled, Search } from '@element-plus/icons-vue'
import { useEditableTable } from '../composables/useEditableTable'
import { useHistoryManager } from '../composables/useHistoryManager'

const createEmptyItem = () => ({ name: '', length: '', spec: '', maxLoad: '' })
const validateItem = (item) => Boolean(item.name?.trim() && item.length?.trim() && item.spec?.trim() && item.maxLoad?.trim())

const {
  items,
  isViewMode,
  isHistoryMode,
  addRow,
  deleteRow,
  deleteSelectedRows: deleteRows,
  clearAll,
  isDataComplete,
  getSnapshot,
  hasChanges,
  loadDataToEditor,
  resetToEmpty,
  editingHistoryId,
  originalSnapshot
} = useEditableTable({ createEmptyItem, validateItem, enableDelete: true })

const selectedRows = ref([])

const {
  historyDialogVisible,
  searchKeyword,
  filteredHistoryList,
  saveAsNewHistory,
  updateHistory,
  deleteHistory,
  clearAllHistory,
  openHistoryDialog,
  viewHistory,
  editHistory
} = useHistoryManager({
  storageKey: 'beam_quotation_history',
  getCurrentData: getSnapshot,
  loadToEditor: (record, mode) => {
    loadDataToEditor(record.items || [], mode, record.id)
  },
  getRecordName: () => `横梁记录_${new Date().toLocaleString()}`,
  defaultNameProvider: (data) => data?.[0]?.name || null,
  transformData: (data) => ({ items: data })
})

const handleSave = async () => {
  if (!isDataComplete()) {
    ElMessage.warning('请完整填写所有必需字段')
    return
  }

  if (editingHistoryId.value) {
    if (!hasChanges(originalSnapshot.value)) {
      ElMessage.warning('您未修改任何数据，无需保存')
      return
    }
    if (await updateHistory(editingHistoryId.value, getSnapshot())) {
      originalSnapshot.value = getSnapshot()
    }
    return
  }

  try {
    await saveAsNewHistory()
    resetToEmpty()
  } catch {
    // 取消保存时不处理
  }
}

const backToHome = () => {
  resetToEmpty()
}

const deleteSelectedRows = () => deleteRows(selectedRows.value)
const handleSelectionChange = (selection) => { selectedRows.value = selection }
const rowClassName = () => (isViewMode.value ? 'view-mode-row' : '')

resetToEmpty()
</script>

<style scoped>
.beam-quotation-page { height: 100%; padding: 0; }
.full-width { width: 100%; height: 100%; display: flex; flex-direction: column; }
.toolbar { margin-bottom: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.history-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.history-search { margin-bottom: 16px; text-align: right; }
:deep(.view-mode-row) { background-color: #fafafa !important; }
:deep(.el-table__header th) { text-align: center !important; }
:deep(.el-table__body td) { text-align: center !important; }
</style>
