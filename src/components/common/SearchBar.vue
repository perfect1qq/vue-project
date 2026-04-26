<!--
  @file components/common/SearchBar.vue
  @description 通用搜索栏组件

  功能说明：
  - 提供搜索输入框 + 搜索按钮的组合
  - 支持 v-model 双向绑定关键词
  - 支持回车键触发搜索
  - 支持清除按钮一键清空
  - 响应式布局（移动端自动垂直排列）
  - 可扩展的额外插槽（用于添加筛选器等）

  组件结构：
  ┌─────────────────────────────────────────────┐
  │  SearchBar                                   │
  │  ┌──────────────────────┐ ┌────────┐        │
  │  │ 🔍 [搜索输入框...]    │ │ 搜索   │        │
  │  └──────────────────────┘ └────────┘        │
  │  [extra 插槽内容（可选）]                    │
  └─────────────────────────────────────────────┘

  使用示例：

  基础用法: <SearchBar v-model="keyword" placeholder="搜索客户名称..." @search="handleSearch" />

  带额外操作:
  <SearchBar v-model="keyword" :loading="loading" @search="handleSearch">
    <template #extra>
      <el-select v-model="status" placeholder="状态"><el-option label="已合作" value="已合作" /><el-option label="未合作" value="未合作" /></el-select>
      <el-button @click="reset">重置</el-button>
    </template>
  </SearchBar>

  事件说明：
  - search: 点击搜索或按回车时触发，参数为当前关键词
  - clear: 清除输入框时触发
  - update:modelValue: 关键词变化时自动同步（v-model）
-->

<template>
  <div class="search-bar" :class="{ 'is-collapsed': collapsed }">
    <!-- 搜索输入框 -->
    <el-input
      v-model="keyword"
      :placeholder="placeholder"
      :clearable="clearable"
      :prefix-icon="SearchIcon"
      :size="size"
      :disabled="disabled"
      @keyup.enter="handleSearch"
      @clear="handleClear"
    />

    <!-- 搜索按钮 -->
    <el-button
      :type="buttonType"
      :size="size"
      :icon="SearchIcon"
      :loading="loading"
      :disabled="disabled"
      @click="handleSearch"
    >
      {{ searchText }}
    </el-button>

    <!-- 额外插槽（用于添加筛选按钮等） -->
    <slot name="extra" />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Search as SearchIcon } from '@element-plus/icons-vue'

const props = defineProps({
  /** 绑定的搜索关键词 */
  modelValue: {
    type: String,
    default: ''
  },
  /** 输入框占位文本 */
  placeholder: {
    type: String,
    default: '请输入搜索关键词...'
  },
  /** 是否可清除 */
  clearable: {
    type: Boolean,
    default: true
  },
  /** 输入框/按钮尺寸 */
  size: {
    type: String,
    default: 'default',
    validator: (val) => ['large', 'default', 'small'].includes(val)
  },
  /** 按钮类型 */
  buttonType: {
    type: String,
    default: 'primary'
  },
  /** 按钮文字 */
  buttonText: {
    type: String,
    default: ''
  },
  /** 是否加载中 */
  loading: {
    type: Boolean,
    default: false
  },
  /** 是否禁用 */
  disabled: {
    type: Boolean,
    default: false
  },
  /** 是否折叠模式（移动端适配） */
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'clear'])

/** 内部关键词状态 */
const keyword = ref(props.modelValue)

/** 同步外部值变化 */
watch(() => props.modelValue, (newVal) => {
  keyword.value = newVal
})

/** 搜索按钮文字（支持自定义） */
const searchText = computed(() => props.buttonText || '搜索')

/**
 * 处理搜索事件
 * 触发搜索并同步值到父组件
 */
const handleSearch = () => {
  emit('update:modelValue', keyword.value)
  emit('search', keyword.value)
}

/**
 * 处理清除事件
 * 清空输入框并触发清除回调
 */
const handleClear = () => {
  keyword.value = ''
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style scoped>
.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.search-bar .el-input {
  flex: 1;
  min-width: 200px;
  max-width: 500px;
}

.search-bar.is-collapsed {
  flex-direction: column;
  align-items: stretch;
}

.search-bar.is-collapsed .el-input {
  max-width: none;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar .el-input {
    max-width: none;
  }

  .search-bar .el-button {
    width: 100%;
  }
}
</style>
