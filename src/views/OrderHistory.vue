<template>
  <div class="order-history">
    <el-card shadow="never">
      <template #header>
        <div class="header-content">
          <span class="title">订单历史记录</span>
          <AppButton variant="add" @click="goToNewOrder" v-if="!isGuest">
            新增下单
          </AppButton>
        </div>
      </template>

      <!-- 搜索过滤条 -->
      <div class="filter-row">
        <SearchBar
          v-model="filters.keyword"
          placeholder="搜索下单名称、公司名称、联系人或送货地址..."
          @search="handleSearch"
          style="width: 320px;"
        />
        <AppButton variant="reset" @click="resetSearch">重置</AppButton>
      </div>

      <!-- 数据表格 -->
      <GroupedHistoryList v-loading="loading" :data="groupedOrders">
        <template #default="{ records }">
          <AutoFitColumn :data="records" prop="customerName" label="公司名称" :min="120" :max="350" />
          <AutoFitColumn :data="records" prop="name" label="下单名称" :min="120" :max="200" use-width>
            <template #default="{ row }">
              <span class="order-no-link" @click="viewOrder(row.id)">{{ row.name || '未命名订单' }}</span>
            </template>
          </AutoFitColumn>
          <AutoFitColumn :data="records" prop="deliveryAddress" label="送货地址" :min="120" :max="400" />
          <AutoFitColumn :data="records" prop="orderDate" label="订单日期" :min="95" :max="160" use-width />
          <AutoFitColumn :data="records" prop="ownerName" label="创建者" :min="80" :max="140" use-width />
          <el-table-column label="操作" min-width="220" align="center">
            <template #default="{ row }">
              <ActionButtons
                :actions="[
                  { key: 'view', variant: 'view', label: '查看', onClick: () => viewOrder(row.id) },
                  { key: 'edit', variant: 'edit', label: '编辑', show: !isGuest && canModify(row), onClick: () => editOrder(row.id) },
                  { key: 'delete', variant: 'delete', label: '删除', show: !isGuest && canModify(row), onClick: () => confirmDelete(row) },
                ]"
              />
            </template>
          </el-table-column>
        </template>
      </GroupedHistoryList>


    </el-card>

    <!-- 订单排版详情预览抽屉/弹窗 -->
    <el-dialog v-model="previewVisible" title="订单详情" width="800px" destroy-on-close append-to-body>
      <!-- 嵌入打印版面 -->
      <div id="print-area" class="order-sheet-paper" v-if="currentOrder">
        <div class="sheet-header">
          <div class="company-brand">武汉倍力特物流装备有限公司</div>
          <div class="sheet-title">生 产 加 工 单</div>
        </div>

        <table class="meta-table">
          <tbody>
            <tr>
              <td class="meta-label">公司名称</td>
              <td class="meta-value" colspan="3"><strong>{{ currentOrder.customerName }}</strong></td>
              <td class="meta-label">订单日期</td>
              <td class="meta-value">{{ currentOrder.orderDate }}</td>
            </tr>
            <tr>
              <td class="meta-label">联系人</td>
              <td class="meta-value">{{ currentOrder.contactPerson || '-' }}</td>
              <td class="meta-label">联系电话</td>
              <td class="meta-value">{{ currentOrder.phone || '-' }}</td>
              <td class="meta-label">传真号码</td>
              <td class="meta-value">{{ currentOrder.fax || '-' }}</td>
            </tr>
            <tr>
              <td class="meta-label">送货地址</td>
              <td class="meta-value" colspan="5">{{ currentOrder.deliveryAddress || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50px;">序号</th>
              <th>品名</th>
              <th>规格</th>
              <th>用料</th>
              <th>颜色</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in currentOrderItems" :key="index">
              <td class="text-center">{{ index + 1 }}</td>
              <td><strong>{{ item.name || '-' }}</strong></td>
              <td>
                {{ item.spec || '-' }}
                <span v-if="item.qty" class="spec-qty-suffix"> = {{ item.qty }}</span>
              </td>
              <td>{{ item.material || '-' }}</td>
              <td class="text-center">{{ item.color || '-' }}</td>
              <td class="remark-col">{{ item.other || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="accessories-section" v-if="currentOrderAccessories.length > 0">
          <div class="block-title">【配套配件明细】</div>
          <div class="accessories-grid">
            <div v-for="(acc, index) in currentOrderAccessories" :key="index" class="accessory-item">
              <span class="acc-num">{{ index + 1 }}.</span>
              <span class="acc-name">{{ acc.name }}</span>
              <span class="acc-divider-equal">=</span>
              <span class="acc-qty">{{ acc.qty }}</span>
            </div>
          </div>
        </div>

        <div class="attachments-section" v-if="currentOrderAttachments.length > 0">
          <div class="block-title">【附件材料】</div>
          <AttachmentList :raw="currentOrder.attachments" empty-text="" />
        </div>

        <div class="sheet-footer">
          <el-row>
            <el-col :span="12">
              <div class="footer-item">
                <span class="foot-label">交货工期：</span>
                <span class="foot-value highlight-days">{{ currentOrder.deliveryDays || '协商确定' }}</span>
              </div>
            </el-col>
            <el-col :span="12" class="text-right">
              <div class="footer-item" v-if="currentOrder.remark">
                <span class="foot-label">备注条款：</span>
                <span class="foot-value">{{ currentOrder.remark }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { showSuccess, showError } from '@/utils/message'
import { usePermissions } from '@/composables/usePermissions'
import { useUserStore } from '@/stores/user'
import { type OrderData, type OrderItem, type AccessoryItem } from '@/api/order'
import SearchBar from '@/components/common/SearchBar.vue'
import ActionButtons from '@/components/common/ActionButtons.vue'
import GroupedHistoryList from '@/components/common/GroupedHistoryList.vue'
import { groupByYearAndCompany } from '@/utils/grouping'
import { useOrderListQuery, useOrderDetailQuery, useDeleteOrderMutation } from '@/composables/useHistoryQueries'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { isGuest, isAdmin } = usePermissions()

// 列表过滤条件（响应式）
const filters = ref({
  keyword: route.query.keyword ? String(route.query.keyword) : '',
  page: 1,
  pageSize: 10000, // 一次拉取，用于前端分组
})

// 列表查询
const { data, isLoading: loading } = useOrderListQuery(filters)
const orderList = computed<OrderData[]>(() => data.value?.list || [])

// 删除 mutation
const deleteMutation = useDeleteOrderMutation()

// 详情查询（按需触发，给预览弹窗用）
const previewVisible = ref(false)
const previewingId = ref<number | null>(null)
const { data: currentOrder } = useOrderDetailQuery(previewingId)

const groupedOrders = computed(() => {
  return groupByYearAndCompany(orderList.value, (r) => r.customerName || '未分配客户')
})

const currentOrderItems = computed<OrderItem[]>(() => {
  if (!currentOrder.value?.items) return []
  try {
    return JSON.parse(currentOrder.value.items)
  } catch {
    return []
  }
})

const currentOrderAccessories = computed<AccessoryItem[]>(() => {
  if (!currentOrder.value?.accessories) return []
  try {
    return JSON.parse(currentOrder.value.accessories)
  } catch {
    return []
  }
})

const currentOrderAttachments = computed<any[]>(() => {
  if (!currentOrder.value?.attachments) return []
  try {
    return JSON.parse(currentOrder.value.attachments)
  } catch {
    return []
  }
})

// 检查是否有编辑权限
const canModify = (row: OrderData) => {
  return isAdmin.value || row.ownerId === userStore.user?.id
}

const goToNewOrder = () => {
  router.push('/order')
}

const handleSearch = () => {
  filters.value = { ...filters.value, page: 1 }
}

const resetSearch = () => {
  filters.value = { ...filters.value, keyword: '', page: 1 }
}

// 查看详情 (弹出弹窗)
const viewOrder = (id: number) => {
  previewingId.value = id
  previewVisible.value = true
}

// 去编辑页面
const editOrder = (id: number) => {
  router.push({ path: '/order', query: { id, mode: 'edit' } })
}

// 删除订单
const confirmDelete = async (row: OrderData) => {
  try {
    await ElMessageBox.confirm(`确定要删除名为 "${row.name || '未命名订单'}" 的订单吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
    await deleteMutation.mutateAsync(row.id)
    showSuccess('订单已成功删除')
    // 删除后 vue-query 自动失效并重新拉取
  } catch (err: any) {
    if (err !== 'cancel') {
      showError(err, '删除订单失败')
    }
  }
}
</script>

<style scoped>
.order-history {
  padding: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-weight: bold;
  font-size: 16px;
}

.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.order-no-link {
  color: #3b82f6;
  font-weight: bold;
  cursor: pointer;
  text-decoration: underline;
}

.order-no-link:hover {
  color: #1d4ed8;
}

.action-buttons {
  display: flex;
  gap: 4px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

/* 订货单纸张排版 (A4 风格设计) */
.order-sheet-paper {
  background: #fff;
  color: #2b2b2b;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  padding: 30px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  line-height: 1.5;
}

.sheet-header {
  text-align: center;
  margin-bottom: 20px;
  position: relative;
}

.company-brand {
  font-size: 16px;
  font-weight: 500;
  color: #555;
  letter-spacing: 1px;
}

.sheet-title {
  font-size: 26px;
  font-weight: 700;
  margin: 6px 0;
  color: #111;
  letter-spacing: 4px;
  border-bottom: 2px double #2b2b2b;
  display: inline-block;
  padding-bottom: 4px;
}

.sheet-order-no {
  font-size: 13px;
  color: #666;
  margin-top: 6px;
}

/* 统一表格基础样式 */
.meta-table, .items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 13px;
}

.meta-table td {
  border: 1px solid #2b2b2b;
  padding: 8px 10px;
}

.meta-label {
  width: 12%;
  font-weight: bold;
  background-color: #f7f9fa;
  text-align: center;
}

.meta-value {
  width: 21%;
}

.items-table th, .items-table td {
  border: 1px solid #2b2b2b;
  padding: 8px 10px;
  text-align: center;
}

.items-table th {
  background-color: #f3f4f6;
  font-weight: bold;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.highlight-qty {
  font-weight: bold;
  color: #1d4ed8;
}

.remark-col {
  font-size: 12px;
  color: #555;
}

.accessories-section {
  border: 1px solid #2b2b2b;
  padding: 12px;
  margin-bottom: 16px;
  border-radius: 2px;
}

.block-title {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
}

.accessories-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  font-size: 13px;
}

.accessory-item {
  display: flex;
  align-items: center;
}

.acc-num {
  color: #777;
  margin-right: 4px;
}

.acc-name {
  font-weight: 550;
}

.acc-divider-equal {
  margin: 0 4px;
  color: #555;
  font-weight: normal;
}

.acc-qty {
  font-weight: bold;
  color: #1d4ed8;
}

.spec-qty-suffix {
  font-weight: bold;
  color: #1d4ed8;
}

.sheet-footer {
  margin-top: 20px;
  border-top: 1px solid #2b2b2b;
  padding-top: 12px;
}

.footer-item {
  font-size: 13px;
  margin-bottom: 6px;
}

.foot-label {
  font-weight: bold;
}

.highlight-days {
  font-weight: bold;
  color: #d97706;
  font-size: 14px;
}

.signature-row {
  margin-top: 40px;
  font-size: 13px;
}

.sig-box {
  height: 60px;
  display: flex;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .order-history {
    padding: 8px;
  }
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .header-content :deep(.el-button) {
    width: 100%;
  }
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .filter-row :deep(.el-input) {
    width: 100% !important;
  }
  .filter-row :deep(.el-button) {
    width: 100%;
    margin: 0 !important;
  }
  .pagination-container {
    justify-content: center;
  }
}

@media print {
  /* 隐藏主应用、侧边栏、对话框头部以及操作按钮 */
  #app, .sidebar-container, .navbar, .tags-view-container,
  .el-dialog__header, .el-dialog__close, .preview-actions {
    display: none !important;
  }

  /* 重置弹窗及其遮罩层的全部定位约束，并隐藏所有滚动条 */
  body, html {
    background: #fff !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* 隐藏所有浏览器的滚动条 */
  ::-webkit-scrollbar {
    display: none !important;
  }
  
  * {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
  }

  .el-overlay, .el-overlay-dialog, .el-dialog {
    position: static !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    overflow: visible !important;
  }

  .el-dialog__body {
    padding: 0 !important;
    overflow: visible !important;
  }

  /* 铺满整个A4页面，允许自然分页 */
  #print-area {
    display: block !important;
    position: static !important;
    width: 100% !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
  }
  
  /* 防止表格行中途截断分页 */
  tr {
    page-break-inside: avoid !important;
  }
}
.attachments-section {
  margin: 16px 20px;
}
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 0 10px;
}
.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.attachment-item .el-icon {
  color: #909399;
}
</style>

