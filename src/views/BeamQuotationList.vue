/**
* @module views/BeamQuotationList
* @description 横梁载重单主工作页面
*
* 功能：
* - 横梁载重单创建与编辑
* - 载重参数配置（长度、规格、承重等）
* - 自动计算载重能力
* - 保存到历史记录
*/

<template>
  <div class="beam-quotation-page">
    <el-card shadow="never" class="editor-card">
      <el-form ref="formRef" :model="{ recordName, items }">
        <div class="toolbar">
          <template v-if="!isGuest">
            <el-button type="primary" :icon="Plus" @click="addRow">添加一行</el-button>
            <el-button type="success" :icon="DocumentAdd" :loading="saving" @click="handleSave">提交保存</el-button>
          </template>

          <div class="name-group">
            <span class="label">横梁名称:</span>
            <el-form-item prop="recordName" :rules="beamNameRule2">
              <el-input v-model="recordName" placeholder="必填" style="width: 280px" />
            </el-form-item>
          </div>
        </div>

        <el-table :data="items" border stripe style="width: 100%" :header-cell-style="TABLE_HEADER_STYLE"
          class="smart-table">
          <el-table-column label="横梁名称" align="center">
            <template #default="{ row, $index }">
              <el-form-item :prop="'items.' + $index + '.name'" :rules="beamNameRule">
                <el-input v-model="row.name" size="small" placeholder="必填" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column label="长度(mm)" align="center">
            <template #default="{ row, $index }">
              <el-form-item :prop="'items.' + $index + '.length'"
                :rules="[{ required: true, message: '请输入长度', trigger: 'blur' }, { validator: (rule, value, callback) => { if (value && !value.trim()) callback(new Error('长度不能只包含空格')); else callback(); }, trigger: 'blur' }]">
                <el-input v-model="row.length" size="small" placeholder="必填" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column label="规格(mm)" align="center">
            <template #default="{ row, $index }">
              <el-form-item :prop="'items.' + $index + '.spec'"
                :rules="[{ required: true, message: '请输入规格', trigger: 'blur' }, { validator: (rule, value, callback) => { if (value && !value.trim()) callback(new Error('规格不能只包含空格')); else callback(); }, trigger: 'blur' }]">
                <el-input v-model="row.spec" size="small" placeholder="必填" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column label="最大载重(kg)" align="center">
            <template #default="{ row, $index }">
              <el-form-item :prop="'items.' + $index + '.maxLoad'" :rules="positiveDecimalRule('最大载重')">
                <el-input v-model="row.maxLoad" size="small" placeholder="必填" />
              </el-form-item>
            </template>
          </el-table-column>
          <el-table-column v-if="!isGuest" label="操作" width="80" align="center">
            <template #default="{ $index }">
              <el-button link type="danger" :icon="Delete" @click="deleteRow($index)" />
            </template>
          </el-table-column>
        </el-table>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, DocumentAdd } from '@element-plus/icons-vue'
import { beamApi } from '../api/beam'
import { to } from '@/utils/async'
import { beamNameRule, beamNameRule2, positiveIntegerRule, positiveDecimalRule } from '@/utils/formRules'
import { usePermissions } from '@/composables/usePermissions'
import { TABLE_HEADER_STYLE } from '@/constants/table'

const { isGuest } = usePermissions()

const recordName = ref('')
const items = ref([{ name: '', length: '', spec: '', maxLoad: '' }])
const saving = ref(false)
const formRef = ref(null)

const addRow = () => items.value.push({ name: '', length: '', spec: '', maxLoad: '' })

const deleteRow = (index) => {
  if (items.value.length <= 1) {
    return ElMessage.warning('至少需要保留一行数据！')
  }
  items.value.splice(index, 1)
}

const handleSave = async () => {
  if (saving.value) return

  const [validateErr] = await to(formRef.value?.validate())
  if (validateErr) return

  const [, checkRes] = await to(beamApi.checkName(recordName.value.trim()))
  if (checkRes?.exists) {
    return ElMessage.warning('历史记录中已存在同名的横梁名称，请更换横梁名称！')
  }

  saving.value = true
  const [err] = await to(beamApi.create({ name: recordName.value, items: items.value }))
  if (err) {
    ElMessage.error('保存失败，请检查网络或后端接口')
    saving.value = false
    return
  }
  ElMessage.success('新增成功')
  formRef.value?.resetFields()
  recordName.value = ''
  items.value = [{ name: '', length: '', spec: '', maxLoad: '' }]
  saving.value = false
}

</script>

<style scoped>
.editor-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.toolbar {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.name-group {
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

.name-group :deep(.el-form-item) {
  vertical-align: middle;
  margin-bottom: 0;
  display: flex;
  align-items: flex-start;
}

.name-group :deep(.el-form-item__error) {
  font-size: 11px;
  line-height: 1.6;
  padding-top: 2px;
  position: absolute;
  top: 100%;
  left: 0;
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
  .toolbar {
    margin-bottom: 12px;
    gap: 8px;
  }

  .name-group {
    margin-left: 0;
    width: 100%;
    flex-wrap: wrap;
    gap: 6px;
  }

  .name-group :deep(.el-input),
  .name-group :deep(.el-input__wrapper) {
    width: 100% !important;
  }
}
</style>