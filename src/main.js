/**
 * @file main.js
 * @description 前端应用程序入口文件
 *
 * 功能说明：
 * - 创建 Vue 3 应用实例
 * - 注册全局插件（Element Plus、Pinia、Vue Router）
 * - 注册所有 Element Plus 图标为全局组件
 * - 配置中文语言包（解决分页等组件的英文文案问题）
 * - 初始化认证运行时处理器
 * - 预加载高频访问页面（提升用户体验）
 *
 * 启动流程：
 * ┌──────────────────────────────────────────────┐
 * │ 1. createApp(App)     创建 Vue 实例          │
 * │ 2. 注册图标组件       全局可用               │
 * │ 3. app.use(ElementPlus) UI 组件库            │
 * │ 4. app.use(pinia)     状态管理               │
 * │ 5. app.use(router)    路由系统               │
 * │ 6. 注册认证处理器      Token 自动刷新等        │
 * │ 7. app.mount('#app')  挂载到 DOM             │
 * │ 8. 预热页面           空闲时提前加载 chunk   │
 * └──────────────────────────────────────────────┘
 */

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './assets/styles/global.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { pinia } from './stores'
import { registerAuthRuntimeHandlers } from './utils/authSession'
import { warmupCriticalViews } from './router/preload'
import DialogComponents from '@/components/common'

/** Vue 应用实例 */
const app = createApp(App)

// ==================== 全局注册 Element Plus 图标 ====================

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// ==================== 插件注册 ====================

app.use(ElementPlus, { locale: zhCn })
app.use(pinia)
app.use(router)
app.use(DialogComponents)

registerAuthRuntimeHandlers()

app.mount('#app')

// ==================== 性能优化：预热高频页面 ====================

warmupCriticalViews()
