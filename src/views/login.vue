<template>
  <!-- 登录页面外层容器结构 -->
  <div class="login-page">
    <!-- 动态背景装饰圆球 -->
    <div class="login-decor decor-1"></div>
    <div class="login-decor decor-2"></div>
    <!-- 登录内容主卡片区 -->
    <div class="login-wrap">
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
          <div class="badge-item"><el-icon><DataLine /></el-icon><span>自动统计</span></div>
          <div class="badge-item"><el-icon><Grid /></el-icon><span>审批可追踪</span></div>
          <div class="badge-item"><el-icon><Lock /></el-icon><span>退出即回登录</span></div>
        </div>
      </div>

      <el-card class="login-card" shadow="never">
        <div class="card-head">
          <div class="card-title">账号登录</div>
          <div class="card-sub">点击下方按钮可一键填充测试账号</div>
        </div>

        <!-- 快捷登录测试按钮组 -->
        <div class="quick-row">
          <el-button plain round @click="fillDemo('admin', '123456')">超级管理员</el-button>
          <el-button plain round @click="fillDemo('user', '123456')">普通业务员</el-button>
        </div>

        <!-- 登录表单结构 -->
        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" size="large" clearable :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" size="large" show-password :prefix-icon="Lock" />
          </el-form-item>
          <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="handleLogin">登录系统</el-button>
          <div class="footer-links">
            <span>还没账号？</span>
            <el-link type="primary" underline="never" @click="goToRegister">立即注册</el-link>
          </div>
          <!-- <div class="tips">默认演示：admin / 123456 (管理), user / 123456 (普通)</div> -->
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
import { DataLine, Grid, Lock, User } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false) // 登录请求防抖与加载状态判定
const formRef = ref()

// 登录表单数据源定义
const form = reactive({ username: 'admin', password: '123456' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

/** 快捷填入测试数据 */
const fillDemo = (username, password) => {
  form.username = username
  form.password = password
}

/** 执行登录鉴权核心逻辑 */
const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      loading.value = true
      const res = await request.post('/api/login', { username: form.username, password: form.password })
      
      // 保存 token 与用户信息以供后续拦截器使用
      localStorage.setItem('token', res.data?.token ?? '')
      localStorage.setItem('user', JSON.stringify(res.data?.user ?? {}))
      
      ElMessage.success('登录成功')
      router.replace('/')
    } catch (err) {
      console.error('登录异常:', err)
      ElMessage.error(err?.response?.data?.message || '登录异常失败，请检查网络')
    } finally {
      loading.value = false
    }
  })
}

/** 跳转至新用户注册页 */
const goToRegister = () => router.push('/register')
</script>

<style scoped>
/* 替换原蓝绿基调为深邃高级的靛蓝暗调背景 */
.login-page { min-height: 100vh; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top left, rgba(99,102,241,.24), transparent 40%), radial-gradient(circle at bottom right, rgba(165,180,252,.18), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #020617 100%); }
.login-decor { position: absolute; border-radius: 50%; filter: blur(80px); opacity: .5; }
.decor-1 { width: 300px; height: 300px; top: -100px; left: -100px; background: #6366f1; }
.decor-2 { width: 280px; height: 280px; bottom: -80px; right: -80px; background: #818cf8; }
.login-wrap { position: relative; z-index: 2; width: min(1100px, 100%); display: grid; grid-template-columns: 1.15fr .85fr; gap: 30px; align-items: center; }
.hero-panel { color: #fff; padding: 24px 10px; }
.brand { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
.brand-logo { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1, #818cf8); box-shadow: 0 8px 20px rgba(99,102,241,.4); }
.brand-title { font-size: 22px; font-weight: 800; font-family: 'Inter', sans-serif;}
.brand-sub { margin-top: 4px; font-size: 12px; letter-spacing: .6px; color: rgba(255,255,255,.6); text-transform: uppercase; }
.hero-panel h1 { margin: 0; font-size: 48px; line-height: 1.15; letter-spacing: 1px; font-family: 'Inter', sans-serif;}
.hero-panel p { max-width: 620px; margin: 18px 0 0; color: rgba(255,255,255,.8); line-height: 1.8; font-size: 16px; }
.hero-badges { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; }
.badge-item { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 999px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); backdrop-filter: blur(12px); font-size: 14px; transition: background 0.3s; }
.badge-item:hover { background: rgba(255,255,255,.2); }
.login-card { border: 0; border-radius: 20px; padding: 36px 32px; background: rgba(255,255,255,.98); box-shadow: 0 24px 50px rgba(0,0,0,.25); }
.card-head { margin-bottom: 24px; }
.card-title { font-size: 26px; font-weight: 800; color: #1e293b; }
.card-sub { margin-top: 8px; color: #64748b; font-size: 14px; }
.quick-row { display: flex; gap: 12px; margin-bottom: 22px; }
.quick-row :deep(.el-button) { background: #f1f5f9; border-color: #e2e8f0; color: #475569; }
.quick-row :deep(.el-button:hover) { background: #6366f1; border-color: #6366f1; color: #fff; }
.form :deep(.el-input__wrapper) { border-radius: 12px; height: 46px; background: #f8fafc; box-shadow: 0 0 0 1px #e2e8f0 inset; }
.form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #6366f1 inset; background: #fff; }
.form :deep(.el-input__prefix) { color: #94a3b8; font-size: 18px; }
.login-btn { width: 100%; height: 48px; border-radius: 12px; font-size: 16px; font-weight: 600; margin-top: 10px; background: linear-gradient(135deg, #6366f1, #4f46e5); border: none; box-shadow: 0 8px 16px rgba(99,102,241,.25); transition: all 0.3s; }
.login-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 20px rgba(99,102,241,.35); }
.footer-links { margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 4px; color: #64748b; font-size: 14px; line-height: 1; }
.footer-links :deep(.el-link) { font-weight: 600; color: #6366f1; display: inline-flex; align-items: center; }
.tips { margin-top: 18px; padding: 12px 14px; font-size: 13px; color: #475569; border: 1px solid #e2e8f0; background: #f1f5f9; border-radius: 10px; text-align: center; }
@media (max-width: 960px) { .login-wrap { grid-template-columns: 1fr; } .hero-panel h1 { font-size: 34px; } .login-card { padding: 28px 24px; } }
</style>
