<!--
  @file components/quotation/QuotationEditor.vue
  @description 报价单编辑器组件（核心业务组件）

  功能说明：
  - 提供报价单的完整编辑界面（基础信息 + 价格设置 + 明细表格）
  - 支持三种模式：新建、编辑、查看（只读）
  - 实时计算价格（小计、优惠金额、自动成交价）
  - 支持 Word 表格内容粘贴并智能解析
  - 集成可编辑表格组件，支持行增删改

  组件结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  QuotationEditor (报价单编辑器)                               │
  │                                                              │
  │  ┌─── 基础信息区域 (meta-area) ──────────────────────────┐   │
  │  │  ┌──────────────────┬────────────────────────────┐    │   │
  │  │  │ 基础信息卡片      │ 价格设置卡片               │    │   │
  │  │  │                  │                            │    │   │
  │  │  │ 名称: [________] │ 折扣(%): [____]            │    │   │
  │  │  │ 公司: [________] │ 成交价: [____]             │    │   │
  │  │  │ 备注: [________] │                            │    │   │
  │  │  │                  │ 小计: ¥ xxx                │    │   │
  │  │  │                  │ 优惠: ¥ xxx                │    │   │
  │  │  │                  │ 自动成交价: ¥ xxx          │    │   │
  │  │  │                  │ 状态: [自动/手动]           │    │   │
  │  │  │                  │ [恢复自动成交价]            │    │   │
  │  │  └──────────────────┴────────────────────────────┘    │   │
  │  └──────────────────────────────────────────────────────┘   │
  │                                                              │
  │  ┌─── Word 粘贴区域（仅非查看模式）────────────────────┐   │
  │  │  粘贴 Word 内容                                       │   │
  │  │  [________________________________________________]  │   │
  │  │  [智能解析按钮]                                        │   │
  │  └──────────────────────────────────────────────────────┘   │
  │                                                              │
  │  ┌─── 报价明细区域 ─────────────────────────────────────┐   │
  │  │  报价明细                              [操作按钮插槽]  │   │
  │  │  ┌────────────────────────────────────────────────┐  │   │
  │  │  │ 序号 | 名称 | 规格 | 数量 | 单价 | 总价 | 操作 │  │   │
  │  │  ├────────────────────────────────────────────────┤  │   │
  │  │  │  1   | ...  | ...  | ...  | ...  | ...  | 删除 │  │   │
  │  │  │  2   | ...  | ...  | ...  | ...  | ...  | 删除 │  │   │
  │  │  │  [+ 添加一行]                                   │  │   │
  │  │  └────────────────────────────────────────────────┘  │   │
  │  └──────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────┘

  Props 定义：
  - formModel: Object - 表单数据模型（quotationNo, companyName, remark）
  - discount: number - 折扣百分比（0-100）
  - finalPrice: number - 成交价（可为手动或自动计算）
  - subtotal: number - 小计（Σ 数量 × 单价）
  - discountAmount: number - 优惠金额（小计 × 折扣%）
  - autoFinalPrice: number - 自动计算的成交价（小计 - 优惠）
  - isManualFinalPrice: boolean - 是否使用手动成交价
  - rawText: string - 从 Word 粘贴的原始文本
  - isViewMode: boolean - 是否为只读模式

  Events 定义：
  - update:* 系列 - 双向绑定更新事件（v-model 语法支持）
  - handleDiscountChange - 折扣变化回调
  - handleManualFinalPriceChange - 手动修改成交价回调
  - restoreAutoFinalPrice - 恢复自动计算价格

  插槽定义：
  - detail-action: 明细区域右上角的额外操作按钮

  价格计算逻辑：
  ┌─────────────────────────────────────────────────────────────┐
  │  计算公式                                                    │
  ├─────────────────────────────────────────────────────────────┤
  │  subtotal = Σ(item.quantity × item.unitPrice)               │
  │  discountAmount = subtotal × (discount / 100)              │
  │  autoFinalPrice = subtotal - discountAmount                 │
  │                                                             │
  │  手动模式：                                                  │
  │  - 用户可直接输入 finalPrice                                │
  │  - 显示"手动成交价"警告标签                                  │
  │  - 可点击"恢复自动成交价"回到自动模式                       │
  └─────────────────────────────────────────────────────────────┘

  使用场景：
  - QuotationList.vue 中作为新建/编辑报价单的表单区域
  - approvalDetail.vue 中作为审批详情的展示/编辑区域
-->

<template>
  <div class="quotation-editor-component">
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
              <el-input :model-value="remark" @update:model-value="$emit('update:remark', $event)" type="textarea" :rows="3" placeholder="备注信息，不参与表格" :disabled="isViewMode" />
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
                  @change="(val) => { $emit('update:discount', val); $emit('handleDiscountChange', val) }" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="成交价">
                <el-input-number :model-value="toNumber(finalPrice)" :min="0" :precision="2" controls-position="right"
                  style="width: 100%" :disabled="isViewMode"
                  @change="(val) => { $emit('update:finalPrice', val); $emit('handleManualFinalPriceChange', val) }" />
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
            <el-button size="small" @click="$emit('restoreAutoFinalPrice')"
              :disabled="isViewMode || !isManualFinalPrice">恢复自动成交价</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="!isViewMode" shadow="never" class="inner-card">
      <template #header>
        <div class="section-title">粘贴 Word 内容</div>
      </template>
      <el-input :model-value="rawText" @update:model-value="$emit('update:rawText', $event)" type="textarea" :rows="8" resize="vertical"
        placeholder="把 Word 里复制出来的表格直接粘贴到这里，再点击“智能解析粘贴内容”" />
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
            <el-input v-model="row.quantity" placeholder="数量" :disabled="isViewMode" @change="$emit('updateRowTotal', row)" />
          </template>
        </el-table-column>

        <el-table-column v-if="visibleColumns.includes('unitPrice')" label="单价" width="120" align="right">
          <template #default="{ row }">
            <el-input v-model="row.unitPrice" placeholder="单价" :disabled="isViewMode" @change="$emit('updateRowTotal', row)" />
          </template>
        </el-table-column>

        <el-table-column v-if="visibleColumns.includes('totalPrice')" label="总价" width="120" align="right">
          <template #default="{ row }">
            <span>¥ {{ formatMoney(row.totalPrice) }}</span>
          </template>
        </el-table-column>

        <el-table-column v-if="!hideActionColumn" label="操作" width="80" fixed="right" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="$emit('removeRow', $index)"
              :disabled="isViewMode">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { formatMoney } from '@/utils/number'
import { TABLE_HEADER_STYLE } from '@/constants/table'

const props = defineProps({
  isViewMode: Boolean,
  rulesDisabled: Boolean,
  hideActionColumn: Boolean,
  formModel: {
    type: Object,
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
  items: Array,
  visibleColumns: Array
})

const emit = defineEmits([
  'update:remark',
  'update:discount',
  'update:finalPrice',
  'update:rawText',
  'handleDiscountChange',
  'handleManualFinalPriceChange',
  'restoreAutoFinalPrice',
  'updateRowTotal',
  'removeRow'
])

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const formRef = ref()

defineExpose({
  validate: (callback) => formRef.value?.validate(callback)
})

const quotationNameRule = computed(() => (props.isViewMode || props.rulesDisabled) ? [] : [
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

const companyNameRule = computed(() => (props.isViewMode || props.rulesDisabled) ? [] : [
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
</script>

<style scoped>
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
</style>
