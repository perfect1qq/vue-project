<!--
  @file views/QuotationHistory.vue
  @description 报价单历史记录页面

  功能说明：
  - 展示所有历史报价单记录（按公司名称分组）
  - 支持按公司名/提交人搜索
  - 分页展示（支持 10/20/50/60 条每页）
  - 查看详情 / 编辑 / 删除操作
  - 可折叠的分组面板（类似手风琴效果）

  页面布局：
  ┌──────────────────────────────────────────────────────────────┐
  │  QuotationHistory (报价单历史)                                │
  │                                                              │
  │  Toolbar: [搜索框] [统计标签: X个公司/Y条记录]               │
  │                                                              │
  │  Collapse (公司分组)                                         │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ ▼ 武汉测试公司 (3条) 最新: 2024-01-15                  │  │
  │  │ ┌───────────────────────────────────────────────────┐  │  │
  │  │ │ 报价单号 | 提交人 | 成交价 | 创建时间 | 操作      │  │  │
  │  │ ├───────────────────────────────────────────────────┤  │  │
  │  │ │ QT001   | 张三  | ¥1000 | 01-10  |[查看][修改]  │  │  │
  │  │ │ QT002   | 张三  | ¥2000 | 01-12  |[查看][修改]  │  │  │
  │  │ └───────────────────────────────────────────────────┘  │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  Pagination: [共X条] [< 1 2 3 >] [每页: ▼10条]             │
  └──────────────────────────────────────────────────────────────┘

  数据结构：
  - 原始数据：扁平的报价单列表
  - 分组后：按 companyName 聚合，每个分组包含：
    * companyName: 公司名称
    * count: 该公司的报价单数量
    * latestDate: 最新一条的创建时间
    * records: 该公司的所有报价单数组

  权限控制：
  - admin/user: 可查看、编辑、删除
  - guest: 仅可查看（无修改和删除按钮）

  API 调用：
  - GET /api/quotations/history?keyword=&page=&pageSize= → 获取历史记录
  - DELETE /api/quotations/:id → 删除指定报价单

  特性说明：
  - 使用 el-collapse 实现可折叠分组
  - 支持实时搜索过滤（防抖处理）
  - 使用 useInstantListActions 实现乐观更新
-->

<template>
  <div class="quotation-history-page">
    <div v-if="viewState === 'list'" class="history-list-view">
      <el-card shadow="never" class="card">
        <div class="history-toolbar">
          <el-input v-model="searchKeyword" placeholder="按公司名称 / 名称搜索" clearable style="max-width: 340px"
            @input="onKeywordInput" />
          <el-tag type="info"> 共 {{ total }} 个公司 / {{ totalRecords }} 条记录</el-tag>
        </div>

        <div class="history-content-wrap">
          <el-skeleton v-if="loading" animated :rows="8" />

          <template v-else>
            <el-empty v-if="!pagedHistoryGroups.length" description="暂无历史报价单" />

            <el-collapse v-else v-model="activePanels" class="company-collapse">
              <el-collapse-item v-for="group in pagedHistoryGroups" :key="group.companyName" :name="group.companyName">
                <template #title>
                  <div class="group-title">
                    <div class="group-title-main">
                      <span class="group-company">{{ group.companyName }}</span>
                      <el-tag size="small" type="info">{{ group.count }} 条</el-tag>
                    </div>
                    <div class="group-title-meta">
                      <span>最新：{{ group.latestDate || '-' }}</span>
                    </div>
                  </div>
                </template>

                <el-table :data="group.records" stripe border :header-cell-style="TABLE_HEADER_STYLE"
                  class="smart-table" style="width: 100%">
                  <el-table-column prop="quotationNo" label="名称" min-width="140" show-overflow-tooltip align="center" />
                  <el-table-column prop="ownerName" label="提交人" min-width="90" align="center" v-if="role === 'admin'" />
                  <el-table-column prop="finalPrice" label="成交价" min-width="110" align="center">
                    <template #default="{ row }">¥ {{ formatMoney(row.finalPrice) }}</template>
                  </el-table-column>
                  <el-table-column prop="createDate" label="创建时间" width="110" align="center" />
                  <el-table-column label="操作" fixed="right" :width="isGuest ? 80 : 220" align="center">
                    <template #default="{ row }">
                      <div class="action-btns">
                        <el-button type="primary" size="small" round @click="openDetail(row, 'view')">查看</el-button>
                        <template v-if="!isGuest">
                          <el-button type="warning" size="small" plain :loading="isActionLoading(row.id)"
                            @click="openDetail(row, 'edit')">
                            修改
                          </el-button>
                          <el-button type="danger" size="small" plain :loading="isActionLoading(row.id)"
                            @click="deleteHistory(row)">
                            删除
                          </el-button>
                        </template>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </el-collapse-item>
            </el-collapse>
          </template>

          <div class="pager-wrap" v-if="total">
            <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 60]"
              :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
              @current-change="handleCurrentChange" />
          </div>
        </div>
      </el-card>
    </div>

    <div v-else class="history-detail-view">
      <el-card shadow="never" class="card">
        <div class="toolbar">
          <el-button @click="backToList">返回列表</el-button>
          <el-button v-if="!isViewMode" type="primary" :icon="DocumentAdd" @click="handleParseText"
            :loading="parsing">智能解析粘贴内容</el-button>
          <el-button type="primary" plain :icon="Plus" @click="addRow" :disabled="isViewMode">手动添加一行</el-button>
          <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">清空当前表格</el-button>
          <el-button type="success" :icon="DocumentAdd" @click="handleSubmit" :loading="isSubmitting"
            :disabled="isViewMode">确认保存报价单</el-button>
        </div>

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
        />
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { Delete, DocumentAdd, Plus, Refresh } from '@element-plus/icons-vue'
import quotationApi from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'
import { useQuotationHistory } from '@/composables/useQuotationHistory'
import { useQuotationEditor } from '@/composables/useQuotationEditor'
import { readCurrentUser } from '@/utils/navigation'
import { usePermissions } from '@/composables/usePermissions'
import { formatMoney } from '@/utils/number'
import { showError } from '@/utils/message'
import { TABLE_HEADER_STYLE } from '@/constants/table'
import QuotationEditor from '@/components/quotation/QuotationEditor.vue'

