<template>
  <div class="page">
    <section class="panel editor">
      <h1>重型货架部件汇总</h1>

      <textarea
        v-model="rawText"
        placeholder="把货架报价文本直接粘贴到这里..."
      />

      <div class="toolbar">
        <button type="button" class="primary" @click="parseNow">生成汇总</button>
        <button type="button" class="ghost" @click="clearText">清空</button>
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
import { computed, ref } from 'vue';
import { parseQuoteText } from '@/utils/quoteParser';

const rawText = ref('');
const parts = ref([]);
const errors = ref([]);
const warnings = ref([]);

function parseNow() {
  if (!rawText.value.trim()) {
    alert('请先粘贴货架文本。');
    return;
  }

  const result = parseQuoteText(rawText.value);
  parts.value = result.parts;
  errors.value = result.errors;
  warnings.value = result.warnings;

  if (errors.value.length) {
    alert('存在无法识别的内容，请查看“错误”区域。');
  }
}

function clearText() {
  rawText.value = '';
  parts.value = [];
  errors.value = [];
  warnings.value = [];
}

const summaryCards = computed(() => {
  const totals = {};
  for (let i = 0; i < parts.value.length; i++) {
    const row = parts.value[i];
    totals[row.name] = (totals[row.name] || 0) + Number(row.qty || 0);
  }

  return [
    { label: '立柱片', value: totals['立柱片'] || 0 },
    { label: '横梁', value: totals['横梁'] || 0 },
    { label: '网层板', value: totals['网层板'] || 0 },
    { label: '层板', value: totals['层板'] || 0 },
  ];
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f7fb;
  color: #0f172a;
  box-sizing: border-box;
}

.panel {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  padding: 16px;
  margin-bottom: 16px;
}

h1 {
  margin: 0 0 12px;
  font-size: 24px;
}

h2 {
  margin: 0 0 12px;
  font-size: 18px;
}

textarea {
  width: 100%;
  min-height: 240px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  box-sizing: border-box;
}

textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

button {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  cursor: pointer;
  background: #e2e8f0;
  color: #0f172a;
}

button.primary {
  background: #2563eb;
  color: #fff;
}

button.ghost {
  background: #f1f5f9;
}

.error-box {
  border: 1px solid #fecaca;
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
  padding-left: 18px;
}

.table-wrap {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

table {
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  font-size: 13px;
  vertical-align: top;
}

th {
  background: #f8fafc;
}

@media (max-width: 720px) {
  .page {
    padding: 12px;
  }
}
</style>