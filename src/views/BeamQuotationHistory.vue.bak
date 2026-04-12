<template>
  <div class="beam-quotation-history-container">
    <div v-if="viewState === 'list'" class="history-list-view">
      <el-card shadow="never" class="history-card" v-loading="loading">
        <div class="search-toolbar">
          <el-input
            v-model="searchKeyword"
            placeholder="按横梁名称模糊搜索"
            clearable
            :prefix-icon="Search"
            style="width: 320px"
            @input="onKeywordInput"
          />
        </div>

        <el-table :data="historyList" stripe border style="width: 100%" :header-cell-style="{ background: '#f8f8f9', textAlign: 'center' }" class="smart-table">
          <el-table-column label="时间" width="120" align="center">
            <template #default="{ row }">{{ formatDate(row.createdAt || row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column prop="name" label="横梁名称" min-width="220" align="center" />
          <el-table-column label="长度(mm)" width="120" align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'length') }}</template>
          </el-table-column>
          <el-table-column label="规格(mm)" width="150" align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'spec') }}</template>
          </el-table-column>
          <el-table-column label="最大载重(kg)" width="140" align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'maxLoad') }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="enterDetail(row, 'view')">查看</el-button>
              <el-button link type="warning" :loading="isActionLoading(row.id)" @click="enterDetail(row, 'edit')">修改</el-button>
              <el-button link type="danger" :loading="isActionLoading(row.id)" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!historyList.length" description="暂无数据" />

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
    </div>

    <div v-else class="history-detail-view">
      <el-card shadow="never" class="editor-card">
        <div class="detail-toolbar">
          <el-button @click="backToList">返回列表</el-button>
          <el-button v-if="viewState === 'edit'" type="success" @click="handleUpdate">提交修改</el-button>
          
          <div class="name-display">
            <span class="label">记录名称:</span>
            <el-input v-model="editingName" :disabled="viewState === 'view'" style="width: 250px" placeholder="必填" />
          </div>
        </div>

        <el-table :data="editingItems" border stripe style="width: 100%; margin-top: 20px" :header-cell-style="{ background: '#f8f8f9', textAlign: 'center' }" class="smart-table">
          <el-table-column label="横梁名称" min-width="180" align="center">
            <template #default="{ row }">
              <el-input v-model="row.name" size="small" :disabled="viewState === 'view'" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column label="长度(mm)" min-width="140" align="center">
            <template #default="{ row }">
              <el-input v-model="row.length" size="small" :disabled="viewState === 'view'" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column label="规格(mm)" min-width="160" align="center">
            <template #default="{ row }">
              <el-input v-model="row.spec" size="small" :disabled="viewState === 'view'" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column label="最大载重(kg)" min-width="150" align="center">
            <template #default="{ row }">
              <el-input v-model="row.maxLoad" size="small" :disabled="viewState === 'view'" placeholder="必填" />
            </template>
          </el-table-column>
          <el-table-column v-if="viewState === 'edit'" label="操作" width="90" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="removeRow($index)" />
            </template>
          </el-table-column>
        </el-table>
        <el-button v-if="viewState === 'edit'" type="primary" plain :icon="Plus" @click="addRow" style="margin-top: 15px; width: 100%">添加一行</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { useListQueryState } from '@/composables/useListQueryState'
import { createDebounce } from '@/utils/debounce'

const viewState = ref('list')
const historyList = ref([])
const { page, pageSize, keyword: searchKeyword, resetToFirstPage } = useListQueryState({ page: 1, pageSize: 10, keyword: '' })
const total = ref(0)
const loading = ref(false)
const { isActionLoading, withActionLock, replaceById, removeById } = useInstantListActions(historyList)

// 编辑数据
const editingId = ref(null)
const editingName = ref('')
const editingItems = ref([])
const originalDataStr = ref('') // 用于深比较

const loadList = async (targetPage = page.value) => {
  loading.value = true
  try {
    const res = await beamApi.list({ page: targetPage, pageSize: pageSize.value, keyword: searchKeyword.value.trim() })
    const rawList = res?.list || res?.records || res?.items || res || []
    const list = Array.isArray(rawList) ? rawList : []
    const hasPaginationMeta = Boolean(res && (Object.prototype.hasOwnProperty.call(res, 'total') || Object.prototype.hasOwnProperty.call(res, 'page') || Object.prototype.hasOwnProperty.call(res, 'pageSize')))

    if (hasPaginationMeta) {
      historyList.value = list
      total.value = Number(res?.total ?? list.length ?? 0)
    } else {
      const start = (targetPage - 1) * pageSize.value
      historyList.value = list.slice(start, start + pageSize.value)
      total.value = list.length
    }

    page.value = Number(res?.page || targetPage)
    pageSize.value = Number(res?.pageSize || pageSize.value)
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || error?.message || '历史记录加载失败')
  } finally {
    loading.value = false
  }
}

