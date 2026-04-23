<template>
  <div class="message-management">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="page-header">
          <div>
            <div class="page-title">{{ pageTitle }}</div>
            <div class="page-subtitle">{{ pageSubtitle }}</div>
          </div>

          <div class="header-tools">
            <SearchBar v-model="keyword" placeholder="搜索联系方式或留言内容" @search="handleSearch">
              <template #extra>
                <el-tag :type="isAdmin ? 'success' : 'info'" effect="plain">
                  {{ isAdmin ? '管理员视图' : '测试账号视图' }}
                </el-tag>
              </template>
            </SearchBar>
          </div>
        </div>
      </template>

      <PageTable v-if="!useVirtualTable" :data="messages" :loading="loading" :total="total" v-model:current-page="page"
        v-model:page-size="pageSize" empty-description="暂无留言线索" @page-change="(p) => loadMessages(p)">
        <el-table-column label="提交时间" width="150" align="center">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column prop="contactInfo" label="联系方式" min-width="160" align="center" show-overflow-tooltip />
        <el-table-column prop="content" label="留言内容" min-width="220" align="center" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <div class="status-cell">
              <el-tag :type="row.status === 'assigned' ? 'success' : 'warning'" size="small">
                {{ row.status === 'assigned' ? '已指派' : '待处理' }}
              </el-tag>

            </div>
          </template>
        </el-table-column>

        <el-table-column label="跟进人" min-width="90" align="center">
          <template #default="{ row }">
            {{ (row.assignee?.name || '').trim() || row.assignee?.username || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" :width="isAdmin ? 200 : (isGuest ? 80 : 140)" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" size="small" round @click="openView(row)">查看</el-button>
              <template v-if="!isGuest">
                <template v-if="isAdmin">
                  <el-button type="warning" size="small" plain :loading="isActionLoading(row.id)"
                    @click="openAssign(row)">指派</el-button>
                  <el-button type="danger" size="small" plain :loading="isActionLoading(row.id)"
                    @click="doDelete(row)">删除</el-button>
                </template>
                <el-button v-else type="danger" size="small" plain :loading="isActionLoading(row.id)"
                  @click="doHideFromList(row)">
                  删除
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </PageTable>
      <div v-else class="virtual-table-wrap">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2 :columns="virtualColumns" :data="messages" :width="width" :height="Math.max(420, height)"
              :row-height="54" fixed />
          </template>
        </el-auto-resizer>
      </div>
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false" class="load-error" />
    </el-card>

    <MessageDialogs v-model:view-visible="viewVisible" v-model:assign-visible="assignVisible" :view-title="viewTitle"
      :view-row="viewRow" :assign-form="assignForm" :staff-list="staffList" :assign-loading="assignLoading"
      :format-time="formatTime" @confirm-assign="confirmAssign" />

  </div>
</template>

<script setup>
import { computed, h, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import { ElButton, ElMessageBox, ElTag } from 'element-plus'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { createDebounce } from '@/utils/debounce'
import { to } from '@/utils/async'
import { getMessagePageTitle, readCurrentUser, formatDateTime } from '@/utils/navigation'
import { showError, showSuccess, showWarning } from '@/utils/message'
import { useCancelableLoader } from '@/composables/useCancelableLoader'
import { usePagination } from '@/composables/usePagination'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { usePermissions } from '@/composables/usePermissions'
import { TABLE_HEADER_STYLE } from '@/constants/table'
import MessageDialogs from '@/components/message/MessageDialogs.vue'
import SearchBar from '@/components/common/SearchBar.vue'
import PageTable from '@/components/common/PageTable.vue'

/**
 * 留言管理页面：
 * - 管理员视角显示为“官方留言板”，可查看全部线索、指派业务员和删除；
 * - 测试账号视角显示为“我的指派”，只展示当前账号被分配的线索；
 * - 通过分页与搜索降低线索量增长后的渲染压力。
 */
const currentUser = ref(readCurrentUser())

/**
 * 刷新当前账号快照。
 * 适合在登录态切换、页面回到前台或 storage 事件触发时调用。
 */
const refreshCurrentUser = () => {
  currentUser.value = readCurrentUser()
}

const { isAdmin, isGuest, canEdit, canDelete } = usePermissions()
const pageTitle = computed(() => {
  if (isGuest.value) return '留言板（只读）'
  return getMessagePageTitle(currentUser.value.role)
})
const pageSubtitle = computed(() => {
  if (isGuest.value) '游客仅可查看留言内容，无法进行任何操作。'
  if (isAdmin.value) return '管理员可查看全部线索、统一指派业务员，并按需删除无效线索。'
  return '当前账号只会看到被分配给自己的线索。'
})

const messages = shallowRef([])
const { loading, loadError, run: runListLoad, isLatest } = useCancelableLoader()
const VIRTUAL_TABLE_THRESHOLD = 80
const useVirtualTable = computed(() => messages.value.length >= VIRTUAL_TABLE_THRESHOLD)

const viewVisible = ref(false)
const viewRow = ref(null)
const viewTitle = computed(() => (viewRow.value ? `留言详情 #${viewRow.value.id}` : '留言详情'))

const staffList = ref([])
const assignVisible = ref(false)
const assignLoading = ref(false)
const assignForm = reactive({ messageId: null, userId: null })
const { isActionLoading, withActionLock, replaceById, removeById } = useInstantListActions(messages)

const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

/**
 * 拉取留言列表。
 * @param {number} targetPage - 目标页码
 */
const loadMessages = async (targetPage) => {
  if (!targetPage) targetPage = page.value || 1
  const runResult = await runListLoad(async ({ signal, seq }) => {
    const res = await messageApi.list({
      page: targetPage,
      pageSize: pageSize.value,
      keyword: keyword.value.trim()
    }, { signal })
    if (!isLatest(seq)) return
    messages.value = res.list || []
    total.value = res.total || 0
    page.value = res.page || targetPage
    pageSize.value = res.pageSize || pageSize.value
  })
  if (!runResult.ok && !runResult.canceled) {
    showError(loadError.value || '获取留言列表失败')
  }
}

const handleCurrentChange = (val) => {
  page.value = val
  loadMessages(page.value)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  loadMessages(1)
}

const resetToFirstPage = () => {
  page.value = 1
}

/**
 * 管理员拉取可指派的测试账号。
 */
const loadStaff = async () => {
  if (!isAdmin.value) return
  const [, res] = await to(userApi.list())
  staffList.value = (res?.users || []).filter((u) => u.role !== 'admin')
}

const triggerSearch = createDebounce(() => {
  resetToFirstPage()
  loadMessages(page.value)
}, 300)

const onKeywordInput = () => {
  triggerSearch()
}

const handleSearch = () => {
  triggerSearch()
}

/**
 * 查看完整留言（表格列宽有限时便于阅读全文）。
 * @param {object} row
 */
const openView = (row) => {
  viewRow.value = row
  viewVisible.value = true
}

/**
 * 打开指派弹窗。
 * @param {object} row - 当前留言
 */
const openAssign = (row) => {
  assignForm.messageId = row.id
  assignForm.userId = row.assignedTo || null
  assignVisible.value = true
}

const statusText = (row) => (row?.status === 'assigned' ? '已指派' : '待处理')
const statusType = (row) => (row?.status === 'assigned' ? 'success' : 'warning')

/**
 * 确认指派。
 */
const confirmAssign = async () => {
  if (!assignForm.userId) return showWarning('请选择业务员')
  const currentId = assignForm.messageId
  const before = (messages.value || []).find((m) => m.id === currentId)
  const selectedUser = staffList.value.find((u) => u.id === assignForm.userId) || null
  if (!before) return

  replaceById(currentId, {
    assignedTo: assignForm.userId,
    status: 'assigned',
    assignee: selectedUser ? { id: selectedUser.id, username: selectedUser.username, name: selectedUser.name } : before.assignee
  })

  assignLoading.value = true
  const [err] = await to(withActionLock(currentId, async () => {
    await messageApi.assign(currentId, assignForm.userId)
  }))
  if (err) {
    replaceById(currentId, before)
    showError(err, '指派失败')
    assignLoading.value = false
    return
  }
  showSuccess('指派成功')
  assignVisible.value = false
  await loadMessages(page.value)
  assignLoading.value = false
}

/**
 * 业务员从「我的指派」删除：软隐藏，本人不再看到，管理员仍可见。
 * @param {object} row
 */
const doHideFromList = async (row) => {
  const [confirmErr] = await to(ElMessageBox.confirm(
    '确定从「我的指派」中删除这条留言吗？删除后您将不再看到它，超级管理员仍可在后台查看完整数据。',
    '提示',
    { type: 'warning' }
  ))
  if (confirmErr) return

  removeById(row.id)
  total.value = Math.max(0, Number(total.value || 0) - 1)
  const [err] = await to(withActionLock(row.id, async () => {
    await messageApi.hideFromAssignee(row.id)
  }))
  if (err) {
    await loadMessages(page.value)
    showError(err, '操作失败')
    return
  }
  showSuccess('已从我的列表移除')
  await loadMessages(page.value)
}

/**
 * 删除留言。
 * 仅管理员可见该操作。
 */
const doDelete = async (row) => {
  const [confirmErr] = await to(ElMessageBox.confirm('确定删除这条留言吗？', '提示', { type: 'warning' }))
  if (confirmErr) return

  removeById(row.id)
  total.value = Math.max(0, Number(total.value || 0) - 1)
  const [err] = await to(withActionLock(row.id, async () => {
    await messageApi.remove(row.id)
  }))
  if (err) {
    await loadMessages(page.value)
    showError(err, '删除失败')
    return
  }
  showSuccess('已删除')
  await loadMessages(page.value)
}

const virtualColumns = computed(() => {
  const baseColumns = [
    {
      key: 'createdAt',
      dataKey: 'createdAt',
      title: '提交时间',
      width: 170,
      align: 'center',
      cellRenderer: ({ rowData }) => formatTime(rowData?.createdAt)
    },
    {
      key: 'contactInfo',
      dataKey: 'contactInfo',
      title: '联系方式',
      width: 230
    },
    {
      key: 'content',
      dataKey: 'content',
      title: '留言内容',
      width: 380
    },
    {
      key: 'status',
      dataKey: 'status',
      title: '状态',
      width: 150,
      align: 'center',
      cellRenderer: ({ rowData }) => {
        const tags = [
          h(
            ElTag,
            { size: 'small', type: statusType(rowData) },
            () => statusText(rowData)
          )
        ]
        if (isAdmin.value && rowData?.hiddenByAssignee) {
          tags.push(h(ElTag, { size: 'small', type: 'info', class: 'status-extra' }, () => '已隐藏'))
        }
        return h('div', { class: 'status-cell' }, tags)
      }
    },
    {
      key: 'assignee',
      dataKey: 'assignee',
      title: '跟进人',
      width: 130,
      align: 'center',
      cellRenderer: ({ rowData }) => ((rowData?.assignee?.name || '').trim() || rowData?.assignee?.username) || '—'
    }
  ]

  baseColumns.push({
    key: 'actions',
    title: '操作',
    width: isAdmin.value ? 260 : 200,
    align: 'center',
    cellRenderer: ({ rowData }) =>
      h('div', { class: 'virtual-actions' }, [
        h(
          ElButton,
          {
            type: 'primary',
            link: true,
            size: 'small',
            onClick: () => openView(rowData)
          },
          () => '查看'
        ),
        ...(isAdmin.value
          ? [
            h(
              ElButton,
              {
                type: 'primary',
                link: true,
                size: 'small',
                loading: isActionLoading(rowData?.id),
                onClick: () => openAssign(rowData)
              },
              () => '指派'
            ),
            h(
              ElButton,
              {
                type: 'danger',
                link: true,
                size: 'small',
                loading: isActionLoading(rowData?.id),
                onClick: () => doDelete(rowData)
              },
              () => '删除'
            )
          ]
          : [
            h(
              ElButton,
              {
                type: 'danger',
                link: true,
                size: 'small',
                loading: isActionLoading(rowData?.id),
                onClick: () => doHideFromList(rowData)
              },
              () => '删除'
            )
          ])
      ])
  })

  return baseColumns
})

const formatTime = (dateStr) => formatDateTime(dateStr)

onMounted(() => {
  refreshCurrentUser()
  loadMessages(1)
  loadStaff()
  window.addEventListener('storage', refreshCurrentUser)
})

onUnmounted(() => {
  triggerSearch.cancel?.()
  window.removeEventListener('storage', refreshCurrentUser)
})
</script>

<style scoped>
.message-management {
  padding: 0;
}

.card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.header-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 280px;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.virtual-table-wrap {
  height: 460px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.virtual-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.load-error {
  margin-top: 12px;
}

.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.status-extra {
  margin: 0;
}

.message-view-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: min(70vh, 520px);
  overflow-y: auto;
  padding-right: 4px;
}

.view-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.view-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
}

.view-value {
  font-size: 14px;
  color: #0f172a;
  word-break: break-word;
}

.view-text-block {
  white-space: pre-wrap;
  line-height: 1.65;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.view-content {
  max-height: 320px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 16px;
  }

  .page-subtitle {
    font-size: 12px;
    line-height: 1.6;
  }

  .header-tools {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .pager-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .virtual-table-wrap {
    height: 380px;
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
