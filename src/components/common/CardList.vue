<!--
  @file components/common/CardList.vue
  @description 通用卡片列表组件（支持分页、选择、拖拽）

  功能说明：
  - 以卡片网格形式展示数据列表
  - 支持响应式列数（1/2/3/4 列）
  - 内置加载状态（骨架屏）、空状态处理
  - 支持单选/多选模式
  - 支持拖拽排序（需配合外部库实现）
  - 内置分页器或"加载更多"模式
  - 丰富的插槽支持自定义内容

  组件结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  CardList (容器)                                             │
  │  ┌────────────────────────────────────────────────────────┐  │
  │  │ Loading State (骨架屏) / Empty State (空状态提示)      │  │
  │  ├────────────────────────────────────────────────────────┤  │
  │  │ Cards Grid (CSS Grid 布局)                             │  │
  │  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │  │
  │  │ │ Card Item 1  │ │ Card Item 2  │ │ Card Item 3  │       │  │
  │  │ │ [checkbox]   │ │ [checkbox]   │ │ [checkbox]   │       │  │
  │  │ │ [actions]    │ │ [actions]    │ │ [actions]    │       │  │
  │  │ │ card content │ │ card content │ │ card content │       │  │
  │  │ └─────────────┘ └─────────────┘ └─────────────┘       │  │
  │  ├────────────────────────────────────────────────────────┤  │
  │  │ Load More Button / Pagination (分页或加载更多)        │  │
  │  └────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  使用示例：

  基础用法:
  <CardList :data="list" :loading="loading" :total="total" v-model:current-page="page" v-model:page-size="pageSize" :columns="2" @page-change="loadData">
    <template #card="{ item }">
      <div>{{ item.companyName }}</div>
    </template>
  </CardList>

  多选模式:
  <CardList :data="list" selectable multiple v-model:selected-items="selected">
    <template #card="{ item }">
      {{ item.name }}
    </template>
  </CardList>

  Props 说明：
  - data: 数据数组
  - loading: 加载状态
  - total: 总记录数（用于分页）
  - columns: 网格列数（1-4）
  - selectable: 是否可选择
  - multiple: 是否多选
  - draggable: 是否可拖拽
  - loadMore: 启用"加载更多"模式（替代分页）

  插槽说明：
  - #card: 卡片内容（作用域：item, index, selected）
  - #actions: 卡片操作按钮（右上角悬浮）
  - #loading: 自定义加载状态
  - #empty-image: 自定义空状态图片
  - #empty-action: 空状态操作按钮区域
  - #drag-handle: 拖拽手柄
  - #extra: 额外内容（搜索栏右侧）
-->

<template>
  <div class="card-list" v-bind="$attrs">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <slot name="loading">
        <el-skeleton :rows="skeletonRows" animated :count="skeletonCount" />
      </slot>
    </div>

    <!-- 空状态 -->
    <div v-else-if="data.length === 0" class="empty-wrapper">
      <el-empty :description="emptyDescription" :image-size="emptyImageSize">
        <template #image>
          <slot name="empty-image" />
        </template>
        <template #default>
          <slot name="empty-action" />
        </template>
      </el-empty>
    </div>

    <!-- 卡片列表 -->
    <div v-else class="cards-grid" :class="'grid-' + columns">
      <div v-for="(item, index) in data" :key="item[idField] !== undefined ? item[idField] : index" class="card-item"
        :class="{
          'is-selected': isSelected(item),
          'is-disabled': isDisabled(item),
          'is-draggable': draggable
        }" :data-card-item="draggable" @click="handleCardClick(item, $event)"
        @contextmenu.prevent="$emit('card-contextmenu', item, $event)">
        <!-- 选中状态指示器 -->
        <div v-if="selectable && (multiple || isSelected(item))" class="selection-indicator">
          <el-checkbox :model-value="isSelected(item)" @click.stop
            @change="(val) => handleSelectChange(item, val, $event)" />
        </div>

        <!-- 卡片内容插槽 -->
        <slot name="card" :item="item" :index="index" :selected="isSelected(item)">
          <!-- 默认卡片内容 -->
          <div class="default-card">
            <h4>{{ item[titleField] || item.title || '未命名' }}</h4>
            <p>{{ item[descriptionField] || item.description || '' }}</p>
          </div>
        </slot>

        <!-- 卡片操作按钮（右上角） -->
        <div v-if="$slots.actions" class="card-actions" @click.stop>
          <slot name="actions" :item="item" :index="index" />
        </div>

        <!-- 拖拽手柄 -->
        <div v-if="dragHandle && draggable" class="drag-handle" @mousedown.stop>
          <slot name="drag-handle">
            <span class="drag-icon">⋮⋮</span>
          </slot>
        </div>
      </div>
    </div>

    <!-- 加载更多按钮（替代分页） -->
    <div v-if="loadMore && hasMore && !loading" class="load-more-wrapper">
      <el-button type="primary" plain :loading="loadingMore" @click="$emit('load-more')">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </el-button>
    </div>

    <!-- 分页器 -->
    <div v-if="showPagination && total > 0 && !loading" class="pagination-wrapper">
      <PagePagination v-model:page="currentPage" v-model:pageSize="currentPageSize" :total="total"
        :page-sizes="pageSizes" @page-change="handlePageChange" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PagePagination from './PagePagination.vue'
import { DEFAULT_PAGINATION } from '@/constants/table'

