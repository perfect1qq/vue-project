<!--
  @file views/ApprovalHistory.vue
  @description 审批历史记录页面（仅管理员可见）

  功能说明：
  - 展示所有已处理的审批记录（通过 + 驳回）
  - 支持按关键词搜索（公司名/提交人）
  - 分页展示，每页显示 10 条记录
  - 点击卡片可查看审批详情（含操作日志）

  页面权限：
  - 仅 admin 角色可访问此页面
  - 其他角色访问时会重定向到首页

  数据来源：
  ┌─────────────────────┐
  │  approvalApi         │
  │  .listHistory()      │
  │  GET /api/approvals   │
  │  /history            │
  └──────────┬──────────┘
             │ 返回 { approvals, total, page, pageSize }
             ▼
  ┌─────────────────────────────────────────┐
  │  CardList 组件渲染                        │
  │  每张卡片包含：                            │
  │  - 报价单号 (quotationNo)                │
  │  - 审批状态标签 (approved/rejected)       │
  │  - 公司名称 (companyName)                 │
  │  - 提交人 (ownerName)                    │
  │  - 创建时间 (createDate)                 │
  │  - [查看详情] 按钮                       │
  └─────────────────────────────────────────┘

  状态映射：
  ┌────────────┬────────────┬────────────┐
  │  status     │  tagType    │  label      │
  ├────────────┼────────────┼────────────┤
  │  draft      │  info       │  草稿        │
  │  pending    │  warning    │  待审批      │
  │  approved   │  success    │  已通过      │
  │  rejected   │  danger     │  已驳回      │
  │  deleted    │  info       │  已删除      │
  └────────────┴────────────┴────────────┘

  路由配置：
  - 路径: /approval/history
  - 名称: ApprovalHistory
  - 父级: /approval (需登录)
-->

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

      <CardList :data="list" :loading="loading" :total="total" v-model:current-page="page" v-model:page-size="pageSize"
        :columns="2" empty-description="暂无审批历史" @page-change="(p) => loadList(p)">
        <template #card="{ item }">
          <div class="history-card-item">
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
              <el-button link type="primary" size="small" @click.stop="openDetail(item.id)">查看详情</el-button>
            </div>
          </div>
        </template>
      </CardList>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { to } from '@/utils/async'
import { showError } from '@/utils/message'
import approvalApi from '@/api/approval'
import { useListQueryState } from '@/composables/useListQueryState'
import CardList from '@/components/common/CardList.vue'
import SearchBar from '@/components/common/SearchBar.vue'

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
    showError(err, '审批历史加载失败')
    loading.value = false
    return
  }
  list.value = res.approvals || []
  total.value = Number(res.total || 0)
  page.value = Number(res.page || targetPage)
  pageSize.value = Number(res.pageSize || pageSize.value)
  loading.value = false
}

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

/* 审批历史卡片特有样式（通用样式已移至global.css） */
</style>
