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

/**
 * 前端入口。
 * 这里统一注入 Element Plus 中文语言包，解决分页组件里的英文文案问题。
 */
const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn })
app.use(pinia)
app.use(router)
registerAuthRuntimeHandlers()
app.mount('#app')

// 主界面挂载后，在浏览器空闲时预热高频页面 chunk。
warmupCriticalViews()
