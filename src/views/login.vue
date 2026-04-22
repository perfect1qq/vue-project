/**
* @module views/login
* @description 用户登录页面
*
* 系统入口页面，提供用户名/密码登录功能：
* - 表单验证（必填校验）
* - 登录成功后保存 Token 和用户信息到 localStorage
* - 登录失败显示错误提示
* - 支持回车键快捷登录
* - 响应式布局（适配桌面端和移动端）
*/

<template>
  <!-- 登录页面外层容器结构 -->
  <div class="login-page">
    <!-- 动态背景装饰圆球 -->
    <div class="login-decor decor-1"></div>
    <div class="login-decor decor-2"></div>

    <!-- 登录内容主卡片区 -->
    <div class="login-wrap">
      <!-- 左侧品牌展示面板 -->
      <div class="hero-panel">
        <div class="brand">
          <div class="brand-logo">R</div>
          <div>
            <div class="brand-title">武汉倍力特货架报价系统</div>
            <div class="brand-sub">Quotation & Approval Platform</div>
          </div>
        </div>

        <h1>欢迎使用</h1>
        <p>
          支持报价单、审批流、撤回与权限控制，帮助业务员和超级管理员在同一套系统里高效协作。
        </p>

        <div class="hero-badges">
          <div class="badge-item"><el-icon>
              <DataLine />
            </el-icon><span>自动统计</span></div>
          <div class="badge-item"><el-icon>
              <Grid />
            </el-icon><span>审批可追踪</span></div>
          <div class="badge-item"><el-icon>
              <Lock />
            </el-icon><span>退出即回登录</span></div>
        </div>
      </div>

      <!-- 右侧登录表单卡片 -->
      <el-card class="login-card" shadow="never">
        <div class="card-head">
          <div class="card-title">账号登录</div>
          <div class="card-sub">请输入正式账号登录系统</div>
        </div>

        <!-- 登录表单：用户名 + 密码 -->
        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" size="large" clearable :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" show-password
              :prefix-icon="Lock" />
          </el-form-item>

          <!-- 登录按钮 -->
          <el-button class="login-btn" type="primary" size="large" :loading="loading"
            @click="handleLogin">登录系统</el-button>

          <!-- 注册跳转链接 -->
          <div class="footer-links">
            <span>还没账号？</span>
            <el-link type="primary" underline="never" @click="goToRegister">立即注册</el-link>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { to } from '@/utils/async'
import { DataLine, Grid, Lock, User } from '@element-plus/icons-vue'

const router = useRouter()

/** 登录请求加载状态 */
const loading = ref(false)

/** 表单引用（用于触发验证） */
const formRef = ref()

/** 登录表单数据 */
const form = reactive({ username: '', password: '' })

/** 表单验证规则 */
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

/**
 * 执行登录鉴权核心逻辑
 * 
 * 流程：
 * 1. 表单验证
 * 2. 调用 /api/login 接口
 * 3. 保存 token 和 user 到 localStorage
 * 4. 跳转到首页
 */
const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    const [err, res] = await to(request.post('/api/login', {
      username: form.username,
      password: form.password
    }))

    if (err) {
      ElMessage.error(err?.response?.data?.message || '登录异常失败，请检查网络')
      loading.value = false
      return
    }

    // 保存认证信息到本地存储
    localStorage.setItem('token', res.data?.token ?? '')
    localStorage.setItem('user', JSON.stringify(res.data?.user ?? {}))

    router.replace('/')
    loading.value = false
  })
}

/** 跳转至新用户注册页 */
const goToRegister = () => router.push('/register')
</script>

<style scoped>
/* 替换原蓝绿基调为深邃高级的靛蓝暗调背景 */
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(circle at top left, rgba(99, 102, 241, .24), transparent 40%), radial-gradient(circle at bottom right, rgba(165, 180, 252, .18), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #020617 100%);
}

.login-decor {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: .5;
}

.decor-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -100px;
  background: #6366f1;
}

