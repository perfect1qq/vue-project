/**
 * 关键页面分级预热：
 * - P0: 首屏后短延时预热（高频页面）
 * - P1: 浏览器空闲时再预热（次高频页面）
 */
const p0Preloaders = [
  () => import('@/views/HomeView.vue'),
  () => import('@/views/QuotationList.vue')
]

const p1Preloaders = [
  () => import('@/views/MemoManagement.vue'),
  () => import('@/views/MessageManagement.vue'),
  () => import('@/views/QuotationStatistics.vue'),
  () => import('@/views/MediumShelfWeightTable.vue')
]

const safeBatchLoad = (loaders) => {
  loaders.forEach((load) => {
    load().catch(() => {
      // 预热失败不影响主流程
    })
  })
}

export const warmupCriticalViews = () => {
  setTimeout(() => safeBatchLoad(p0Preloaders), 200)

  const loadP1 = () => safeBatchLoad(p1Preloaders)
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(loadP1, { timeout: 1800 })
    return
  }
  setTimeout(loadP1, 1200)
}
