/**
* @module views/approval
* @description 审批管理列表页面（仅管理员可见）
*
* 功能：
* - 查看待审批的报价单列表
* - 审批通过/驳回操作
* - 查看审批历史
* - 审批流水日志追踪
*/

<template>
  <el-card shadow="never" class="approval-card">
    <div class="head">
      <div>
        <h2>审批管理</h2>
        <p class="sub">这里展示报价单提交后的待审记录，仅管理员可处理。</p>
      </div>
      <div class="actions">
        <SearchBar v-model="searchKeyword" placeholder="按公司名称、名称或提交人搜索" button-text="刷新列表" :loading="loading"
          @search="loadList(1)">
          <template #extra>
            <!-- 额外按钮可以放在这里 -->
          </template>
        </SearchBar>
      </div>
    </div>

    <PageTable :data="list" :loading="loading" :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      empty-description="暂无待审批记录" @page-change="(p) => loadList(p)">
      <el-table-column prop="quotationNo" label="名称" min-width="150" show-overflow-tooltip align="center" />
      <el-table-column prop="companyName" label="公司名称" min-width="160" show-overflow-tooltip align="center" />
      <el-table-column prop="ownerName" label="提交人" min-width="90" align="center" />
      <el-table-column prop="createDate" label="创建时间" width="110" align="center" />
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="tagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" min-width="240" align="center">
        <template #default="{ row }">
          <div class="action-btns">
            <el-button type="primary" size="small" round @click="editDetail(row.id)">详情</el-button>
            <el-button type="success" size="small" plain :loading="isActionLoading(row.id)"
              @click="approveRow(row)">通过</el-button>
            <el-button type="danger" size="small" plain :loading="isActionLoading(row.id)"
              @click="rejectRow(row)">驳回</el-button>
          </div>
        </template>
      </el-table-column>
    </PageTable>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { createDebounce } from '@/utils/debounce'
import { to } from '@/utils/async'
import { approvalApi } from '@/api/approval'
import { quotationApi } from '@/api/quotation'
import { messageApi } from '@/api/message'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { useListQueryState } from '@/composables/useListQueryState'
import PageTable from '@/components/common/PageTable.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { showError, showSuccess } from '@/utils/message'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const { keyword: searchKeyword, page, pageSize, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })
const { isActionLoading, withActionLock, replaceById, removeById } = useInstantListActions(list)

const tagType = (status) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info' }[status] || 'info')
const statusLabel = (status) => ({ draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }[status] || status)

const loadList = async (targetPage = page.value) => {
  loading.value = true
  const [err, res] = await to(approvalApi.list({
    status: 'pending',
    keyword: searchKeyword.value.trim(),
    page: targetPage,
    pageSize: pageSize.value
  }))
  if (err) {
    showError(err, '获取审批列表失败')
    loading.value = false
    return
  }
  list.value = res.approvals || []
  total.value = Number(res.total || 0)
  page.value = Number(res.page || targetPage)
  pageSize.value = Number(res.pageSize || pageSize.value)
  void messageApi.markAllAsRead()
  loading.value = false
}

const onKeywordInput = createDebounce(() => {
  resetToFirstPage()
  loadList(1)
}, 300)

const editDetail = (id) => {
  router.push({ path: `/approval/${id}`, query: { mode: 'edit' } })
}

const approveRow = async (row) => {
  const [confirmErr] = await to(ElMessageBox.confirm(`确认通过报价单「${row.companyName || row.name}」吗？`, '审批通过', { type: 'warning' }))
  if (confirmErr) return

  replaceById(row.id, { status: 'approved' })
  removeById(row.id)
  const [apiErr] = await to(withActionLock(row.id, async () => {
    await quotationApi.approve(row.id, '同意')
  }))
  if (apiErr) {
    showError(apiErr, '审批失败')
    await loadList(page.value)
    return
  }
  showSuccess('已通过')
  await loadList(page.value)
}

const rejectRow = async (row) => {
  const [promptErr, promptRes] = await to(ElMessageBox.prompt('请输入驳回原因', '驳回报价单', {
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }))
  if (promptErr) return

  replaceById(row.id, { status: 'rejected' })
  removeById(row.id)
  const [apiErr] = await to(withActionLock(row.id, async () => {
    await quotationApi.reject(row.id, promptRes.value || '拒绝')
  }))
  if (apiErr) {
    showError(apiErr, '驳回失败')
    await loadList(page.value)
    return
  }
  showSuccess('已驳回')
  await loadList(page.value)
}

onMounted(() => loadList(1))
</script>

<style scoped>
.approval-card {
  border-radius: 14px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  border: 1px solid #e2e8f0;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 20px;
}

.head h2 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  border-left: 4px solid #2563eb;
  padding-left: 10px;
  margin: 0;
  line-height: 1;
}

.sub {
  color: #64748b;
  font-size: 13px;
  margin-top: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.search-input {
  width: 300px;
}

@media (max-width: 768px) {
  .head {
    margin-bottom: 12px;
    align-items: flex-start;
  }

  .actions {
    width: 100%;
  }

  .search-input {
    width: 100%;
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
