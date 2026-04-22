<template>
  <div class="customer-management">
    <el-card shadow="never">
      <template #header>
        <CardHeader title="客户管理">
          <template #actions>
            <el-button v-if="canCreate" type="primary" :icon="Plus" @click="handleAdd">新增客户</el-button>
          </template>
        </CardHeader>
      </template>

      <!-- 搜索栏 -->
      <SearchBar v-model="searchKeyword" placeholder="搜索公司名称、客户姓名、联系方式" @search="handleSearch" />

      <!-- 客户列表表格 -->
      <PageTable :data="customerList" :loading="loading" :total="total" v-model:current-page="page"
        v-model:page-size="pageSize" empty-description="暂无客户数据" :empty-image-size="120"
        @page-change="(p) => loadList(p)">
        <el-table-column prop="companyName" label="公司名称" min-width="150" show-overflow-tooltip align="center" />
        <el-table-column prop="customerName" label="客户姓名" min-width="100" align="center" />
        <el-table-column prop="contactInfo" label="联系方式" min-width="130" align="center" />
        <el-table-column prop="ownerName" label="负责人" min-width="90" align="center" />
        <el-table-column label="跟进次数" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.followUpCount > 0 ? 'success' : 'info'" size="small">{{ row.followUpCount }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="110" align="center">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" :width="isGuest ? 100 : 220" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" size="small" round @click="handleViewDetail(row)">详情</el-button>
              <template v-if="!isGuest">
                <el-button v-if="canEdit" type="warning" size="small" plain @click="handleEdit(row)">编辑</el-button>
                <el-button v-if="canDelete" type="danger" size="small" plain @click="handleDelete(row)">删除</el-button>
              </template>
            </div>
          </template>
        </el-table-column>

        <!-- 空状态操作按钮 -->
        <template #empty-action>
          <el-button v-if="canCreate" type="primary" @click="handleAdd">立即添加客户</el-button>
        </template>
      </PageTable>
    </el-card>

    <!-- 新增/编辑客户对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" destroy-on-close>
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="公司名称" prop="companyName">
          <el-input v-model="formData.companyName" placeholder="请输入公司名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="客户姓名" prop="customerName">
          <el-input v-model="formData.customerName" placeholder="请输入客户姓名" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="联系方式" prop="contactInfo">
          <el-input v-model="formData.contactInfo" placeholder="请输入联系方式（电话、微信等）" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注信息（可选）" maxlength="500"
            show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 客户详情对话框（含跟进记录） -->
    <el-dialog v-model="detailVisible" title="客户详情" width="800px" destroy-on-close>
      <div class="detail-content" v-if="currentCustomer">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="公司名称">{{ currentCustomer.companyName }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{ currentCustomer.customerName }}</el-descriptions-item>
          <el-descriptions-item label="联系方式">{{ currentCustomer.contactInfo || '—' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ currentCustomer.ownerName }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentCustomer.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(currentCustomer.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(currentCustomer.updatedAt) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 跟进记录部分 -->
        <div class="follow-up-section">
          <div class="section-header">
            <span class="section-title">跟进记录 ({{ currentCustomer.followUps?.length || 0 }})</span>
            <el-button v-if="canCreate" type="primary" size="small" :icon="Plus"
              @click="showAddFollowUpDialog">添加跟进</el-button>
          </div>

          <el-timeline v-if="currentCustomer.followUps?.length > 0">
            <el-timeline-item v-for="item in currentCustomer.followUps" :key="item.id"
              :timestamp="formatDateTime(item.createdAt)" placement="top">
              <el-card shadow="hover" class="follow-up-card">
                <div class="follow-up-header">
                  <el-tag size="small" :type="getFollowTypeTagType(item.followType)">{{ item.followType }}</el-tag>
                  <span class="operator-name">{{ item.operatorName }}</span>
                  <el-button v-if="!isGuest" type="danger" link size="small" @click="handleDeleteFollowUp(item)"
                    style="margin-left: auto">删除</el-button>
                </div>
                <p class="follow-up-content">{{ item.content }}</p>
                <p v-if="item.nextTime" class="next-time">
                  下次跟进时间：{{ formatDate(item.nextTime) }}
                </p>
              </el-card>
            </el-timeline-item>
          </el-timeline>

          <el-empty v-else description="暂无跟进记录" :image-size="80" />
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 添加跟进记录对话框 -->
    <el-dialog v-model="followUpDialogVisible" title="添加跟进记录" width="500px" append-to-body destroy-on-close>
      <el-form ref="followUpFormRef" :model="followUpFormData" :rules="followUpFormRules" label-width="100px">
        <el-form-item label="跟进方式" prop="followType">
          <el-select v-model="followUpFormData.followType" placeholder="选择跟进方式" style="width: 100%">
            <el-option label="电话" value="电话" />
            <el-option label="微信" value="微信" />
            <el-option label="邮件" value="邮件" />
            <el-option label="上门" value="上门" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input v-model="followUpFormData.content" type="textarea" :rows="4" placeholder="请输入跟进内容" maxlength="1000"
            show-word-limit />
        </el-form-item>
        <el-form-item label="下次跟进" prop="nextTime">
          <el-date-picker v-model="followUpFormData.nextTime" type="date" placeholder="选择下次跟进时间" format="YYYY-MM-DD"
            value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="followUpSubmitLoading" @click="handleSubmitFollowUp">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { customerApi } from '@/api/customer'
import { to } from '@/utils/async'
import { formatDate, formatDateTime } from '@/utils/date'
import { showError, showSuccess } from '@/utils/message'
import { usePagination } from '@/composables/usePagination'
import { usePermissions } from '@/composables/usePermissions'
import { useFormSubmit } from '@/composables/useFormSubmit'
import { TABLE_HEADER_STYLE } from '@/constants/table'
import SearchBar from '@/components/common/SearchBar.vue'
import CardHeader from '@/components/common/CardHeader.vue'
import PageTable from '@/components/common/PageTable.vue'

const { isGuest, canCreate, canEdit, canDelete } = usePermissions()
const { submitLoading, withSubmitLock } = useFormSubmit()

const loading = ref(false)
const customerList = ref([])
const searchKeyword = ref('')

const {
  page,
  pageSize,
  total,
  handleCurrentChange,
  handleSizeChange,
  resetToFirstPage
} = usePagination({
  defaultPage: 1,
  defaultPageSize: 20,
  onLoad: (newPage) => loadList(newPage)
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增客户')
// const submitLoading = ref(false)
const editingId = ref(null)

const formRef = ref(null)
const formData = reactive({
  companyName: '',
  customerName: '',
  contactInfo: '',
  remark: ''
})

const formRules = {
  companyName: [
    { required: true, message: '请输入公司名称', trigger: 'blur' },
    { min: 2, message: '公司名称至少2个字符', trigger: 'blur' }
  ],
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' },
    { min: 2, message: '客户姓名至少2个字符', trigger: 'blur' }
  ]
}

const detailVisible = ref(false)
const currentCustomer = ref(null)

const followUpDialogVisible = ref(false)
const followUpSubmitLoading = ref(false)
const followUpFormRef = ref(null)
const followUpFormData = reactive({
  followType: '电话',
  content: '',
  nextTime: ''
})

const followUpFormRules = {
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' }
  ]
}

const loadList = async () => {
  loading.value = true
  const [err, res] = await to(customerApi.list({
    keyword: searchKeyword.value,
    page: page.value,
    pageSize: pageSize.value
  }))
  if (err) {
    showError(err, '加载客户列表失败')
    loading.value = false
    return
  }

  customerList.value = res?.customers || []
  total.value = Number(res?.total ?? 0)
  loading.value = false
}

const handleSearch = () => {
  resetToFirstPage()
  loadList()
}

const resetForm = () => {
  formData.companyName = ''
  formData.customerName = ''
  formData.contactInfo = ''
  formData.remark = ''
  editingId.value = null
}

const handleAdd = () => {
  resetForm()
  dialogTitle.value = '新增客户'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  resetForm()
  editingId.value = row.id
  formData.companyName = row.companyName
  formData.customerName = row.customerName
  formData.contactInfo = row.contactInfo
  formData.remark = row.remark
  dialogTitle.value = '编辑客户'
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await withSubmitLock(async () => {
    const [validateErr] = await to(formRef.value?.validate())
    if (validateErr) return

    if (editingId.value) {
      const [err] = await to(customerApi.update(editingId.value, { ...formData }))
      if (err) {
        showError(err, '更新客户失败')
        return
      }
      showSuccess('客户更新成功')
    } else {
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

const handleDelete = async (row) => {
  const [confirmErr] = await to(
    ElMessageBox.confirm(`确定要删除客户"${row.companyName}"吗？此操作将同时删除所有跟进记录。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
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

const showAddFollowUpDialog = () => {
  followUpFormData.followType = '电话'
  followUpFormData.content = ''
  followUpFormData.nextTime = ''
  followUpDialogVisible.value = true
}

const handleSubmitFollowUp = async () => {
  await withSubmitLock(async () => {
    const [validateErr] = await to(followUpFormRef.value?.validate())
    if (validateErr) return

    const [err] = await to(customerApi.addFollowUp(currentCustomer.value.id, { ...followUpFormData }))
    if (err) {
      showError(err, '添加跟进记录失败')
      return
    }

    showSuccess('跟进记录添加成功')
    followUpDialogVisible.value = false

    // 重新加载客户详情
    const [, res] = await to(customerApi.getDetail(currentCustomer.value.id))
    if (res?.customer) {
      currentCustomer.value = res.customer
    }
  })
}

const handleDeleteFollowUp = async (item) => {
  const [confirmErr] = await to(
    ElMessageBox.confirm('确定要删除这条跟进记录吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
  )
  if (confirmErr) return

  const [err] = await to(customerApi.deleteFollowUp(item.id))
  if (err) {
    showError(err, '删除跟进记录失败')
    return
  }

  showSuccess('跟进记录删除成功')

  // 重新加载客户详情
  const [, res] = await to(customerApi.getDetail(currentCustomer.value.id))
  if (res?.customer) {
    currentCustomer.value = res.customer
  }
}

const getFollowTypeTagType = (type) => {
  const map = { '电话': '', '微信': 'success', '邮件': 'warning', '上门': 'danger', '其他': 'info' }
  return map[type] || 'info'
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.customer-management {
  padding: 20px;
}


.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.follow-up-card {
  margin-bottom: 8px;
}

.follow-up-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.operator-name {
  color: #909399;
  font-size: 13px;
}

.follow-up-content {
  margin: 8px 0;
  color: #303133;
  line-height: 1.6;
}

.next-time {
  color: #e6a23c;
  font-size: 13px;
  margin-top: 8px;
}

.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

.action-btns .el-button {
  padding: 5px 12px;
}
</style>