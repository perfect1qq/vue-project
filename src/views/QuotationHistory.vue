<template>
  <div class="quotation-history-page">
    <div v-if="viewState === 'list'" class="history-list-view">
      <el-card shadow="never" class="card">
        <div class="history-toolbar">
          <el-input
            v-model="searchKeyword"
            placeholder="按公司名称 / 名称搜索"
            clearable
            style="max-width: 340px"
            @input="onKeywordInput"
          />
          <el-tag type="info">  共 {{ total }} 个公司 / {{ totalRecords }} 条记录</el-tag>
        </div>

        <div class="history-content-wrap">
          <el-skeleton v-if="loading" animated :rows="8" />

          <template v-else>
            <el-empty v-if="!pagedHistoryGroups.length" description="暂无历史报价单" />

            <el-collapse v-else v-model="activePanels" class="company-collapse">
              <el-collapse-item
                v-for="group in pagedHistoryGroups"
                :key="group.companyName"
                :name="group.companyName"
              >
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

                <el-table
                  :data="group.records"
                  stripe
                  border
                  :header-cell-style="headerStyle"
                  class="smart-table"
                  style="width: 100%"
                >
                  <el-table-column prop="quotationNo" label="名称" min-width="150" />
                  <el-table-column prop="ownerName" label="提交人" width="120" v-if="role === 'admin'" />
                  <el-table-column prop="finalPrice" label="成交价" width="120" align="right">
                    <template #default="{ row }">¥ {{ formatMoney(row.finalPrice) }}</template>
                  </el-table-column>
                  <el-table-column prop="createDate" label="创建时间" width="120" />
                  <el-table-column label="操作" width="260" align="center">
                    <template #default="{ row }">
                      <el-button link type="primary" size="small" @click="openDetail(row, 'view')">查看</el-button>
                      <el-button
                        link
                        type="warning"
                        size="small"
                        :loading="isActionLoading(row.id)"
                        @click="openDetail(row, 'edit')"
                      >
                        修改
                      </el-button>
                      <el-button
                        link
                        type="danger"
                        size="small"
                        :loading="isActionLoading(row.id)"
                        @click="deleteHistory(row)"
                      >
                        删除
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </el-collapse-item>
            </el-collapse>
          </template>

          <div class="pager-wrap" v-if="total">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[ 10, 20, 50,60]"
              :total="total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </el-card>
    </div>

    <div v-else class="history-detail-view">
      <el-card shadow="never" class="card">
        <div class="toolbar">
          <el-button @click="backToList">返回列表</el-button>
          <el-button v-if="!isViewMode" type="primary" :icon="DocumentAdd" @click="handleParseText" :loading="parsing">智能解析粘贴内容</el-button>
          <el-button type="primary" plain :icon="Plus" @click="addRow" :disabled="isViewMode">手动添加一行</el-button>
          <el-button :icon="Refresh" @click="clearRows" :disabled="isViewMode">清空当前表格</el-button>
          <el-button type="success" :icon="DocumentAdd" @click="handleSubmit" :loading="isSubmitting" :disabled="isViewMode">确认保存报价单</el-button>
        </div>

        <el-row :gutter="16" class="meta-area">
          <el-col :xs="24" :md="12">
            <el-card shadow="never" class="inner-card">
              <template #header>
                <div class="section-title">基础信息</div>
              </template>
              <el-form label-width="92px">
                <el-form-item label="名称" required>
                  <el-input v-model="quotationNo" placeholder="请输入名称" :disabled="isViewMode" />
                </el-form-item>
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

        <el-card v-if="!isViewMode" shadow="never" class="inner-card">
          <template #header>
            <div class="section-title">粘贴 Word 内容</div>
          </template>
          <el-input
            v-model="rawText"
            type="textarea"
            :rows="8"
            resize="vertical"
            placeholder="把 Word 里复制出来的表格直接粘贴到这里，再点击“智能解析粘贴内容”"
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
            class="smart-table"
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
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, DocumentAdd, Plus, Refresh } from '@element-plus/icons-vue'
import { quotationApi } from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'
import { useQuotationHistory } from '@/composables/useQuotationHistory'
import { readCurrentUser } from '@/utils/navigation'

const role = ref(readCurrentUser().role || 'user')
const headerStyle = { background: '#f8fafc', color: '#475569', fontWeight: 'bold', textAlign: 'center' }
const parsing = ref(false)
const isSubmitting = ref(false)
const viewState = ref('list')
const activePanels = ref([])

