<template>

  <!-- * @module views/QuotationList
 * @description 报价单主工作页面
 * 
 * 功能：
 * - 报价单创建与编辑
 * - 智能解析粘贴内容（AI 辅助）
 * - 手动添加/删除行
 * - 项目明细管理（名称、规格、数量、单价）
 * - 自动计算小计、折扣、成交价
 * - 保存到历史记录
 * - 提交审批流程 -->


  <!-- 报价单主工作页面 -->
  <div class="quotation-page">
    <el-card shadow="never" class="card">
      <!-- 顶部操作按钮工具栏 -->
      <div class="toolbar">
        <template v-if="!isGuest">
          <el-button v-if="!isViewMode" type="primary" :icon="DocumentAdd" @click="handleParseText"
            :loading="parsing">智能解析粘贴内容</el-button>
          <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">清空当前表格</el-button>
          <el-button type="success" :icon="DocumentAdd" @click="handleSubmit" :loading="isSubmitting"
            :disabled="isViewMode">确认保存报价单</el-button>
        </template>

        <!-- 模式切换按钮 -->
        <QuotationModeActions :is-editing="isEditing" :is-view-mode="isViewMode" @reset="resetDraft"
          @switch-edit="switchToEdit" />
      </div>

      <el-row :gutter="16" class="meta-area">
        <el-col :xs="24" :md="12">
          <el-card shadow="never" class="inner-card">
            <template #header>
              <div class="section-title">基础信息</div>
            </template>
            <el-form ref="formRef" :model="formModel" label-width="92px">
              <el-form-item label="名称" prop="quotationNo" :rules="quotationNameRule">
                <el-input v-model="formModel.quotationNo" placeholder="请输入名称" :disabled="isViewMode" />
              </el-form-item>
              <el-form-item label="公司名称" prop="companyName" :rules="companyNameRule">
                <el-input v-model="formModel.companyName" placeholder="请输入公司名称" :disabled="isViewMode" />
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
                  <el-input-number :model-value="toNumber(discount)" :min="0" :max="100" :precision="2"
                    controls-position="right" style="width: 100%" :disabled="isViewMode"
                    @change="(val) => { discount = val; handleDiscountChange(val) }" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="成交价">
                  <el-input-number :model-value="toNumber(finalPrice)" :min="0" :precision="2" controls-position="right"
                    style="width: 100%" :disabled="isViewMode"
                    @change="(val) => { finalPrice = val; handleManualFinalPriceChange(val) }" />
                </el-form-item>
              </el-col>
            </el-row>

            <div class="price-summary">
              <div>小计：<strong>¥ {{ formatMoney(subtotal) }}</strong></div>
              <div>优惠金额：<strong>¥ {{ formatMoney(discountAmount) }}</strong></div>
              <div>自动成交价：<strong>¥ {{ formatMoney(autoFinalPrice) }}</strong></div>
              <div>状态：<el-tag :type="isManualFinalPrice ? 'warning' : 'success'" effect="plain">{{ isManualFinalPrice ?
                '手动成交价'
                : '自动成交价' }}</el-tag></div>
            </div>

            <div class="price-actions">
              <el-button size="small" @click="restoreAutoFinalPrice"
                :disabled="isViewMode || !isManualFinalPrice">恢复自动成交价</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-card v-if="!isViewMode" shadow="never" class="inner-card">
        <template #header>
          <div class="section-title">粘贴 Word 内容</div>
        </template>
        <el-input v-model="rawText" type="textarea" :rows="8" resize="vertical"
          placeholder="把 Word 里复制出来的表格直接粘贴到这里，再点击“智能解析粘贴内容”" />
        <div class="hint-row">
          支持名称/规格/数量/单价/总价的任意组合，缺少的列会自动隐藏；总价缺失时会用 数量 × 单价 自动计算。
        </div>
      </el-card>

      <el-card shadow="never" class="inner-card">
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="section-title">报价明细</div>
            <el-button v-if="!isGuest && !isViewMode" type="primary" plain :icon="Plus" @click="addRow"
              size="small">添加一行</el-button>
          </div>
        </template>

        <el-table :data="items" border stripe style="width: 100%" :header-cell-style="TABLE_HEADER_STYLE"
          empty-text="暂无明细，请先粘贴内容或手动添加一行" class="smart-table">
          <el-table-column v-if="visibleColumns.includes('name')" label="名称" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="名称" :disabled="isViewMode" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('spec')" label="规格" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.spec" placeholder="规格" :disabled="isViewMode" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('quantity')" label="数量" width="110" align="center">
            <template #default="{ row }">
              <el-input v-model="row.quantity" placeholder="数量" :disabled="isViewMode" @change="updateRowTotal(row)" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('unitPrice')" label="单价" width="120" align="right">
            <template #default="{ row }">
              <el-input v-model="row.unitPrice" placeholder="单价" :disabled="isViewMode" @change="updateRowTotal(row)" />
            </template>
          </el-table-column>

          <el-table-column v-if="visibleColumns.includes('totalPrice')" label="总价" width="120" align="right">
            <template #default="{ row }">
              <span>¥ {{ formatMoney(row.totalPrice) }}</span>
            </template>
          </el-table-column>

          <el-table-column v-if="!isGuest" label="操作" width="80" fixed="right" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="removeRow($index)"
                :disabled="isViewMode">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { Delete, DocumentAdd, Plus, Refresh } from '@element-plus/icons-vue'
