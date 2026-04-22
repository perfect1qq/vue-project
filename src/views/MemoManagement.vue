/**
* @module views/MemoManagement
* @description 备忘录管理页面
*
* 功能：
* - 创建、编辑、删除备忘录
* - 按日期范围筛选（今日/归档）
* - 备忘录统计概览
* - 游客只读模式
*/

<template>
  <div class="memo-container">
    <MemoStatsRow :stats="stats" :scope-stat-copy="scopeStatCopy" />

    <div class="memo-wrapper">
      <header class="memo-header">
        <div class="header-left">
          <h1 class="memo-title">{{ pageTitle }}</h1>
          <div class="memo-badge">{{ activeListScope === 'today' ? 'LIVE' : 'ARCHIVE' }}</div>
        </div>

        <div class="header-right">
          <div class="control-group">
            <el-segmented v-model="activeListScope" :options="listScopeOptions" class="custom-segmented"
              @change="handleListScopeChange" />
          </div>

          <div class="vertical-spacer"></div>

          <div class="control-group search-container">
            <el-input v-model="keyword" placeholder="搜索标题或内容..." :prefix-icon="Search" clearable class="custom-search"
              @input="onKeywordInput" />

            <div class="date-picker-box" :class="{ 'is-expanded': activeListScope === 'history' }">
              <el-date-picker v-model="historyCreatedOn" type="date" value-format="YYYY-MM-DD" placeholder="选择创建日期"
                clearable class="custom-date-picker" @change="onHistoryDateChange" />
            </div>
          </div>

          <div class="vertical-spacer"></div>

          <div class="control-group">
            <el-segmented v-model="activeFilter" :options="filterOptions" class="custom-segmented"
              @change="handleFilterChange" />
          </div>

          <div v-if="activeListScope === 'today' && !isGuest" class="action-box">
            <el-button type="primary" :icon="Plus" class="main-add-btn" @click="openCreate">
              新建任务
            </el-button>
          </div>
        </div>
      </header>

      <div class="memo-content">
        <el-skeleton :loading="loading && !list.length" animated :rows="12">
          <template #default>
            <div v-show="isBoardMode" class="board-grid">
              <section class="column">
                <div class="column-head">
                  <span class="col-indicator todo"></span>
                  <span class="col-name">待处理</span>
                  <span class="col-num">{{ todoList.length }}</span>
                </div>

                <div class="task-list">
                  <div v-for="item in todoList" :key="item.id" v-memo="[item.updatedAt, item.pinned, item.color]"
                    :class="['card', item.color, { 'is-pinned': item.pinned }]">
                    <div class="card-inner">
                      <div class="card-side">
                        <el-checkbox :model-value="item.completed" @change="() => toggleCompleted(item)" />
                      </div>

                      <div class="card-main" @click="openEdit(item)">
                        <div class="card-header">
                          <span class="card-title">{{ item.title }}</span>
                          <el-tag v-if="item.pinned" size="small" type="danger" effect="dark" round>
                            置顶
                          </el-tag>
                        </div>

                        <p class="card-body">{{ item.content }}</p>

                        <div class="card-meta">
                          <span class="tag">{{ item.label || '默认' }}</span>
                          <span class="date">{{ formatTime(item.updatedAt) }}</span>
                        </div>
                      </div>

                      <div class="card-actions">
                        <el-dropdown trigger="click">
                          <el-button link :icon="MoreFilled"></el-button>
                          <template #dropdown>
                            <el-dropdown-menu>
                              <el-dropdown-item @click="openEdit(item)">编辑详情</el-dropdown-item>
                              <el-dropdown-item @click="togglePinned(item)">
                                {{ item.pinned ? '取消置顶' : '置顶任务' }}
                              </el-dropdown-item>
                              <el-dropdown-item @click="openHistory(item)">查看日志</el-dropdown-item>
                              <el-dropdown-item divided style="color: #f56c6c" @click="removeMemo(item)">
                                彻底删除
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>
                      </div>
                    </div>
                  </div>
                </div>

                <el-empty v-if="!todoList.length" description="今日无事" :image-size="80" />
              </section>

              <section class="column">
                <div class="column-head">
                  <span class="col-indicator done"></span>
                  <span class="col-name">已圆满</span>
                  <span class="col-num">{{ doneList.length }}</span>
                </div>

                <div class="task-list">
                  <div v-for="item in doneList" :key="item.id" v-memo="[item.updatedAt, item.completed]"
                    class="card is-completed">
                    <div class="card-inner">
                      <div class="card-side">
                        <el-checkbox :model-value="item.completed" @change="() => toggleCompleted(item)" />
                      </div>

                      <div class="card-main">
                        <span class="card-title">{{ item.title }}</span>
                        <div class="card-meta">
                          <span class="date">完成于 {{ formatTime(item.completedAt || item.updatedAt) }}</span>
                        </div>
                      </div>

                      <el-button link type="danger" :icon="Delete" @click="removeMemo(item)"></el-button>
                    </div>
                  </div>
                </div>

                <el-empty v-if="!doneList.length" description="继续加油" :image-size="80" />
              </section>
            </div>

            <div v-show="!isBoardMode" class="list-view">
              <div v-if="list.length" class="task-list single-stack">
                <div v-for="item in list" :key="item.id" v-memo="[item.updatedAt, item.completed, item.pinned]"
                  :class="['card', item.color, { 'is-pinned': item.pinned, 'is-completed': item.completed, 'is-highlighted': highlightId === item.id }]"
                  :data-memo-id="item.id">
                  <div class="card-inner">
                    <el-checkbox :model-value="item.completed" @change="() => toggleCompleted(item)" />
                    <div class="card-main" @click="openEdit(item)">
                      <div class="card-header">
                        <span class="card-title">{{ item.title }}</span>
                        <el-tag v-if="item.completed" size="small" type="success">DONE</el-tag>
                      </div>
                      <p class="card-body">{{ item.content }}</p>
                    </div>
                    <div class="card-actions">
                      <template v-if="!isGuest">
                        <el-button link @click="openEdit(item)">编辑</el-button>
                        <el-button link type="danger" @click="removeMemo(item)">删除</el-button>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <el-empty v-else :description="emptyDescription" />
            </div>

            <div class="load-more-container">
              <div v-if="loading" class="no-more-text">
                <span>加载中...</span>
              </div>

              <div v-else-if="!hasMore && list.length > 0" class="no-more-text">
                <span class="line"></span>
                <span>已经没有更多任务了</span>
                <span class="line"></span>
              </div>
            </div>

            <div ref="loadMoreTriggerRef" class="load-more-sentinel" aria-hidden="true"></div>
          </template>
        </el-skeleton>
      </div>
    </div>

    <el-drawer v-model="editorVisible" :title="editorMode === 'create' ? '✨ 开启新任务' : '📝 更新任务细节'" size="540px"
      class="custom-drawer">
      <el-form ref="formRef" :model="form" label-position="top">
        <el-form-item label="任务名称" prop="title" :rules="memoTitleRule" required>
          <el-input v-model="form.title" placeholder="输入核心目标" maxlength="100" show-word-limit />
        </el-form-item>

        <div class="form-row">
          <el-form-item label="分类" prop="label" :rules="memoLabelRule" required>
            <el-input v-model="form.label" placeholder="如：工作" maxlength="20" show-word-limit />
          </el-form-item>
          <el-form-item label="主题色" style="flex: 1">
            <el-select v-model="form.color">
              <el-option v-for="c in colorOptions" :key="c.value" :label="c.label" :value="c.value" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-row toggle-row">
          <el-form-item label="置顶显示">
            <el-switch v-model="form.pinned" />
          </el-form-item>
          <el-form-item label="完成状态">
            <el-switch v-model="form.completed" />
          </el-form-item>
        </div>

        <el-form-item label="提醒时间">
          <el-date-picker v-model="form.remindAt" type="datetime" placeholder="选择提醒时间" style="width: 100%"
            format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>

        <el-form-item label="详细说明" prop="content" :rules="memoContentRule" required>
          <el-input v-model="form.content" type="textarea" :rows="10" placeholder="记录具体步骤或想法..." maxlength="2000"
            show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-btns">
          <el-button @click="editorVisible = false">舍弃修改</el-button>
          <el-button type="primary" :loading="saving" @click="saveMemo">确 认 保 存</el-button>
        </div>
      </template>
    </el-drawer>

    <el-drawer v-model="historyVisible" :title="historyTitle" size="420px">
      <el-timeline v-if="historyList.length" class="custom-timeline">
        <el-timeline-item v-for="h in historyList" :key="h.id" :timestamp="formatTime(h.createdAt)"
          :type="h.action === 'complete' ? 'success' : 'primary'">
          <div class="log-box">
            <p class="log-user"><strong>{{ h.operatorName }}</strong> {{ actionLabel(h.action) }}</p>
            <div class="log-content">{{ h.content }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else />
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, MoreFilled, Delete } from '@element-plus/icons-vue'
import { memoApi } from '@/api/memo'
import { createDebounce } from '@/utils/debounce'
import { to } from '@/utils/async'
import { formatDateTime } from '@/utils/navigation'
import { useCancelableLoader } from '@/composables/useCancelableLoader'
import { useListQueryState } from '@/composables/useListQueryState'
import { memoTitleRule, memoLabelRule, memoContentRule } from '@/utils/formRules'
import { usePermissions } from '@/composables/usePermissions'
import MemoStatsRow from '@/components/memo/MemoStatsRow.vue'