const formatMoney = (val) => {
  const num = Number(val || 0)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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
    activePanels.value = groups.length ? [groups[0].companyName] : []
  },
  { immediate: true }
)

const handleManualFinalPriceChange = (value) => {
  if (isViewMode.value) return
  setFinalPriceManual(value)
}

const handleDiscountChange = () => {
  if (isViewMode.value) return
  if (isManualFinalPrice.value) restoreAutoFinalPrice()
}

const handleParseText = async () => {
  if (isViewMode.value) return
  const text = String(rawText.value ?? '').trim()
  if (!text) return ElMessage.warning('请先粘贴报价内容至编辑框内')

  parsing.value = true
  try {
    const result = await quotationApi.parseText(text)
    if (!result) return
    setRows(result.items || [], result.columns || [])
    if (result.warnings?.length) ElMessage.warning(result.warnings[0])
    else ElMessage.success('文本解析完成，已渲染至下方数据表')
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '解析失败，请检查服务连通性')
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
    return meaningful ? ((hasQty && hasUnit) || hasTotal) : false
  })

  if (!quotationNo.value.trim()) return ElMessage.warning('请先填写名称'), false
  if (!companyName.value.trim()) return ElMessage.warning('请先填写公司名称归属'), false
  if (!validRows.length) return ElMessage.warning('请先录入或使用 AI 智能粘贴获取报价明细'), false
  if (validRows.length !== items.value.length) return ElMessage.warning('表格存在残缺不完整的数据行，请修正后继续'), false
  return true
}

const handleSubmit = async () => {
  if (isSubmitting.value) return
  if (!validateRows()) return

  const payload = getPayload()
  if (editingHistoryId.value && JSON.stringify(payload) === originalPayloadStr.value) {
    return ElMessage.warning('没有做任何修改，无法保存无用的沉余记录！')
  }

  isSubmitting.value = true
  try {
    const result = await saveQuotation(payload, editingHistoryId.value)
    if (result) {
      ElMessage.success(editingHistoryId.value ? '修改保存成功！' : '成功创建了一条新报价单！')
      await backToList()
    }
  } catch (error) {
    ElMessage.error(error?.response?.data?.message ?? error.message ?? '入库失败，请稍后刷新重试！')
  } finally {
    isSubmitting.value = false
  }
}

const fetchQuotationRecord = async (id) => {
  const result = await quotationApi.get(id)
  return result?.quotation || result?.record || result
}

const openDetail = async (record, mode = 'view') => {
  if (!record?.id) return
  resetDraft()
  const detail = record.items ? record : await fetchQuotationRecord(record.id)
  loadRecord(detail, mode)
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
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '历史记录加载失败')
  }
})
</script>

<style scoped>
.quotation-history-page { padding: 0; }
.card { border-radius: 12px; border: none; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); }
.history-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.history-content-wrap { overflow: visible; }
.history-list-view, .history-detail-view { width: 100%; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.meta-area { margin-bottom: 16px; }
.inner-card { border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
.section-title { font-size: 15px; font-weight: 700; color: #1e293b; border-left: 4px solid #6366f1; padding-left: 10px; line-height: 1; margin-bottom: 4px; }
.price-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; color: #475569; background: #f8fafc; padding: 12px; border-radius: 6px; }
.price-summary strong { color: #020617; font-size: 15px; }
.price-actions { margin-top: 14px; }
.hint-row { margin-top: 10px; color: #64748b; font-size: 13px; line-height: 1.6; }
.pager-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
.company-collapse { border-top: 1px solid #e5e7eb; }
.group-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%; padding-right: 12px; }
.group-title-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.group-company { font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.group-title-meta { color: #64748b; font-size: 13px; white-space: nowrap; }

@media (max-width: 768px) {
  .history-toolbar { margin-bottom: 10px; align-items: flex-start; }
  .history-toolbar :deep(.el-input),
  .history-toolbar :deep(.el-input__wrapper) { width: 100% !important; max-width: 100% !important; }
  .toolbar { margin-bottom: 12px; gap: 8px; }
  .price-summary { grid-template-columns: 1fr; }
  .pager-wrap { justify-content: center; }
  .group-title { flex-direction: column; align-items: flex-start; gap: 6px; }
  .group-title-meta { white-space: normal; }
}
</style>
