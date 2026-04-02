<template>
  <!-- 报价单主工作页面 -->
  <div class="quotation-page">
    <el-card shadow="never" class="card">
      <!-- 顶部操作按钮工具栏 -->
      <div class="toolbar">
        <!-- 解析粘贴自 Word 或 Excel 的非结构化文本 -->
        <el-button type="primary" :icon="DocumentAdd" @click="handleParseText" :loading="parsing">智能解析粘贴内容</el-button>
        <el-button type="primary" plain :icon="Plus" @click="addRow" :disabled="isViewMode">手动添加一行</el-button>
        <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">清空当前表格</el-button>
        
        <!-- 提交并保存报价单到后端数据库，使用 isSubmitting 防抖处理高并发重连机制 -->
        <el-button type="success" :icon="DocumentAdd" @click="handleSubmit" :loading="isSubmitting" :disabled="isViewMode">确认保存报价单</el-button>
        <el-button :icon="List" @click="openHistoryDialog">查看历史记录</el-button>
        
        <!-- 模式切换按钮 -->
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
                    @change="handleDiscountChange"
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
              <div>优惠金额：<strong>¥ {{ formatMoney(discountAmount) }}</strong></div>
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
        <el-input v-model="searchKeyword" placeholder="按公司名称搜索" clearable style="max-width: 340px" />
        <el-tag type="info">{{ role === 'admin' ? '管理员可查看所有人的报价单' : '仅显示自己的历史记录' }}</el-tag>
      </div>

      <el-table :data="filteredHistoryList" stripe border max-height="460" :header-cell-style="headerStyle">
        <!-- <el-table-column prop="quotationNo" label="编号" width="120">
          <template #default="{ row }">
            {{ (row.quotationNo || '').length > 10 ? (row.quotationNo || '').slice(-10) : row.quotationNo }}
          </template>
        </el-table-column> -->
        <el-table-column prop="companyName" label="公司名称" min-width="220" />
        <el-table-column prop="ownerName" label="提交人" width="120" v-if="role === 'admin'" />
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

// 当前用户角色判断，处理只读/读写权限
const role = ref(JSON.parse(localStorage.getItem('user') || '{}')?.role || 'user')
const headerStyle = { background: '#f8fafc', color: '#475569', fontWeight: 'bold', textAlign: 'center' }

// 控制全页面并发状态的 Loading
const parsing = ref(false)
const isSubmitting = ref(false)

// 格式化金额：保留两位小数并添加千分位
const formatMoney = (val) => {
  const num = Number(val || 0)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 报价单状态对应的标签样式
const statusTag = (status) => {
  const tags = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    deleted: 'info'
  }
  return tags[status] || 'info'
}

// 报价单状态对应的中文文案
const statusLabel = (status) => {
  const labels = {
    draft: '草稿',
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    deleted: '已删除'
  }
  return labels[status] || status
}

// --- [状态管理] 报价单草稿逻辑 ---
// 核心逻辑高度封装在 useQuotationDraft 中，包括：
// 1. 自动计算总价、小计、折扣
// 2. 区分“自动成交价”与“手动覆盖成交价”
// 3. 动态显隐表格列 (根据解析出的内容)
const {
  companyName,
  remark,
  discount,
  finalPrice,
  isManualFinalPrice, // 是否处于手动指定总价模式
  rawText, // 用户粘贴的原始文本
  items, // 表格行数据
  visibleColumns, // 当前显示的列 (name, spec, quantity, unitPrice, totalPrice)
  editingHistoryId, // 当前是否在修改已有的历史记录
  isViewMode, // 是否处于只读查看模式
  isEditing, // 是否处于编辑模式
  subtotal,
  autoFinalPrice,
  discountAmount,
  resetDraft,
  setRows,
  addRow,
  removeRow,
  clearRows,
  updateRowTotal,
  setFinalPriceManual, // 切换到手动指定成交价状态
  restoreAutoFinalPrice, // 恢复通过折扣计算成交价的状态
  loadRecord,
  setMode,
  getPayload
} = useQuotationDraft()

