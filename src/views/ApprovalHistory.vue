/**
* @module views/ApprovalHistory
* @description 审批历史记录页面（仅管理员可见）
*
* 功能：
* - 查看所有已审批的报价单历史
* - 按状态筛选（通过/驳回/待审批）
* - 查看审批详情和操作日志
*/

<template>
  <div class="approval-history-page">
    <el-card shadow="never" class="approval-card">
      <div class="head">
        <div>
          <h2>审批历史</h2>
          <p class="sub">这里展示所有已审批记录，包含通过和驳回结果。</p>
        </div>
        <div class="actions">
          <SearchBar v-model="searchKeyword" placeholder="按公司名称、名称或提交人搜索" button-text="刷新列表" :loading="loading"
            @search="loadList(1)" />
        </div>
      </div>

      <el-table :data="list" border stripe style="width: 100%; margin-top: 16px" :header-cell-style="TABLE_HEADER_STYLE"
        class="smart-table">
        <el-table-column prop="quotationNo" label="名称" width="180" />
        <el-table-column prop="companyName" label="公司名称" min-width="180" />
        <el-table-column prop="ownerName" label="提交人" width="120" />
        <el-table-column prop="createDate" label="创建时间" width="120" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="tagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !list.length" description="暂无审批历史" style="padding: 32px 0" />

      <PagePagination v-model:page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]"
        @page-change="loadList" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createDebounce } from '@/utils/debounce'
import { to } from '@/utils/async'
import { approvalApi } from '@/api/approval'
import { useListQueryState } from '@/composables/useListQueryState'
import PagePagination from '@/components/common/PagePagination.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import { TABLE_HEADER_STYLE } from '@/constants/table'

const router = useRouter()
const loading = ref(false)
const list = ref([])
const total = ref(0)
const { keyword: searchKeyword, page, pageSize, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })

const tagType = (status) => ({ draft: 'info', pending: 'warning', approved: 'success', rejected: 'danger', deleted: 'info' }[status] || 'info')
const statusLabel = (status) => ({ draft: '草稿', pending: '待审批', approved: '已通过', rejected: '已驳回', deleted: '已删除' }[status] || status)

const loadList = async (targetPage = page.value) => {
  loading.value = true
  const [err, res] = await to(approvalApi.listHistory({
    page: targetPage,
    pageSize: pageSize.value,
    keyword: searchKeyword.value.trim()
  }))
  if (err) {
    ElMessage.error(err?.response?.data?.message || '审批历史加载失败')
    loading.value = false
    return
  }
  list.value = res.approvals || []
  total.value = Number(res.total || 0)
  page.value = Number(res.page || targetPage)
  pageSize.value = Number(res.pageSize || pageSize.value)
  loading.value = false
}

const onKeywordInput = createDebounce(() => {
  resetToFirstPage()
  loadList(1)
}, 300)

const openDetail = (id) => {
  router.push({ name: 'ApprovalHistoryDetail', params: { id } })
}

onMounted(() => loadList(1))
</script>

<style scoped>
.approval-history-page {
  padding: 0;
}

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
</style>
