<template>
  <div class="quotation-page">
    <el-card shadow="never" class="card">
      <div class="toolbar">
        <el-button type="primary" :icon="DocumentAdd" @click="handleParseText" :loading="parsing">解析粘贴内容</el-button>
        <el-button type="primary" :icon="Plus" @click="addRow" :disabled="isViewMode">添加一行</el-button>
        <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">清空表格</el-button>
        <el-button type="success" :icon="DocumentAdd" @click="handleSubmit" :disabled="isViewMode">保存报价单</el-button>
        <el-button :icon="List" @click="openHistoryDialog">历史报价单</el-button>
        <el-button v-if="isEditing && !isViewMode" type="warning" @click="resetDraft">新建空白单</el-button>
        <el-button v-if="isViewMode" type="info" :icon="Edit" @click="switchToEdit">编辑当前记录</el-button>
      </div>

      <el-row :gutter="16" class="meta-area">
        <el-col :xs="24" :md="12">
          <el-card shadow="never" class="inner-card">
            <template #header>
              <div class="section-title">基础信息</div>
            </template>
            <el-form label-width="92px">
              <el-form-item label="公司名称" required>
                <el-input v-model="companyName" placeholder="请输入公司名称" :disabled="isViewMode" />
              </el-form-item>
              <el-form-item label="备注">
                <el-input v-model="remark" type="textarea" :rows="3" placeholder="备注信息，不参与表格" :disabled="isViewMode" />
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-card shadow="never" class="inner-card">
            <template #header>
              <div class="section-title">价格设置</div>
            </template>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="折扣(%)">
                  <el-input-number
                    v-model="discount"
                    :min="0"
                    :max="100"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    :disabled="isViewMode"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="成交价">
                  <el-input-number
                    v-model="finalPrice"
                    :min="0"
                    :precision="2"
                    controls-position="right"
                    style="width: 100%"
                    :disabled="isViewMode"
                    @change="handleManualFinalPriceChange"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="price-summary">
              <div>小计：<strong>¥ {{ formatMoney(subtotal) }}</strong></div>
              <div>自动成交价：<strong>¥ {{ formatMoney(autoFinalPrice) }}</strong></div>
              <div>状态：<el-tag :type="isManualFinalPrice ? 'warning' : 'success'" effect="plain">{{ isManualFinalPrice ? '手动成交价' : '自动成交价' }}</el-tag></div>
            </div>

            <div class="price-actions">
              <el-button size="small" @click="restoreAutoFinalPrice" :disabled="isViewMode || !isManualFinalPrice">恢复自动成交价</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" class="inner-card">
        <template #header>
          <div class="section-title">粘贴 Word 内容</div>
        </template>
        <el-input
          v-model="rawText"
          type="textarea"
          :rows="8"
          resize="vertical"
          placeholder="把 Word 里复制出来的表格直接粘贴到这里，再点击“解析粘贴内容”"
          :disabled="isViewMode"
        />
        <div class="hint-row">
          支持名称/规格/数量/单价/总价的任意组合，缺少的列会自动隐藏；总价缺失时会用 数量 × 单价 自动计算。
        </div>
      </el-card>

      <el-card shadow="never" class="inner-card">
        <template #header>
          <div class="section-title">报价明细</div>
        </template>

        <el-table
          :data="items"
          border
          stripe
          style="width: 100%"
          :header-cell-style="headerStyle"
          empty-text="暂无明细，请先粘贴内容或手动添加一行"
        >
          <el-table-column v-if="visibleColumns.includes('name')" label="名称" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="名称" :disabled="isViewMode" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('spec')" label="规格" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.spec" placeholder="规格" :disabled="isViewMode" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('quantity')" label="数量" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.quantity" placeholder="数量" :disabled="isViewMode" @change="updateRowTotal(row)" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('unitPrice')" label="单价" min-width="130">
            <template #default="{ row }">
              <el-input v-model="row.unitPrice" placeholder="单价" :disabled="isViewMode" @change="updateRowTotal(row)" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('totalPrice')" label="总价" min-width="130" align="center">
            <template #default="{ row }">
              <span>¥ {{ formatMoney(row.totalPrice) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="90" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="removeRow($index)" :disabled="isViewMode">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>

    <el-dialog v-model="historyDialogVisible" title="历史报价单" width="980px">
      <div class="history-toolbar">
        <el-input v-model="searchKeyword" placeholder="按公司名称或编号模糊搜索" clearable style="max-width: 340px" />
        <el-tag type="info">{{ role === 'admin' ? '管理员可查看所有人的报价单' : '仅显示自己的历史记录' }}</el-tag>
      </div>

      <el-table :data="filteredHistoryList" stripe border max-height="460" :header-cell-style="headerStyle">
        <el-table-column prop="quotationNo" label="编号" width="180" />
        <el-table-column prop="companyName" label="公司名称" min-width="220" />
        <el-table-column prop="ownerName" label="提交人" width="120" v-if="role === 'admin'" />
        <el-table-column prop="subtotal" label="小计" width="120" align="right">
          <template #default="{ row }">¥ {{ formatMoney(row.subtotal) }}</template>
        </el-table-column>
        <el-table-column prop="finalPrice" label="成交价" width="120" align="right">
          <template #default="{ row }">¥ {{ formatMoney(row.finalPrice) }}</template>
        </el-table-column>
        <el-table-column prop="createDate" label="创建时间" width="120" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewHistory(row)">查看</el-button>
            <el-button link type="warning" size="small" @click="editHistory(row)" :disabled="row.status === 'approved' && role !== 'admin'">修改</el-button>
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
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, DocumentAdd, Edit, List, Plus, Refresh } from '@element-plus/icons-vue'
import { quotationApi } from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'
import { useQuotationHistory } from '@/composables/useQuotationHistory'

const role = ref((JSON.parse(localStorage.getItem('user') || '{}') || {}).role || 'user')
const headerStyle = { background: '#f5f7fa', fontWeight: 'bold', textAlign: 'center' }
const parsing = ref(false)

const {
  companyName,
  remark,
  discount,
  finalPrice,
  isManualFinalPrice,
  rawText,
  items,
  visibleColumns,
  editingHistoryId,
  isViewMode,
  isEditing,
  subtotal,
  autoFinalPrice,
  resetDraft,
  setRows,
  addRow,
  removeRow,
  clearRows,
  updateRowTotal,
  setFinalPriceManual,
  restoreAutoFinalPrice,
  loadRecord,
  setMode,
  getPayload
} = useQuotationDraft()

const statusTag = (status) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info' }[status] || 'info')
const statusLabel = (status) => ({ draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }[status] || status)
const formatMoney = (value) => Number(value || 0).toFixed(2)

const loadToEditor = (record, mode) => {
  loadRecord(record, mode)
}

const {
  historyDialogVisible,
  searchKeyword,
  filteredHistoryList,
  saveQuotation,
  deleteHistory,
  openHistoryDialog,
  viewHistory,
  editHistory
} = useQuotationHistory({ api: quotationApi, loadToEditor })

const handleManualFinalPriceChange = (value) => {
  if (isViewMode.value) return
  setFinalPriceManual(value)
}

const handleParseText = async () => {
  if (isViewMode.value) return
  const text = String(rawText.value || '').trim()
  if (!text) {
    ElMessage.warning('请先粘贴报价内容')
    return
  }

  try {
    parsing.value = true
    const result = await quotationApi.parseText(text)
    setRows(result.items || [], result.columns || [])
    if (result.warnings?.length) {
      ElMessage.warning(result.warnings[0])
    } else {
      ElMessage.success('解析完成')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '解析失败')
  } finally {
    parsing.value = false
  }
}

const validateRows = () => {
  const validRows = items.value.filter(row => {
    const hasText = String(row.name || '').trim() || String(row.spec || '').trim()
    const hasQty = String(row.quantity ?? '').trim() !== ''
    const hasUnit = String(row.unitPrice ?? '').trim() !== ''
    const hasTotal = String(row.totalPrice ?? '').trim() !== ''
    const meaningful = hasText || hasQty || hasUnit || hasTotal
    const calcReady = (hasQty && hasUnit) || hasTotal
    return meaningful ? calcReady : false
  })

  if (!companyName.value.trim()) {
    ElMessage.warning('请先填写公司名称')
    return false
  }

  if (!validRows.length) {
    ElMessage.warning('请先填写或粘贴报价明细')
    return false
  }

  if (validRows.length !== items.value.length) {
    ElMessage.warning('存在未填写完整的明细行，请先补全后再保存')
    return false
  }

  return true
}

const handleSubmit = async () => {
  if (!validateRows()) return

  try {
    const payload = getPayload()
    await saveQuotation(payload, editingHistoryId.value)
    await openHistoryDialog().catch(() => {})
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error.message || '保存失败')
  }
}

const switchToEdit = () => {
  if (!isViewMode.value) return
  setMode('edit')
}

onMounted(() => {
  resetDraft()
})
</script>

<style scoped>
.quotation-page { padding: 0; }
.card { border-radius: 18px; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.meta-area { margin-bottom: 16px; }
.inner-card { border-radius: 16px; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 700; color: #1f2937; }
.price-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 6px; color: #475569; }
.price-actions { margin-top: 12px; }
.hint-row { margin-top: 10px; color: #64748b; font-size: 13px; line-height: 1.6; }
.history-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
@media (max-width: 960px) {
  .price-summary { grid-template-columns: 1fr; }
}
</style>