const triggerSearch = createDebounce(async () => {
  resetToFirstPage()
  await loadList(1)
}, 300)

const onKeywordInput = () => {
  triggerSearch()
}

const handleCurrentChange = async (val) => {
  await loadList(val)
}

const handleSizeChange = async (val) => {
  pageSize.value = val
  resetToFirstPage()
  await loadList(1)
}

const enterDetail = (row, mode) => {
  editingId.value = row.id
  editingName.value = row.name
  editingItems.value = typeof row.items === 'string' ? JSON.parse(row.items) : JSON.parse(JSON.stringify(row.items))
  
  // 保存一份原始数据的字符串，用于比对
  originalDataStr.value = JSON.stringify({ name: editingName.value, items: editingItems.value })
  viewState.value = mode
}

const backToList = async () => {
  viewState.value = 'list'
  await loadList(page.value)
}

const addRow = () => editingItems.value.push({ name: '', length: '', spec: '', maxLoad: '' })

// 需求 3：不能把数据删完
const removeRow = (index) => {
  if (editingItems.value.length <= 1) {
    return ElMessage.warning('至少需要保留一行数据，无法继续删除！')
  }
  editingItems.value.splice(index, 1)
}

const handleUpdate = async () => {
  // 需求 1：判断用户是否修改了数据
  const currentDataStr = JSON.stringify({ name: editingName.value, items: editingItems.value })
  if (currentDataStr === originalDataStr.value) {
    return ElMessage.warning('您没有修改任何数据，无需提交修改。')
  }

  if (!editingName.value.trim()) return ElMessage.warning('记录名称不能为空！')

  // 需求 3：必填项校验
  if (editingItems.value.length === 0) {
    return ElMessage.warning('表格数据不能为空，请添加数据！')
  }
  const hasEmptyField = editingItems.value.some(item => 
    !item.name?.trim() || !item.length?.trim() || !item.spec?.trim() || !item.maxLoad?.trim()
  )
  if (hasEmptyField) {
    return ElMessage.warning('表格中的横梁名称、长度、规格、最大载重均为必填项，缺一不可！')
  }

  try {
    replaceById(editingId.value, { name: editingName.value, items: JSON.parse(JSON.stringify(editingItems.value)) })
    await withActionLock(editingId.value, async () => {
      await beamApi.update(editingId.value, { name: editingName.value, items: editingItems.value })
    })
    ElMessage.success('修改成功！')

    backToList()
  } catch {
    await loadList(page.value)
    ElMessage.error('历史记录里面有相同的横梁名称')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name}”？`, '提示', { type: 'warning' })
    removeById(row.id)
    await withActionLock(row.id, async () => {
      await beamApi.remove(row.id)
    })
    ElMessage.success('删除成功')
    await loadList(page.value)
  } catch (error) {
    if (error !== 'cancel') {
      await loadList(page.value)
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

const getFirstItemValue = (row, f) => {
  const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items
  return items?.[0]?.[f] || '-'
}
const formatDate = (d) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
}

onMounted(loadList)
</script>

<style scoped>
.beam-quotation-history-container { padding: 0; }
.history-card, .editor-card { border-radius: 12px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.search-toolbar, .detail-toolbar { margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
.detail-toolbar { justify-content: flex-start; }
.name-display { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.label { font-weight: bold; color: #475569; }
.pager-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }

@media (max-width: 768px) {
  .search-toolbar,
  .detail-toolbar {
    margin-bottom: 12px;
    gap: 8px;
  }

  .search-toolbar :deep(.el-input),
  .search-toolbar :deep(.el-input__wrapper) {
    width: 100% !important;
  }

  .name-display {
    margin-left: 0;
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .name-display :deep(.el-input),
  .name-display :deep(.el-input__wrapper) {
    width: 100% !important;
  }

  .pager-wrap {
    justify-content: center;
  }
}
</style>
