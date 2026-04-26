<!--
  @file views/approval.vue
  @description 审批管理列表页面（待审批报价单，仅管理员可见）

  功能说明：
  - 展示所有"待审批"状态的报价单
  - 支持审批操作：通过 / 驳回
  - 查看报价单详情并进入编辑模式
  - 搜索过滤（按公司名/提交人搜索）
  - 分页加载

  页面结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  Approval (审批管理)                                         │
  │                                                              │
  │  Header: 标题 + 搜索栏                                       │
  │                                                              │
  │  CardList (2列网格)                                          │
  │  ┌─────────────────┐ ┌─────────────────┐                   │
  │  │ 报价单号 [pending]│ │ 报价单号 [pending]│                   │
  │  │ 🏢 公司名称       │ │ 🏢 公司名称       │                   │
  │  │ 👤 提交人        │ │ 👤 提交人        │                   │
  │  │ 📅 创建时间      │ │ 📅 创建时间      │                   │
  │  │ [详情][通过][驳回]│ │ [详情][通过][驳回]│                   │
  │  └─────────────────┘ └─────────────────┘                   │
  └──────────────────────────────────────────────────────────────┘

  审批流程：
  ┌──────────┐   提交    ┌──────────┐   通过    ┌──────────┐
  │  草稿/编辑 │ ──────▶ │  待审批   │ ──────▶ │  已通过   │
  └──────────┘         └──────────┘         └──────────┘
                            │                    ▲
                            │ 驳回               │
                            ▼                    │
                      ┌──────────┐ 重新提交       │
                      │  已驳回   │ ───────────────┘
                      └──────────┘

  操作说明：
  - 详情：跳转到 /approval/:id?mode=edit 进入编辑页面
  - 通过：调用 approvalApi.approve(id)，状态变为 approved
  - 驳回：弹出输入框要求填写原因，调用 approvalApi.reject(id, reason)

  权限控制：
  - 仅 admin 角色可访问此页面
  - 只有管理员才能执行通过/驳回操作

  API 调用：
  - GET /api/approvals?status=pending&keyword=&page=&pageSize= → 获取待审批列表
  - POST /api/quotations/:id/approve → 通过审批
  - POST /api/quotations/:id/reject → 驳回审批（需 comment 参数）
  - POST /api/messages (内部通知) → 审批结果通知创建者

  注意事项：
  - 使用 useInstantListActions 实现乐观更新（立即移除已处理的记录）
  - 审批操作会同时发送消息通知给报价单创建者
  - 驳回时必须填写原因（comment），否则提示错误
-->

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

    <CardList :data="list" :loading="loading" :total="total" v-model:current-page="page" v-model:page-size="pageSize"
      :columns="2" empty-description="暂无待审批记录" @page-change="(p) => loadList(p)">
      <template #card="{ item }">
        <div class="approval-card-item">
          <div class="card-header">
            <h3 class="quotation-name">{{ item.quotationNo }}</h3>
            <el-tag :type="tagType(item.status)" size="small">{{ statusLabel(item.status) }}</el-tag>
          </div>

          <div class="card-body">
            <div class="info-row">
              <span class="label">🏢 公司名称：</span>
              <span class="value">{{ item.companyName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">👤 提交人：</span>
              <span class="value">{{ item.ownerName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">📅 创建时间：</span>
              <span class="value">{{ item.createDate || '-' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <el-button type="primary" size="small" round @click.stop="editDetail(item.id)">详情</el-button>
            <el-button type="success" size="small" plain :loading="isActionLoading(item.id)"
              @click.stop="approveRow(item)">通过</el-button>
            <el-button type="danger" size="small" plain :loading="isActionLoading(item.id)"
              @click.stop="rejectRow(item)">驳回</el-button>
          </div>
        </div>
      </template>
    </CardList>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { to } from '@/utils/async'
import approvalApi from '@/api/approval'
import quotationApi from '@/api/quotation'
import messageApi from '@/api/message'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { useListQueryState } from '@/composables/useListQueryState'
import CardList from '@/components/common/CardList.vue'
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

.approval-card-item {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.approval-card-item .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.approval-card-item .quotation-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
  word-break: break-all;
}

.approval-card-item .card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.approval-card-item .info-row {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.6;
}

.approval-card-item .info-row .label {
  color: #909399;
  white-space: nowrap;
  min-width: 100px;
  font-weight: 500;
}

.approval-card-item .info-row .value {
  color: #606266;
  flex: 1;
  word-break: break-all;
}

.approval-card-item .card-footer {
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
