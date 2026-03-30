<template>
  <div class="medium-weight-page">
    <el-card class="page-card" shadow="never" v-loading="loading">
      <div class="toolbar">
        <div>
          <div class="page-title">中型货架重量表</div>
          <div class="page-subtitle">页面进入后自动从后端加载数据</div>
        </div>

        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
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

          <el-table :data="summaryRows" border stripe class="table">
            <el-table-column prop="index" label="序号" width="70" align="center" />
            <el-table-column prop="name" label="名称" min-width="120" align="center" />
            <el-table-column prop="spec" label="规格" min-width="120" align="center" />
            <el-table-column prop="layers" label="层数" width="90" align="center" />
            <el-table-column prop="load" label="载重" width="110" align="center" />
            <el-table-column prop="totalWeight" label="总自重" width="110" align="center" />
            <el-table-column label="配件分拆重量">
              <el-table-column prop="uprightWeight" label="立柱片" width="110" align="center" />
              <el-table-column prop="beamWeight" label="横梁" width="110" align="center" />
              <el-table-column prop="shelfWeight" label="层板" width="110" align="center" />
            </el-table-column>
          </el-table>
        </el-card>

        <el-card shadow="never" class="section-card">
          <template #header>
            <div class="section-title">层数规格明细</div>
          </template>

          <el-table
            :data="detailRows"
            border
            stripe
            class="table"
            :span-method="detailSpanMethod"
            row-key="index"
          >
            <el-table-column prop="index" label="序号" width="70" align="center" />
            <el-table-column prop="layerGroup" label="层数" width="90" align="center" />
            <el-table-column prop="spec" label="规格（L*W*H）" min-width="170" align="center" />
            <el-table-column prop="loadPerLayer" label="载重（kg/层）" width="120" align="center" />
            <el-table-column prop="quote" label="报价" min-width="340" show-overflow-tooltip align="center" />
            <el-table-column prop="actual" label="实际" min-width="340" show-overflow-tooltip align="center" />
          </el-table>
        </el-card>
      </template>

      <el-empty v-else description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { mediumShelfWeightApi } from '@/api/mediumShelfWeight'

const loading = ref(false)
const errorMsg = ref('')
const summaryRows = ref([])
const detailRows = ref([])

const normalizeList = (list = []) => {
  return Array.isArray(list) ? list : []
}

const applyConfig = (config) => {
  const payload = config?.payload || {}
  const summary = normalizeList(payload.summaryRows).map((item, index) => ({
    ...item,
    index: item.index || index + 1
  }))
  const detail = normalizeList(payload.detailRows).map((item, index) => ({
    ...item,
    index: item.index || index + 1
  }))

  summaryRows.value = summary
  detailRows.value = detail
}

const loadData = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const res = await mediumShelfWeightApi.getConfig()
    applyConfig(res.config)
  } catch (error) {
    errorMsg.value = error?.response?.data?.message || '加载中型货架重量表失败'
    ElMessage.error(errorMsg.value)
  } finally {
    loading.value = false
  }
}

const detailSpanMap = computed(() => {
  const map = {}
  const rows = detailRows.value
  let i = 0

  while (i < rows.length) {
    const currentGroup = rows[i].layerGroup
    let count = 1

    while (i + count < rows.length && rows[i + count].layerGroup === currentGroup) {
      count += 1
    }

    map[i] = count
    for (let j = 1; j < count; j += 1) {
      map[i + j] = 0
    }

    i += count
  }

  return map
})

const detailSpanMethod = ({ rowIndex, columnIndex }) => {
  if (columnIndex !== 1) return [1, 1]

  const span = detailSpanMap.value[rowIndex]
  if (span === 0) return [0, 0]
  if (span > 1) return [span, 1]
  return [1, 1]
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

.table {
  width: 100%;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>