.decor-2 {
  width: 280px;
  height: 280px;
  bottom: -80px;
  right: -80px;
  background: #818cf8;
}

.login-wrap {
  position: relative;
  z-index: 2;
  width: min(1100px, 100%);
  display: grid;
  grid-template-columns: 1.15fr .85fr;
  gap: 30px;
  align-items: center;
}

.hero-panel {
  color: #fff;
  padding: 24px 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  box-shadow: 0 8px 20px rgba(99, 102, 241, .4);
}

.brand-title {
  font-size: 22px;
  font-weight: 800;
  font-family: 'Inter', sans-serif;
}

.brand-sub {
  margin-top: 4px;
  font-size: 12px;
  letter-spacing: .6px;
  color: rgba(255, 255, 255, .6);
  text-transform: uppercase;
}

.hero-panel h1 {
  margin: 0;
  font-size: 48px;
  line-height: 1.15;
  letter-spacing: 1px;
  font-family: 'Inter', sans-serif;
}

.hero-panel p {
  max-width: 620px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, .8);
  line-height: 1.8;
  font-size: 16px;
}

.hero-badges {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .15);
  backdrop-filter: blur(12px);
  font-size: 14px;
  transition: background 0.3s;
}

.badge-item:hover {
  background: rgba(255, 255, 255, .2);
}

.login-card {
  border: 0;
  border-radius: 20px;
  padding: 36px 32px;
  background: rgba(255, 255, 255, .98);
  box-shadow: 0 24px 50px rgba(0, 0, 0, .25);
}

.card-head {
  margin-bottom: 24px;
}

.card-title {
  font-size: 26px;
  font-weight: 800;
  color: #1e293b;
}

.card-sub {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
}

.form :deep(.el-input__wrapper) {
  border-radius: 12px;
  height: 46px;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

.form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #6366f1 inset;
  background: #fff;
}

.form :deep(.el-input__prefix) {
  color: #94a3b8;
  font-size: 18px;
}

.login-btn {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 10px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  box-shadow: 0 8px 16px rgba(99, 102, 241, .25);
  transition: all 0.3s;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(99, 102, 241, .35);
}

.footer-links {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #64748b;
  font-size: 14px;
  line-height: 1;
}

.footer-links :deep(.el-link) {
  font-weight: 600;
  color: #6366f1;
  display: inline-flex;
  align-items: center;
}

@media (max-width: 960px) {
  .login-wrap {
    grid-template-columns: 1fr;
    gap: 18px;
    max-width: 560px;
  }

  .hero-panel {
    padding: 6px 0;
  }

  .hero-panel h1 {
    font-size: 34px;
  }

  .login-card {
    padding: 28px 24px;
  }
}

@media (max-width: 768px) {
  .login-page {
    padding: 14px;
    align-items: stretch;
  }

  .login-wrap {
    width: 100%;
    max-width: 420px;
    margin: auto;
    gap: 12px;
  }

  .hero-panel {
    display: none;
  }

  .login-card {
    border-radius: 16px;
    padding: 20px 16px;
    box-shadow: 0 14px 28px rgba(0, 0, 0, .2);
  }

  .card-head {
    margin-bottom: 16px;
  }

  .card-title {
    font-size: 22px;
  }

  .card-sub {
    margin-top: 4px;
    font-size: 13px;
  }

  .form :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  .form :deep(.el-input__wrapper) {
    height: 44px;
  }

  .login-btn {
    height: 44px;
    margin-top: 6px;
    font-size: 15px;
  }
}

@media (max-width: 420px) {
  .login-page {
    padding: 10px;
  }

  .decor-1 {
    width: 220px;
    height: 220px;
    top: -90px;
    left: -120px;
  }

  .decor-2 {
    width: 220px;
    height: 220px;
    bottom: -100px;
    right: -120px;
  }

  .login-card {
    padding: 18px 14px;
  }

  .card-title {
    font-size: 20px;
  }

  .footer-links {
    font-size: 13px;
  }
}
</style>
