/**
* @module views/register
* @description 新用户注册页面
*
* 提供新账号创建功能：
* - 用户名验证（字母+数字，必须包含字母）
* - 真实姓名填写
* - 密码设置与确认
* - 注册成功后跳转登录页
* - 默认角色为 guest（游客/只读权限）
* - 响应式布局（与登录页统一样式）
*/

<template>
  <!-- 注册页面外层容器结构 -->
  <div class="login-page">
    <!-- 动态背景装饰圆球 -->
    <div class="login-decor decor-1"></div>
    <div class="login-decor decor-2"></div>
    <!-- 注册主卡片区 -->
    <div class="login-wrap">
      <div class="hero-panel">
        <div class="brand">
          <div class="brand-logo">R</div>
          <div>
            <div class="brand-title">武汉倍力特货架报价系统</div>
            <div class="brand-sub">Quotation & Approval Platform</div>
          </div>
        </div>

        <h1>加入我们</h1>
        <p>
          创建一个新账号，开启您的智能报价与高效审批之旅。系统将自动根据您的设置分配初始权限。
        </p>

        <div class="hero-badges">
          <div class="badge-item"><el-icon>
              <DataLine />
            </el-icon><span>即刻开启</span></div>
          <div class="badge-item"><el-icon>
              <Grid />
            </el-icon><span>专业协作</span></div>
          <div class="badge-item"><el-icon>
              <Lock />
            </el-icon><span>安全可靠</span></div>
        </div>
      </div>

      <el-card class="login-card" shadow="never">
        <div class="card-head">
          <div class="card-title">新用户注册</div>
          <div class="card-sub">请填写以下信息完成账号创建</div>
        </div>

        <!-- 注册表单结构 -->
        <el-form ref="formRef" :model="form" :rules="rules" class="form" @keyup.enter="handleRegister">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入至少3位用户名" size="large" clearable :prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="name">
            <el-input v-model="form.name" placeholder="请输入真实姓名" size="large" clearable :prefix-icon="UserFilled" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请设置登录密码" size="large" show-password
              :prefix-icon="Lock" />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="请再次确认密码" size="large" show-password
              :prefix-icon="Lock" />
          </el-form-item>

          <el-button class="login-btn" type="primary" size="large" :loading="loading"
            @click="handleRegister">立即注册</el-button>

          <div class="footer-links">
            <span>已有账号？</span>
            <el-link type="primary" underline="never" @click="goToLogin">去登录</el-link>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { to } from '@/utils/async'
import { showError, showSuccess } from '@/utils/message'
import { DataLine, Grid, Lock, User, UserFilled } from '@element-plus/icons-vue'
import { isPublicRegisterEnabled } from '@/utils/runtimeConfig'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false) // 注册请求防抖与加载状态判定
const formRef = ref()

if (!isPublicRegisterEnabled) {
  router.replace('/login')
}

// 注册表单数据源定义
const form = reactive({
  username: '',
  name: '',
  password: '',
  confirmPassword: ''
})

/** 确认密码验证逻辑 */
const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码以确认'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的新密码不一致!'))
  } else {
    callback()
  }
}

/** 注册表单校验规则集 */
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名长度至少为 3 个字符', trigger: 'blur' },
    { pattern: /^(?=.*[a-zA-Z])[a-zA-Z0-9]+$/, message: '用户名只能包含字母或数字，且必须包含至少一个字母', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, message: '姓名长度至少为 2 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请设置登录密码', trigger: 'blur' },
    { min: 6, message: '密码安全长度至少为 6 个字符', trigger: 'blur' }
  ],
  confirmPassword: [{ validator: validatePass2, trigger: 'blur', required: true }]
}

/** 执行注册提交核心逻辑 */
const handleRegister = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    const [err] = await to(userStore.register({
      username: form.username,
      name: form.name,
      password: form.password
    }))
    if (err) {
      showError(err, '服务器繁忙，注册失败请重试')
      loading.value = false
      return
    }
    showSuccess('账号创建成功，请使用新账号登入系统')
    router.push('/login')
    loading.value = false
  })
}

/** 路由返回至登录页 */
const goToLogin = () => router.push('/login')
</script>

<style scoped>
/* 替换原蓝绿基调为深邃高级的靛蓝暗调背景（与登录页统一样式） */
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
  margin-top: 20px;
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
