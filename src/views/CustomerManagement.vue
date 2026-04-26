<!--
  @file views/CustomerManagement.vue
  @description 客户管理页面（CRUD + 跟进记录 + 报价联动）

  功能说明：
  - 客户信息的增删改查（CRUD）
  - 搜索筛选（关键词、合作状态、客户类型）
  - 分页展示（卡片列表形式）
  - 客户详情查看（含跟进记录时间线）
  - 跟进记录管理（添加/删除）
  - 与报价单联动（显示报价状态、跳转查看）

  页面结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  el-card (客户管理容器)                                       │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ CardHeader (标题栏) [新增客户按钮]                      │  │
  │  ├────────────────────────────────────────────────────────┤  │
  │  │ search-filter-row (搜索筛选区)                          │  │
  │  │ [搜索框] [合作状态▼] [客户类型▼] [搜索] [清空]          │  │
  │  ├────────────────────────────────────────────────────────┤  │
  │  │ CardList (客户卡片列表 + 分页)                          │  │
  │  │ ┌─────────────────┐ ┌─────────────────┐               │  │
  │  │ │ 公司A [已合作]   │ │ 公司B [未合作]   │               │  │
  │  │ │ 姓名: 张三       │ │ 姓名: 李四       │               │  │
  │  │ │ 报价: 已报价 ✓   │ │ 报价: 未报价     │               │  │
  │  │ │ [详情][编辑]    │ │ [详情][编辑]    │               │  │
  │  │ └─────────────────┘ └─────────────────┘               │  │
  │  │                    [< 1 2 3 >]                         │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  对话框：
  ┌──────────────────────────────────────┐
  │ 新增/编辑客户对话框                   │
  │ - 公司名称 *                        │
  │ - 客户姓名 *                        │
  │ - 联系方式                          │
  │ - 合作状态 / 客户类型               │
  │ - 备注                              │
  └──────────────────────────────────────┘

  ┌──────────────────────────────────────┐
  │ 客户详情对话框                       │
  │ - 基本信息（Descriptions）           │
  │ - 跟进记录时间线                     │
  │   [添加跟进] 按钮                   │
  └──────────────────────────────────────┘

  权限控制：
  - 游客(isGuest): 只读，隐藏新增/编辑/删除按钮
  - 普通用户: 可创建/编辑自己的客户
  - 管理员: 全部权限
-->