// 1. 响应式状态：使用 shallowRef 优化大型列表性能
const { isGuest, canEdit, canDelete } = usePermissions()
const list = shallowRef([])
const hasMore = ref(false)
const formRef = ref(null)
const { loading, run: runListLoad, isLatest } = useCancelableLoader()
const saving = ref(false)
const { keyword, page, pageSize, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 50, keyword: '' })
const activeListScope = ref('today')
const historyCreatedOn = ref(null)
const activeFilter = ref('all')
const stats = reactive({ total: 0, todoTotal: 0, doneTotal: 0, pinnedTotal: 0 })

/** 统计区域显示文本配置（根据当前模式动态切换） */
const scopeStatCopy = computed(() => {
  const isHistory = activeListScope.value === 'history'
  return {
    mode: isHistory ? 'history' : 'today',
    totalLabel: isHistory ? '往期任务' : '全部任务',
    totalTip: isHistory ? '历史创建的任务总数' : '当前视图的任务总数',
    todoTip: isHistory ? '往期未完成任务' : '待处理事项',
    doneTip: isHistory ? '往期已完成' : '已完成的任务',
    pinnedTip: isHistory ? '历史置顶' : '重要置顶'
  }
})

const route = useRoute()
const highlightId = ref(null)

// 2. 交互状态
const editorVisible = ref(false)
const editorMode = ref('create')
const editingId = ref(null)
const form = reactive({ title: '', content: '', label: '', color: 'blue', pinned: false, completed: false, remindAt: null })
const originalForm = reactive({ title: '', content: '', label: '', color: 'blue', pinned: false, completed: false, remindAt: null })
const historyVisible = ref(false)
const historyTitle = ref('日志')
const historyList = shallowRef([])

