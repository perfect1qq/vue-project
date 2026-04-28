<!--
  @file views/QuotationList.vue
  @description 报价单主工作页面（创建/编辑/查看）

  功能说明：
  - 报价单的创建、编辑和查看
  - 智能解析粘贴内容（AI 辅助，自动识别表格数据）
  - 手动添加/删除明细行
  - 项目明细管理（名称、规格、数量、单价）
  - 自动计算小计、折扣金额、成交价
  - 支持手动覆盖成交价（折扣计算 vs 手动输入）
  - 保存到历史记录 / 提交审批流程

  页面结构：
  ┌──────────────────────────────────────────────────────┐
  │  el-card (报价单容器)                                  │
  │  ┌──────────────────────────────────────────────────┐ │
  │  │ toolbar (操作工具栏)                              │ │
  │  │ [智能解析] [清空] [确认保存] [模式切换按钮]       │ │
  │  ├──────────────────────────────────────────────────┤ │
  │  │ QuotationEditor (报价单编辑器组件)                │ │
  │  │ ┌────────────────────────────────────────────┐   │ │
  │  │ │ 表头：报价单号 | 公司名称                    │   │ │
  │  │ ├────────────────────────────────────────────┤   │ │
  │  │ │ 明细表格：名称 | 规格 | 数量 | 单价 | 小计   │   │ │
  │  │ │ [添加一行] 按钮                             │   │ │
  │  │ ├────────────────────────────────────────────┤   │ │
  │  │ │ 底部：备注 | 折扣 | 成交价                   │   │ │
  │  │ └────────────────────────────────────────────┘   │ │
  │  └──────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────┘

  状态管理架构：
  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ useQuotationDraft│  │ useQuotationHistory│  │ useQuotationEditor│
  │ (草稿状态)        │  │ (历史记录)         │  │ (编辑交互)         │
  ├─────────────────┤  ├──────────────────┤  ├──────────────────┤
  │ items[]          │  │ saveQuotation()  │  │ handleParseText() │
  │ discount         │  │ deleteHistory()  │  │ handleSubmit()    │
  │ finalPrice       │  │ loadToEditor()   │  │ validateRows()    │
  │ isManualFinalPrice│ └──────────────────┘  └──────────────────┘
  │ visibleColumns   │
  │ addRow/removeRow │
  └─────────────────┘

  权限控制：
  - 游客(isGuest): 只读模式，隐藏所有编辑按钮
  - 普通用户: 完整编辑权限
  - 管理员: 完整编辑权限 + 审批功能
-->

<template>
  <div class="quotation-page">
    <el-card shadow="never" class="card">
      <!-- ==================== 顶部操作工具栏 ==================== -->
      <div class="toolbar">
        <!-- 非游客用户显示的操作按钮 -->
        <template v-if="!isGuest">
          <!-- AI 智能解析：将粘贴的文本自动识别为表格行 -->
          <el-button
            v-if="!isViewMode"
            type="primary"
            :icon="DocumentAdd"
            @click="handleParseText"
            :loading="parsing"
          >
            智能解析粘贴内容
          </el-button>

          <!-- 清空当前表格所有行 -->
          <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">
            清空当前表格
          </el-button>

          <!-- 保存报价单到历史记录 -->
          <el-button
            type="success"
            :icon="DocumentAdd"
            @click="handleSubmit"
            :loading="isSubmitting"
            :disabled="isViewMode"
          >
            确认保存报价单
          </el-button>
        </template>

        <!--
          QuotationModeActions: 模式切换组件
          提供"重置"、"切换到编辑"等模式切换按钮
          仅在查看模式下显示"切换到编辑"按钮
        -->
        <QuotationModeActions
          :is-editing="isEditing"
          :is-view-mode="isViewMode"
          @reset="resetDraft"
          @switch-edit="switchToEdit"
        />
      </div>

      <!-- ==================== 报价单编辑器核心区域 ==================== -->

      <!--
        QuotationEditor: 报价单编辑器子组件
        负责渲染表头、明细表格、底部汇总区域

        Props 说明：
        - isViewMode: 是否只读查看模式
        - formModel: { quotationNo, companyName } 基础信息
        - items: 明细行数据数组
        - visibleColumns: 动态列配置

        Events 说明：
        - handle-discount-change: 折扣值变化时重新计算成交价
        - update-row-total: 单行数量/单价变化时更新小计
        - remove-row: 删除某一行
      -->
      <QuotationEditor
        ref="formRef"
        :is-view-mode="isViewMode"
        :rules-disabled="rulesDisabled"
        :form-model="formModel"
        v-model:remark="remark"
        v-model:discount="discount"
        v-model:final-price="finalPrice"
        v-model:raw-text="rawText"
        :subtotal="subtotal"
        :discount-amount="discountAmount"
        :auto-final-price="autoFinalPrice"
        :is-manual-final-price="isManualFinalPrice"
        :items="items"
        :visible-columns="visibleColumns"
        :hide-action-column="isGuest"
        @handle-discount-change="handleDiscountChange"
        @handle-manual-final-price-change="handleManualFinalPriceChange"
        @restore-auto-final-price="restoreAutoFinalPrice"
        @update-row-total="updateRowTotal"
        @remove-row="removeRow"
      >
        <!-- 插槽：明细表格上方的操作按钮 -->
        <template #detail-action>
          <el-button
            v-if="!isGuest && !isViewMode"
            type="primary"
            plain
            :icon="Plus"
            @click="addRow"
            size="small"
          >
            添加一行
          </el-button>
        </template>
      </QuotationEditor>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import {
  Delete,
  DocumentAdd,
  Plus,
  Refresh,
} from '@element-plus/icons-vue'
import quotationApi from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'
import { useQuotationHistory } from '@/composables/useQuotationHistory'
import { useQuotationEditor } from '@/composables/useQuotationEditor'
import { usePermissions } from '@/composables/usePermissions'
import QuotationModeActions from '@/components/quotation/QuotationModeActions.vue'
import QuotationEditor from '@/components/quotation/QuotationEditor.vue'

