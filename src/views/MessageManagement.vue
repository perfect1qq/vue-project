<template>
  <div class="message-management">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="header-bar">
          <span class="page-title">官网留言管理</span>
          <el-tag :type="isAdmin ? 'success' : 'info'" effect="plain">
            {{ isAdmin ? '管理员 · 可查看全部线索并指派' : '业务员 · 仅显示已分配给您的线索' }}
          </el-tag>
        </div>
      </template>

      <!-- 留言列表 -->
      <el-table :data="messages" stripe border v-loading="loading" class="smart-table">
        <el-table-column label="提交时间" width="160" align="center">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>

        <el-table-column prop="contactInfo" label="联系方式" width="220" />
        <el-table-column prop="content" label="留言内容" min-width="300" show-overflow-tooltip />

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'assigned' ? 'success' : 'warning'" size="small">
              {{ row.status === 'assigned' ? '已指派' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="跟进人" width="100" align="center">
          <template #default="{ row }">
            {{ row.assignee?.username || '—' }}
          </template>
        </el-table-column>

        <!-- 管理员专属操作列 -->
        <el-table-column v-if="isAdmin" label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <el-popover placement="left" :width="220" trigger="click">
              <template #reference>
                <el-button link type="primary" size="small">指派</el-button>
              </template>
              <p style="margin-bottom: 10px; font-weight: 600">选择业务员：</p>
              <el-select v-model="assignTarget" placeholder="请选择" size="small" style="width: 100%">
                <el-option
                  v-for="u in staffList"
                  :key="u.id"
                  :label="u.username"
                  :value="u.id"
                />
              </el-select>
              <div style="text-align: right; margin-top: 10px">
                <el-button type="primary" size="small" @click="doAssign(row)">确认</el-button>
              </div>
            </el-popover>
            <el-button link type="danger" size="small" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <!-- 空状态 -->
        <template #empty>
          <el-empty description="暂无留言线索" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
/**
 * 官网留言管理页
 *
 * 管理员视角：查看全部留言，可指派给业务员、可删除
 * 业务员视角：仅查看已分配给自己的留言，无操作权限
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { messageApi } from '@/api/message'
import { userApi } from '@/api/user'

// ─── 状态 ─────────────────────────────────────────────────

const user     = JSON.parse(localStorage.getItem('user') || '{}')
const isAdmin  = computed(() => user.role === 'admin')
const messages = ref([])
const loading  = ref(false)
const staffList   = ref([])   // 可被指派的用户列表
const assignTarget = ref(null) // 当前弹窗中选中的用户 ID

// ─── 数据加载 ─────────────────────────────────────────────

/** 拉取留言列表 */
const loadMessages = async () => {
  loading.value = true
  try {
    const res = await messageApi.list()
    // messageApi.list() 返回原始 axios 响应，实际数据在 res.data 中
    messages.value = res.data?.list || []
  } catch {
    ElMessage.error('获取留言列表失败')
  } finally {
    loading.value = false
  }
}

/** 拉取业务员名单（仅管理员需要） */
const loadStaff = async () => {
  if (!isAdmin.value) return
  try {
    const res = await userApi.list()
    // userApi.list() 内部已提取 res.data，返回 { users: [...] }
    staffList.value = (res.users || []).filter((u) => u.role !== 'admin')
  } catch { /* 静默失败 */ }
}

// ─── 操作 ─────────────────────────────────────────────────

/** 指派留言给选中的业务员 */
const doAssign = async (row) => {
  if (!assignTarget.value) {
    return ElMessage.warning('请先选择一位业务员')
  }
  try {
    await messageApi.assign(row.id, assignTarget.value)
    ElMessage.success('指派成功')
    assignTarget.value = null
    loadMessages()
  } catch {
    ElMessage.error('指派失败，请稍后重试')
  }
}

/** 删除留言 */
const doDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除这条留言吗？', '提示', { type: 'warning' })
    await messageApi.remove(row.id)
    ElMessage.success('已删除')
    loadMessages()
  } catch { /* 用户取消 */ }
}

// ─── 工具函数 ─────────────────────────────────────────────

/** 格式化时间戳 */
const formatTime = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── 初始化 ─────────────────────────────────────────────

onMounted(() => {
  loadMessages()
  loadStaff()
})
</script>

<style scoped>
.message-management { padding: 0; }
.card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e293b;
}
</style>
