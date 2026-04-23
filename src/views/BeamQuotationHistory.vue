/**
* @module views/BeamQuotationHistory
* @description 横梁载重单历史记录页面
*
* 功能：
* - 查看所有历史横梁载重单（按公司分组）
* - 搜索和分页
* - 查看/编辑/删除历史记录
*/

<template>
  <div class="beam-quotation-history-container">
    <div v-if="viewState === 'list'" class="history-list-view">
      <el-card shadow="never" class="history-card" v-loading="loading">
        <div class="search-toolbar">
          <SearchBar v-model="searchKeyword" placeholder="按横梁名称模糊搜索" @search="handleSearch" />
        </div>

        <el-table :data="historyList" stripe border style="width: 100%" :header-cell-style="TABLE_HEADER_STYLE"
          class="smart-table">
          <el-table-column label="时间" width="105" align="center">
            <template #default="{ row }">{{ formatDate(row.createdAt || row.updatedAt) }}</template>
          </el-table-column>
          <el-table-column prop="name" label="横梁名称" min-width="140" show-overflow-tooltip align="center" />
          <el-table-column label="长度(mm)" align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'length') }}</template>
          </el-table-column>
          <el-table-column label="规格(mm)" min-width="150" show-overflow-tooltip align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'spec') }}</template>
          </el-table-column>
          <el-table-column label="最大载重(kg)" align="center">
            <template #default="{ row }">{{ getFirstItemValue(row, 'maxLoad') }}</template>
          </el-table-column>
          <el-table-column label="操作" :width="isGuest ? 80 : 200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button type="primary" size="small" round @click="enterDetail(row, 'view')">查看</el-button>
                <template v-if="!isGuest">
                  <el-button type="warning" size="small" plain :loading="isActionLoading(row.id)"
                    @click="enterDetail(row, 'edit')">修改</el-button>
                  <el-button type="danger" size="small" plain :loading="isActionLoading(row.id)"
                    @click="handleDelete(row)">删除</el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!historyList.length" description="暂无数据" />

        <div class="pager-wrap">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]"
            :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
        </div>
      </el-card>
    </div>

    <div v-else class="history-detail-view">
      <el-card shadow="never" class="editor-card">
        <el-form ref="formRef" :model="formModel">
          <div class="detail-toolbar">
            <el-button @click="backToList">返回列表</el-button>
            <el-button v-if="viewState === 'edit'" type="success" @click="handleUpdate">提交修改</el-button>

            <div class="name-display">
              <span class="label">记录名称:</span>
              <el-form-item prop="recordName" :rules="recordNameRule">
                <el-input v-model="formModel.recordName" :disabled="viewState === 'view'" style="width: 250px"
                  placeholder="必填" />
              </el-form-item>
            </div>
          </div>

          <el-table :data="editingItems" border stripe style="width: 100%; margin-top: 20px"
            :header-cell-style="TABLE_HEADER_STYLE" class="smart-table">
            <el-table-column label="横梁名称" min-width="180" align="left">
              <template #default="{ row, $index }">
                <el-form-item :prop="'editingItems.' + $index + '.name'" :rules="beamNameRule">
                  <el-input v-model="row.name" size="small" :disabled="viewState === 'view'" placeholder="必填" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="长度(mm)" width="130" align="center">
              <template #default="{ row, $index }">
                <el-form-item :prop="'editingItems.' + $index + '.length'"
                  :rules="[{ required: true, message: '请输入长度', trigger: 'blur' }, { validator: (rule, value, callback) => { if (value && !value.trim()) callback(new Error('长度不能只包含空格')); else callback(); }, trigger: 'blur' }]">
                  <el-input v-model="row.length" size="small" :disabled="viewState === 'view'" placeholder="必填" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="规格(mm)" width="150" align="center">
              <template #default="{ row, $index }">
                <el-form-item :prop="'editingItems.' + $index + '.spec'"
                  :rules="[{ required: true, message: '请输入规格', trigger: 'blur' }, { validator: (rule, value, callback) => { if (value && !value.trim()) callback(new Error('规格不能只包含空格')); else callback(); }, trigger: 'blur' }]">
                  <el-input v-model="row.spec" size="small" :disabled="viewState === 'view'" placeholder="必填" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column label="最大载重(kg)" width="140" align="center">
              <template #default="{ row, $index }">
                <el-form-item :prop="'editingItems.' + $index + '.maxLoad'" :rules="positiveDecimalRule('最大载重')">
                  <el-input v-model="row.maxLoad" size="small" :disabled="viewState === 'view'" placeholder="必填" />
                </el-form-item>
              </template>
            </el-table-column>
            <el-table-column v-if="viewState === 'edit'" label="操作" width="80" fixed="right" align="center">
              <template #default="{ $index }">
                <el-button link type="danger" :icon="Delete" @click="removeRow($index)" />
              </template>
            </el-table-column>
          </el-table>
        </el-form>
        <el-button v-if="viewState === 'edit'" type="primary" plain :icon="Plus" @click="addRow"
          style="margin-top: 15px; width: 100%">添加一行</el-button>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'
