<template>
  <div class="memo-page">
    <!-- 顶部数据概览：帮助用户快速看到待办、已完成和置顶数量。 -->
    <el-row :gutter="16" class="memo-stats">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">总任务</div>
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-tip">当前账号可见的全部任务</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">未完成</div>
          <div class="stat-value">{{ stats.todoTotal }}</div>
          <div class="stat-tip">今天还没有标记已做的任务</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">已完成</div>
          <div class="stat-value">{{ stats.doneTotal }}</div>
          <div class="stat-tip">已经打勾的任务</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">置顶</div>
          <div class="stat-value">{{ stats.pinnedTotal }}</div>
          <div class="stat-tip">需要优先处理的事项</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="memo-card">
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
              placeholder="搜索标题、内容或标签"
              :prefix-icon="Search"
              @input="onKeywordInput"
            />
            <el-segmented
              v-model="activeFilter"
              :options="filterOptions"
              size="small"
              @change="handleFilterChange"
            />
            <el-button type="primary" :icon="Plus" @click="openCreate">新增任务</el-button>
          </div>
        </div>
      </template>

      <el-skeleton :loading="loading && !list.length" animated :rows="8">
        <template #default>
          <!-- 默认“全部”模式使用双栏板式，和高赞 GitHub 待办工具更接近。 -->
          <div v-if="isBoardMode" class="memo-board">
            <section class="memo-column">
              <div class="column-head">
                <div>
                  <div class="column-title">未完成</div>
                  <div class="column-subtitle">{{ stats.todoTotal }} 条</div>
                </div>
                <el-tag size="small" type="warning" effect="light">待办</el-tag>
              </div>

              <div v-if="todoList.length" class="task-stack">
                <article
                  v-for="item in todoList"
                  :key="item.id"
                  class="task-card"
                  :class="{ pinned: item.pinned }"
                >
                  <div class="task-top">
                    <el-checkbox
                      :model-value="item.completed"
                      :disabled="isActionLoading(item.id)"
                      @change="(checked) => toggleCompleted(item, checked)"
                    >
                      <span class="task-check-label">已做</span>
                    </el-checkbox>

                    <div class="task-main">
                      <div class="task-title-row">
                        <h3 class="task-title">{{ item.title }}</h3>
                        <el-tag v-if="item.pinned" size="small" type="danger" effect="light">置顶</el-tag>
                        <el-tag size="small" effect="plain" :type="colorTagType(item.color)">
                          {{ colorLabel(item.color) }}
                        </el-tag>
                      </div>

                      <div class="task-meta">
                        <span>创建人：{{ item.ownerName }}</span>
                        <span>更新于：{{ formatTime(item.updatedAt) }}</span>
                        <span v-if="item.label">标签：{{ item.label }}</span>
                      </div>
                    </div>

                    <div class="task-actions">
                      <el-button link type="success" size="small" :loading="isActionLoading(item.id)" @click="toggleCompleted(item, true)">标记已做</el-button>
                      <el-button link type="warning" size="small" @click="togglePinned(item)">
                        {{ item.pinned ? '取消置顶' : '置顶' }}
                      </el-button>
                      <el-button link type="primary" size="small" @click="openEdit(item)">编辑</el-button>
                      <el-button link type="info" size="small" @click="openHistory(item)">历史</el-button>
                      <el-button link type="danger" size="small" @click="removeMemo(item)">删除</el-button>
                    </div>
                  </div>

                  <p class="task-content">{{ item.content }}</p>
                </article>
              </div>
              <el-empty v-else description="暂无未完成任务" />
            </section>

            <section class="memo-column done-column">
              <div class="column-head">
                <div>
                  <div class="column-title">已完成</div>
                  <div class="column-subtitle">{{ stats.doneTotal }} 条</div>
                </div>
                <el-tag size="small" type="success" effect="light">完成</el-tag>
              </div>

              <div v-if="doneList.length" class="task-stack">
                <article
                  v-for="item in doneList"
                  :key="item.id"
                  class="task-card done"
                  :class="{ pinned: item.pinned }"
                >
                  <div class="task-top">
                    <el-checkbox
                      :model-value="item.completed"
                      :disabled="isActionLoading(item.id)"
                      @change="(checked) => toggleCompleted(item, checked)"
                    >
                      <span class="task-check-label">已做</span>
                    </el-checkbox>

                    <div class="task-main">
                      <div class="task-title-row">
                        <h3 class="task-title">{{ item.title }}</h3>
                        <el-tag v-if="item.pinned" size="small" type="danger" effect="light">置顶</el-tag>
                        <el-tag size="small" effect="plain" :type="colorTagType(item.color)">
                          {{ colorLabel(item.color) }}
                        </el-tag>
                      </div>

                      <div class="task-meta">
                        <span>创建人：{{ item.ownerName }}</span>
                        <span>完成于：{{ formatTime(item.completedAt || item.updatedAt) }}</span>
                        <span v-if="item.label">标签：{{ item.label }}</span>
                      </div>
                    </div>

                    <div class="task-actions">
                      <el-button link type="warning" size="small" :loading="isActionLoading(item.id)" @click="toggleCompleted(item, false)">改回未做</el-button>
                      <el-button link type="warning" size="small" @click="togglePinned(item)">
                        {{ item.pinned ? '取消置顶' : '置顶' }}
                      </el-button>
                      <el-button link type="primary" size="small" @click="openEdit(item)">编辑</el-button>
                      <el-button link type="info" size="small" @click="openHistory(item)">历史</el-button>
                      <el-button link type="danger" size="small" @click="removeMemo(item)">删除</el-button>
                    </div>
                  </div>

                  <p class="task-content done-content">{{ item.content }}</p>
                </article>
              </div>
              <el-empty v-else description="暂无已完成任务" />
            </section>
          </div>

          <!-- 其他筛选模式保持列表视图，便于集中查看单一状态。 -->
          <div v-else-if="list.length" class="task-list">
            <article
              v-for="item in list"
              :key="item.id"
              class="task-card task-list-card"
              :class="{ pinned: item.pinned, done: item.completed }"
            >
              <div class="task-top">
                <el-checkbox
                  :model-value="item.completed"
                  :disabled="isActionLoading(item.id)"
                  @change="(checked) => toggleCompleted(item, checked)"
                >
                  <span class="task-check-label">已做</span>
                </el-checkbox>

                <div class="task-main">
                  <div class="task-title-row">
                    <h3 class="task-title">{{ item.title }}</h3>
                    <el-tag v-if="item.completed" size="small" type="success" effect="light">已完成</el-tag>
                    <el-tag v-if="item.pinned" size="small" type="danger" effect="light">置顶</el-tag>
                    <el-tag size="small" effect="plain" :type="colorTagType(item.color)">
                      {{ colorLabel(item.color) }}
                    </el-tag>
                  </div>

                  <div class="task-meta">
                    <span>创建人：{{ item.ownerName }}</span>
                    <span>更新于：{{ formatTime(item.updatedAt) }}</span>
                    <span v-if="item.completedAt">完成于：{{ formatTime(item.completedAt) }}</span>
                    <span v-if="item.label">标签：{{ item.label }}</span>
                  </div>
                </div>

                <div class="task-actions">
                  <el-button link type="success" size="small" :loading="isActionLoading(item.id)" @click="toggleCompleted(item, !item.completed)">
                    {{ item.completed ? '改回未做' : '标记已做' }}
                  </el-button>
                  <el-button link type="warning" size="small" @click="togglePinned(item)">
                    {{ item.pinned ? '取消置顶' : '置顶' }}
                  </el-button>
                  <el-button link type="primary" size="small" @click="openEdit(item)">编辑</el-button>
                  <el-button link type="info" size="small" @click="openHistory(item)">历史</el-button>
                  <el-button link type="danger" size="small" @click="removeMemo(item)">删除</el-button>
                </div>
              </div>

              <p class="task-content">{{ item.content }}</p>
            </article>
          </div>

          <el-empty v-else description="暂无任务" />
        </template>
      </el-skeleton>
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
          :total="stats.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增 / 编辑任务抽屉。 -->
    <el-drawer
      v-model="editorVisible"
      :title="editorMode === 'create' ? '新增任务' : '修改任务'"
      size="540px"
      destroy-on-close
    >
      <el-form :model="form" label-width="72px" class="memo-editor">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="请输入要做的事情" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.label" placeholder="例如：客户、今日、紧急" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-select v-model="form.color" placeholder="选择卡片颜色" style="width: 100%">
            <el-option v-for="option in colorOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="form.pinned" active-text="置顶" inactive-text="普通任务" />
        </el-form-item>
        <el-form-item label="已做">
          <el-switch v-model="form.completed" active-text="已完成" inactive-text="未完成" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="记录今天要做的内容、执行细节或补充说明"
            resize="none"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="editorVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveMemo">保存</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 历史记录抽屉。 -->
    <el-drawer v-model="historyVisible" :title="historyTitle" size="420px">
      <el-timeline v-if="historyList.length">
        <el-timeline-item
          v-for="item in historyList"
          :key="item.id"
          :timestamp="formatTime(item.createdAt)"
          placement="top"
        >
          <el-card shadow="never" class="history-card">
            <div class="history-head">
              <el-tag size="small" :type="actionTag(item.action)">{{ actionLabel(item.action) }}</el-tag>
              <span class="history-operator">{{ item.operatorName }}</span>
            </div>
            <p class="history-title">{{ item.title }}</p>
            <p class="history-content">{{ item.content }}</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无历史记录" />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { memoApi } from '@/api/memo'