import { quotationApi } from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'
import { useQuotationHistory } from '@/composables/useQuotationHistory'
import { useQuotationEditor } from '@/composables/useQuotationEditor'
import { usePermissions } from '@/composables/usePermissions'
import QuotationModeActions from '@/components/quotation/QuotationModeActions.vue'
import { formatMoney } from '@/utils/number'
import { TABLE_HEADER_STYLE } from '@/constants/table'


const { isGuest } = usePermissions()

const formRef = ref(null)
const formModel = reactive({
  quotationNo: '',
  companyName: ''
})

const quotationNameRule = computed(() => (isViewMode.value || rulesDisabled.value) ? [] : [
  { required: true, message: '请输入报价单名称', trigger: ['blur', 'change'] },
  { min: 1, max: 100, message: '报价单名称不能超过100个字符', trigger: ['blur', 'change'] },
  {
    validator: (rule, value, callback) => {
      if (value && value.trim() !== value) {
        callback(new Error('报价单名称不能有前后空格'))
      } else {
        callback()
      }
    },
    trigger: ['blur', 'change']
  }
])

const companyNameRule = computed(() => (isViewMode.value || rulesDisabled.value) ? [] : [
  { required: true, message: '请输入公司名称', trigger: ['blur', 'change'] },
  { min: 1, max: 100, message: '公司名称不能超过100个字符', trigger: ['blur', 'change'] },
  {
    validator: (rule, value, callback) => {
      if (value && value.trim() !== value) {
        callback(new Error('公司名称不能有前后空格'))
      } else {
        callback()
      }
    },
    trigger: ['blur', 'change']
  }
])

// 控制全页面并发状态的 Loading
const parsing = ref(false)
const isSubmitting = ref(false)
const rulesDisabled = ref(false)

/**
 * 将值安全转换为数字类型
 * 用于 ElInputNumber 组件，确保传入的是 Number 或 null 而不是字符串
 * @param {*} value - 待转换的值
 * @returns {number|null} 转换后的数字值，无法转换返回 null
 */
const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

// --- [状态管理] 报价单草稿逻辑 ---
// 核心逻辑高度封装在 useQuotationDraft 中，包括：
// 1. 自动计算总价、小计、折扣
// 2. 区分"自动成交价"与"手动覆盖成交价"
// 3. 动态显隐表格列 (根据解析出的内容)
const {
  quotationNo,
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
  getPayload,
  originalPayloadStr // 暴露深比对历史快照
} = useQuotationDraft()

// 同步 formModel 与 useQuotationDraft 的值
watch(quotationNo, (val) => { formModel.quotationNo = val })
watch(companyName, (val) => { formModel.companyName = val })

// --- [状态管理] 历史记录逻辑 ---
const {
  saveQuotation,
  deleteHistory
} = useQuotationHistory({
  api: quotationApi,
  loadToEditor: (record, mode) => loadRecord(record, mode)
})

const {
  handleManualFinalPriceChange,
  handleDiscountChange,
  handleParseText,
  validateRows,
  handleSubmit
} = useQuotationEditor({
  isViewMode,
  parsing,
  isSubmitting,
  rawText,
  items,
  quotationNo,
  companyName,
  formRef,
  formModel,
  editingHistoryId,
  originalPayloadStr,
  isManualFinalPrice,
  setFinalPriceManual,
  restoreAutoFinalPrice,
  setRows,
  getPayload,
  saveQuotation,
  parseTextFn: quotationApi.parseText.bind(quotationApi),
  onSaveSuccess: () => {
    rulesDisabled.value = true
    resetDraft()
  }
})

const switchToEdit = () => {
  if (!isViewMode.value) return
  rulesDisabled.value = false
  formModel.quotationNo = quotationNo.value
  formModel.companyName = companyName.value
  loadRecord({
    id: editingHistoryId.value,
    quotationNo: quotationNo.value,
    companyName: companyName.value,
    remark: remark.value,
    discount: discount.value,
    finalPrice: finalPrice.value,
    isManual: isManualFinalPrice.value,
    items: items.value
  }, 'edit')
}
</script>

<style scoped>
.quotation-page {
  padding: 0;
}

.card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: none;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.meta-area {
  margin-bottom: 16px;
}

.inner-card {
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  border-left: 4px solid #6366f1;
  padding-left: 10px;
  line-height: 1;
  margin-bottom: 4px;
}

.price-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
  color: #475569;
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
}

.price-summary strong {
  color: #020617;
  font-size: 15px;
}

.price-actions {
  margin-top: 14px;
}

.hint-row {
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
}

@media (max-width: 960px) {
  .price-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .toolbar {
    margin-bottom: 12px;
    gap: 8px;
  }

}
</style>
