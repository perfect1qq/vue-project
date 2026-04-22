<template>
  <div class="page-table">
    <!-- 表格 -->
    <el-table
      :data="data"
      v-loading="loading"
      v-bind="$attrs"
      :header-cell-style="TABLE_HEADER_STYLE"
      stripe
      border
    >
      <!-- 列插槽 -->
      <slot />

      <!-- 空状态提示（默认） -->
      <template #empty>
        <slot name="empty">
          <el-empty :description="emptyDescription" :image-size="emptyImageSize">
            <slot name="empty-action" />
          </el-empty>
        </slot>
      </template>
    </el-table>

    <!-- 分页（可选） -->
    <div v-if="showPagination && total > 0" class="pagination-wrapper">
      <PagePagination
        v-model:page="currentPage"
        v-model:pageSize="currentPageSize"
        :total="total"
        :page-sizes="pageSizes"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PagePagination from './PagePagination.vue'
import { TABLE_HEADER_STYLE, DEFAULT_PAGINATION } from '@/constants/table'

const props = defineProps({
  /** 表格数据 */
  data: {
    type: Array,
    default: () => []
  },
  /** 是否加载中 */
  loading: {
    type: Boolean,
    default: false
  },
  /** 总记录数 */
  total: {
    type: Number,
    default: 0
  },
  /** 当前页码 */
  currentPage: {
    type: Number,
    default: 1
  },
  /** 每页条数 */
  pageSize: {
    type: Number,
    default: 20
  },
  /** 分页大小选项 */
  pageSizes: {
    type: Array,
    default: () => DEFAULT_PAGINATION.pageSizes
  },
  /** 是否显示分页 */
  showPagination: {
    type: Boolean,
    default: true
  },
  /** 空状态描述文字 */
  emptyDescription: {
    type: String,
    default: '暂无数据'
  },
  /** 空状态图片大小 */
  emptyImageSize: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits(['update:currentPage', 'update:pageSize', 'page-change'])

/** 当前页码（双向绑定） */
const currentPage = computed({
  get: () => props.currentPage,
  set: (val) => emit('update:currentPage', val)
})

/** 每页条数（双向绑定） */
const currentPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val)
})

/**
 * 处理分页变化
 * @param {number} page - 目标页码
 */
const handlePageChange = (page) => {
  emit('page-change', page)
}
</script>

<style scoped>
.page-table {
  width: 100%;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding: 0 4px;
}
</style>
