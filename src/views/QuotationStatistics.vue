<!--
  @file views/QuotationStatistics.vue
  @description 报价单统计 / 重型货架部件智能汇总工具

  功能说明：
  - AI 智能解析重型货架报价文本
  - 自动提取部件信息（名称、规格、数量、单位）
  - 统计数据可视化展示
  - 错误和警告提示

  页面布局：
  ┌──────────────────────────────────────────────────────────────┐
  │  QuotationStatistics (重型货架部件智能汇总)                    │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Editor Panel (文本解析区)                               │  │
  │  │                                                        │  │
  │  │  重型货架部件智能汇总                                   │  │
  │  │  ┌──────────────────────────────────────────────────┐  │  │
  │  │  │ 把货架报价单内的文本内容直接粘贴到这里...         │  │  │
  │  │  │                                                  │  │  │
  │  │  │                                                  │  │  │
  │  │  └──────────────────────────────────────────────────┘  │  │
  │  │                                                        │  │
  │  │  [生成汇总分析] [清空面板]                             │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  Error Panel (如有错误)                                      │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ 错误                                                    │  │
  │  │ • 无法识别的格式: ...                                   │  │
  │  │ • 数量字段缺失: ...                                     │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  Warning Panel (如有提示)                                    │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ 提示                                                    │  │
  │  │ • 规格字段可能不完整: ...                               │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  Result Panel (解析结果)                                     │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ 部件汇总                                                │  │
  │  │ ┌────┬──────────┬────────┬──────┬────┐                │  │
  │  │ │ #  │ 名称      │ 规格   │ 数量 │ 单位│               │  │
  │  │ ├────┼──────────┼────────┼──────┼────┤               │  │
  │  │ │ 1  │ 立柱      │ 80×60  │ 100  │ 根 │               │  │
  │  │ │ 2  │ 横梁      │ 2.4m   │ 200  │ 根 │               │  │
  │  │ └────┴──────────┴────────┴──────┴────┘               │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  使用场景：
  - 收到供应商的货架报价单文本
  - 将文本粘贴到输入框
  - 点击"生成汇总分析"
  - 自动提取所有部件及其数量
  - 快速统计成本和数量

  数据模型：
  ┌─────────────────────────────────────────────────────────────┐
  │  Part (部件)                                                 │
  ├─────────────────────────────────────────────────────────────┤
  │  name: string   - 部件名称（立柱、横梁、层板等）              │
  │  spec: string   - 规格型号（80×60、2.4m 等）                 │
  │  qty: number     │  数量                                    │
  │  unit: string    - 单位（根、块、个等）                       │
  └─────────────────────────────────────────────────────────────┘

  API 调用：
  - POST /api/quotation/statistics/parse { text }
    输入: 原始报价文本
    输出: { parts: [], errors: [], warnings: [] }

  解析能力：
  - 识别常见货架部件名称
  - 提取规格参数（尺寸、材质等）
  - 解析数量和单位
  - 处理多种文本格式
  - 给出错误提示和建议
-->