const { isGuest } = usePermissions()

/** 编辑器组件引用（用于程序化触发验证） */
const formRef = ref(null)

/**
 * 基础表单模型（响应式对象）
 * - quotationNo: 报价单编号
 * - companyName: 公司名称
 */
const formModel = reactive({
  quotationNo: '',
  companyName: '',
})

/** AI 解析进行中状态 */
const parsing = ref(false)

/** 保存提交进行中状态 */
const isSubmitting = ref(false)

/** 是否禁用表单验证规则（保存成功后禁用） */
const rulesDisabled = ref(false)

// ==================== Composables 集成 ====================

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
  originalPayloadStr, // 暴露深比对历史快照
} = useQuotationDraft()

// 同步 formModel 与 useQuotationDraft 的值
watch(quotationNo, (val) => {
  formModel.quotationNo = val
})
watch(companyName, (val) => {
  formModel.companyName = val
})

// --- [状态管理] 历史记录逻辑 ---
const { saveQuotation, deleteHistory } = useQuotationHistory({
  api: quotationApi,
  loadToEditor: (record, mode) => loadRecord(record, mode),
})

// --- [交互处理] 编辑器事件处理 ---
const {
  handleManualFinalPriceChange,
  handleDiscountChange,
  handleParseText,
  validateRows,
  handleSubmit,
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
  },
})

/**
 * 切换到编辑模式
 *
 * 从查看模式切换回编辑模式，
 * 重新加载当前记录的数据到编辑器
 */
const switchToEdit = () => {
  if (!isViewMode.value) return
  rulesDisabled.value = false
  formModel.quotationNo = quotationNo.value
  formModel.companyName = companyName.value
  loadRecord(
    {
      id: editingHistoryId.value,
      quotationNo: quotationNo.value,
      companyName: companyName.value,
      remark: remark.value,
      discount: discount.value,
      finalPrice: finalPrice.value,
      isManual: isManualFinalPrice.value,
      items: items.value,
    },
    'edit',
  )
}
</script>

<style scoped>
/** 页面根容器：无内边距 */
.quotation-page {
  padding: 0;
}

/**
 * 卡片样式
 * - 圆角边框
 * - 轻微阴影效果
 * - 无默认边框
 */
.card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: none;
}

/**
 * 工具栏布局
 * - Flex 弹性布局
 * - 子元素间距 10px
 * - 支持换行（小屏幕自适应）
 * - 底部间距 20px
 */
.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

/** 移动端适配：缩小间距 */
@media (max-width: 768px) {
  .toolbar {
    margin-bottom: 12px;
    gap: 8px;
  }
}
</style>