import { createDebounce } from '@/utils/debounce'
import { formatDateTime } from '@/utils/navigation'
import { useCancelableLoader } from '@/composables/useCancelableLoader'
import { useListQueryState } from '@/composables/useListQueryState'
import { useInstantListActions } from '@/composables/useInstantListActions'

/**
 * 任务备忘录页面。
 * 设计目标：
 * 1. 以“未做 / 已做”作为核心状态，贴合日常待办使用方式；
 * 2. 默认展示双栏任务板，便于快速区分待办和完成项；
 * 3. 支持搜索、置顶、颜色标签、备注历史和分页，兼顾易用性和可维护性。
 */
const list = ref([])
const { loading, loadError, run: runListLoad, isLatest } = useCancelableLoader()
const saving = ref(false)
const { keyword, page, pageSize, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })
const activeFilter = ref('all')
const stats = reactive({
  total: 0,
  todoTotal: 0,
  doneTotal: 0,
  pinnedTotal: 0
})

const editorVisible = ref(false)
const editorMode = ref('create')
const editingId = ref(null)
const form = reactive({
  title: '',
  content: '',
  label: '',
  color: 'blue',
  pinned: false,
  completed: false
})

const historyVisible = ref(false)
const historyTitle = ref('任务历史')
const historyList = ref([])
const { isActionLoading, withActionLock } = useInstantListActions(list)

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '未完成', value: 'todo' },
  { label: '已完成', value: 'done' },
  { label: '置顶', value: 'pinned' }
]

