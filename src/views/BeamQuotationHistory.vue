<template>
  <div class="beam-quotation-history-container">
    <div v-if="viewState === 'list'" class="history-list-view">
      <el-card shadow="never" class="history-card">
        <div class="search-toolbar">
          <el-input v-model="searchKeyword" placeholder="按横梁名称模糊搜索" clearable :prefix-icon="Search" style="width: 320px" />
        </div>

        <el-table :data="filteredHistoryList" stripe border style="width: 100%" :header-cell-style="{ background: '#f8f8f9', textAlign: 'center' }" class="smart-table">
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
              <el-button link type="warning" @click="enterDetail(row, 'edit')">修改</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!filteredHistoryList.length" description="暂无数据" />
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'

const viewState = ref('list')
const historyList = ref([])
const searchKeyword = ref('')

// 编辑数据
const editingId = ref(null)
const editingName = ref('')
const editingItems = ref([])
const originalDataStr = ref('') // 用于深比较

const fetchList = async () => {
  try {
    const res = await beamApi.list()
    historyList.value = res.list || []
  } catch {}
}

const filteredHistoryList = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  return historyList.value.filter(item => (item.name || '').toLowerCase().includes(kw))
})

const enterDetail = (row, mode) => {
  editingId.value = row.id
  editingName.value = row.name
  editingItems.value = typeof row.items === 'string' ? JSON.parse(row.items) : JSON.parse(JSON.stringify(row.items))
  
  // 保存一份原始数据的字符串，用于比对
  originalDataStr.value = JSON.stringify({ name: editingName.value, items: editingItems.value })
  viewState.value = mode
}

const backToList = () => {
  viewState.value = 'list'
  fetchList()
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
    await beamApi.update(editingId.value, { name: editingName.value, items: editingItems.value })
    ElMessage.success('修改成功！')

    backToList()
  } catch {
    
    ElMessage.error('历史记录里面有相同的横梁名称')
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name}”？`, '提示', { type: 'warning' })
    await beamApi.remove(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {}
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

onMounted(fetchList)
</script>

<style scoped>
.beam-quotation-history-container { padding: 0; }
.history-card, .editor-card { border-radius: 12px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.search-toolbar, .detail-toolbar { margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
.detail-toolbar { justify-content: flex-start; }
.name-display { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.label { font-weight: bold; color: #475569; }
</style>