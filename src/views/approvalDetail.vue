<template>
  <el-card shadow="never" class="card">
    <div class="head">
      <div>
        <h2>{{ form.companyName || form.name || '审批详情' }}</h2>
        <div class="sub">编号：{{ form.quotationNo || '-' }} ｜ 提交人：{{ form.ownerName || '-' }}</div>
      </div>
      <div class="actions">
        <el-tag :type="tagType(form.status)">{{ statusLabel(form.status) }}</el-tag>
        <el-button @click="router.back()">返回</el-button>
        <el-button v-if="form.status === 'pending'" type="success" @click="approve">通过</el-button>
        <el-button v-if="form.status === 'pending'" type="danger" @click="reject">驳回</el-button>
        <el-button v-if="form.status !== 'approved'" type="warning" :disabled="!editMode" @click="save">保存</el-button>
      </div>
    </div>

    <el-form class="form" label-width="90px" :model="form">
      <el-row :gutter="16">
        <el-col :span="12"><el-form-item label="公司名称"><el-input v-model="form.companyName" :disabled="!editMode" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="状态"><el-input :model-value="statusLabel(form.status)" disabled /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="折扣"><el-input-number v-model="form.discount" :disabled="!editMode" :min="0" :max="100" controls-position="right" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="成交价"><el-input-number v-model="form.finalPrice" :disabled="!editMode" :min="0" :precision="2" controls-position="right" /></el-form-item></el-col>
      </el-row>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" :disabled="!editMode" /></el-form-item>
    </el-form>

    <el-table :data="form.items" border stripe style="width:100%; margin-top: 12px" :header-cell-style="headerStyle">
      <el-table-column label="名称" min-width="150"><template #default="{ row }"><el-input v-model="row.name" :disabled="!editMode" /></template></el-table-column>
      <el-table-column label="规格" min-width="120"><template #default="{ row }"><el-input v-model="row.spec" :disabled="!editMode" /></template></el-table-column>
      <el-table-column label="数量" min-width="110"><template #default="{ row }"><el-input v-model="row.quantity" :disabled="!editMode" /></template></el-table-column>
      <el-table-column label="单价" min-width="120"><template #default="{ row }"><el-input-number v-model="row.unitPrice" :disabled="!editMode" :min="0" :precision="2" style="width:100%" /></template></el-table-column>
      <el-table-column label="总价" min-width="120" align="center"><template #default="{ row }">¥ {{ Number(row.totalPrice || 0).toFixed(2) }}</template></el-table-column>
    </el-table>

    <el-divider />
    <h3>审批记录</h3>
    <el-timeline>
      <el-timeline-item v-for="log in logs" :key="log.id" :timestamp="log.createdAt">{{ log.action }} - {{ log.comment }}</el-timeline-item>
    </el-timeline>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { quotationApi } from '@/api/quotation'

const route = useRoute()
const router = useRouter()
const editMode = ref(route.query.mode === 'edit')
const logs = ref([])
const headerStyle = { background: '#f5f7fa', fontWeight: 'bold', textAlign: 'center' }
const form = reactive({ id: null, quotationNo: '', name: '', companyName: '', ownerName: '', status: 'pending', items: [], remark: '', discount: 0, finalPrice: 0, isManual: false })

const tagType = (status) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info' }[status] || 'info')
const statusLabel = (status) => ({ draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }[status] || status)

async function loadDetail() {
  const res = await quotationApi.get(route.params.id)
  const q = res.quotation || {}
  Object.assign(form, q)
  logs.value = res.logs || []
}

async function save() {
  const payload = {
    companyName: form.companyName || form.name,
    name: form.companyName || form.name,
    items: form.items,
    remark: form.remark,
    discount: form.discount,
    finalPrice: form.finalPrice,
    isManual: true
  }
  await quotationApi.update(form.id, payload)
  ElMessage.success('修改成功')
  editMode.value = false
  await loadDetail()
}

async function approve() {
  await quotationApi.approve(form.id, '同意')
  ElMessage.success('已通过')
  await loadDetail()
}

async function reject() {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回报价单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  await quotationApi.reject(form.id, value || '拒绝')
  ElMessage.success('已驳回')
  await loadDetail()
}

onMounted(loadDetail)
</script>

<style scoped>
.card { border-radius: 18px; }
.head { display:flex; justify-content:space-between; align-items:flex-end; gap: 16px; }
.sub { color: #6b7280; font-size: 13px; margin-top: 6px; }
.actions { display:flex; gap: 10px; flex-wrap: wrap; }
.form { margin-top: 16px; }
</style>
