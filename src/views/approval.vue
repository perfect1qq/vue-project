<template>
  <el-card shadow="never" class="approval-card">
    <div class="head">
      <div>
        <h2>审批管理</h2>
        <p class="sub">这里展示报价单提交后的待审记录，仅处理报价单数据。</p>
      </div>
      <div class="actions">
        <el-input v-model="searchKeyword" placeholder="按名称或编号搜索" clearable style="width: 260px" @input="loadList" />
        <el-button type="primary" :loading="loading" @click="loadList">刷新</el-button>
      </div>
    </div>

    <el-table :data="filteredList" border stripe style="width: 100%; margin-top: 16px" :header-cell-style="headerStyle">
      <el-table-column prop="quotationNo" label="编号" width="180" />
      <el-table-column prop="companyName" label="公司名称" min-width="180" />
      <el-table-column prop="ownerName" label="提交人" width="120" />
      <el-table-column prop="createDate" label="创建时间" width="120" />
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="tagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="viewDetail(row.id)">查看</el-button>
          <el-button link type="success" size="small" @click="approveRow(row)">通过</el-button>
          <el-button link type="danger" size="small" @click="rejectRow(row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { quotationApi } from '@/api/quotation'

const router = useRouter()
const loading = ref(false)
const searchKeyword = ref('')
const list = ref([])

const headerStyle = { background: '#f5f7fa', fontWeight: 'bold', textAlign: 'center' }
const tagType = (status) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info' }[status] || 'info')
const statusLabel = (status) => ({ draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }[status] || status)

const filteredList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter(item => `${item.companyName || item.name || ''} ${item.quotationNo || ''}`.toLowerCase().includes(kw))
})

const loadList = async () => {
  try {
    loading.value = true
    const res = await quotationApi.list({ status: 'pending', keyword: searchKeyword.value })
    list.value = res.quotations || []
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '获取审批列表失败')
  } finally {
    loading.value = false
  }
}

const viewDetail = (id) => {
  router.push(`/approval/${id}`)
}

const approveRow = async (row) => {
  await ElMessageBox.confirm(`确认通过报价单「${row.companyName || row.name}」吗？`, '审批通过', { type: 'warning' })
  await quotationApi.approve(row.id, '同意')
  ElMessage.success('已通过')
  await loadList()
}

const rejectRow = async (row) => {
  const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回报价单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })
  await quotationApi.reject(row.id, value || '拒绝')
  ElMessage.success('已驳回')
  await loadList()
}

onMounted(loadList)
</script>

<style scoped>
.approval-card { border-radius: 18px; }
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.sub { color: #6b7280; font-size: 13px; margin-top: 6px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
</style>
