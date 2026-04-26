<!--
  @file components/common/PageTable.vue
  @description 通用数据表格组件（带分页功能）

  功能说明：
  - 封装 el-table，提供统一的表格样式和行为
  - 内置分页器（PagePagination），支持双向绑定
  - 统一的空状态展示（可自定义空状态内容和操作按钮）
  - 支持加载状态显示（v-loading）
  - 支持透传所有 el-table 的属性和事件（v-bind="$attrs"）

  组件结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  PageTable                                                   │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  el-table (数据表格)                                   │  │
  │  │  ┌──────────┬──────────┬──────────┬──────────┬────────┐│  │
  │  │  │ 列1      │ 列2      │ 列3      │ 列4      │ 操作   ││  │
  │  │  ├──────────┼──────────┼──────────┼──────────┼────────┤│  │
  │  │  │ 数据1    │ 数据1    │ 数据1    │ 数据1    │ 编辑   ││  │
  │  │  │ 数据2    │ 数据2    │ data2    │ data2    │ 删除   ││  │
  │  │  │ ...      │ ...      │ ...      │ ...      │ ...    ││  │
  │  │  └──────────┴──────────┴──────────┴──────────┴────────┘│  │
  │  │                                                        │  │
  │  │  [空状态提示] (当 data 为空数组时显示)                   │  │
  │  └────────────────────────────────────────────────────────┘  │
  │                                                              │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │  PagePagination (分页器)                               │  │
  │  │  [◀ 上一页] [1] [2] [3] ... [10] [下一页 ▶]           │  │
  │  │  显示: 20条/页 ▾    共 200 条                          │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  Props 定义：
  ┌─────────────────────────────────────────────────────────────┐
  │  属性名            │ 类型      │ 默认值      │ 说明         │
  ├─────────────────────┼───────────┼─────────────┼──────────────┤
  │  data              │ Array     │ []          │ 表格数据源   │
  │  loading           │ Boolean   │ false       │ 加载状态     │
  │  total             │ Number    │ 0           │ 总记录数     │
  │  currentPage       │ Number    │ 1           │ 当前页码     │
  │  pageSize          │ Number    │ 20          │ 每页条数     │
  │  pageSizes         │ Array     │ [10,20,50]  │ 分页大小选项 │
  │  showPagination    │ Boolean   │ true        │ 是否显示分页 │
  │  emptyDescription  │ String    │ '暂无数据'  │ 空状态文案   │
  │  emptyImageSize    │ Number    │ 100         │ 空状态图标尺寸│
  └─────────────────────┴───────────┴─────────────┴──────────────┘

  Events 定义：
  - update:currentPage - 页码变化事件（支持 v-model:currentPage）
  - update:pageSize - 每页条数变化事件（支持 v-model:pageSize）
  - page-change - 页码切换回调

  插槽定义：
  ┌─────────────────────────────────────────────────────────────┐
  │  插槽名           │ 说明                                    │
  ├───────────────────┼─────────────────────────────────────────┤
  │  默认插槽         │ 自定义列（<el-table-column />）          │
  │  empty            │ 自定义空状态内容                         │
  │  empty-action     │ 空状态下的操作按钮                       │
  └───────────────────┴─────────────────────────────────────────┘

  使用示例：
  <PageTable
    :data="tableData"
    :total="100"
    v-model:current-page="page"
    v-model:page-size="size"
    @page-change="fetchData"
  >
    <el-table-column prop="name" label="姓名" />
    <el-table-column prop="age" label="年龄" />
  </PageTable>

  特性说明：
  - 双向绑定：currentPage 和 pageSize 支持 v-model 语法
  - 样式统一：使用 TABLE_HEADER_STYLE 常量保持全局一致
  - 条件渲染：当 total > 0 且 showPagination=true 时才显示分页器
  - 空状态：默认显示 Element Plus 的 Empty 组件，可通过插槽自定义
-->

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
