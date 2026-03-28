<template>
  <div class="login-page">
    <div class="login-decor decor-1"></div>
    <div class="login-decor decor-2"></div>

    <div class="login-wrap">
      <div class="hero-panel">
        <div class="brand">
          <div class="brand-logo">R</div>
          <div>
            <div class="brand-title">仓储货架报价系统</div>
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
          <div class="card-sub">点击按钮可一键填充 demo 账号</div>
        </div>

        <div class="quick-row">
          <el-button plain round @click="fillDemo('admin', '123456')">admin</el-button>
          <el-button plain round @click="fillDemo('user', '123456')">user</el-button>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" size="large" clearable :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password :prefix-icon="Lock" />
          </el-form-item>
          <el-button class="login-btn" type="primary" size="large" :loading="loading" @click="handleLogin">登录系统</el-button>
          <div class="tips">默认演示：admin / 123456，user / 123456</div>
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
const loading = ref(false)
const formRef = ref()
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const fillDemo = (username, password) => {
  form.username = username
  form.password = password
}

const handleLogin = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      loading.value = true
      const res = await request.post('/api/login', { username: form.username, password: form.password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user || {}))
      ElMessage.success('登录成功')
      router.replace('/')
    } catch (err) {
      console.error(err)
      ElMessage.error(err?.response?.data?.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.login-page { min-height: 100vh; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top left, rgba(64,158,255,.24), transparent 30%), radial-gradient(circle at bottom right, rgba(103,194,58,.18), transparent 28%), linear-gradient(135deg, #0f172a 0%, #172331 55%, #0b1220 100%); }
.login-decor { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .4; }
.decor-1 { width: 280px; height: 280px; top: -90px; left: -90px; background: #409eff; }
.decor-2 { width: 240px; height: 240px; bottom: -70px; right: -70px; background: #67c23a; }
.login-wrap { position: relative; z-index: 2; width: min(1100px, 100%); display: grid; grid-template-columns: 1.15fr .85fr; gap: 30px; align-items: center; }
.hero-panel { color: #fff; padding: 24px 10px; }
.brand { display: flex; align-items: center; gap: 14px; margin-bottom: 26px; }
.brand-logo { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #409eff, #67c23a); box-shadow: 0 12px 28px rgba(64,158,255,.3); }
.brand-title { font-size: 22px; font-weight: 800; }
.brand-sub { margin-top: 4px; font-size: 12px; letter-spacing: .6px; color: rgba(255,255,255,.58); }
.hero-panel h1 { margin: 0; font-size: 48px; line-height: 1.1; letter-spacing: 1px; }
.hero-panel p { max-width: 620px; margin: 18px 0 0; color: rgba(255,255,255,.78); line-height: 1.9; font-size: 16px; }
.hero-badges { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 12px; }
.badge-item { display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 999px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); backdrop-filter: blur(10px); }
.login-card { border: 0; border-radius: 24px; padding: 32px 30px; background: rgba(255,255,255,.95); box-shadow: 0 20px 60px rgba(0,0,0,.24); }
.card-head { margin-bottom: 18px; }
.card-title { font-size: 28px; font-weight: 800; color: #1f2937; }
.card-sub { margin-top: 8px; color: #6b7280; font-size: 14px; }
.quick-row { display: flex; gap: 10px; margin-bottom: 18px; }
.form :deep(.el-input__wrapper) { border-radius: 14px; height: 46px; }
.form :deep(.el-input__prefix) { color: #94a3b8; }
.login-btn { width: 100%; height: 46px; border-radius: 14px; font-size: 16px; font-weight: 700; margin-top: 6px; box-shadow: 0 12px 24px rgba(64,158,255,.28); }
.tips { margin-top: 14px; padding: 12px 14px; font-size: 13px; color: #64748b; border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 12px; }
@media (max-width: 960px) { .login-wrap { grid-template-columns: 1fr; } .hero-panel h1 { font-size: 34px; } .login-card { padding: 24px 20px; } }
</style>
