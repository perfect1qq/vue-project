<!--
  @file views/BeamQuotationLayout.vue
  @description 横梁载重单模块布局容器组件

  功能说明：
  - 作为横梁载重单模块的顶级路由容器
  - 提供嵌套路由视图出口（router-view）
  - 包裹横梁载重相关的所有子页面

  路由结构：
  /beam-quotation (parent route)
  ├── /beam-quotation (default) → BeamQuotationList.vue (新建/编辑)
  └── /beam-quotation/history → BeamQuotationHistory.vue (历史记录)

  与 QuotationLayout 的关系：
  - 结构相似，都是简单的 router-view 容器
  - 独立于报价单模块，有自己的业务逻辑
  - 未来可根据需求扩展为带侧边栏的复杂布局
-->
<template>
  <router-view />
</template>
