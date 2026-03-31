<template>
  <div class="medium-weight-page">
    <el-card class="page-card" shadow="never" v-loading="loading">
      <div class="toolbar">
        <div>
          <div class="page-title">中型货架重量表</div>
          <div class="page-subtitle">
            {{ editMode ? '当前为编辑模式，可修改、添加或删除数据后保存' : '页面进入后自动从后端加载数据' }}
          </div>
        </div>

        <div class="toolbar-actions">
          <el-button
            v-if="!editMode"
            type="primary"
            :icon="Edit"
            @click="startEdit"
          >
            编辑
          </el-button>

          <template v-else>
            <el-button :icon="Plus" @click="addSummaryRow">新增汇总行</el-button>
            <el-button :icon="Plus" @click="addDetailRow">新增明细行</el-button>
            <el-button :loading="saving" type="success" @click="saveData">保存</el-button>
            <el-button @click="cancelEdit">取消</el-button>
          </template>

          <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
        </div>
      </div>

      <el-alert
        v-if="errorMsg"
        class="mb-16"
        type="error"
        :title="errorMsg"
        :closable="false"
        show-icon
      />

      <template v-if="summaryRows.length || detailRows.length">
        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-title">中型货架重量表</div>
          </template>

          <el-table :data="displaySummaryRows" border stripe class="table">
            <el-table-column prop="index" label="序号" width="70" align="center" />

            <el-table-column label="名称" min-width="120" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.name"
                  size="small"
                  placeholder="名称"
                />
            <span v-else class="config-text">
  {{ formatConfigText(row.name) }}