const colorOptions = [
  { label: '蓝色', value: 'blue' },
  { label: '绿色', value: 'green' },
  { label: '橙色', value: 'amber' },
  { label: '紫色', value: 'purple' },
  { label: '玫红', value: 'rose' },
  { label: '灰色', value: 'slate' }
]

const pageTitle = computed(() => '每日任务备忘录')
const pageSubtitle = computed(() => '把要做的事情放进同一块任务板里，完成后直接勾选，未勾选的就是未做。')

const isBoardMode = computed(() => activeFilter.value === 'all')
const todoList = computed(() => list.value.filter(item => !item.completed))
const doneList = computed(() => list.value.filter(item => item.completed))

const colorLabel = (color) => ({ blue: '蓝色', green: '绿色', amber: '橙色', purple: '紫色', rose: '玫红', slate: '灰色' }[color] || '默认')
const colorTagType = (color) => ({ blue: 'primary', green: 'success', amber: 'warning', purple: 'info', rose: 'danger', slate: 'info' }[color] || 'info')

/**
 * 根据当前筛选条件请求任务列表。
 * @param {number} targetPage - 目标页码
 */
const loadList = async (targetPage = page.value) => {
  const runResult = await runListLoad(async ({ signal, seq }) => {
    const res = await memoApi.list({
      page: targetPage,
      pageSize: pageSize.value,
      keyword: keyword.value.trim(),
      filter: activeFilter.value
    }, { signal })
    if (!isLatest(seq)) return
    list.value = res.list || []
    stats.total = Number(res.total || 0)
    stats.todoTotal = Number(res.todoTotal || 0)
    stats.doneTotal = Number(res.doneTotal || 0)
    stats.pinnedTotal = Number(res.pinnedTotal || 0)
    page.value = Number(res.page || targetPage)
    pageSize.value = Number(res.pageSize || pageSize.value)
  })
  if (!runResult.ok && !runResult.canceled) {
    ElMessage.error(loadError.value || '获取任务失败')
  }
}

/**
 * 重置编辑表单。
 */
const resetForm = () => {
  form.title = ''
  form.content = ''
  form.label = ''
  form.color = 'blue'
  form.pinned = false
  form.completed = false
  editingId.value = null
}