const props = defineProps({
  /** 数据列表 */
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
  /** 列数（响应式网格） */
  columns: {
    type: Number,
    default: 2,
    validator: (val) => [1, 2, 3, 4].includes(val)
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
  },

  /** ====== 新增功能属性 ====== */

  /** 是否可选择 */
  selectable: {
    type: Boolean,
    default: false
  },
  /** 是否多选 */
  multiple: {
    type: Boolean,
    default: false
  },
  /** 已选中的项（v-model支持） */
  selectedItems: {
    type: Array,
    default: () => []
  },
  /** 数据唯一标识字段名 */
  idField: {
    type: String,
    default: 'id'
  },
  /** 标题字段名（用于默认卡片） */
  titleField: {
    type: String,
    default: 'title'
  },
  /** 描述字段名（用于默认卡片） */
  descriptionField: {
    type: String,
    default: 'description'
  },
  /** 是否可拖拽排序 */
  draggable: {
    type: Boolean,
    default: false
  },
  /** 是否显示拖拽手柄 */
  dragHandle: {
    type: Boolean,
    default: false
  },
  /** 是否禁用项判断函数 */
  disabledFn: {
    type: Function,
    default: null
  },
  /** 是否启用加载更多模式（替代分页） */
  loadMore: {
    type: Boolean,
    default: false
  },
  /** 是否还有更多数据 */
  hasMore: {
    type: Boolean,
    default: false
  },
  /** 加载更多按钮的loading状态 */
  loadingMore: {
    type: Boolean,
    default: false
  },
  /** 骨架屏行数 */
  skeletonRows: {
    type: Number,
    default: 3
  },
  /** 骨架屏数量 */
  skeletonCount: {
    type: Number,
    default: 3
  }
})

const emit = defineEmits([
  'update:currentPage',
  'update:pageSize',
  'update:selectedItems',
  'page-change',
  'card-click',
  'card-contextmenu',
  'card-select',
  'card-dblclick',
  'load-more',
  'drag-start',
  'drag-end'
])

const currentPage = computed({
  get: () => props.currentPage,
  set: (val) => emit('update:currentPage', val)
})

const currentPageSize = computed({
  get: () => props.pageSize,
  set: (val) => emit('update:pageSize', val)
})

/**
 * 判断项是否被选中
 * @param {Object} item - 数据项
 * @returns {boolean}
 */
const isSelected = (item) => {
  if (!props.selectable) return false
  const id = item[props.idField]
  return props.selectedItems.some(selected => selected[props.idField] === id)
}

/**
 * 判断项是否被禁用
 * @param {Object} item - 数据项
 * @returns {boolean}
 */
const isDisabled = (item) => {
  return props.disabledFn ? props.disabledFn(item) : false
}

/**
 * 处理卡片点击事件
 * @param {Object} item - 数据项
 * @param {Event} event - 点击事件
 */
const handleCardClick = (item, event) => {
  if (isDisabled(item)) return

  if (props.selectable) {
    handleSelectChange(item, !isSelected(item), event)
    return
  }

  emit('card-click', item, event)

  if (event.detail === 2) {
    emit('card-dblclick', item, event)
  }
}

/**
 * 处理选择变化
 * @param {Object} item - 数据项
 * @param {boolean} selected - 是否选中
 * @param {Event} event - 事件对象
 */
const handleSelectChange = (item, selected, event) => {
  if (props.multiple) {
    let newSelected = [...props.selectedItems]
    if (selected) {
      newSelected.push(item)
    } else {
      newSelected = newSelected.filter(i => i[props.idField] !== item[props.idField])
    }
    emit('update:selectedItems', newSelected)
    emit('card-select', item, selected, newSelected)
  } else {
    emit('update:selectedItems', selected ? [item] : [])
    emit('card-select', item, selected, selected ? [item] : [])
  }
}

/**
 * 处理分页变化
 * @param {number} page - 页码
 */
const handlePageChange = (page) => {
  emit('page-change', page)
}
</script>

<style scoped>
.card-list {
  width: 100%;
  position: relative;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.empty-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.cards-grid {
  display: grid;
  gap: 16px;
  transition: all 0.3s ease;
}

/* 响应式列数 */
.grid-1 {
  grid-template-columns: 1fr;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}

.card-item {
  position: relative;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  user-select: none;
}

.card-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.card-item.is-selected {
  border-color: #409eff;
  background-color: #ecf5ff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.card-item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.card-item.is-draggable {
  cursor: grab;
}

.card-item.is-draggable:active {
  cursor: grabbing;
}

/* 选中指示器 */
.selection-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

/* 卡片操作按钮 */
.card-actions {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-item:hover .card-actions {
  opacity: 1;
}

/* 拖拽手柄 */
.drag-handle {
  position: absolute;
  top: 50%;
  right: -8px;
  transform: translateY(-50%);
  cursor: move;
  padding: 4px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.drag-handle:hover {
  background: #e4e7ed;
}

.card-item:hover .drag-handle {
  opacity: 1;
}

.drag-icon {
  color: #909399;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}

/* 默认卡片样式 */
.default-card h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.default-card p {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

/* 加载更多按钮 */
.load-more-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 16px 0;
}

/* 分页器 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding: 0 4px;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  .grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {

  .grid-2,
  .grid-3,
  .grid-4 {
    grid-template-columns: 1fr;
  }

  .card-item {
    padding: 16px;
  }

  .selection-indicator {
    top: 8px;
    right: 8px;
  }

  .card-actions {
    opacity: 1;
  }
}
</style>
