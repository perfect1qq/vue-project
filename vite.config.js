import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({

  plugins: [vue()],
  // 💡 添加下面这一行！
  // 格式是 '/仓库名字/'，记得前  后都有斜杠
  // 如果你刚才在 GitHub 建的仓库叫 my-vue-app，这里就写 '/my-vue-app/'
  base: '/vue-project/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})

