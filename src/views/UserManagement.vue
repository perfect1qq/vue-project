/**
* @module views/UserManagement
* @description 系统用户管理页面（仅管理员可见）
*
* 功能：
* - 查看所有用户列表
* - 新增/编辑/删除用户
* - 修改用户角色（admin/user/guest）
* - 修改用户姓名
* - 重置用户密码
* - 搜索和分页
*/

<template>
  <div class="user-management">
    <!-- 最外层承载卡片 -->
    <el-card shadow="never" class="card">
      <template #header>
        <div class="header-box">
          <!-- 页面标题与引导副标题 -->
          <div class="title-section">
            <h2 class="title">系统用户管理</h2>
            <p class="subtitle">管理平台各业务人员账号及权限，支持查询及强行密码重置配置</p>
          </div>
          <!-- 右上角工具栏：搜索框与刷新按钮 -->
          <div class="actions">
            <SearchBar v-model="search" placeholder="搜索用户名" button-text="刷新列表" @search="fetchUsers">
              <template #extra>
                <el-button type="primary" :icon="Refresh" @click="fetchUsers">刷新</el-button>
              </template>
            </SearchBar>
          </div>
        </div>
      </template>

      <!-- 数据展示核心区：用户实体列表 -->
      <CardList :data="filteredUsers" :loading="loading" :show-pagination="false" :columns="3"
        empty-description="暂无用户数据" :empty-image-size="100">
        <template #card="{ item }">
          <div class="user-card-item">
            <div class="card-header">
              <h3 class="username">{{ item.username }}</h3>
              <el-tag :type="item.role === 'admin' ? 'danger' : item.role === 'user' ? 'primary' : 'info'" size="small">
                {{ item.role === 'admin' ? '管理员' : item.role === 'user' ? '业务员' : '游客(只读)' }}
              </el-tag>
            </div>

            <div class="card-body">
              <div class="info-row">
                <span class="label">👤 姓名：</span>
                <span class="value">
                  <el-input v-if="item._editingName" v-model="item._editNameValue" size="small" placeholder="输入姓名"
                    @blur="handleNameBlur(item)" @keyup.enter="confirmNameChange(item)" />
                  <span v-else class="editable-name" @click="startEditName(item)">
                    {{ item.name || '—' }}
                    <el-icon class="edit-icon">
                      <Edit />
                    </el-icon>
                  </span>
                </span>
              </div>
              <div class="info-row">
                <span class="label">🔐 角色：</span>
                <span class="value">
                  <el-select :model-value="item.role" size="small" placeholder="选择角色"
                    @change="(val) => handleRoleChange(item, val)" :disabled="item.id === currentUser.id">
                    <el-option label="管理员" value="admin" />
                    <el-option label="业务员" value="user" />
                    <el-option label="游客(只读)" value="guest" />
                  </el-select>
                </span>
              </div>
              <div class="info-row">
                <span class="label">📅 注册时间：</span>
                <span class="value">{{ formatDate(item.createdAt) }}</span>
              </div>
            </div>

            <div class="card-footer">
              <el-button type="warning" size="small" plain :icon="Lock" @click.stop="handleResetClick(item)">
                重置密码
              </el-button>
              <el-button type="danger" size="small" plain :icon="Delete" @click.stop="handleDelete(item)"
                :disabled="item.id === currentUser.id">
                删除
              </el-button>
            </div>
          </div>
        </template>
      </CardList>
    </el-card>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetDialog.visible" title="重置用户密码" width="400px" append-to-body destroy-on-close>
      <div class="dialog-content">
        <p class="dialog-tip">正在为用户 <strong>{{ resetDialog.username }}</strong> 设置新密码</p>
        <el-form label-position="top">
          <el-form-item label="输入新密码" required>
            <el-input v-model="resetDialog.password" type="password" show-password placeholder="建议包含字母与数字" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="resetDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="resetDialog.loading" @click="confirmReset">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { Lock, Refresh, Delete, Edit } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { to } from '@/utils/async'
import { formatDate } from '@/utils/date'
import { showError, showSuccess, showWarning } from '@/utils/message'
import SearchBar from '@/components/common/SearchBar.vue'
import CardList from '@/components/common/CardList.vue'

const loading = ref(false)
const users = ref([])
const search = ref('') // 搜索关键词
const userStore = useUserStore()
const currentUser = computed(() => userStore.user || {})