</span>
              </template>
            </el-table-column>

            <el-table-column label="规格" min-width="120" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.spec"
                  size="small"
                  placeholder="规格"
                />
                <span v-else>{{ row.spec }}</span>
              </template>
            </el-table-column>

            <el-table-column label="层数" width="90" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.layers"
                  size="small"
                  placeholder="层数"
                />
                <span v-else>{{ row.layers }}</span>
              </template>
            </el-table-column>

            <el-table-column label="载重" width="110" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.load"
                  size="small"
                  placeholder="载重"
                />
                <span v-else>{{ row.load }}</span>
              </template>
            </el-table-column>

            <el-table-column label="总自重" width="110" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.totalWeight"
                  size="small"
                  placeholder="总自重"
                />
                <span v-else>{{ row.totalWeight }}</span>
              </template>
            </el-table-column>

            <el-table-column label="配件分拆重量">
              <el-table-column label="立柱片" width="110" align="center">
                <template #default="{ row }">
                  <el-input
                    v-if="editMode"
                    v-model="row.uprightWeight"
                    size="small"
                    placeholder="立柱片"
                  />
                  <span v-else>{{ row.uprightWeight }}</span>
                </template>
              </el-table-column>

              <el-table-column label="横梁" width="110" align="center">
                <template #default="{ row }">
                  <el-input
                    v-if="editMode"
                    v-model="row.beamWeight"
                    size="small"
                    placeholder="横梁"
                  />
                  <span v-else>{{ row.beamWeight }}</span>
                </template>
              </el-table-column>

              <el-table-column label="层板" width="110" align="center">
                <template #default="{ row }">
                  <el-input
                    v-if="editMode"
                    v-model="row.shelfWeight"
                    size="small"
                    placeholder="层板"
                  />
                  <span v-else>{{ row.shelfWeight }}</span>
                </template>
              </el-table-column>
            </el-table-column>

            <el-table-column
              v-if="editMode"
              label="操作"
              width="90"
              align="center"
              fixed="right"
            >
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeSummaryRow($index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-title">层数规格明细</div>
          </template>

          <el-table
            :data="displayDetailRows"
            border
            stripe
            class="table"
            :span-method="editMode ? undefined : detailSpanMethod"
            row-key="index"
          >
            <el-table-column prop="index" label="序号" width="70" align="center" />

            <el-table-column label="层数" width="90" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.layerGroup"
                  size="small"
                  placeholder="层数"
                />
                <span v-else>{{ row.layerGroup }}</span>
              </template>
            </el-table-column>

            <el-table-column label="规格（L*W*H）" min-width="170" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.spec"
                  size="small"
                  placeholder="规格"
                />
                <span v-else>{{ row.spec }}</span>
              </template>
            </el-table-column>

            <el-table-column label="载重（kg/层）" width="120" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="editMode"
                  v-model="row.loadPerLayer"
                  size="small"
                  placeholder="载重"
                />
                <span v-else>{{ row.loadPerLayer }}</span>
              </template>
            </el-table-column>
<el-table-column label="报价" min-width="200">
  <template #default="{ row }">
    <div class="wrap-text">
      <el-input
        v-if="editMode"
        v-model="row.quote"
        type="textarea"
        :rows="2"
        resize="none"
      />
      <span v-else>{{ row.quote }}</span>
    </div>
  </template>
</el-table-column>
   <el-table-column label="实际" min-width="200">
  <template #default="{ row }">
    <div class="wrap-text">
      <el-input
        v-if="editMode"
        v-model="row.actual"
        type="textarea"
        :rows="2"
        resize="none"
      />
      <span v-else>{{ row.actual }}</span>
    </div>
  </template>
</el-table-column>

            <el-table-column
              v-if="editMode"
              label="操作"
              width="90"
              align="center"
              fixed="right"
            >
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeDetailRow($index)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>

      <el-empty v-else description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { mediumShelfWeightApi } from '@/api/mediumShelfWeight'

const loading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const editMode = ref(false)

const configTitle = ref('中型货架重量表')
const summaryRows = ref([])
const detailRows = ref([])

const draftSummaryRows = ref([])
const draftDetailRows = ref([])

const normalizeList = (list = []) => (Array.isArray(list) ? list : [])

const cloneRows = (rows = []) => {
  return JSON.parse(JSON.stringify(rows || []))
}

const createEmptySummaryRow = (index) => ({
  index,
  name: '',
  spec: '',
  layers: '',
  load: '',
  totalWeight: '',
  uprightWeight: '',
  beamWeight: '',
  shelfWeight: ''
})

const createEmptyDetailRow = (index) => ({
  index,
  layerGroup: '',
  spec: '',
  loadPerLayer: '',
  quote: '',
  actual: ''
})

const reindexRows = (rows = []) => {
  rows.forEach((row, index) => {
    row.index = index + 1
  })
  return rows
}
const formatConfigText = (text) => {
  if (!text) return ''

  return String(text)
    .split('；')           // 按分号拆
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n')           // 用换行拼接
}

const getCurrentSummaryRows = () => (editMode.value ? draftSummaryRows.value : summaryRows.value)
const getCurrentDetailRows = () => (editMode.value ? draftDetailRows.value : detailRows.value)

const displaySummaryRows = computed(() => getCurrentSummaryRows())
const displayDetailRows = computed(() => getCurrentDetailRows())

const applyConfig = (config) => {
  const payload = config?.payload || {}

  configTitle.value = config?.title || '中型货架重量表'

  summaryRows.value = reindexRows(
    cloneRows(normalizeList(payload.summaryRows)).map((item, index) => ({
      index: item.index || index + 1,
      name: item.name || '',
      spec: item.spec || '',
      layers: item.layers || '',
      load: item.load || '',
      totalWeight: item.totalWeight || '',
      uprightWeight: item.uprightWeight || '',
      beamWeight: item.beamWeight || '',
      shelfWeight: item.shelfWeight || ''
    }))
  )

  detailRows.value = reindexRows(
    cloneRows(normalizeList(payload.detailRows)).map((item, index) => ({
      index: item.index || index + 1,
      layerGroup: item.layerGroup || '',
      spec: item.spec || '',
      loadPerLayer: item.loadPerLayer || '',
      quote: item.quote || '',
      actual: item.actual || ''
    }))
  )

  if (editMode.value) {
    draftSummaryRows.value = cloneRows(summaryRows.value)
    draftDetailRows.value = cloneRows(detailRows.value)
  }
}

const loadData = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const res = await mediumShelfWeightApi.getConfig()
    applyConfig(res.config)
    ElMessage.success('加载成功')
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '加载中型货架重量表失败'
    ElMessage.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

const startEdit = () => {
  draftSummaryRows.value = cloneRows(summaryRows.value)
  draftDetailRows.value = cloneRows(detailRows.value)
  editMode.value = true
}

const cancelEdit = () => {
  editMode.value = false
  draftSummaryRows.value = []
  draftDetailRows.value = []
  ElMessage.info('已取消修改')
}

const addSummaryRow = () => {
  draftSummaryRows.value.push(createEmptySummaryRow(draftSummaryRows.value.length + 1))
  reindexRows(draftSummaryRows.value)
}

const addDetailRow = () => {
  draftDetailRows.value.push(createEmptyDetailRow(draftDetailRows.value.length + 1))
  reindexRows(draftDetailRows.value)
}

const removeSummaryRow = async (index) => {
  try {
    await ElMessageBox.confirm('确定删除这一行汇总数据吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    draftSummaryRows.value.splice(index, 1)
    reindexRows(draftSummaryRows.value)
  } catch {
    // 取消删除，不处理
  }
}

const removeDetailRow = async (index) => {
  try {
    await ElMessageBox.confirm('确定删除这一行明细数据吗？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    draftDetailRows.value.splice(index, 1)
    reindexRows(draftDetailRows.value)
  } catch {
    // 取消删除，不处理
  }
}

/**
 * 只对连续相同值的单元格进行合并。
 * 这样“报价 / 实际”相同且连续的行会自动合并。
 */
const buildSpanMap = (rows, field) => {
  const map = {}
  let i = 0

  while (i < rows.length) {
    const currentValue = rows[i]?.[field]
    let count = 1

    while (i + count < rows.length && rows[i + count]?.[field] === currentValue) {
      count += 1
    }

    map[i] = count
    for (let j = 1; j < count; j += 1) {
      map[i + j] = 0
    }

    i += count
  }

  return map
}

const detailSpanMaps = computed(() => {
  const rows = displayDetailRows.value
  return {
    layerGroup: buildSpanMap(rows, 'layerGroup'),
    loadPerLayer: buildSpanMap(rows, 'loadPerLayer'),
    quote: buildSpanMap(rows, 'quote'),
    actual: buildSpanMap(rows, 'actual')
  }
})

const detailSpanMethod = ({ rowIndex, columnIndex }) => {
  const spanMapList = {
    1: detailSpanMaps.value.layerGroup,
    3: detailSpanMaps.value.loadPerLayer,
    4: detailSpanMaps.value.quote,
    5: detailSpanMaps.value.actual
  }

  const spanMap = spanMapList[columnIndex]
  if (!spanMap) return [1, 1]

  const span = spanMap[rowIndex]
  if (span === 0) return [0, 0]
  if (span > 1) return [span, 1]
  return [1, 1]
}

const validateRows = () => {
  const summary = getCurrentSummaryRows()
  const detail = getCurrentDetailRows()

  if (!summary.length) {
    ElMessage.warning('汇总表至少要有一行')
    return false
  }

  if (!detail.length) {
    ElMessage.warning('明细表至少要有一行')
    return false
  }

  return true
}

const saveData = async () => {
  if (!validateRows()) return

  saving.value = true
  try {
    const payload = {
      summaryRows: reindexRows(cloneRows(draftSummaryRows.value)),
      detailRows: reindexRows(cloneRows(draftDetailRows.value))
    }

    const res = await mediumShelfWeightApi.saveConfig({
      title: configTitle.value,
      payload
    })

    applyConfig(res.config)
    editMode.value = false
    draftSummaryRows.value = []
    draftDetailRows.value = []
    ElMessage.success('保存成功')
  } catch (error) {
    const msg = error?.response?.data?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.medium-weight-page {
  min-height: 100%;
}

.page-card {
  border-radius: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: #6b7280;
}

.section-card {
  margin-top: 16px;
  border-radius: 14px;
}

.section-title {
  font-weight: 700;
  color: #1f2937;
}
.config-text {
  white-space: pre-line;   /* 让 \n 生效 */
  line-height: 1.6;
  word-break: break-word;
}

.table {
  width: 100%;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>