// 抖音式底部哨兵
const loadMoreTriggerRef = ref(null)
let observer = null

// 3. 静态配置
const statConfig = [
  { label: '全部任务', key: 'total', class: '' },
  { label: '未完成', key: 'todoTotal', class: 'todo' },
  { label: '已完成', key: 'doneTotal', class: 'done' },
  { label: '重要置顶', key: 'pinnedTotal', class: 'pinned' }
]

const listScopeOptions = [
  { label: '今日任务', value: 'today' },
  { label: '往期回顾', value: 'history' }
]

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '待办', value: 'todo' },
  { label: '完成', value: 'done' },
  { label: '置顶', value: 'pinned' }
]

const colorOptions = [
  { label: '经典蓝', value: 'blue' },
  { label: '薄荷绿', value: 'green' },
  { label: '珊瑚橙', value: 'amber' },
  { label: '丁香紫', value: 'purple' },
  { label: '玫瑰红', value: 'rose' }
]

// 4. 计算逻辑
const isBoardMode = computed(() => activeFilter.value === 'all')
const todoList = computed(() => list.value.filter(i => !i.completed))
const doneList = computed(() => list.value.filter(i => i.completed))
const pageTitle = computed(() => (activeListScope.value === 'today' ? '今日任务' : '往期任务'))
const emptyDescription = computed(() =>
  activeListScope.value === 'history' ? '这一天没有任何记录' : '今日还没有任务，给自己定个目标吧'
)