import { to } from '@/utils/async'
import { showError, showSuccess } from '@/utils/message'
import { useInstantListActions } from '@/composables/useInstantListActions'
import { usePagination } from '@/composables/usePagination'
import { createDebounce } from '@/utils/debounce'
import { beamNameRule, recordNameRule, positiveIntegerRule, positiveDecimalRule } from '@/utils/formRules'
import { usePermissions } from '@/composables/usePermissions'
import { formatDate, formatDateTime } from '@/utils/date'
import { TABLE_HEADER_STYLE } from '@/constants/table'
import SearchBar from '@/components/common/SearchBar.vue'

const { isGuest } = usePermissions()

const viewState = ref('list')
const historyList = ref([])
const loading = ref(false)
const editingId = ref(null)
const editingName = ref('')
const editingItems = ref([])
const originalDataStr = ref('')
const formRef = ref(null)
const formModel = reactive({
  recordName: '',
  editingItems: editingItems
})

watch(editingName, (val) => { formModel.recordName = val })

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')

const { isActionLoading, withActionLock, replaceById, removeById } = useInstantListActions(historyList)

const loadList = async (targetPage) => {
  if (!targetPage) targetPage = page.value || 1
  if (loading.value) return
  loading.value = true
  const [err, res] = await to(beamApi.list({ page: targetPage, pageSize: pageSize.value, keyword: searchKeyword.value.trim() }))
  if (err) {
    showError(err, '历史记录加载失败')
    loading.value = false
    return
  }
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
  loading.value = false
}

const handleCurrentChange = (val) => {
  page.value = val
  loadList(page.value)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  page.value = 1
  loadList(1)
}

const resetToFirstPage = () => {
  page.value = 1
}

const triggerSearch = createDebounce(async () => {
  resetToFirstPage()
  await loadList(1)
}, 300)

const onKeywordInput = () => {
  triggerSearch()
}

const handleSearch = () => {
  loadList(1)
}

const enterDetail = (row, mode) => {
  editingId.value = row.id
  editingName.value = row.name
  let parsedItems = []
  try {
    parsedItems = typeof row.items === 'string' ? JSON.parse(row.items) : JSON.parse(JSON.stringify(row.items || []))
    if (!Array.isArray(parsedItems)) parsedItems = []
  } catch {
    parsedItems = []
  }
  editingItems.value = parsedItems
  formModel.recordName = row.name
  formModel.items = parsedItems

  originalDataStr.value = JSON.stringify({ name: row.name, items: parsedItems })
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
  const [validateErr] = await to(formRef.value?.validate())
  if (validateErr) return

  const currentName = formModel.recordName
  const currentDataStr = JSON.stringify({ name: currentName, items: editingItems.value })
  if (currentDataStr === originalDataStr.value) {
    return ElMessage.warning('您没有修改任何数据，无需提交修改。')
  }

  replaceById(editingId.value, { name: currentName, items: JSON.parse(JSON.stringify(editingItems.value)) })
  const [err] = await to(withActionLock(editingId.value, async () => {
    await beamApi.update(editingId.value, { name: currentName, items: editingItems.value })
  }))
  if (err) {
    await loadList(page.value)
    showError('历史记录里面有相同的横梁名称')
    return
  }
  showSuccess('修改成功！')
  backToList()
}

const handleDelete = async (row) => {
  const [confirmErr] = await to(ElMessageBox.confirm(`确定删除"${row.name}"？`, '提示', { type: 'warning' }))
  if (confirmErr) return

  removeById(row.id)
  const [err] = await to(withActionLock(row.id, async () => {
    await beamApi.remove(row.id)
  }))
  if (err) {
    await loadList(page.value)
    showError(err, '删除失败')
    return
  }
  ElMessage.success('删除成功')
  await loadList(page.value)
}

const getFirstItemValue = (row, f) => {
  try {
    const items = typeof row.items === 'string' ? JSON.parse(row.items) : row.items
    return items?.[0]?.[f] || '-'
  } catch {
    return '-'
  }
}

onMounted(loadList)
</script>

<style scoped>
.beam-quotation-history-container {
  padding: 0;
}

.history-card,
.editor-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.search-toolbar,
.detail-toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.detail-toolbar {
  justify-content: flex-start;
}

.name-display {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  vertical-align: middle;
}

.label {
  font-weight: bold;
  color: #475569;
  vertical-align: middle;
  line-height: normal;
}

.name-display :deep(.el-form-item) {
  vertical-align: middle;
  margin-bottom: 0;
  display: flex;
  align-items: flex-start;
}

.name-display :deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
  position: absolute;
  top: 100%;
  left: 0;
}

.pager-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
}

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
