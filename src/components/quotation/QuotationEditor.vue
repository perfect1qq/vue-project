<template>
  <div class="quotation-editor-component">
    <el-row :gutter="16" class="meta-area">
      <el-col :xs="24" :md="12">
        <el-card shadow="never" class="inner-card">
          <template #header>
            <div class="section-title">基础信息</div>
          </template>
          <el-form ref="formRef" :model="combinedFormModel" label-width="92px">
            <el-form-item label="名称" prop="name" :rules="quotationNameRule">
              <el-input v-model="localFormModel.name" placeholder="请输入名称" :disabled="isViewMode"
                @blur="handleNameBlur" />
            </el-form-item>
            <el-form-item label="公司名称" prop="companyName" :rules="companyNameRule">
              <el-input v-model="localFormModel.companyName" placeholder="请输入公司名称" :disabled="isViewMode" />
            </el-form-item>
            <el-form-item label="报价时间" prop="quotationDate" :rules="[{ required: !isViewMode && !rulesDisabled, message: '请填写报价时间', trigger: ['blur', 'change'] }]">
              <el-date-picker
                v-model="localQuotationDate"
                type="date"
                placeholder="选择报价日期（必填）"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                :disabled="isViewMode"
              />
            </el-form-item>
            <el-form-item label="备注">
              <el-input :model-value="remark" @update:model-value="$emit('update:remark', $event)" type="textarea"
                :autosize="{ minRows: 3 }" placeholder="备注信息，不参与表格" :disabled="isViewMode" />
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
                <el-input-number :model-value="toNumber(discount)" :min="0" :max="100"
                  controls-position="right" style="width: 100%" :disabled="isViewMode"
                  @change="(val: number | undefined) => { $emit('update:discount', val); $emit('handleDiscountChange', val) }" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="成交价">
                <el-input-number :model-value="toNumber(finalPrice)" :min="0" controls-position="right"
                  style="width: 100%" :disabled="isViewMode"
                  @change="(val: number | undefined) => { $emit('update:finalPrice', val); $emit('handleManualFinalPriceChange', val) }" />
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
            <AppButton size="small" @click="$emit('restoreAutoFinalPrice')"
              :disabled="isViewMode || !isManualFinalPrice">恢复自动成交价</AppButton>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="!isViewMode" shadow="never" class="inner-card">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="section-title">粘贴 Word 内容</div>
          <slot name="parse-action"></slot>
        </div>
      </template>
      <el-input :model-value="rawText" @update:model-value="$emit('update:rawText', $event)" type="textarea" :rows="8"
        resize="vertical" placeholder="把 Word 里复制出来的表格直接粘贴到这里，再点击“智能解析粘贴内容”" />
      <div class="hint-row">
        支持名称/规格/数量/单价/总价的任意组合，缺少的列会自动隐藏；总价缺失时会用 数量 × 单价 自动计算。
      </div>
    </el-card>

    <el-card shadow="never" class="inner-card">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="section-title">报价明细</div>
          <slot name="detail-action"></slot>
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
            <el-input v-model="row.quantity" placeholder="数量" :disabled="isViewMode"
              @change="$emit('updateRowTotal', row)" />
          </template>
        </el-table-column>

        <el-table-column v-if="visibleColumns.includes('unitPrice')" label="单价" width="120" align="right">
          <template #default="{ row }">
            <el-input v-model="row.unitPrice" placeholder="单价" :disabled="isViewMode"
              @change="$emit('updateRowTotal', row)" />
          </template>
        </el-table-column>

        <el-table-column v-if="visibleColumns.includes('totalPrice')" label="总价" width="120" align="right">
          <template #default="{ row }">
            <span>¥ {{ formatMoney(row.totalPrice) }}</span>
          </template>
        </el-table-column>

        <el-table-column v-if="!hideActionColumn" label="操作" min-width="80" align="center">
          <template #default="{ $index }">
            <AppButton variant="delete" @click="$emit('removeRow', $index)" :disabled="isViewMode">删除</AppButton>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import type { PropType } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { formatMoney } from '@/utils/number'