// 重置密码弹窗的状态管理
const resetDialog = reactive({
  visible: false,
  loading: false,
  userId: null,
  username: '',
  password: ''
})

/**
 * 实时过滤用户列表
 */
const filteredUsers = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return users.value
  return users.value.filter(u => u.username.toLowerCase().includes(kw))
})

const fetchUsers = async () => {
  loading.value = true
  const [err, data] = await to(userApi.list())
  if (err) {
    showError('无法获取用户列表')
    loading.value = false
    return
  }
  users.value = data.users || []
  loading.value = false
}

const handleResetClick = (row) => {
  resetDialog.userId = row.id
  resetDialog.username = row.username
  resetDialog.password = ''
  resetDialog.visible = true
}

// 执行重置密码请求
const confirmReset = async () => {
  if (!resetDialog.password) {
    return showWarning('请输入新密码')
  }
  if (resetDialog.password.length < 6) {
    return showWarning('密码长度至少为 6 位')
  }

  resetDialog.loading = true
  const [err] = await to(userApi.resetPassword(resetDialog.userId, resetDialog.password))
  if (err) {
    showError(err, '重置失败')
    resetDialog.loading = false
    return
  }
  showSuccess(`用户 ${resetDialog.username} 的密码已成功重置`)
  resetDialog.visible = false
  resetDialog.loading = false
}

const handleDelete = async (row) => {
  const [confirmErr] = await to(ElMessageBox.confirm(`确定要删除用户 "${row.name || row.username}" 吗？此操作不可恢复！`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }))
  if (confirmErr) return

  const [err] = await to(userApi.remove(row.id))
  if (err) {
    showError(err, '删除用户失败')
    return
  }
  showSuccess('用户已成功删除')
  fetchUsers()
}

const handleRoleChange = async (row, newRole) => {
  const oldRole = row.role
  const roleLabels = { admin: '管理员', user: '业务员', guest: '游客(只读)' }
  const [confirmErr] = await to(ElMessageBox.confirm(`确定要将用户 ${row.username} 的权限修改为 "${roleLabels[newRole] || newRole}" 吗？`, '权限变更确认', {
    type: 'warning',
    confirmButtonText: '确定变更',
    cancelButtonText: '取消'
  }))
  if (confirmErr) {
    row.role = oldRole
    return
  }

  const [err] = await to(userApi.updateRole(row.id, newRole))
  if (err) {
    showError(err, '更新权限失败')
    row.role = oldRole
    fetchUsers()
    return
  }
  row.role = newRole
  showSuccess('用户权限更新成功')
}

const startEditName = (row) => {
  row._editingName = true
  row._editNameValue = row.name || ''
}

const handleNameBlur = (row) => {
  if (!row._editingName) return
  confirmNameChange(row)
}

const confirmNameChange = async (row) => {
  const newName = (row._editNameValue || '').trim()
  if (!newName) {
    row._editingName = false
    return showWarning('姓名不能为空')
  }
  if (newName === row.name) {
    row._editingName = false
    return
  }
  const [err] = await to(userApi.updateName(row.id, newName))
  if (err) {
    showError(err, '修改姓名失败')
    row._editingName = false
    return
  }
  row.name = newName
  row._editingName = false
  showSuccess('姓名已更新')
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management {
  padding: 0;
}

.card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: none;
}

.header-box {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 10px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  border-left: 4px solid #6366f1;
  padding-left: 10px;
  line-height: 1;
}

.subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748b;
  padding-left: 14px;
}

.actions {
  display: flex;
  align-items: center;
}

.dialog-content {
  padding: 10px 0;
}

.dialog-tip {
  margin-bottom: 20px;
  color: #475569;
  line-height: 1.5;
  font-size: 14px;
}

.dialog-tip strong {
  color: #6366f1;
}

@media (max-width: 768px) {
  .header-box {
    align-items: flex-start;
    gap: 10px;
  }

  .title {
    font-size: 16px;
  }

  .subtitle {
    font-size: 12px;
    padding-left: 0;
  }

  .actions {
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .actions :deep(.el-input),
  .actions :deep(.el-input__wrapper) {
    width: 100% !important;
  }
}

.editable-name {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.editable-name:hover {
  background-color: #e8f0fe;
  color: #6366f1;
}

.edit-icon {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.editable-name:hover .edit-icon {
  opacity: 1;
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

/* 用户卡片特有样式（通用样式已移至global.css） */
</style>
