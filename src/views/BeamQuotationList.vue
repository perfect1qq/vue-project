<!--
  @file views/BeamQuotationList.vue
  @description 横梁载重单主工作页面（创建与编辑）

  功能说明：
  - 创建新的横梁载重单记录
  - 编辑横梁参数（名称、长度、规格、最大载重）
  - 动态增减表格行（支持多条横梁）
  - 表单验证（必填项、数值校验）
  - 保存到数据库并生成历史记录

  页面布局：
  ┌──────────────────────────────────────────────────────────────┐
  │  BeamQuotationList (横梁载重单)                               │
  │                                                              │
  │  Toolbar: [+添加一行] [提交保存]  名称:[________]           │
  │                                                              │
  │  Table (横梁明细表)                                          │
  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐    │
  │  │ 横梁名称  │ 长度(mm) │ 规格(mm) │ 最大载重  │ 操作    │    │
  │  ├──────────┼──────────┼──────────┼──────────┼────────┤    │
  │  │ [必填]   │ [必填]   │ [必填]   │ [必填]   │ [删除] │    │
  │  │ [必填]   │ [必填]   │ [必填]   │ [必填]   │ [删除] │    │
  │  │ ...      │ ...      │ ...      │ ...      │ ...    │    │
  │  └──────────┴──────────┴──────────┴──────────┴────────┘    │
  └──────────────────────────────────────────────────────────────┘

  数据模型：
  ┌─────────────────────────────────────────────────────────────┐
  │  BeamItem (横梁条目)                                         │
  ├─────────────────────────────────────────────────────────────┤
  │  name: string       - 横梁名称/型号                          │
  │  length: string     - 长度（单位：mm）                       │
  │  spec: string       - 规格尺寸（如：80×50）                 │
  │  maxLoad: string    - 最大承重能力（单位：kg）              │
  └─────────────────────────────────────────────────────────────┘

  表单验证规则：
  - name: 必填，符合 beamNameRule 规则
  - length: 必填，不能为纯空格
  - spec: 必填，不能为纯空格
  - maxLoad: 必填，必须为正数（positiveDecimalRule）

  权限控制：
  - admin/user: 可添加行、保存、删除行
  - guest: 只读模式，隐藏操作按钮

  API 调用：
  - POST /api/beam-quotations { recordName, items[] }
    创建新的横梁载重单记录

  业务场景：
  - 用于计算和记录货架横梁的承载能力
  - 帮助工程师选择合适的横梁规格
  - 为报价单提供技术参数依据

  组件特性：
  - 使用 el-form-item 实现行内验证
  - 支持动态添加/删除行（最少保留1行）
  - 保存前自动触发完整表单验证
-->

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
import { Plus, Delete, DocumentAdd } from '@element-plus/icons-vue'
import beamApi from '../api/beam'
import { to } from '@/utils/async'
import { showWarning, showError, showSuccess } from '@/utils/message'
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
    return showWarning('至少需要保留一行数据！')
  }
  items.value.splice(index, 1)
}

const handleSave = async () => {
  if (saving.value) return

  const [validateErr] = await to(formRef.value?.validate())
  if (validateErr) return

  const [, checkRes] = await to(beamApi.checkName(recordName.value.trim()))
  if (checkRes?.exists) {
    return showWarning('历史记录中已存在同名的横梁名称，请更换横梁名称！')
  }

  saving.value = true
  const [err] = await to(beamApi.create({ name: recordName.value, items: items.value }))
  if (err) {
    showError('保存失败，请检查网络或后端接口')
    saving.value = false
    return
  }
  showSuccess('新增成功')
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

/* 表格内表单验证提示文字已通过 global.css 全局优化 */
/* 输入框居中 + 错误提示显示在下方 */

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