/**
 * 打开新增任务抽屉。
 */
const openCreate = () => {
  editorMode.value = 'create'
  resetForm()
  editorVisible.value = true
}

/**
 * 打开编辑抽屉并回填数据。
 * @param {object} row - 任务数据
 */
const openEdit = (row) => {
  editorMode.value = 'edit'
  editingId.value = row.id
  form.title = row.title || ''
  form.content = row.content || ''
  form.label = row.label || ''
  form.color = row.color || 'blue'
  form.pinned = Boolean(row.pinned)
  form.completed = Boolean(row.completed)
  editorVisible.value = true
}

/**
 * 统一构造更新 payload，避免编辑、置顶、完成状态维护多份逻辑。
 * @param {object} row - 当前任务
 * @param {object} patch - 需要覆盖的字段
 */
const buildPayload = (row, patch = {}) => ({
  title: row.title,
  content: row.content,
  label: row.label || '',
  color: row.color || 'blue',
  pinned: Boolean(row.pinned),
  completed: Boolean(row.completed),
  ...patch
})

const recalcStatsByList = () => {
  const rows = Array.isArray(list.value) ? list.value : []
  stats.total = rows.length
  stats.todoTotal = rows.filter(item => !item.completed).length
  stats.doneTotal = rows.filter(item => item.completed).length
  stats.pinnedTotal = rows.filter(item => item.pinned).length
}

const appendCreatedMemoToList = (memo) => {
  if (!memo || !memo.id) return
  const exists = list.value.some(item => item.id === memo.id)
  if (exists) return

  const passFilter = (
    activeFilter.value === 'all' ||
    (activeFilter.value === 'todo' && !memo.completed) ||
    (activeFilter.value === 'done' && memo.completed) ||
    (activeFilter.value === 'pinned' && memo.pinned)
  )
  if (!passFilter) return

  list.value = [memo, ...list.value].slice(0, pageSize.value)
}

/**
 * 保存新增或修改任务。
 */
