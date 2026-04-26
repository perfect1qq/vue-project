<!--
  @file App.vue
  @description 应用程序根组件

  功能说明：
  - 作为 Vue 应用的最顶层组件
  - 仅包含一个 <router-view /> 占位符
  - 所有页面内容都通过路由系统动态渲染到这里
  - 本身不包含任何业务逻辑或样式（纯容器）

  组件层级：
  ┌─────────────────────────────────────┐
  │  App.vue (根组件)                    │
  │  └── <router-view />                │
  │      ├── /login → login.vue         │
  │      ├── /register → register.vue   │
  │      └── /layout → layout/index.vue │
  │          ├── Navbar.vue             │
  │          ├── Sidebar.vue            │
  │          └── <router-view />        │
  │              ├── QuotationList.vue  │
  │              ├── UserManagement.vue │
  │              └── ...                │
  └─────────────────────────────────────┘
-->
<template>
  <router-view />
</template>
