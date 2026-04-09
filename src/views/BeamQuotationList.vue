<template>
  <div class="beam-quotation-page">
    <el-card shadow="never" class="editor-card">
      <div class="toolbar">
        <el-button type="primary" :icon="Plus" @click="addRow">添加一行</el-button>
        <el-button type="success" :icon="DocumentAdd" :loading="saving" @click="handleSave">提交保存</el-button>
        <el-button :icon="List" @click="goToHistory">历史记录</el-button>
        
        <div class="name-group">
          <span class="label">横梁名称:</span>
          <el-input v-model="recordName" placeholder="必填" style="width: 280px" />
        </div>
      </div>

      <el-table :data="items" border stripe style="width: 100%" :header-cell-style="{ background: '#f8f8f9', textAlign: 'center' }" class="smart-table">
        <el-table-column label="横梁名称" align="center">
          <template #default="{ row }">
            <el-input v-model="row.name" size="small" placeholder="必填" />
          </template>
        </el-table-column>
        <el-table-column label="长度(mm)" align="center">
          <template #default="{ row }">
            <el-input v-model="row.length" size="small" placeholder="必填" />
          </template>
        </el-table-column>
        <el-table-column label="规格(mm)" align="center">
          <template #default="{ row }">
            <el-input v-model="row.spec" size="small" placeholder="必填" />
          </template>
        </el-table-column>
        <el-table-column label="最大载重(kg)" align="center">
          <template #default="{ row }">
            <el-input v-model="row.maxLoad" size="small" placeholder="必填" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" :icon="Delete" @click="deleteRow($index)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, DocumentAdd, List } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'

const router = useRouter()
const recordName = ref('')
const items = ref([{ name: '', length: '', spec: '', maxLoad: '' }])
const saving = ref(false)

const addRow = () => items.value.push({ name: '', length: '', spec: '', maxLoad: '' })

// 需求 3：防删空机制
const deleteRow = (index) => {
  if (items.value.length <= 1) {
    return ElMessage.warning('至少需要保留一行数据！')
  }
  items.value.splice(index, 1)
}

const handleSave = async () => {
  if (saving.value) return
  if (!recordName.value.trim()) return ElMessage.warning('请输入记录名称！')

  // 需求 2：新增时检查名称是否冲突，给出特定提示
  try {
    const { exists } = await beamApi.checkName(recordName.value.trim())
    if (exists) {
      return ElMessage.warning('历史记录中已存在同名的横梁名称，请更换横梁名称！')
    }
  } catch (err) {
    // 兼容：如果你后端没有 checkName 接口，可以用下面这两行替代
    // const res = await beamApi.list()
    // if (res.list.some(i => i.name === recordName.value.trim())) return ElMessage.warning('历史记录中已存在同名的横梁记录，请更换名称！')
  }

  // 需求 3：必填项校验
  if (items.value.length === 0) return ElMessage.warning('请添加表格数据！')
  
  const hasEmptyField = items.value.some(item => 
    !item.name?.trim() || !item.length?.trim() || !item.spec?.trim() || !item.maxLoad?.trim()
  )
  if (hasEmptyField) {
    return ElMessage.warning('表格中的横梁名称、长度、规格、最大载重均为必填项，缺一不可！')
  }

  try {
    saving.value = true
    await beamApi.create({ name: recordName.value, items: items.value })
    ElMessage.success('新增保存成功！')
    // 重置页面
    recordName.value = ''
    items.value = [{ name: '', length: '', spec: '', maxLoad: '' }]
  } catch {
    ElMessage.error('保存失败，请检查网络或后端接口')
  } finally {
    saving.value = false
  }
}

const goToHistory = () => router.push('/beam-quotation/history')
</script>

<style scoped>
.editor-card { border-radius: 12px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.toolbar { margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
.name-group { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.label { font-weight: bold; color: #475569; }
</style>