import { TABLE_HEADER_STYLE } from '@/constants/table'
import { quotationNameRule as quotationNameBaseRule, companyNameRule as companyNameBaseRule } from '@/utils/formRules'
import type { QuotationCreatePayload, QuotationItem } from '@/types'
import { quotationApi } from '@/api/quotation'
import { to } from '@/utils/async'

const props = defineProps({
  isViewMode: Boolean,
  rulesDisabled: Boolean,
  hideActionColumn: Boolean,
  editingHistoryId: { type: [Number, null] as PropType<number | null>, default: null },
  formModel: {
    type: Object as PropType<Pick<QuotationCreatePayload, 'name' | 'companyName'>>,
    required: true
  },
  remark: String,
  discount: Number,
  finalPrice: Number,
  subtotal: Number,
  discountAmount: Number,
  autoFinalPrice: Number,
  isManualFinalPrice: Boolean,
  rawText: String,
  items: { type: Array as PropType<QuotationItem[]>, default: () => [] },
  visibleColumns: { type: Array as PropType<string[]>, default: () => [] },
  quotationDate: String,
})

const emit = defineEmits([
  'update:remark',
  'update:discount',
  'update:finalPrice',
  'update:rawText',
  'update:quotationDate',
  'handleDiscountChange',
  'handleManualFinalPriceChange',
  'restoreAutoFinalPrice',
  'updateRowTotal',
  'removeRow',
  'update:formModel'
])

const localFormModel = computed({
  get: () => props.formModel,
  set: (val) => emit('update:formModel', val)
})

const combinedFormModel = computed(() => ({
  ...props.formModel,
  quotationDate: props.quotationDate
}))

const localQuotationDate = computed({
  get: () => props.quotationDate,
  set: (val) => emit('update:quotationDate', val || '')
})

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const formRef = ref()

defineExpose({
  validate: async (callback?: (valid: boolean) => void) => {
    let valid = true;
    try {
      await formRef.value?.validate();
    } catch {
      valid = false;
    }
    if (!props.quotationDate) {
      const { showError } = require('@/utils/message');
      showError(new Error('请填写报价时间'), '校验失败');
      valid = false;
    }
    if (callback) callback(valid);
    if (!valid) return Promise.reject(new Error('Validation failed'));
    return Promise.resolve(true);
  }
})

const quotationNameRule = computed(() => (props.isViewMode || props.rulesDisabled) ? [] : quotationNameBaseRule)

const companyNameRule = computed(() => (props.isViewMode || props.rulesDisabled) ? [] : companyNameBaseRule)

let nameCheckTimer: ReturnType<typeof setTimeout> | null = null

const handleNameBlur = async () => {
  if (props.isViewMode) return
  const currentName = String(props.formModel.name || '').trim()
  const currentCompany = String(props.formModel.companyName || '').trim()
  if (!currentName) return

  if (nameCheckTimer) clearTimeout(nameCheckTimer)
  nameCheckTimer = setTimeout(async () => {
    nameCheckTimer = null
    try {
      const result = await to(quotationApi.suggestName(currentName, currentCompany || undefined, props.editingHistoryId ?? undefined))
      if (result[0] || !result[1]?.suggestedName) return
      if (result[1].suggestedName !== currentName) {
        ElMessage.warning(`名称「${currentName}」在该公司下已存在，已自动修改为「${result[1].suggestedName}」`)
        emit('update:formModel', { ...props.formModel, name: result[1].suggestedName })
      }
    } catch (_e) {
      // ignore
    }
  }, 300)
}

onBeforeUnmount(() => {
  if (nameCheckTimer) {
    clearTimeout(nameCheckTimer)
    nameCheckTimer = null
  }
})
</script>

<style scoped>
.meta-area {
  margin-bottom: 16px;
}

.inner-card {
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
  margin-bottom: 4px;
}

.price-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
  color: #475569;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
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

:deep(.el-textarea__inner) {
  line-height: 1.65 !important;
  padding: 10px 14px !important;
  font-size: 14px;
  transition: height 0.2s ease;
}

@media (max-width: 960px) {
  .price-summary {
    grid-template-columns: 1fr;
  }
}
</style>

