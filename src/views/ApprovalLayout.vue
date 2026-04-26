<!--
  @file views/ApprovalLayout.vue
  @description 审批管理模块布局容器组件

  功能说明：
  - 作为审批管理模块的顶级路由容器
  - 提供嵌套路由视图出口（router-view）
  - 包裹审批流程相关的所有子页面

  路由结构：
  /approval (parent route, requires auth + admin role)
  ├── /approval (default) → approval.vue (待审批列表)
  ├── /approval/history → ApprovalHistory.vue (历史记录)
  └── /approval/:id?mode=edit → approvalDetail.vue (审批详情/编辑)

  权限控制：
  - 整个 /approval 路由都需要登录
  - 仅 admin 角色可访问此模块
  - 其他角色访问会被重定向到首页

  业务范围：
  - 待审批报价单的列表展示和处理
  - 已完成审批的历史记录查询
  - 单个报价单的详细审批操作
-->
<template>
  <router-view />
</template>