<template>

  <!-- * @module views/QuotationStatistics
  * @description 报价单统计页面
  *
  * 功能：
  * - 重型货架解析汇总
  * - AI 智能解析报价文本
  * - 统计数据可视化展示 -->


  <!-- 重型货架解析汇总页面 -->
  <div class="page">
    <section class="panel editor">
      <h1>重型货架部件智能汇总</h1>

      <!-- 文本解析区 -->
      <textarea v-model="rawText" placeholder="把货架报价单内的文本内容直接粘贴到这里，点击生成汇总即可自动计算..." />

      <div class="toolbar">
        <button type="button" class="primary" @click="parseNow" :disabled="loading">
          {{ loading ? '解析中...' : '生成汇总分析' }}
        </button>
        <button type="button" class="ghost" @click="clearText" :disabled="loading">清空面板</button>
      </div>
    </section>

    <section v-if="errors.length" class="panel error-box">
      <h2>错误</h2>
      <ul>
        <li v-for="(item, index) in errors" :key="'e-' + index">{{ item }}</li>
      </ul>
    </section>

    <section v-if="warnings.length" class="panel warn-box">
      <h2>提示</h2>
      <ul>
        <li v-for="(item, index) in warnings" :key="'w-' + index">{{ item }}</li>
      </ul>
    </section>

    <section class="panel result" v-if="parts.length">
      <h2>部件汇总</h2>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th>名称</th>
              <th>规格</th>
              <th>数量</th>
              <th>单位</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, index) in parts" :key="index">
              <td>{{ index + 1 }}</td>
              <td>{{ p.name }}</td>
              <td>{{ p.spec }}</td>
              <td>{{ p.qty }}</td>
              <td>{{ p.unit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { quotationStatisticsApi } from '../api/quotation'
import { to } from '@/utils/async'
import { showWarning, showError, showSuccess } from '@/utils/message'

const rawText = ref('')
const parts = ref([])
const errors = ref([])
const warnings = ref([])
const loading = ref(false)

/**
 * 触发后端解析文本接口
 */
async function parseNow () {
  if (!rawText.value.trim()) {
    return showWarning('请先提供完整的货架报价文本用于解析。')
  }

  loading.value = true
  const [err, result] = await to(quotationStatisticsApi.parse(rawText.value))
  if (err) {
    showError(err, '智能引擎解析失败，请检查文本格式或服务端运行状态。')
    loading.value = false
    return
  }
  parts.value = result.parts || []
  errors.value = result.errors || []
  warnings.value = result.warnings || []

  if (errors.value.length) {
    showWarning('文本存在无法精准识别的内容区块，请检查页面"错误"反馈。')
  } else {
    showSuccess('文本解析及计算转换成功')
  }
  loading.value = false
}

/** 清空当前分析状态 */
function clearText () {
  rawText.value = ''
  parts.value = []
  errors.value = []
  warnings.value = []
}

const summaryCards = computed(() => {
  const totals = {}
  for (let i = 0; i < parts.value.length; i++) {
    const row = parts.value[i]
    totals[row.name] = (totals[row.name] || 0) + Number(row.qty || 0)
  }

  return [
    { label: '立柱片', value: totals['立柱片'] || 0 },
    { label: '横梁', value: totals['横梁'] || 0 },
    { label: '网层板', value: totals['网层板'] || 0 },
    { label: '层板', value: totals['层板'] || 0 },
  ]
})

</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 0px;
  background: white;
  color: #0f172a;
  box-sizing: border-box;

  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.panel {
  background: #fff;

  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: 20px;
  margin-bottom: 20px;
}

h1 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
}

h2 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: bold;
  border-left: 4px solid #6366f1;
  padding-left: 10px;
  line-height: 1.1;
}

textarea {
  width: 100%;
  min-height: 240px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 14px;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  box-sizing: border-box;
  background: #f8fafc;
  transition: all 0.3s;
}

textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: #fff;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

button {
  border: 0;
  border-radius: 6px;
  padding: 10px 18px;
  cursor: pointer;
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 14px;
}

button:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

button.primary {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
}

button.primary:hover {
  background: #4f46e5;
}

button.ghost {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.error-box {
  border: 1px solid #fca5a5;
  background: #fef2f2;
  color: #991b1b;
}

.warn-box {
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #92400e;
}

.error-box ul,
.warn-box ul {
  margin: 0;
  padding-left: 21px;
}

.table-wrap {
  overflow-x: hidden;
  overflow-y: visible;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

th,
td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 14px;
  vertical-align: middle;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

th {
  background: #f8fafc;
  font-weight: bold;
  color: #475569;
}


@media (max-width: 720px) {
  .page {
    padding: 12px;
  }

  .panel {
    padding: 12px;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 17px;
  }

  h2 {
    font-size: 14px;
  }

  textarea {
    min-height: 180px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    min-width: 540px;
  }

  th,
  td {
    padding: 10px;
    font-size: 13px;
  }
}
</style>