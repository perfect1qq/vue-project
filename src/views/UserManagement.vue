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
            <el-input
              v-model="search"
              placeholder="搜索用户名"
              clearable
              :prefix-icon="Search"
              style="width: 240px; margin-right: 12px"
            />
            <el-button type="primary" :icon="Refresh" @click="fetchUsers">刷新列表</el-button>
          </div>
        </div>
      </template>

      <!-- 数据展示核心区：用户实体列表 -->
      <el-table
        v-loading="loading"
        :data="filteredUsers"
        stripe
        border
        style="width: 100%"
        :header-cell-style="{ background: '#f8f8f9', color: '#515a6e', fontWeight: 'bold' }"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" min-width="150" />
        
        <!-- ================= 角色列：支持管理员手动切换系统权限 ================= -->
        <el-table-column prop="role" label="角色 (点击修改)" width="150">
          <template #default="{ row }">
            <el-select
              v-model="row.role"
              size="small"
              placeholder="选择角色"
              @change="(val) => handleRoleChange(row, val)"
              :disabled="row.id === currentUser.id" 
            >
              <!-- 业务规则：禁止管理员在这里自杀式修改自己的角色，防止整个系统失去 Admin 节点 -->
              <el-option label="管理员" value="admin" />
              <el-option label="业务员" value="user" />
            </el-select>
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        
        <!-- 操作列：支持针对特定用户打回密码 -->
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              :icon="Lock"
              @click="handleResetClick(row)"
            >
              重置密码
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialog.visible"
      title="重置用户密码"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <div class="dialog-content">
        <p class="dialog-tip">正在为用户 <strong>{{ resetDialog.username }}</strong> 设置新密码</p>
        <el-form label-position="top">
          <el-form-item label="输入新密码" required>
            <el-input
              v-model="resetDialog.password"
              type="password"
              show-password
              placeholder="建议包含字母与数字"
            />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock, Refresh, Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

const loading = ref(false)
const users = ref([]) // 所有用户列表
const search = ref('') // 搜索关键词
const currentUser = ref({}) // 当前登录用户的信息

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
  try {
    loading.value = true
    const res = await request.get('/api/users')
    users.value = res.data.users || []
  } catch (error) {
    ElMessage.error('无法获取用户列表')
  } finally {
    loading.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
    return ElMessage.warning('请输入新密码')
  }
  if (resetDialog.password.length < 6) {
    return ElMessage.warning('密码长度至少为 6 位')
  }

  try {
    resetDialog.loading = true
    await request.post(`/api/users/${resetDialog.userId}/reset-password`, {
      password: resetDialog.password
    })
    ElMessage.success(`用户 ${resetDialog.username} 的密码已成功重置`)
    resetDialog.visible = false
  } catch (error) {
    ElMessage.error(error?.response?.data?.message || '重置失败')
  } finally {
    resetDialog.loading = false
  }
}

// 处理角色(权限)变更逻辑
const handleRoleChange = async (row, newRole) => {
  try {
    // 强制确认，防止误操作
    await ElMessageBox.confirm(`确定要将用户 ${row.username} 的权限修改为 ${newRole === 'admin' ? '管理员' : '业务员'} 吗？`, '权限变更确认', {
      type: 'warning'
    })
    await request.put(`/api/users/${row.id}/role`, { role: newRole })
    ElMessage.success('用户权限更新成功')
    fetchUsers() // 刷新列表以展示最新状态
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.message || '更新权限失败')
      fetchUsers() // 如果修改失败，则回滚表格展示的数据
    }
  }
}

onMounted(() => {
  fetchUsers()
  const saved = localStorage.getItem('user')
  if (saved) currentUser.value = JSON.parse(saved)
})
</script>

<style scoped>
.user-management { padding: 0; }
.card { border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); border: none; }
.header-box { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 10px; }
.title { margin: 0; font-size: 18px; font-weight: 800; color: #1e293b; border-left: 4px solid #6366f1; padding-left: 10px; line-height: 1; }
.subtitle { margin: 8px 0 0; font-size: 13px; color: #64748b; padding-left: 14px; }
.actions { display: flex; align-items: center; }

.dialog-content { padding: 10px 0; }
.dialog-tip { margin-bottom: 20px; color: #475569; line-height: 1.5; font-size: 14px;}
.dialog-tip strong { color: #6366f1; }
</style>