// --- [状态管理] 历史记录逻辑 ---
const {
  historyDialogVisible,
  searchKeyword,
  filteredHistoryList,
  saveQuotation,
  deleteHistory,
  openHistoryDialog,
  viewHistory,
  editHistory
} = useQuotationHistory({ 
  api: quotationApi, 
  loadToEditor: (record, mode) => loadRecord(record, mode) 
})

const handleManualFinalPriceChange = (value) => {
  if (isViewMode.value) return
  setFinalPriceManual(value)
}

const handleDiscountChange = () => {
  if (isViewMode.value) return
  if (isManualFinalPrice.value) {
    restoreAutoFinalPrice()
  }
}

/**
 * 智能解析剪贴板内容核心逻辑
 * - 使用 try..catch 完美替换 .catch 增强语法规范
 */
const handleParseText = async () => {
  if (isViewMode.value) return
  const text = String(rawText.value ?? '').trim()
  if (!text) {
    return ElMessage.warning('请先粘贴报价内容至编辑框内')
  }

  parsing.value = true
  try {
    const result = await quotationApi.parseText(text)
    if (!result) return
    
    // 生成行内明细数据并初始化表结构
    setRows(result.items || [], result.columns || [])
    if (result.warnings?.length) {
      ElMessage.warning(result.warnings[0])
    } else {
      ElMessage.success('文本解析完成，已渲染至下方数据表')
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '解析失败，请检查服务连通性')
  } finally {
    parsing.value = false
  }
}

/**
 * 完整校验当前行数据合法性，避免创建脏数据
 */
const validateRows = () => {
  const validRows = items.value.filter(row => {
    const hasText = String(row.name || '').trim() || String(row.spec || '').trim()
    const hasQty = String(row.quantity ?? '').trim() !== ''
    const hasUnit = String(row.unitPrice ?? '').trim() !== ''
    const hasTotal = String(row.totalPrice ?? '').trim() !== ''
    const meaningful = hasText || hasQty || hasUnit || hasTotal
    // 行数据有效需同时满足: 基础信息 + 基础组合 (数量x单价 | 总价直出)
    return meaningful ? ((hasQty && hasUnit) || hasTotal) : false
  })

  // 三元或简化式校验逻辑
  if (!companyName.value.trim()) return ElMessage.warning('请先填写公司名称归属'), false
  if (!validRows.length) return ElMessage.warning('请先录入或使用 AI 智能粘贴获取报价明细'), false
  if (validRows.length !== items.value.length) return ElMessage.warning('表格存在残缺不完整的数据行，请修正后继续'), false
  
  return true
}

/**
 * 提交并保存报价单到后端 (加入防高频触发防御机制)
 */
const handleSubmit = async () => {
  if (isSubmitting.value) return // 防重锁防御机制
  if (!validateRows()) return

  isSubmitting.value = true
  try {
    const payload = getPayload() // 序列化传输负载
    const result = await saveQuotation(payload, editingHistoryId.value)
    
    if (result) {
      ElMessage.success(editingHistoryId.value ? '已覆盖历史记录！' : '成功创建了一条新报价单！')
      resetDraft() // 持久化成功清理状态环境
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message ?? error.message ?? '入库失败，请稍后刷新重试！')
  } finally {
    isSubmitting.value = false
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
.card { border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); border: none;}
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.meta-area { margin-bottom: 16px; }
.inner-card { border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
.section-title { font-size: 15px; font-weight: 700; color: #1e293b; border-left: 4px solid #6366f1; padding-left: 10px; line-height: 1; margin-bottom: 4px; }
.price-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px;}
.price-summary strong { color: #020617; font-size: 15px; }
.price-actions { margin-top: 14px; }
.hint-row { margin-top: 10px; color: #64748b; font-size: 13px; line-height: 1.6; }
.history-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }

@media (max-width: 960px) {
  .price-summary { grid-template-columns: 1fr; }
}
</style>