const saveMemo = async () => {
  if (!form.title.trim()) return ElMessage.warning('标题不能为空')
  if (!form.content.trim()) return ElMessage.warning('内容不能为空')

  const payload = {
    title: form.title,
    content: form.content,
    label: form.label,
    color: form.color,
    pinned: form.pinned,
    completed: form.completed
  }

  try {
    saving.value = true
    if (editorMode.value === 'create') {
      const res = await memoApi.create(payload)
      appendCreatedMemoToList(res?.memo)
      recalcStatsByList()
      ElMessage.success('任务已创建')
    } else {
      await memoApi.update(editingId.value, payload)
      ElMessage.success('任务已更新')
    }
    editorVisible.value = false
    await loadList(1)
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 切换任务完成状态。
 * @param {object} row - 任务数据
 * @param {boolean} checked - 新状态
 */
const toggleCompleted = async (row, checked) => {
  const nextCompleted = Boolean(checked)
  const prevCompleted = Boolean(row.completed)
  const prevCompletedAt = row.completedAt

  // 先做本地状态切换，避免点击后视觉上“还在未完成”。
  row.completed = nextCompleted
  row.completedAt = nextCompleted ? (prevCompletedAt || new Date().toISOString()) : null
  recalcStatsByList()

  const ok = await withActionLock(row.id, async () => {
    try {
      await memoApi.update(row.id, buildPayload(row, { completed: nextCompleted }))
      ElMessage.success(nextCompleted ? '已标记为已做' : '已改回未做')
      if (activeFilter.value === 'todo' && nextCompleted) {
        list.value = list.value.filter(item => item.id !== row.id)
      }
      if (activeFilter.value === 'done' && !nextCompleted) {
        list.value = list.value.filter(item => item.id !== row.id)
      }
      recalcStatsByList()
      await loadList(activeFilter.value === 'all' ? page.value : 1)
    } catch (error) {
      row.completed = prevCompleted
      row.completedAt = prevCompletedAt
      recalcStatsByList()
      ElMessage.error(error?.response?.data?.message || '操作失败')
    }
  })
  return ok
}

/**
 * 切换任务置顶状态。
 * @param {object} row - 任务数据
 */
const togglePinned = async (row) => {
  const nextPinned = !row.pinned
  const prevPinned = row.pinned
  row.pinned = nextPinned
  recalcStatsByList()

  const ok = await withActionLock(row.id, async () => {
    try {
      await memoApi.update(row.id, buildPayload(row, { pinned: nextPinned }))
      ElMessage.success(nextPinned ? '已置顶' : '已取消置顶')
      if (activeFilter.value === 'pinned' && !nextPinned) {
        list.value = list.value.filter(item => item.id !== row.id)
      }
      recalcStatsByList()
      await loadList(page.value)
    } catch (error) {
      row.pinned = prevPinned
      recalcStatsByList()
      ElMessage.error(error?.response?.data?.message || '操作失败')
    }
  })
  return ok
}

/**
 * 删除任务。
 * @param {object} row - 任务数据
 */
const removeMemo = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除任务「${row.title}」吗？`, '提示', { type: 'warning' })
    const snapshot = [...list.value]
    list.value = list.value.filter(item => item.id !== row.id)
    recalcStatsByList()

    await withActionLock(row.id, async () => {
      try {
        await memoApi.remove(row.id)
        ElMessage.success('删除成功')
        await loadList(page.value)
      } catch (error) {
        list.value = snapshot
        recalcStatsByList()
        ElMessage.error(error?.response?.data?.message || '删除失败')
      }
    })
  } catch {
    // 用户取消删除时不做任何处理。
  }
}

/**
 * 打开历史记录抽屉。
 * @param {object} row - 任务数据
 */
const openHistory = async (row) => {
  historyTitle.value = `${row.title} · 历史记录`
  historyVisible.value = true
  try {
    const res = await memoApi.history(row.id)
    historyList.value = res.histories || []
  } catch (error) {
    historyList.value = []
    ElMessage.error(error?.response?.data?.message || '获取历史失败')
  }
}

/**
 * 切换页码。
 * @param {number} val - 新页码
 */
const handleCurrentChange = (val) => {
  loadList(val)
}

/**
 * 切换每页条数。
 * @param {number} val - 新的 pageSize
 */
const handleSizeChange = (val) => {
  pageSize.value = val
  resetToFirstPage()
  loadList(page.value)
}

/**
 * 切换筛选条件。
 */
const handleFilterChange = () => {
  resetToFirstPage()
  loadList(page.value)
}

/**
 * 搜索输入防抖，避免每次键入都发请求。
 */
const triggerSearch = createDebounce(() => {
  resetToFirstPage()
  loadList(page.value)
}, 300)

const onKeywordInput = () => {
  triggerSearch()
}

const actionTag = (action) => ({ create: 'success', update: 'warning', delete: 'danger', complete: 'success', reopen: 'info' }[action] || 'info')
const actionLabel = (action) => ({ create: '创建', update: '修改', delete: '删除', complete: '标记已做', reopen: '改回未做' }[action] || action)

const formatTime = (value) => formatDateTime(value)

onMounted(() => {
  loadList(1)
})

onUnmounted(() => {
  triggerSearch.cancel?.()
})
</script>

<style scoped>
.memo-page {
  padding: 0;
}

.memo-stats {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
}

.stat-label {
  color: #64748b;
  font-size: 13px;
}

.stat-value {
  margin-top: 6px;
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
}

.stat-tip {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.memo-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
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

.memo-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.memo-column {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #f8fafc;
  padding: 14px;
}

.done-column {
  background: #f8fbf8;
}

.column-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.column-title {
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.column-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.task-stack,
.task-list {
  display: grid;
  gap: 12px;
}

.task-card {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.task-card.pinned {
  border-color: #fca5a5;
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.08);
}

.task-card.done {
  background: linear-gradient(180deg, #ffffff 0%, #f8fff8 100%);
}

.task-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.task-check-label {
  font-size: 12px;
  color: #64748b;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 12px;
  margin-top: 8px;
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.task-content {
  margin: 12px 0 0;
  white-space: pre-wrap;
  line-height: 1.7;
  color: #334155;
}

.done-content {
  color: #475569;
}

.task-list-card.done .task-title {
  text-decoration: line-through;
  color: #64748b;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.load-error {
  margin-top: 12px;
}

.memo-editor {
  padding-right: 8px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.history-card {
  border-radius: 10px;
  margin-bottom: 10px;
}

.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.history-title {
  margin: 10px 0 8px;
  font-weight: 600;
  color: #0f172a;
}

.history-content {
  margin: 0;
  white-space: pre-wrap;
  color: #334155;
  line-height: 1.7;
}

.history-operator {
  color: #64748b;
  font-size: 12px;
}

@media (max-width: 980px) {
  .memo-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }

  .task-top {
    flex-direction: column;
  }

  .task-actions {
    justify-content: flex-start;
  }
}
</style>
