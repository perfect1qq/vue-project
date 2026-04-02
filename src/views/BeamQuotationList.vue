<template>
  <div class="beam-quotation-page">
    <!-- 横梁页面的主体面板外壳 -->
    <el-card shadow="never" class="editor-card full-width">
      
      <!-- 顶部主操作栏：执行数据的增删清空及上传落盘 -->
      <div class="toolbar">
        <!-- 业务操作按钮 -->
        <el-button type="primary" plain :icon="Plus" @click="addRow">添加一行</el-button>
        <el-button type="success" :icon="DocumentAdd" @click="handleSave" :loading="isSubmitting" :disabled="isViewMode">提交</el-button>
        <el-button type="danger" plain :icon="Delete" @click="deleteSelectedRows" :disabled="isViewMode || !selectedRows.length">批量删除</el-button>
        <el-button :icon="Refresh" @click="clearAllAndReset" :disabled="isViewMode">清空所有</el-button>
        
        <el-divider direction="vertical" />
        
        <!-- [关键约束] 记录名称输入框：作为数据库中定位此报价的历史记录主键 -->
        <div class="name-input-group">
          <span class="label">横梁名称:</span>
          <el-input 
            v-model="recordName" 
            placeholder="必填，作为唯一标识且不可重复" 
            style="width: 280px" 
            :disabled="isViewMode"
            @blur="checkNameExistence"
          >
            <!-- 冲突时尾部报警图标 -->
            <template #suffix v-if="isNameConflict">
              <el-icon class="icon-warning" title="名称已存在，点击保存将覆盖项目"><WarningFilled /></el-icon>
            </template>
          </el-input>
          <!-- 冲突提示文字：当检测到后端已存在此名称时将显式预警 -->
          <span v-if="isNameConflict" class="warning-text">此名称已存在，点击保存将直接覆盖原记录</span>
        </div>
        
        <el-divider direction="vertical" />
        
        <!-- 右侧：通用功能入口 -->
        <el-button :icon="List" @click="openHistoryDialog">历史记录汇总</el-button>
        <el-button v-if="isHistoryMode" type="info" :icon="HomeFilled" @click="backToHome">返回首页</el-button>
      </div>

      <!-- ================= 横梁数据可编辑表格 ================= -->
      <!-- 带有内置序号与选中态记录的动态网格 -->
      <el-table
        :data="items"
        border
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
        :header-cell-style="{ background: '#f8f8f9', color: '#515a6e', fontWeight: 'bold', textAlign: 'center' }"
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

    <!-- ================= 历史记录全屏接管对话框 ================= -->
    <el-dialog v-model="historyDialogVisible" title="共享历史记录 (所有用户)" width="850px">
      <template #header>
        <div class="history-header">
          <span>共享历史记录 (所有用户)</span>
        </div>
      </template>

      <!-- 搜索过滤容器 -->
      <div class="history-search">
        <el-input v-model="searchKeyword" placeholder="按横梁名称模糊搜索" clearable :prefix-icon="Search" style="width: 250px" />
      </div>

      <!-- 云端记录读取表格 -->
      <el-table :data="filteredHistoryList" stripe max-height="400px">
        <el-table-column prop="name" label="横梁名称" min-width="180" show-overflow-tooltip align="center" />
        <el-table-column prop="ownerName" label="添加人" width="100" align="center" />
        <el-table-column prop="createDate" label="创建时间" width="120" align="center" />
        
        <!-- 数据列控制器：管理员具有删除全局项目的最高授权 -->
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewHistory(row)">查看</el-button>
            <el-button link type="primary" size="small" @click="editHistory(row)">修改</el-button>
            <el-button v-if="userRole === 'admin'" link type="danger" size="small" @click="deleteHistory(row)">删除</el-button>
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
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh, DocumentAdd, List, HomeFilled, Search, WarningFilled } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'
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

const recordName = ref('') // 当前正在编辑的记录名称
const isNameConflict = ref(false) // 是否与后端已有名称冲突
const selectedRows = ref([]) // 勾选的行
const userRole = ref('user') // 当前登录用户的角色
const isSubmitting = ref(false) // 防止多点重复提交

