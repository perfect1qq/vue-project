<template>
  <!-- 业务审批详情主视图 -->
  <el-card shadow="never" class="card">
    <!-- 顶部状态概览与操作动作栏 -->
    <div class="head">
      <div>
        <h2>{{ companyName || meta.name || '审批详情' }}</h2>
        <div class="sub">单据名称：{{ meta.quotationNo || '-' }} ｜ 发起人：{{ meta.ownerName || '-' }}</div>
      </div>
      <div class="actions">
        <!-- 业务流转状态标记 -->
        <el-tag :type="tagType(meta.status)" effect="dark">{{ statusLabel(meta.status) }}</el-tag>
        <el-button @click="router.back()">返回上层</el-button>
        <!-- 针对管理员的决策按钮区 -->
        <el-button v-if="meta.status === 'pending'" type="success" :loading="actionLoading" @click="approve">准予通过</el-button>
        <el-button v-if="meta.status === 'pending'" type="danger" :loading="actionLoading" @click="reject">驳回退回</el-button>
        <el-button v-if="meta.status !== 'approved'" type="warning" :loading="actionLoading" :disabled="!editMode" @click="save">保存当前修改</el-button>
      </div>
    </div>

    <el-form class="form" label-width="90px">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="公司名称">
            <el-input v-model="companyName" :disabled="!editMode" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="折扣 (%)">
            <el-input-number 
              v-model="discount" 
              :disabled="!editMode" 
              :min="0" :max="100" 
              controls-position="right" 
              style="width: 100%"
              @change="handleDiscountChange"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="成交价">
            <el-input-number 
              v-model="finalPrice" 
              :disabled="!editMode" 
              :min="0" :precision="2" 
              controls-position="right" 
              style="width: 100%"
              @input="handleManualFinalPriceChange"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="remark" type="textarea" :rows="2" :disabled="!editMode" />
      </el-form-item>
    </el-form>

    <div class="table-container">
      <el-table :data="items" border stripe style="width:100%" :header-cell-style="headerStyle" class="smart-table">
        <el-table-column label="项目名称" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.name" :disabled="!editMode" />
          </template>
        </el-table-column>
        <el-table-column label="规格型号" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.spec" :disabled="!editMode" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="120">
          <template #default="{ row }">
            <el-input v-model="row.quantity" :disabled="!editMode" @change="updateRowTotal(row)" />
          </template>
        </el-table-column>
        <el-table-column label="单价" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.unitPrice" :disabled="!editMode" :min="0" :precision="2" controls-position="right" style="width:100%" @change="updateRowTotal(row)" />
          </template>
        </el-table-column>
        <el-table-column label="总价" width="150" align="right">
          <template #default="{ row }">
            <span class="row-total">¥ {{ Number(row.totalPrice || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 汇总区域 (保持与主模块一致) -->
    <div class="summary-bar">
      <div class="summary-item">合计小计：<span>¥ {{ Number(subtotal || 0).toFixed(2) }}</span></div>
      <div class="summary-item">优惠金额：<span>¥ {{ Number(discountAmount || 0).toFixed(2) }}</span></div>
      <div class="summary-item main">最终成交价：<strong>¥ {{ Number(finalPrice || 0).toFixed(2) }}</strong></div>
      <el-button v-if="editMode && isManualFinalPrice" type="primary" link @click="restoreAutoFinalPrice">恢复自动计算</el-button>
    </div>

    <el-divider />
    <h3 class="section-title">审批流水 & 日志</h3>
    <el-timeline class="logs">
      <el-timeline-item 
        v-for="log in logs" 
        :key="log.id" 
        :timestamp="new Date(log.createdAt).toLocaleString()"
        :type="log.action === 'approve' ? 'success' : (log.action === 'reject' ? 'danger' : 'info')"
      >
        <span class="log-op">{{ log.operatorName }}</span> 
        <el-tag size="small" :type="tagType(log.action)" class="log-tag">{{ log.action }}</el-tag>
        <span class="log-comment">{{ log.comment }}</span>
      </el-timeline-item>
    </el-timeline>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { quotationApi } from '@/api/quotation'
import { useQuotationDraft } from '@/composables/useQuotationDraft'

const route = useRoute()
const router = useRouter()
const editMode = ref(route.query.mode === 'edit')
const logs = ref([])
const actionLoading = ref(false)
// Indigo 风格表头，确保全局 UI 一致性
const headerStyle = { background: '#f8fafc', color: '#475569', fontWeight: 'bold', textAlign: 'center' }

// 基础元数据
const meta = reactive({
  id: null,
  quotationNo: '',
  name: '',
  ownerName: '',
  status: 'pending'
})

// 核心状态集成
const {
  companyName,
  remark,
  discount,
  finalPrice,
  items,
  subtotal,
  discountAmount,
  isManualFinalPrice,
  updateRowTotal,
  setFinalPriceManual,
  restoreAutoFinalPrice,
  loadRecord,
  getPayload
} = useQuotationDraft()

const tagType = (status) => ({ 
  draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info',
  submit: 'primary', approve: 'success', reject: 'danger', recall: 'warning'
 }[status] || 'info')

const statusLabel = (status) => ({ 
  draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除',
  submit: '提交审批', approve: '审批通过', reject: '审批驳回'
 }[status] || status)

// 成交价手动修改
const handleManualFinalPriceChange = (val) => {
  if (!editMode.value) return
  setFinalPriceManual(val)
}

// 折扣修改
const handleDiscountChange = () => {
  if (!editMode.value) return
  if (isManualFinalPrice.value) {
    restoreAutoFinalPrice()
  }
}

async function loadDetail() {
  try {
    const res = await quotationApi.get(route.params.id)
    const q = res.quotation || {}
    meta.id = q.id
    meta.quotationNo = q.quotationNo
    meta.name = q.name
    meta.ownerName = q.ownerName
    meta.status = q.status
    logs.value = res.logs || []
    
    loadRecord(q, editMode.value ? 'edit' : 'view')
  } catch (err) {
    ElMessage.error('加载详情失败')
  }
}

async function save() {
  if (actionLoading.value) return
  if (!companyName.value.trim()) return ElMessage.warning('公司名称不能为空')
  const payload = getPayload()
  try {
    actionLoading.value = true
    await quotationApi.update(meta.id, payload)
    ElMessage.success('报价单修改成功')
    editMode.value = false
    await loadDetail()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    actionLoading.value = false
  }
}

async function approve() {
  if (actionLoading.value) return
  const prevStatus = meta.status
  try {
    actionLoading.value = true
    meta.status = 'approved'
    await quotationApi.approve(meta.id, '审批通过 (由管理员直接修改并同意)')
    ElMessage.success('审批已通过')
    router.back()
  } catch (err) {
    meta.status = prevStatus
    ElMessage.error('操作失败')
  } finally {
    actionLoading.value = false
  }
}

async function reject() {
  if (actionLoading.value) return
  const prevStatus = meta.status
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '审批驳回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    actionLoading.value = true
    meta.status = 'rejected'
    await quotationApi.reject(meta.id, value || '拒绝')
    ElMessage.success('已驳回')
    router.back()
  } catch (err) {
    meta.status = prevStatus
    // 处理取消
  } finally {
    actionLoading.value = false
  }
}

onMounted(loadDetail)
</script>

<style scoped>
.card {   border-radius: 12px;box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05); border: none; }
.head { display:flex; justify-content:space-between; align-items:flex-end; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; }
.head h2 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; line-height: 1; border-left: 4px solid #6366f1; padding-left: 10px; }
.sub { color: #64748b; font-size: 13px; margin-top: 10px; padding-left: 14px; }
.actions { display:flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.form { margin-top: 10px; padding: 20px; background: #f8fafc; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
.table-container { margin-bottom: 20px; }
.row-total { font-weight: 700; color: #334155; }
.summary-bar { 
  display: flex; align-items: center; justify-content: flex-end; gap: 24px;
  padding: 16px 24px; background: #f8fafc; border-radius: 8px; font-size: 15px; border: 1px solid #e2e8f0;
}
.summary-item span { color: #475569; font-weight: 700; margin-left: 6px; }
.summary-item.main strong { color: #ef4444; font-size: 20px; font-weight: 800; margin-left: 8px; }
.section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 28px; margin-bottom: 20px; border-left: 4px solid #6366f1; padding-left: 10px; line-height: 1; }
.log-op { font-weight: 700; color: #1e293b; }
.log-tag { margin: 0 10px; }
.log-comment { color: #64748b; font-size: 14px; }
</style>