// 5. 方法函数
const loadList = async (targetPage = page.value, append = false) => {
  await runListLoad(async ({ signal, seq }) => {
    const params = {
      page: targetPage,
      pageSize: pageSize.value,
      keyword: keyword.value.trim(),
      filter: activeFilter.value,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    if (activeListScope.value === 'history' && historyCreatedOn.value) {
      params.createdOn = historyCreatedOn.value
    }

    const res =
      activeListScope.value === 'history'
        ? await memoApi.listHistory(params, { signal })
        : await memoApi.list(params, { signal })

    if (!isLatest(seq)) return

    const rows = res.list || []
    list.value = append ? [...list.value, ...rows] : rows
    hasMore.value = list.value.length < (res.total || 0)

    Object.assign(stats, {
      total: res.total || 0,
      todoTotal: res.todoTotal || 0,
      doneTotal: res.doneTotal || 0,
      pinnedTotal: res.pinnedTotal || 0
    })
  })
}

// 抖音式：滚动到接近底部自动加载
const loadNextPage = async () => {
  if (!hasMore.value || loading.value) return

  page.value += 1
  await loadList(page.value, true)
}

const initInfiniteObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }

  const target = loadMoreTriggerRef.value
  if (!target) return

  observer = new IntersectionObserver(
    entries => {
      const [entry] = entries
      if (entry?.isIntersecting) {
        loadNextPage()
      }
    },
    {
      root: null,
      rootMargin: '0px 0px 240px 0px',
      threshold: 0.1
    }
  )

  observer.observe(target)
}

const openCreate = () => {
  editorMode.value = 'create'
  Object.assign(form, { title: '', content: '', label: '', color: 'blue', pinned: false, completed: false })
  editorVisible.value = true
}

const openEdit = item => {
  editorMode.value = 'edit'
  editingId.value = item.id
  Object.assign(form, { ...item })
  Object.assign(originalForm, { ...item })
  editorVisible.value = true
}

const saveMemo = async () => {
  const [validateErr] = await to(formRef.value?.validate())
  if (validateErr) return

  if (editorMode.value === 'edit') {
    const isChanged = JSON.stringify(form) !== JSON.stringify(originalForm)
    if (!isChanged) {
      ElMessage.warning('没有做任何修改')
      return
    }
  }

  saving.value = true
  if (editorMode.value === 'create') {
    const [err] = await to(memoApi.create(form))
    if (err) {
      saving.value = false
      return
    }
    ElMessage.success('新增成功')
  } else {
    const [err] = await to(memoApi.update(editingId.value, form))
    if (err) {
      saving.value = false
      return
    }
    ElMessage.success('修改完成')
  }
  editorVisible.value = false
  page.value = 1
  await loadList(1)
  saving.value = false
}

const toggleCompleted = async item => {
  const [err] = await to(memoApi.update(item.id, { ...item, completed: !item.completed }))
  if (err) {
    ElMessage.error('网络繁忙，请重试')
    return
  }
  page.value = 1
  await loadList(1)
}

const togglePinned = async item => {
  const [err] = await to(memoApi.update(item.id, { ...item, pinned: !item.pinned }))
  if (err) {
    ElMessage.error('操作失败')
    return
  }
  page.value = 1
  await loadList(1)
}

const removeMemo = async item => {
  const [confirmErr] = await to(ElMessageBox.confirm('任务一旦删除将无法找回，确认继续吗？', '删除确认'))
  if (confirmErr) return

  const [err] = await to(memoApi.remove(item.id))
  if (err) return
  page.value = 1
  await loadList(1)
}

const openHistory = async item => {
  historyTitle.value = `${item.title} 的修订轨迹`
  historyVisible.value = true
  const res = await memoApi.history(item.id)
  historyList.value = res.histories || []
}

const triggerSearch = createDebounce(() => {
  resetToFirstPage()
  page.value = 1
  loadList(1)
}, 300)

const onKeywordInput = () => triggerSearch()

const handleFilterChange = () => {
  resetToFirstPage()
  page.value = 1
  loadList(1)
}

const handleListScopeChange = () => {
  historyCreatedOn.value = null
  resetToFirstPage()
  page.value = 1
  loadList(1)
}

const onHistoryDateChange = () => {
  resetToFirstPage()
  page.value = 1
  loadList(1)
}

const formatTime = v => formatDateTime(v)

const actionLabel = a =>
({
  create: '创建了任务',
  update: '更新了内容',
  complete: '完成了任务',
  reopen: '重新开启了任务'
}[a] || a)