// --- [业务逻辑] 历史记录管理 ---
const {
  historyDialogVisible,
  searchKeyword,
  filteredHistoryList,
  saveAsNewHistory: originalSave,
  updateHistory,
  deleteHistory,
  clearAllHistory,
  openHistoryDialog,
  viewHistory,
  editHistory
} = useHistoryManager({
  storageKey: null, // 横梁记录使用后端存储，不再使用本地缓存
  api: beamApi,
  getCurrentData: getSnapshot,
  // 当从历史记录中点击“查看”或“修改”时触发的回调
  loadToEditor: (record, mode) => {
    recordName.value = record.name
    let itemsParsed = record.items || []
    // [注意] 后端 SQLite 存的是 JSON 字符串，读取时需反序列化
    if (typeof itemsParsed === 'string') {
      try {
        itemsParsed = JSON.parse(itemsParsed)
      } catch (e) {
        itemsParsed = []
      }
    }
    loadDataToEditor(itemsParsed, mode, record.id)
    isNameConflict.value = false
  },
  getRecordName: () => recordName.value,
  defaultNameProvider: () => recordName.value,
  transformData: (data) => ({ items: data })
})

// 实时检查名称是否冲突
const checkNameExistence = async () => {
  const name = recordName.value.trim()
  if (!name || isViewMode.value) return
  const { exists } = await beamApi.checkName(name)
  isNameConflict.value = exists
}

// 保存逻辑：处理“新增”与“同名覆盖”情况
const handleSave = async () => {
  if (isSubmitting.value) return
  
  const name = recordName.value.trim()
  if (!name) return ElMessage.warning('请输入记录名称作为唯一标识')
  if (!isDataComplete()) return ElMessage.warning('请完整填写所有必需字段')

  isSubmitting.value = true
  try {
    // 情况 A: 正在修改一个已经加载的历史记录
    if (editingHistoryId.value) {
      if (!hasChanges(originalSnapshot.value)) {
        ElMessage.info('内容未变动，无需保存')
        return
      }
      await updateHistory(editingHistoryId.value, getSnapshot())
      return
    }

    // 情况 B: 新建记录但名称与他人已有的冲突
    if (isNameConflict.value) {
      try {
        await ElMessageBox.confirm(`系统已存在同名记录“${name}”，是否要直接覆盖原记录？`, '名称冲突提示', {
          confirmButtonText: '覆盖保存',
          cancelButtonText: '取消',
          type: 'warning'
        })
        const allHist = await beamApi.list()
        const existing = (allHist.list || []).find(h => h.name === name)
        if (existing) {
          await updateHistory(existing.id, getSnapshot())
          return
        }
      } catch {
        return // 用户取消覆盖
      }
    }

    // 情况 C: 真正的新增记录
    const payload = { name: recordName.value, items: getSnapshot() }
    await beamApi.create(payload)
    ElMessage.success('已保存到历史记录')
    resetToEmpty()
    recordName.value = ''
    isNameConflict.value = false
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '网络或保存失败')
  } finally {
    isSubmitting.value = false
  }
}

const clearAllAndReset = () => {
    clearAll()
    recordName.value = ''
    isNameConflict.value = false
}

const backToHome = () => {
  resetToEmpty()
  recordName.value = ''
  isNameConflict.value = false
}

const deleteSelectedRows = () => deleteRows(selectedRows.value)
const handleSelectionChange = (selection) => { selectedRows.value = selection }
const rowClassName = () => (isViewMode.value ? 'view-mode-row' : '')

onMounted(() => {
  const saved = localStorage.getItem('user')
  if (saved) {
    try {
      const user = JSON.parse(saved)
      userRole.value = user.role || 'user'
    } catch {
      userRole.value = 'user'
    }
  }
})

resetToEmpty()
</script>

<style scoped>
.beam-quotation-page { height: 100%; padding: 0; }
.editor-card { border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: none; }
.full-width { width: 100%; height: 100%; display: flex; flex-direction: column; }
.toolbar { margin-bottom: 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.history-header { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.history-search { margin-bottom: 16px; text-align: right; }
.name-input-group { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.name-input-group .label { font-weight: bold; color: #475569; white-space: nowrap; }
.icon-warning { color: #f59e0b; font-size: 18px; }
.warning-text { color: #f59e0b; font-size: 12px; }
:deep(.view-mode-row) { background-color: #fafafa !important; }
:deep(.el-table__header th) { text-align: center !important; }
:deep(.el-table__body td) { text-align: center !important; }
</style>
