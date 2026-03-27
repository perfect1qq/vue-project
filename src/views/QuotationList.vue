<template>
  <div class="quotation-container">
    <el-card shadow="never" class="editor-card full-width">
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="addRow">添加一行</el-button>
        <el-button :icon="DocumentAdd" @click="handleSave" :disabled="isViewMode">提交</el-button>
        <el-button :icon="Delete" @click="deleteSelectedRows" :disabled="isViewMode || !selectedRows.length">批量删除</el-button>
        <el-button :icon="Refresh" @click="clearAll" :disabled="isViewMode">清空所有</el-button>
        <el-divider direction="vertical" />
        <el-button :icon="List" @click="openHistoryDialog">历史报价单</el-button>
        <el-button v-if="isHistoryMode" type="info" :icon="HomeFilled" @click="backToHome">返回首页</el-button>
      </div>

      <!-- 文本导入区域（直接显示，无需按钮） -->
      <div class="import-area">
        <el-input
          v-model="importText"
          type="textarea"
          :rows="4"
          placeholder="请在此粘贴从 Word/Excel 复制的数据（每行用制表符分隔）&#10;支持格式：&#10;• 2列：数量\t单价&#10;• 4列：产品名称\t规格\t数量\t单价"
          :disabled="isViewMode"
        />
        <div class="import-actions">
          <el-checkbox v-model="replaceExisting">替换现有数据（包含第一行）</el-checkbox>
          <el-button type="primary" :icon="Upload" @click="parseAndImport" :disabled="isViewMode || !importText.trim()">
            解析并添加到表格
          </el-button>
        </div>
      </div>

      <!-- 动态表格 -->
      <el-table
        ref="tableRef"
        :data="items"
        border
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', fontWeight: 'bold', textAlign: 'center' }"
        :row-class-name="rowClassName"
      >
        <el-table-column type="selection" width="55" align="center" :selectable="() => !isViewMode" />
        <el-table-column
          v-for="col in currentColumns"
          :key="col.prop"
          :prop="col.prop"
          :label="col.label"
          :align="col.align || 'center'"
          :min-width="col.minWidth"
        >
          <template #default="{ row }">
            <template v-if="col.prop === 'quantity'">
              <el-input
                v-model="row.quantity"
                placeholder="如 10套"
                size="small"
                clearable
                :disabled="isViewMode"
                @input="recalcRowTotal(row)"
              />
            </template>
            <template v-else-if="col.prop === 'unitPrice'">
              <el-input-number
                v-model="row.unitPrice"
                :min="0"
                :precision="2"
                :step="10"
                size="small"
                controls-position="right"
                style="width: 100%"
                @change="recalcRowTotal(row)"
                :disabled="isViewMode"
              />
            </template>
            <template v-else-if="col.prop === 'totalPrice'">
              <span class="total-price">¥ {{ formatInteger(row.totalPrice) }}</span>
            </template>
            <template v-else>
              <el-input
                v-model="row[col.prop]"
                :placeholder="'请输入' + col.label"
                size="small"
                clearable
                :disabled="isViewMode"
              />
            </template>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="deleteRow($index)" :disabled="isViewMode" />
          </template>
        </el-table-column>
      </el-table>

      <!-- 备注区域 -->
      <div class="remark-area">
        <div class="remark-label">备注：</div>
        <el-input
          v-model="remark"
          type="textarea"
          :rows="3"
          placeholder="请输入报价单备注（如：客户要求、特殊说明等）"
          :disabled="isViewMode"
        />
      </div>

      <!-- 底部汇总 -->
      <div class="summary-bar">
        <div class="summary-item"><span class="label">合计总价：</span><span class="value">¥ {{ formatInteger(totalSum) }}</span></div>
        <div class="summary-item">
          <span class="label">折扣：</span>
          <el-slider v-model="discount" :min="0" :max="100" :format-tooltip="val => val + '%'" style="width: 180px" :disabled="isViewMode" />
          <el-input-number v-model="discount" :min="0" :max="100" :step="1" size="small" style="width: 80px" :disabled="isViewMode" />
          <span class="discount-value">%</span>
          <span class="label" style="margin-left: 12px;">优惠金额：</span>
          <span class="value">¥ {{ formatInteger(totalSum - finalPrice) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">成交价：</span>
          <el-input-number v-model="finalPrice" :min="0" :precision="2" :step="100" size="small" style="width: 150px" :disabled="isViewMode" />
        </div>
      </div>
    </el-card>

    <!-- 历史报价单弹窗 -->
    <el-dialog v-model="historyDialogVisible" title="历史报价单" width="700px">
      <template #header>
        <div class="history-header">
          <span>历史报价单</span>
          <el-button type="danger" size="small" @click="clearAllHistory">一键删除</el-button>
        </div>
      </template>
      <div class="history-search">
        <el-input
          v-model="searchKeyword"
          placeholder="按名称模糊搜索"
          clearable
          :prefix-icon="Search"
          style="width: 250px"
        />
      </div>
      <el-table :data="filteredHistoryList" stripe max-height="400px">
        <el-table-column prop="name" label="报价单名称" min-width="180" show-overflow-tooltip align="center" />
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
import { ref, computed, watch,nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, Refresh, DocumentAdd, List, HomeFilled, Search, Upload } from '@element-plus/icons-vue'
import { useEditableTable } from '../composables/useEditableTable'
import { useHistoryManager } from '../composables/useHistoryManager'

// ---------- 工具函数 ----------
const extractNumberFromText = (text) => {
  const match = String(text).match(/^[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

// ---------- 数据模型 ----------
const createEmptyItem = () => ({
  productName: '',
  spec: '',
  quantity: '',
  unitPrice: 0,
  totalPrice: 0
})

const validateItem = (item) => {
  if (columnMode.value === 'full') {
    return item.productName?.trim() && item.spec?.trim() && extractNumberFromText(item.quantity) > 0 && item.unitPrice > 0
  }
  return extractNumberFromText(item.quantity) > 0 && item.unitPrice > 0
}

// 列模式
const columnMode = ref('full')
const currentColumns = computed(() => {
  if (columnMode.value === 'full') {
    return [
      { prop: 'productName', label: '产品名称', minWidth: 150 },
      { prop: 'spec', label: '规格', minWidth: 120 },
      { prop: 'quantity', label: '数量', align: 'center', minWidth: 100 },
      { prop: 'unitPrice', label: '单价(元)', align: 'center', minWidth: 120 },
      { prop: 'totalPrice', label: '总价(元)', align: 'center', minWidth: 120 }
    ]
  }
  return [
    { prop: 'quantity', label: '数量', align: 'center', minWidth: 120 },
    { prop: 'unitPrice', label: '单价(元)', align: 'center', minWidth: 120 },
    { prop: 'totalPrice', label: '总价(元)', align: 'center', minWidth: 120 }
  ]
})

// 表格编辑组合
const {
  items,
  isViewMode,
  isHistoryMode,
  addRow,
  deleteRow,
  deleteSelectedRows: deleteRows,
  clearAll: clearTable,
  isDataComplete,
  getSnapshot,
  hasChanges,
  loadDataToEditor,
  resetToEmpty: resetTable,
  editingHistoryId,
  originalSnapshot
} = useEditableTable({ createEmptyItem, validateItem, enableDelete: true })

// 备注
const remark = ref('')

// 折扣与成交价
const discount = ref(0)
const selectedRows = ref([])
const importText = ref('')
const replaceExisting = ref(true)

// 合计总价（必须在 finalPrice 前定义）
const totalSum = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
})

// 成交价联动逻辑
const isManualFinalPrice = ref(false)
const manualFinalPriceValue = ref(0)
let isUpdatingFromFinalPrice = false

const finalPrice = computed({
  get() {
    if (isManualFinalPrice.value) return manualFinalPriceValue.value
    const auto = totalSum.value * (1 - discount.value / 100)
    return Math.max(0, auto)
  },
  set(val) {
    if (totalSum.value === 0) return
    const newVal = Math.max(0, val)
    manualFinalPriceValue.value = newVal
    let newDiscount = (1 - newVal / totalSum.value) * 100
    newDiscount = Math.min(100, Math.max(0, newDiscount))
    isUpdatingFromFinalPrice = true
    discount.value = newDiscount
    isUpdatingFromFinalPrice = false
    isManualFinalPrice.value = true
  }
})

watch(totalSum, (newTotal, oldTotal) => {
  if (newTotal === oldTotal) return
  if (isManualFinalPrice.value) {
    const currentFinal = manualFinalPriceValue.value
    if (newTotal === 0) {
      discount.value = 0
    } else {
      let newDiscount = (1 - currentFinal / newTotal) * 100
      newDiscount = Math.min(100, Math.max(0, newDiscount))
      isUpdatingFromFinalPrice = true
      discount.value = newDiscount
      isUpdatingFromFinalPrice = false
    }
  } else {
    discount.value = 0
    manualFinalPriceValue.value = newTotal
  }
})

watch(discount, () => {
  if (isUpdatingFromFinalPrice) return
  isManualFinalPrice.value = false
})

// 重置所有状态（表格 + 备注 + 折扣 + 手动模式）
const resetToEmpty = () => {
  resetTable()
  remark.value = ''
  discount.value = 0
  isManualFinalPrice.value = false
  manualFinalPriceValue.value = 0
  columnMode.value = 'full'
}

// 清空表格（仅表格数据，不清空备注和折扣）
const clearAll = () => {
  clearTable()
}

// 历史管理（关键修改：保存和恢复完整数据）
const {
  historyDialogVisible,
  searchKeyword,
  filteredHistoryList,
  saveAsNewHistory,
  updateHistory,
  deleteHistory,
  clearAllHistory,
  openHistoryDialog,
  viewHistory: historyView,
  editHistory: historyEdit
} = useHistoryManager({
  storageKey: 'quotation_history',
  getCurrentData: () => getSnapshot(),
  loadToEditor: async (record, mode) => {
    // 1. 恢复表格数据（这会触发 totalSum 重新计算，但计算是异步的）
    loadDataToEditor(record.items, mode, record.id)
    // 2. 恢复备注
    remark.value = record.remark || ''
    
    // 3. 等待 Vue 更新完成，确保 totalSum 已基于新表格数据重新计算
    await nextTick()
    
    // 4. 恢复折扣
    discount.value = record.discount !== undefined ? record.discount : 0
    
    // 5. 恢复成交价模式
    if (record.isManual !== undefined) {
      isManualFinalPrice.value = record.isManual
    } else {
      // 兼容旧数据
      isManualFinalPrice.value = record.manualFinalPrice !== undefined && record.manualFinalPrice !== null
    }
    
    // 6. 恢复成交价数值（优先使用存储的 finalPrice）
    if (record.finalPrice !== undefined) {
      manualFinalPriceValue.value = record.finalPrice
    } else if (record.manualFinalPrice !== undefined) {
      manualFinalPriceValue.value = record.manualFinalPrice
    } else {
      // 旧数据：根据折扣和当前的 totalSum 计算
      manualFinalPriceValue.value = totalSum.value * (1 - discount.value / 100)
    }
  },
  getRecordName: () => `报价单_${new Date().toLocaleString()}`,
  defaultNameProvider: (data) => {
    const firstItem = data[0]
    if (firstItem?.productName?.trim()) return firstItem.productName.trim()
    return null
  },
  transformData: (data) => ({
    items: data,
    remark: remark.value,
    discount: discount.value,
    finalPrice: finalPrice.value,
    isManual: isManualFinalPrice.value
  })
})
// 重写 viewHistory/editHistory 以同步列模式
const setColumnModeByData = (record) => {
  const hasNameOrSpec = record.items.some(item => item.productName?.trim() || item.spec?.trim())
  columnMode.value = hasNameOrSpec ? 'full' : 'simple'
}

const viewHistory = (record) => {
  setColumnModeByData(record)
  historyView(record)
}
const editHistory = (record) => {
  setColumnModeByData(record)
  historyEdit(record)
}

// 保存（提交）
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
    if (updateHistory(editingHistoryId.value, getSnapshot())) {
      originalSnapshot.value = getSnapshot()
    }
  } else {
    await saveAsNewHistory()
    resetToEmpty()
  }
}

// 辅助函数
const recalcRowTotal = (row) => {
  const qty = extractNumberFromText(row.quantity)
  row.totalPrice = qty * (row.unitPrice || 0)
}

const formatInteger = (num) => Math.round(num || 0).toString()

// 导入解析
const parseQuotationText = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (!lines.length) return { mode: null, data: [] }

  const firstLine = lines[0]
  const colCount = firstLine.split(/\t/).length
  let mode
  if (colCount === 2) mode = 'simple'
  else if (colCount === 4) mode = 'full'
  else return { mode: null, data: [] }

  const data = lines.flatMap(line => {
    const parts = line.split(/\t/)
    if (parts.length !== colCount) return []
    if (mode === 'simple') {
      const quantity = parts[0]?.trim() || ''
      const unitPrice = extractNumberFromText(parts[1])
      return [{
        productName: '',
        spec: '',
        quantity,
        unitPrice,
        totalPrice: extractNumberFromText(quantity) * unitPrice
      }]
    } else {
      const productName = parts[0]?.trim() || ''
      const spec = parts[1]?.trim() || ''
      const quantity = parts[2]?.trim() || ''
      const unitPrice = extractNumberFromText(parts[3])
      return [{
        productName,
        spec,
        quantity,
        unitPrice,
        totalPrice: extractNumberFromText(quantity) * unitPrice
      }]
    }
  })
  return { mode, data }
}