<template>
  <div class="customer-management">
    <el-card shadow="never">
      <!-- ==================== 卡片头部：标题 + 操作按钮 ==================== -->
      <template #header>
        <CardHeader title="客户管理">
          <template #actions>
            <el-button
              v-if="canCreate"
              type="primary"
              :icon="Plus"
              @click="handleAdd"
            >
              新增客户
            </el-button>
          </template>
        </CardHeader>
      </template>

      <!-- ==================== 搜索 & 筛选区域 ==================== -->

      <!--
        搜索筛选行：
        - 左侧：全文搜索框（公司名称、姓名、联系方式）
        - 右侧：下拉筛选项（合作状态、客户类型）+ 操作按钮
      -->
      <div class="search-filter-row">
        <SearchBar
          v-model="searchKeyword"
          placeholder="搜索公司名称、客户姓名、联系方式"
          @search="handleSearch"
        />

        <div class="filter-group">
          <!-- 合作状态筛选 -->
          <el-select
            v-model="filterCooperationStatus"
            placeholder="合作状态"
            clearable
            style="width: 130px"
          >
            <el-option label="已合作" value="已合作" />
            <el-option label="未合作" value="未合作" />
          </el-select>

          <!-- 客户类型筛选 -->
          <el-select
            v-model="filterCustomerType"
            placeholder="客户类型"
            clearable
            style="width: 130px"
          >
            <el-option label="终端" value="终端" />
            <el-option label="经销商" value="经销商" />
            <el-option label="待确认" value="待确认" />
          </el-select>

          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="handleResetFilter">清空</el-button>
        </div>
      </div>

      <!-- ==================== 客户卡片列表（带分页） ==================== -->

      <!--
        CardList: 通用卡片列表组件
        - columns=2: 两列布局
        - 支持分页加载
        - 空状态显示 + 空状态操作按钮
      -->
      <CardList
        :data="customerList"
        :loading="loading"
        :total="total"
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :columns="2"
        empty-description="暂无客户数据"
        :empty-image-size="120"
        @page-change="(p) => loadList(p)"
      >
        <!-- 单个客户卡片插槽 -->
        <template #card="{ item }">
          <div class="customer-card">
            <!-- 卡片头部：公司名 + 标签 -->
            <div class="card-header">
              <h3 class="company-name">{{ item.companyName }}</h3>
              <div class="tags">
                <el-tag
                  :type="item.cooperationStatus === '已合作' ? 'success' : 'warning'"
                  size="small"
                >
                  {{ item.cooperationStatus || '未合作' }}
                </el-tag>
                <el-tag
                  :type="getCustomerTypeTagType(item.customerType)"
                  size="small"
                >
                  {{ item.customerType || '终端' }}
                </el-tag>
              </div>
            </div>

            <!-- 卡片主体：基本信息 -->
            <div class="card-body">
              <div class="info-row">
                <span class="label">👤 客户姓名：</span>
                <span class="value">{{ item.customerName || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="label">📞 联系方式：</span>
                <span class="value">{{ item.contactInfo || '-' }}</span>
              </div>

              <!-- 报价状态联动区域（与报价单模块联动） -->
              <div
                v-if="item.hasQuotation"
                class="info-row quotation-info"
              >
                <span class="label">📋 报价状态：</span>
                <el-tag type="success" size="small">已报价</el-tag>
                <span
                  v-if="item.quotationDate"
                  class="quotation-date"
                >
                  🕐 {{ item.quotationDate }}
                </span>
              </div>
              <div v-else class="info-row quotation-info">
                <span class="label">📋 报价状态：</span>
                <el-tag type="info" size="small" plain>未报价</el-tag>
              </div>

              <!-- 备注（可选显示） -->
              <div v-if="item.remark" class="info-row">
                <span class="label">📝 备注：</span>
                <span class="value remark-text">{{ item.remark }}</span>
              </div>
            </div>

            <!-- 卡片底部：操作按钮组 -->
            <div class="card-footer">
              <div class="action-buttons">
                <!-- 查看详情 -->
                <el-button
                  type="primary"
                  size="small"
                  round
                  @click.stop="handleViewDetail(item)"
                >
                  详情
                </el-button>

                <!-- 查看关联的报价单（仅已报价时显示） -->
                <el-button
                  v-if="item.hasQuotation && item.quotationId"
                  type="success"
                  size="small"
                  round
                  @click.stop="handleGoToQuotation(item)"
                >
                  查看报价单
                </el-button>

                <!-- 编辑/删除（非游客可见） -->
                <template v-if="!isGuest">
                  <el-button
                    v-if="canEdit"
                    type="warning"
                    size="small"
                    plain
                    @click.stop="handleEdit(item)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    v-if="canDelete"
                    type="danger"
                    size="small"
                    plain
                    @click.stop="handleDelete(item)"
                  >
                    删除
                  </el-button>
                </template>
              </div>
            </div>
          </div>
        </template>

        <!-- 空状态时的操作按钮 -->
        <template #empty-action>
          <el-button
            v-if="canCreate"
            type="primary"
            @click="handleAdd"
          >
            立即添加客户
          </el-button>
        </template>
      </CardList>
    </el-card>

    <!-- ==================== 新增/编辑客户对话框 ==================== -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="公司名称" prop="companyName">
          <el-input
            v-model="formData.companyName"
            placeholder="请输入公司名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="客户姓名" prop="customerName">
          <el-input
            v-model="formData.customerName"
            placeholder="请输入客户姓名"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="联系方式" prop="contactInfo">
          <el-input
            v-model="formData.contactInfo"
            placeholder="请输入联系方式（电话、微信等）"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="合作状态" prop="cooperationStatus">
          <el-select
            v-model="formData.cooperationStatus"
            placeholder="选择合作状态"
            style="width: 100%"
          >
            <el-option label="未合作" value="未合作" />
            <el-option label="已合作" value="已合作" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户类型" prop="customerType">
          <el-select
            v-model="formData.customerType"
            placeholder="选择客户类型"
            style="width: 100%"
          >
            <el-option label="终端" value="终端" />
            <el-option label="经销商" value="经销商" />
            <el-option label="待确认" value="待确认" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 客户详情对话框（含跟进记录） ==================== -->
    <el-dialog
      v-model="detailVisible"
      title="客户详情"
      width="800px"
      destroy-on-close
    >
      <div v-if="currentCustomer" class="detail-content">
        <!-- 基本信息描述列表 -->
        <el-descriptions :column="2" border>
          <el-descriptions-item label="公司名称">{{
            currentCustomer.companyName
          }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{
            currentCustomer.customerName
          }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{
            currentCustomer.contactInfo || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{
            currentCustomer.ownerName
          }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{
            currentCustomer.remark || '—'
          }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{
            formatDate(currentCustomer.createdAt)
          }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{
            formatDate(currentCustomer.updatedAt)
          }}</el-descriptions-item>
        </el-descriptions>

        <!-- 跟进记录部分 -->
        <div class="follow-up-section">
          <div class="section-header">
            <span class="section-title"
              >跟进记录 ({{
                currentCustomer.followUps?.length || 0
              }})</span
            >
            <el-button
              v-if="canCreate"
              type="primary"
              size="small"
              :icon="Plus"
              @click="showAddFollowUpDialog"
            >
              添加跟进
            </el-button>
          </div>

          <!-- 跟进记录时间线（有数据时） -->
          <el-timeline v-if="currentCustomer.followUps?.length > 0">
            <el-timeline-item
              v-for="item in currentCustomer.followUps"
              :key="item.id"
              :timestamp="formatDateTime(item.createdAt)"
              placement="top"
            >
              <el-card shadow="hover" class="follow-up-card">
                <div class="follow-up-header">
                  <el-tag
                    size="small"
                    :type="getFollowTypeTagType(item.followType)"
                  >
                    {{ item.followType }}
                  </el-tag>
                  <span class="operator-name">{{
                    item.operatorName
                  }}</span>
                  <el-button
                    v-if="!isGuest"
                    type="danger"
                    link
                    size="small"
                    @click="handleDeleteFollowUp(item)"
                    style="margin-left: auto"
                  >
                    删除
                  </el-button>
                </div>
                <p class="follow-up-content">{{ item.content }}</p>
                <p v-if="item.nextTime" class="next-time">
                  下次跟进时间：{{ formatDate(item.nextTime) }}
                </p>
              </el-card>
            </el-timeline-item>
          </el-timeline>

          <!-- 无跟进记录时的空状态 -->
          <el-empty
            v-else
            description="暂无跟进记录"
            :image-size="80"
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 添加跟进记录对话框 ==================== -->
    <el-dialog
      v-model="followUpDialogVisible"
      title="添加跟进记录"
      width="500px"
      append-to-body
      destroy-on-close
    >
      <el-form
        ref="followUpFormRef"
        :model="followUpFormData"
        :rules="followUpFormRules"
        label-width="100px"
      >
        <el-form-item label="跟进方式" prop="followType">
          <el-select
            v-model="followUpFormData.followType"
            placeholder="选择跟进方式"
            style="width: 100%"
          >
            <el-option label="电话" value="电话" />
            <el-option label="微信" value="微信" />
            <el-option label="邮件" value="邮件" />
            <el-option label="上门" value="上门" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input
            v-model="followUpFormData.content"
            type="textarea"
            :rows="4"
            placeholder="请输入跟进内容"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="下次跟进" prop="nextTime">
          <el-date-picker
            v-model="followUpFormData.nextTime"
            type="date"
            placeholder="选择下次跟进时间"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="followUpSubmitLoading"
          @click="handleSubmitFollowUp"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import customerApi from '@/api/customer'
import { to } from '@/utils/async'
import { formatDate, formatDateTime } from '@/utils/date'
import { showError, showSuccess } from '@/utils/message'
import { usePagination } from '@/composables/usePagination'
import { usePermissions } from '@/composables/usePermissions'
import { useFormSubmit } from '@/composables/useFormSubmit'

import SearchBar from '@/components/common/SearchBar.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import CardList from '@/components/common/CardList.vue'

const router = useRouter()

/** 权限检查 */
const { isGuest, canCreate, canEdit, canDelete } = usePermissions()

/** 提交锁（防止重复提交） */
const { submitLoading, withSubmitLock } = useFormSubmit()

// ==================== 响应式状态 ====================

/** 列表加载状态 */
const loading = ref(false)

/** 客户列表数据（使用 shallowRef 优化大数组性能） */
const customerList = shallowRef([])

/** 搜索关键词 */
const searchKeyword = ref('')

/** 合作状态筛选值 */
const filterCooperationStatus = ref('')

/** 客户类型筛选值 */
const filterCustomerType = ref('')

// ==================== 分页状态 ====================
const {
  page,
  pageSize,
  total,
  handleCurrentChange,
  handleSizeChange,
  resetToFirstPage,
} = usePagination({
  defaultPage: 1,
  defaultPageSize: 10,
  onLoad: (newPage) => loadList(newPage),
})

// ==================== 对话框状态 ====================

/** 新增/编辑对话框是否可见 */
const dialogVisible = ref(false)

/** 对话框标题（"新增客户" / "编辑客户"） */
const dialogTitle = ref('新增客户')

/** 当前正在编辑的客户 ID（null 表示新增模式） */
const editingId = ref(null)

/** 表单引用（用于触发验证） */
const formRef = ref(null)

/**
 * 表单数据模型
 *
 * 字段说明：
 * - companyName: 公司名称（必填）
 * - customerName: 客户姓名（必填）
 * - contactInfo: 联系方式
 * - cooperationStatus: 合作状态（默认"未合作"）
 * - customerType: 客户类型（默认"终端"）
 * - remark: 备注信息
 */
const formData = reactive({
  companyName: '',
  customerName: '',
  contactInfo: '',
  cooperationStatus: '未合作',
  customerType: '终端',
  remark: '',
})

/**
 * 表单验证规则
 *
 * 公司名称和客户姓名为必填项，
 * 最小长度 2 个字符防止无效输入
 */
const formRules = {
  companyName: [
    { required: true, message: '请输入公司名称', trigger: 'blur' },
    { min: 2, message: '公司名称至少2个字符', trigger: 'blur' },
  ],
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' },
    { min: 2, message: '客户姓名至少2个字符', trigger: 'blur' },
  ],
}

/** 详情对话框是否可见 */
const detailVisible = ref(false)

/** 当前查看的客户详情对象 */
const currentCustomer = ref(null)

// ==================== 跟进记录相关状态 ====================

/** 添加跟进对话框是否可见 */
const followUpDialogVisible = ref(false)

/** 跟进提交加载状态 */
const followUpSubmitLoading = ref(false)

/** 跟进表单引用 */
const followUpFormRef = ref(null)

/**
 * 跟进表单数据
 * - followType: 跟进方式（电话/微信/邮件/上门/其他）
 * - content: 跟进内容
 * - nextTime: 下次跟进日期
 */
const followUpFormData = reactive({
  followType: '电话',
  content: '',
  nextTime: '',
})

/** 跟进表单验证规则 */
const followUpFormRules = {
  content: [{ required: true, message: '请输入跟进内容', trigger: 'blur' }],
}

// ==================== 数据加载方法 ====================

/**
 * 加载客户列表
 *
 * 根据当前搜索条件和分页参数请求后端接口
 */
const loadList = async () => {
  loading.value = true

  const params = {
    keyword: searchKeyword.value || undefined,
    page: page.value,
    pageSize: pageSize.value,
  }

  if (
    filterCooperationStatus.value &&
    filterCooperationStatus.value.trim()
  ) {
    params.cooperationStatus =
      filterCooperationStatus.value.trim()
  }
  if (filterCustomerType.value && filterCustomerType.value.trim()) {
    params.customerType = filterCustomerType.value.trim()
  }

  const [err, res] = await to(customerApi.list(params))
  if (err) {
    showError(err, '加载客户列表失败')
    loading.value = false
    return
  }

  customerList.value = res?.customers || []
  total.value = Number(res?.total ?? 0)
  loading.value = false
}

/** 执行搜索（重置到第一页后加载） */
const handleSearch = () => {
  resetToFirstPage()
  loadList()
}

/** 重置所有筛选条件并重新加载 */
const handleResetFilter = () => {
  searchKeyword.value = ''
  filterCooperationStatus.value = ''
  filterCustomerType.value = ''
  resetToFirstPage()
  loadList()
}

// ==================== CRUD 操作方法 ====================

/** 重置表单到初始状态 */
const resetForm = () => {
  formData.companyName = ''
  formData.customerName = ''
  formData.contactInfo = ''
  formData.cooperationStatus = '未合作'
  formData.customerType = '终端'
  formData.remark = ''
  editingId.value = null
}

/** 打开新增客户对话框 */
const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增客户'
  dialogVisible.value = true
}

/** 打开编辑客户对话框（填充现有数据） */
const handleEdit = (row) => {
  resetForm()
  editingId.value = row.id
  formData.companyName = row.companyName
  formData.customerName = row.customerName
  formData.contactInfo = row.contactInfo
  formData.cooperationStatus = row.cooperationStatus || '未合作'
  formData.customerType = row.customerType || '终端'
  formData.remark = row.remark
  dialogTitle.value = '编辑客户'
  dialogVisible.value = true
}

/**
 * 提交表单（新增或更新）
 *
 * 使用 withSubmitLock 防止重复点击
 */
const handleSubmit = async () => {
  await withSubmitLock(async () => {
    const [validateErr] = await to(formRef.value?.validate())
    if (validateErr) return

    if (editingId.value) {
      // 更新模式
      const [err] = await to(
        customerApi.update(editingId.value, { ...formData }),
      )
      if (err) {
        showError(err, '更新客户失败')
        return
      }
      showSuccess('客户更新成功')
    } else {
      // 新增模式
      const [err] = await to(customerApi.create({ ...formData }))
      if (err) {
        showError(err, '创建客户失败')
        return
      }
      showSuccess('客户创建成功')
    }

    dialogVisible.value = false
    loadList()
  })
}

/**
 * 删除客户
 *
 * 二次确认后执行删除操作
 */
const handleDelete = async (row) => {
  const [confirmErr] = await to(
    ElMessageBox.confirm(
      `确定要删除客户"${row.companyName}"吗？此操作将同时删除所有跟进记录。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      },
    ),
  )
  if (confirmErr) return

  const [err] = await to(customerApi.remove(row.id))
  if (err) {
    showError(err, '删除客户失败')
    return
  }

  showSuccess('客户删除成功')
  loadList()
}

// ==================== 详情 & 跟进方法 ====================

/** 查看客户详情（打开详情对话框） */
const handleViewDetail = async (row) => {
  loading.value = true
  const [err, res] = await to(customerApi.getDetail(row.id))
  if (err) {
    showError(err, '加载客户详情失败')
    loading.value = false
    return
  }

  currentCustomer.value = res?.customer || null
  detailVisible.value = true
  loading.value = false
}

/** 打开添加跟进记录对话框 */
const showAddFollowUpDialog = () => {
  followUpFormData.followType = '电话'
  followUpFormData.content = ''
  followUpFormData.nextTime = ''
  followUpDialogVisible.value = true
}

/** 提交跟进记录 */
const handleSubmitFollowUp = async () => {
  await withSubmitLock(async () => {
    const [validateErr] = await to(followUpFormRef.value?.validate())
    if (validateErr) return

    const [err] = await to(
      customerApi.addFollowUp(currentCustomer.value.id, {
        ...followUpFormData,
      }),
    )
    if (err) {
      showError(err, '添加跟进记录失败')
      return
    }

    showSuccess('跟进记录添加成功')
    followUpDialogVisible.value = false

    // 重新加载客户详情以刷新跟进列表
    const [, res] = await to(
      customerApi.getDetail(currentCustomer.value.id),
    )
    if (res?.customer) {
      currentCustomer.value = res.customer
    }
  })
}

/** 删除跟进记录 */
const handleDeleteFollowUp = async (item) => {
  const [confirmErr] = await to(
    ElMessageBox.confirm('确定要删除这条跟进记录吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
    }),
  )
  if (confirmErr) return

  const [err] = await to(customerApi.deleteFollowUp(item.id))
  if (err) {
    showError(err, '删除跟进记录失败')
    return
  }

  showSuccess('跟进记录删除成功')

  // 重新加载客户详情以刷新跟进列表
  const [, res] = await to(
    customerApi.getDetail(currentCustomer.value.id),
  )
  if (res?.customer) {
    currentCustomer.value = res.customer
  }
}

// ==================== 辅助函数 ====================

/**
 * 获取跟进方式的 Tag 类型颜色
 * @param {string} type - 跟进方式
 * @returns {string} Element Plus Tag 的 type 属性
 */
const getFollowTypeTagType = (type) => {
  const map = {
    电话: '',
    微信: 'success',
    邮件: 'warning',
    上门: 'danger',
    其他: 'info',
  }
  return map[type] || 'info'
}

/**
 * 获取客户类型的 Tag 类型颜色
 * @param {string} type - 客户类型
 * @returns {string} Element Plus Tag 的 type 属性
 */
const getCustomerTypeTagType = (type) => {
  const map = {
    终端: 'info',
    经销商: 'primary',
    待确认: 'warning',
  }
  return map[type] || 'info'
}

/**
 * 跳转到报价单历史页面查看关联的报价单
 *
 * 通过 query 参数传递 ID 和模式，实现直接定位
 */
const handleGoToQuotation = (item) => {
  if (item.quotationId) {
    router.push({
      path: '/quotation/history',
      query: { id: item.quotationId, mode: 'view' },
    })
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
/** 页面根容器 */
.customer-management {
  padding: 20px;
}

/**
 * 搜索筛选行布局
 * - Flex 弹性布局
 * - 浅灰色背景区分
 * - 圆角边框
 * - 支持换行（移动端适配）
 */
.search-filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  flex-wrap: wrap;
}

.search-filter-row .search-bar {
  flex: 1;
  min-width: 300px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/** 详情内容区域（限制最大高度，超出可滚动） */
.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

/** 跟进记录区域（与上方内容分隔） */
.follow-up-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

/* ====== 客户卡片特有样式 ====== */

/** 备注文本样式（斜体灰色） */
.customer-card .info-row .remark-text {
  color: #909399;
  font-size: 13px;
  font-style: italic;
}

/** 报价信息行（横向排列标签和日期） */
.quotation-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/** 报价日期（绿色强调） */
.quotation-date {
  color: #67c23a;
  font-size: 13px;
  font-weight: 500;
}

/** 区域标题样式 */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/** 跟进记录卡片间距 */
.follow-up-card {
  margin-bottom: 8px;
}

/** 跟进记录头部（标签 + 操作者 + 删除按钮） */
.follow-up-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

/** 操作者名称（灰色小字） */
.operator-name {
  color: #909399;
  font-size: 13px;
}

/** 跟进内容正文 */
.follow-up-content {
  margin: 8px 0;
  color: #303133;
  line-height: 1.6;
}

/** 下次跟进时间提示（橙色警告色） */
.next-time {
  color: #e6a23c;
  font-size: 13px;
  margin-top: 8px;
}
</style>
