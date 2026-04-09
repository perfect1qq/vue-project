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
            <el-input
              v-model="keyword"
              clearable
              class="search-input"
              placeholder="搜索联系方式或留言内容"
              :prefix-icon="Search"
              @input="onKeywordInput"
            />
            <el-tag :type="isAdmin ? 'success' : 'info'" effect="plain">
              {{ isAdmin ? '管理员视图' : '测试账号视图' }}
            </el-tag>
          </div>
        </div>
      </template>

      <el-table
        v-if="!useVirtualTable"
        :data="messages"
        stripe
        border
        v-loading="loading"
        class="smart-table"
      >
        <el-table-column label="提交时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column prop="contactInfo" label="联系方式" width="220" />
        <el-table-column prop="content" label="留言内容" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'assigned' ? 'success' : 'warning'" size="small">
              {{ row.status === 'assigned' ? '已指派' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="跟进人" width="110" align="center">
          <template #default="{ row }">
            {{ row.assignee?.username || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="isAdmin" link type="primary" size="small" :loading="isActionLoading(row.id)" @click="openAssign(row)">指派</el-button>
            <el-button v-if="isAdmin" link type="danger" size="small" :loading="isActionLoading(row.id)" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无留言线索" />
        </template>
      </el-table>
      <div v-else class="virtual-table-wrap">
        <el-auto-resizer>
          <template #default="{ height, width }">
            <el-table-v2
              :columns="virtualColumns"
              :data="messages"
              :width="width"
              :height="Math.max(420, height)"
              :row-height="54"
              fixed
            />
          </template>
        </el-auto-resizer>
      </div>
      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        show-icon
        :closable="false"
        class="load-error"
      />

      <div class="pager-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="assignVisible" title="指派客户" width="420px" destroy-on-close>
      <el-form :model="assignForm" label-width="90px">
        <el-form-item label="指派对象" required>
          <el-select v-model="assignForm.userId" placeholder="请选择业务员" filterable style="width: 100%">
            <el-option
              v-for="u in staffList"
              :key="u.id"
              :label="u.username"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignLoading" @click="confirmAssign">确认指派</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { computed, h, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'
import { createDebounce } from '@/utils/debounce'
import { getMessagePageTitle, readCurrentUser, formatDateTime } from '@/utils/navigation'
import { useCancelableLoader } from '@/composables/useCancelableLoader'
import { useListQueryState } from '@/composables/useListQueryState'
import { useInstantListActions } from '@/composables/useInstantListActions'

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

const isAdmin = computed(() => currentUser.value.role === 'admin')
const pageTitle = computed(() => getMessagePageTitle(currentUser.value.role))
const pageSubtitle = computed(() => (
  isAdmin.value
    ? '管理员可查看全部线索、统一指派业务员，并按需删除无效线索。'
    : '当前账号只会看到被分配给自己的线索。'
))

const messages = ref([])
const { loading, loadError, run: runListLoad, isLatest } = useCancelableLoader()
const { keyword, page, pageSize, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })
const total = ref(0)
const VIRTUAL_TABLE_THRESHOLD = 80
const useVirtualTable = computed(() => messages.value.length >= VIRTUAL_TABLE_THRESHOLD)

const staffList = ref([])
const assignVisible = ref(false)
const assignLoading = ref(false)
const assignForm = reactive({ messageId: null, userId: null })
const { isActionLoading, withActionLock, replaceById, removeById } = useInstantListActions(messages)

/**
 * 拉取留言列表。
 * @param {number} targetPage - 目标页码
 */
const loadMessages = async (targetPage = page.value) => {
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
    ElMessage.error(loadError.value || '获取留言列表失败')
  }
}

/**
 * 管理员拉取可指派的测试账号。
 */
const loadStaff = async () => {
  if (!isAdmin.value) return
  try {
    const res = await userApi.list()
    staffList.value = (res.users || []).filter((u) => u.role !== 'admin')
  } catch {
    staffList.value = []
  }
}

const triggerSearch = createDebounce(() => {
  resetToFirstPage()
  loadMessages(page.value)
}, 300)

const onKeywordInput = () => {
  triggerSearch()
}

const handleCurrentChange = (val) => {
  loadMessages(val)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  resetToFirstPage()
  loadMessages(page.value)
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
  if (!assignForm.userId) return ElMessage.warning('请选择业务员')
  const currentId = assignForm.messageId
  const before = (messages.value || []).find((m) => m.id === currentId)
  const selectedUser = staffList.value.find((u) => u.id === assignForm.userId) || null
  if (!before) return

  replaceById(currentId, {
    assignedTo: assignForm.userId,
    status: 'assigned',
    assignee: selectedUser ? { id: selectedUser.id, username: selectedUser.username } : before.assignee
  })

  try {
    assignLoading.value = true
    await withActionLock(currentId, async () => {
      await messageApi.assign(currentId, assignForm.userId)
    })
    ElMessage.success('指派成功')
    assignVisible.value = false
    await loadMessages(page.value)
  } catch (error) {
    replaceById(currentId, before)
    ElMessage.error(error?.message || error?.response?.data?.message || '指派失败')
  } finally {
    assignLoading.value = false
  }
}

/**
 * 删除留言。
 * 仅管理员可见该操作。
 */
const doDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除这条留言吗？', '提示', { type: 'warning' })
    removeById(row.id)
    total.value = Math.max(0, Number(total.value || 0) - 1)
    await withActionLock(row.id, async () => {
      await messageApi.remove(row.id)
    })
    ElMessage.success('已删除')
    await loadMessages(page.value)
  } catch (error) {
    if (error !== 'cancel') {
      await loadMessages(page.value)
      ElMessage.error(error?.message || error?.response?.data?.message || '删除失败')
    }
    // 用户取消时不提示。
  }
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
      width: 120,
      align: 'center',
      cellRenderer: ({ rowData }) => h(
        ElTag,
        { size: 'small', type: statusType(rowData) },
        () => statusText(rowData)
      )
    },
    {
      key: 'assignee',
      dataKey: 'assignee',
      title: '跟进人',
      width: 130,
      align: 'center',
      cellRenderer: ({ rowData }) => rowData?.assignee?.username || '—'
    }
  ]

  baseColumns.push({
    key: 'actions',
    title: '操作',
    width: 220,
    align: 'center',
    cellRenderer: ({ rowData }) => {
      if (!isAdmin.value) return '—'
      return h('div', { class: 'virtual-actions' }, [
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
      ])
    }
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

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }
}
</style>