onMounted(async () => {
  highlightId.value = route.query.highlight ? Number(route.query.highlight) : null
  await loadList(1)
  initInfiniteObserver()
  if (highlightId.value) {
    nextTick(() => {
      const el = document.querySelector(`[data-memo-id="${highlightId.value}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight-flash')
      }
    })
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<style scoped>
/* 容器与背景 */
.memo-container {
  padding: 32px;
  background-color: #fcfdfe;
  min-height: 100vh;
  color: #1a1f36;
}

/* 顶部统计区：现代磁贴风 */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.stat-item {
  background: #ffffff;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02), 0 4px 12px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-count {
  font-size: 32px;
  font-weight: 800;
}

.stat-count.todo {
  color: #f59e0b;
}

.stat-count.done {
  color: #10b981;
}

.stat-count.pinned {
  color: #ef4444;
}

/* 核心布局卡片 */
.memo-wrapper {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
  min-height: 600px;
}

/* 头部排版 */
.memo-header {
  padding: 28px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.memo-title {
  font-size: 24px;
  font-weight: 850;
  letter-spacing: -0.5px;
  margin: 0;
}

.memo-badge {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.vertical-spacer {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
  margin: 0 4px;
}

/* 搜索与日期容器 */
.search-container {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 450px;
}

.custom-search {
  width: 240px;
}

.custom-search :deep(.el-input__wrapper) {
  background-color: #f8fafc;
  box-shadow: none !important;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.date-picker-box {
  width: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.date-picker-box.is-expanded {
  width: 220px;
  opacity: 1;
}

.custom-segmented {
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
}

.main-add-btn {
  border-radius: 10px;
  font-weight: 700;
  height: 40px;
  padding: 0 24px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* 看板视图布局 */
.memo-content {
  padding: 28px;
}

.board-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.column {
  background: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #f1f5f9;
}

.column-head {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  font-weight: 700;
}

.col-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
}

.col-indicator.todo {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

.col-indicator.done {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.col-num {
  margin-left: auto;
  color: #94a3b8;
  font-size: 12px;
  background: #fff;
  padding: 2px 10px;
  border-radius: 20px;
}

/* 任务卡片样式 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #eef2f6;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: default;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

.card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 4px;
  border-radius: 0 4px 4px 0;
}

.card.blue::after {
  background: #3b82f6;
}

.card.green::after {
  background: #10b981;
}

.card.amber::after {
  background: #f59e0b;
}

.card.rose::after {
  background: #f43f5e;
}

.card.purple::after {
  background: #a855f7;
}

.card.is-completed {
  opacity: 0.6;
}

.card.is-completed .card-title {
  text-decoration: line-through;
  color: #94a3b8;
}

.card.is-highlighted {
  animation: highlight-pulse 1.5s ease-out;
  box-shadow: 0 0 0 3px #3b82f6, 0 12px 24px -8px rgba(59, 130, 246, 0.3);
}

@keyframes highlight-pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.02);
  }

  100% {
    transform: scale(1);
  }
}

.card-inner {
  padding: 18px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.card-main {
  flex: 1;
  cursor: pointer;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
}

.card-body {
  font-size: 13px;
  color: #475569;
  margin: 0 0 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tag {
  font-size: 11px;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
}

.date {
  font-size: 11px;
  color: #cbd5e1;
}

/* 加载更多与底部提示 */
.load-more-container {
  margin-top: 32px;
  text-align: center;
  padding-bottom: 16px;
}

.no-more-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
}

.no-more-text .line {
  width: 40px;
  height: 1px;
  background-color: #e2e8f0;
}

.load-more-sentinel {
  width: 100%;
  height: 1px;
}

/* 表单与抽屉样式 */
.form-row {
  display: flex;
  gap: 20px;
}

.toggle-row {
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.drawer-btns {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
}

.log-box {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 10px;
}

.log-user {
  font-size: 13px;
  margin: 0 0 4px;
}

.log-content {
  font-size: 12px;
  color: #64748b;
}

/* 响应式适配 */
@media (max-width: 1280px) {
  .search-container {
    min-width: 350px;
  }

  .custom-search {
    width: 180px;
  }
}

@media (max-width: 1024px) {
  .stats-overview {
    grid-template-columns: 1fr 1fr;
  }

  .board-grid {
    grid-template-columns: 1fr;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .search-container {
    width: 100%;
    min-width: auto;
  }
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
}
</style>