import { ref } from 'vue'

/**
 * 列表查询状态组合式函数：
 * 抽离 page/pageSize/keyword 的通用状态与行为，减少页面重复逻辑。
 */
export const useListQueryState = (defaults = {}) => {
  const page = ref(Number(defaults.page || 1))
  const pageSize = ref(Number(defaults.pageSize || 10))
  const keyword = ref(String(defaults.keyword || ''))

  const resetToFirstPage = () => {
    page.value = 1
  }

  return {
    page,
    pageSize,
    keyword,
    resetToFirstPage
  }
}