const parseAndImport = () => {
  const text = importText.value.trim()
  if (!text) {
    ElMessage.warning('请粘贴数据')
    return
  }

  const { mode, data } = parseQuotationText(text)
  if (!mode || !data.length) {
    ElMessage.error('仅支持2列（数量、单价）或4列（名称、规格、数量、单价）的数据格式')
    return
  }

  columnMode.value = mode
  if (replaceExisting.value) {
    items.value = data
    ElMessage.success(`已替换为 ${data.length} 行数据`)
  } else {
    items.value.push(...data)
    ElMessage.success(`已追加 ${data.length} 行数据`)
  }
  importText.value = ''
  replaceExisting.value = false
}

// 返回首页
const backToHome = () => {
  if (!isViewMode.value && isDataComplete() && hasChanges(originalSnapshot.value)) {
    ElMessageBox.confirm('当前数据有未保存的修改，返回首页将丢失更改，确定继续吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => resetToEmpty()).catch(() => {})
  } else {
    resetToEmpty()
  }
}

// 批量删除
const deleteSelectedRows = () => deleteRows(selectedRows.value)
const handleSelectionChange = (selection) => { selectedRows.value = selection }
const rowClassName = () => isViewMode.value ? 'view-mode-row' : ''

// 初始化
resetToEmpty()
</script>

<style scoped>
.quotation-container {
  height: 100%;
  padding: 0;
}
.full-width {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.toolbar {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.import-area {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f9fafc;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}
.import-actions {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.remark-area {
  margin: 20px 0;
}
.remark-label {
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.history-search {
  margin-bottom: 16px;
  text-align: right;
}
.summary-bar {
  margin-top: 20px;
  padding: 16px 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 40px;
  flex-wrap: wrap;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.summary-item .label {
  font-weight: 500;
  color: #606266;
}
.summary-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.final-price {
  color: #e6a23c;
  font-size: 22px;
}
.discount-value {
  min-width: 20px;
  text-align: center;
  color: #409eff;
  font-weight: 500;
}
.total-price {
  color: #67c23a;
  font-weight: 500;
}
:deep(.view-mode-row) {
  background-color: #fafafa !important;
}
:deep(.el-table__header th) {
  text-align: center !important;
}
:deep(.el-table__body td) {
  text-align: center !important;
}
</style>