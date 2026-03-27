<template>
  <div class="common-table-container">
    <!-- 表格顶部操作栏：新增按钮 -->
    <div class="table-toolbar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
    </div>

    <!-- 表格主体 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#fafafa', fontWeight: 'bold' }"
    >
      <!-- 动态生成列 -->
      <el-table-column
        v-for="col in columns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :align="col.align || 'left'"
        :sortable="col.sortable || false"
        :formatter="col.formatter"
      />

      <!-- 操作列：固定右侧 -->
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <el-button
            link
            type="primary"
            size="small"
            :icon="View"
            @click="handleView(row)"
          >
            查看
          </el-button>
          <el-button
            link
            type="primary"
            size="small"
            :icon="Edit"
            @click="handleEdit(row)"
          >
            修改
          </el-button>
          <el-button
            link
            type="danger"
            size="small"
            :icon="Delete"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>

      <!-- 空数据插槽 -->
      <template #empty>
        <el-empty description="暂无数据" :image-size="80" />
      </template>
    </el-table>
  </div>
</template>

<script setup>
import { Plus, View, Edit, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  tableData: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['add', 'view', 'edit', 'delete'])

const handleAdd = () => {
  emit('add')
}

const handleView = (row) => {
  emit('view', row)
}

const handleEdit = (row) => {
  emit('edit', row)
}

const handleDelete = (row) => {
  emit('delete', row)
}
</script>

<style scoped>
.common-table-container {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.table-toolbar {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}
</style>