const route = useRoute()
const role = ref(readCurrentUser().role || 'user')
const { isGuest } = usePermissions()
const parsing = ref(false)
const isSubmitting = ref(false)
const rulesDisabled = ref(false)
const viewState = ref('list')
const activePanels = ref([])

const formRef = ref(null)
const formModel = reactive({
  quotationNo: '',
  companyName: ''
})

const {
  quotationNo,
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
  subtotal,
  autoFinalPrice,
  discountAmount,
  resetDraft,
  setRows,
  addRow,
  removeRow,
  clearRows,
  updateRowTotal,
  setFinalPriceManual,
  restoreAutoFinalPrice,
  loadRecord,
  getPayload,
  originalPayloadStr
} = useQuotationDraft()

const {
  groupedHistoryList,
  pagedHistoryGroups,
  searchKeyword,
  page,
  pageSize,
  total,
  loading,
  isActionLoading,
  loadHistoryList,
  onKeywordInput,
  handleCurrentChange,
  handleSizeChange,
  saveQuotation,
  deleteHistory
} = useQuotationHistory({
  api: quotationApi,
  loadToEditor: (record, mode) => loadRecord(record, mode)
})

const totalRecords = computed(() => groupedHistoryList.value.reduce((sum, group) => sum + group.count, 0))

watch(
  pagedHistoryGroups,
  (groups) => {
    // 这个会自动展开折叠的
    // activePanels.value = groups.length ? [groups[0].companyName] : [] 
    activePanels.value = [] // 切换页码时默认全部折叠，避免性能问题和视觉干扰
  },
  { immediate: true }
)

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
  onSaveSuccess: async () => {
    rulesDisabled.value = true
    await backToList()
  }
})

const fetchQuotationRecord = async (id) => {
  const result = await quotationApi.get(id)
  return result?.quotation || result?.record || result
}

const openDetail = async (record, mode = 'view') => {
  if (!record?.id) return
  resetDraft()
  if (mode === 'edit') {
    rulesDisabled.value = false
  }
  const detail = record.items ? record : await fetchQuotationRecord(record.id)
  loadRecord(detail, mode)
  formModel.quotationNo = quotationNo.value
  formModel.companyName = companyName.value
  viewState.value = 'detail'
}

const backToList = async () => {
  viewState.value = 'list'
  resetDraft()
  await loadHistoryList()
}

onMounted(async () => {
  try {
    await loadHistoryList()

    const queryId = route.query.id
    const queryMode = route.query.mode || 'view'
    if (queryId) {
      const detail = await fetchQuotationRecord(Number(queryId))
      if (detail) {
        if (queryMode === 'edit') {
          rulesDisabled.value = false
        } else {
          rulesDisabled.value = true
        }
        loadRecord(detail, queryMode)
        formModel.quotationNo = quotationNo.value
        formModel.companyName = companyName.value
        viewState.value = 'detail'
      }
    }
  } catch (error) {
    showError(error, '历史记录加载失败')
  }
})
</script>

<style scoped>
.quotation-history-page {
  padding: 0;
}

.card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.history-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.history-content-wrap {
  overflow: visible;
}

.history-list-view,
.history-detail-view {
  width: 100%;
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

.pager-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.company-collapse {
  border-top: 1px solid #e5e7eb;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding-right: 12px;
}

.group-title-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.group-company {
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.group-title-meta {
  color: #64748b;
  font-size: 13px;
  white-space: nowrap;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
}

@media (max-width: 768px) {
  .history-toolbar {
    margin-bottom: 10px;
    align-items: flex-start;
  }

  .history-toolbar :deep(.el-input),
  .history-toolbar :deep(.el-input__wrapper) {
    width: 100% !important;
    max-width: 100% !important;
  }

  .toolbar {
    margin-bottom: 12px;
    gap: 8px;
  }

  .pager-wrap {
    justify-content: center;
  }

  .group-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .group-title-meta {
    white-space: normal;
  }
}

.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.action-btns .el-button {
  padding: 5px 12px;
}
</style>
