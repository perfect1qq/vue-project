<!--
  @file views/QuotationLayout.vue
  @description 报价单模块布局容器组件

  功能说明：
  - 作为报价单模块的顶级路由容器
  - 提供嵌套路由视图出口（router-view）
  - 包裹报价单相关的所有子页面

  路由结构：
  /quotation (parent route)
  ├── /quotation (default) → QuotationList.vue (新建/编辑)
  ├── /quotation/history → QuotationHistory.vue (历史记录)
  ├── /quotation/statistics → QuotationStatistics.vue (统计工具)
  └── /quotation/:id → approvalDetail.vue (审批详情)

  使用场景：
  - 保持报价单模块的布局一致性
  - 为未来可能的共享布局元素预留扩展点
  - 如需添加模块级的侧边栏或顶部栏，可在本组件中实现
-->
<template>
  <router-view />
</template>
