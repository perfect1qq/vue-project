<template>
  <div class="usd-conversion-page">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span class="title">美金换算工具</span>
          <div class="actions">
            <el-button type="primary" :icon="Plus" @click="addRow">添加一行</el-button>
          </div>
        </div>
      </template>

      <!-- 全局设置区 -->
      <div class="global-setting-group">
        <div class="setting-row">
          <label class="label-title">全局汇率：</label>
          <el-input 
            v-model="globalExchangeRate" 
            @input="handleRateChange" class="input-item w-120"
            input-style="text-align: center"
          />
        </div>

        <div class="setting-row">
          <label class="label-title">原单总人民币：</label>
          <el-input
            v-model="manualTotalRmbBase"
            class="input-item w-150"
       
            input-style="text-align: center"
          >
            <template #prefix>¥</template>
          </el-input>
        </div>
        
        <div class="setting-row">
          <label class="label-title">国内运费：</label>
          <el-input 
            v-model="globalDomesticRmb" 
            @input="handleDomesticRmbChange" class="input-item w-150"
           input-style="text-align: center"
          >
             <template #prefix>¥</template>
          </el-input>
          <span class="arrow">➔</span>
          <el-input 
            v-model="globalDomesticUsd" 
            @input="handleDomesticUsdChange" class="input-item w-150"
           input-style="text-align: center"
          >
             <template #prefix>$</template>
          </el-input>
        </div>

        <div class="setting-row">
          <label class="label-title">国外运费：</label>
          <el-input 
            v-model="globalIntlRmb" 
            @input="handleIntlRmbChange" class="input-item w-150"
           input-style="text-align: center"
          >
             <template #prefix>¥</template>
          </el-input>
          <span class="arrow">➔</span>
          <el-input 
            v-model="globalIntlUsd" 
            @input="handleIntlUsdChange" class="input-item w-150"
            input-style="text-align: center"
          >
             <template #prefix>$</template>
          </el-input>
        </div>

      </div>

      <!-- 表格区域 -->
      <el-table :data="tableData" border style="width: 100%; margin-top: 15px;" show-summary :summary-method="getSummaries" :cell-style="{ textAlign: 'center' }" :header-cell-style="{ textAlign: 'center' }">
        
        <el-table-column label="数量" min-width="120" align="center">
          <template #default="{ row, $index }">
            <el-input 
              v-model="row.quantity" 
             
              @input="calculateRow(row)"
              @paste="handlePaste($event, $index)"
              input-style="text-align: center"
            />
          </template>
        </el-table-column>

        <el-table-column label="单价（人民币）" min-width="150" align="center">
          <template #default="{ row, $index }">
            <el-input 
              v-model="row.unitPriceRmb" 
           
              @input="calculateRow(row)"
              @paste="handlePaste($event, $index)"
              input-style="text-align: center"
            >
              <template #prefix>¥</template>
            </el-input>
          </template>
        </el-table-column>

        <el-table-column label="单价（美元）" min-width="150" align="center">
          <template #default="{ row }">
            <el-input v-model="row.unitPriceUsd" @input="calculateTotals(row)" input-style="text-align: center">
              <template #prefix>$</template>
            </el-input>
          </template>
        </el-table-column>

        <el-table-column label="合计" min-width="150" prop="subTotal" align="center">
          <template #default="{ row }">
             <span class="usd-text highlight">${{ row.subTotal || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" :icon="Delete" circle @click="removeRow($index)" />
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部统计区 -->
      <div class="footer-summary">
        <div class="summary-item">
          <span class="label">产品总合计：</span>
          <span class="val text-black">${{ productsTotalUsd }}</span>
        </div>
        <div class="summary-item grand-total">
          <span class="label">总美元：</span>
          <span class="val usd-text">${{ grandTotalUsd }}</span>
          <span class="desc">（产品总合计 + 国内运费美元 + 国外运费美元）</span>
        </div>

        <el-divider border-style="dashed" />

        <div class="summary-item rmb-total">
          <span class="label">汇率人民币：</span>
          <span class="val rmb-text">¥{{ grandTotalRmb }}</span>
          <span class="desc">（总美元 × 全局汇率）</span>
        </div>
        <div class="summary-item difference">
          <span class="label">相差人民币：</span>
          <span class="val" :class="diffRmb >= 0 ? 'usd-text' : 'highlight'">{{ diffRmb >= 0 ? '+' : '' }}{{ diffRmb }}</span>
          <span class="desc">（汇率人民币 - 顶部手填的原单总人民币）</span>
        </div>

        <div class="info-alert" :class="diffRmb >= 0 ? 'success-bg' : 'error-bg'">
          <el-icon class="info-icon"><InfoFilled /></el-icon>
          <div class="info-content">
            <strong>系统分析与计算逻辑说明：</strong>
            <span>
              当 <b>相差人民币</b> 为 <span class="usd-text font-bold">正数</span> 时，说明您当前排版的美金报价按汇率折现回来后，<b>比原先人民币表单总计金额多</b>，您将获得溢价收入。
              <br/>
              当 <b>相差人民币</b> 为 <span class="highlight font-bold">负数</span> 时，说明换算回来的钱<b>比原本的人民币成本还要少</b>，存在报价亏损风险，请提高单价或汇率。
            </span>
          </div>
        </div>
      </div>

    </el-card>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Plus, Delete, InfoFilled } from '@element-plus/icons-vue'
import { useUsdCalculator } from '@/composables/useUsdCalculator'

const {
  globalExchangeRate,
  manualTotalRmbBase,
  globalDomesticRmb,
  globalDomesticUsd,
  globalIntlRmb,
  globalIntlUsd,
  tableData,
  defaultRow,

  handleDomesticRmbChange,
  handleDomesticUsdChange,
  handleIntlRmbChange,
  handleIntlUsdChange,

  calculateTotals,
  calculateRow,
  handleRateChange,

  productsTotalUsd,
  grandTotalUsd,
  grandTotalRmb,
  diffRmb
} = useUsdCalculator()

const addRow = () => tableData.value.push(defaultRow())

const removeRow = (index) => {
  tableData.value.splice(index, 1)
  if (!tableData.value.length) addRow()
}

const handlePaste = (event, startIndex) => {
  event.preventDefault()
  const pasteData = event.clipboardData.getData('text')
  if (!pasteData) return

  const rows = pasteData.split(/\r?\n/).filter(i => i.trim())

  let index = startIndex

  rows.forEach(line => {
    const cols = line.split(/\t/)

    if (!tableData.value[index]) addRow()

    const row = tableData.value[index]

    if (cols[0]) row.quantity = cols[0].replace(/[^\d.]/g, '')
    if (cols[1]) row.unitPriceRmb = cols[1].replace(/[^\d.]/g, '')

    calculateRow(row)
    index++
  })
}

const getSummaries = ({ columns }) => {
  const sums = []
  columns.forEach((col, i) => {
    if (i === 0) sums[i] = '总计'
    else if (col.property === 'subTotal') sums[i] = '$' + productsTotalUsd.value
    else sums[i] = ''
  })
  return sums
}

onMounted(() => {
  addRow()
})
</script>

<style scoped>
.usd-conversion-page {
  padding: 20px 0;
}
.box-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.global-setting-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: #f8fafc;
  padding: 18px;
  border-radius: 8px;
}
.setting-row {
  display: flex;
  align-items: center;
}
.label-title {
  width: 140px;
  text-align: right;
  color: #334155;
  font-weight: 500;
  margin-right: 15px;
}
.input-item {
  box-sizing: border-box;
}
.w-120 { width: 120px; }
.w-150 { width: 150px; }
.arrow {
  margin: 0 15px;
  color: #94a3b8;
}

.footer-summary {
  margin-top: 25px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}
.summary-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 12px;
  font-size: 16px;
}
.summary-item:last-child {
  margin-bottom: 0;
}
.summary-item .label {
  font-weight: 600;
  color: #334155;
  width: 150px;
  text-align: right;
  margin-right: 15px;
}
.summary-item .val {
  font-size: 20px;
  font-weight: 700;
}
.summary-item .desc {
  font-size: 13px;
  color: #94a3b8;
  margin-left: 15px;
}

.text-black { color: #1e293b; }
.usd-text { color: #10b981; }
.rmb-text { color: #f59e0b; }
.highlight { font-weight: 700; color: #ef4444; }

.info-alert {
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
}
.success-bg { 
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
.error-bg {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.info-icon {
  font-size: 20px;
  margin-top: 2px;
}
.success-bg .info-icon { color: #16a34a; }
.error-bg .info-icon { color: #dc2626; }

.info-content strong {
  display: block;
  font-size: 15px;
  margin-bottom: 4px;
}

.font-bold {
  font-weight: 700;
}

/* 居中覆盖补充 */
:deep(.el-table .cell) {
  text-align: center;
}
:deep(.el-table th.el-table__cell) {
  text-align: center;
}
</style>