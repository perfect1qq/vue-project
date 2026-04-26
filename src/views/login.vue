<!--
  @file views/login.vue
  @description 用户登录页面

  功能说明：
  - 系统入口页面，提供用户名/密码登录功能
  - 表单验证（必填校验、失焦触发）
  - 登录成功后跳转到首页
  - 登录失败显示错误提示
  - 支持回车键快捷登录
  - 响应式布局（适配桌面端和移动端）

  页面结构：
  ┌──────────────────────────────────────────────────────┐
  │  AuthLayout（认证布局容器）                            │
  │  ┌──────────┬────────────────────────────────┐       │
  │  │ Hero 区域  │ 登录表单卡片                   │       │
  │  │ (左侧)    │ (右侧)                         │       │
  │  ├──────────┤                                │       │
  │  │ 欢迎使用   │ 用户名输入框                  │       │
  │  │ 功能介绍   │ 密码输入框                    │       │
  │  │ 特性徽章   │ [登录系统] 按钮               │       │
  │  │           │ [还没账号？立即注册] 链接      │       │
  │  └──────────┴────────────────────────────────┘       │
  └──────────────────────────────────────────────────────┘

  组件依赖：
  - AuthLayout: 认证页面通用布局（左右分栏）
  - Element Plus: UI 组件库（表单、输入框、按钮）
-->

<template>
  <AuthLayout card-title="账号登录" card-subtitle="请输入正式账号登录系统">
    <!-- ==================== 左侧 Hero 区域 ==================== -->
    <template #hero-content>
      <h1>欢迎使用</h1>
      <p>
        支持报价单、审批流、撤回与权限控制，帮助业务员和超级管理员在同一套系统里高效协作。
      </p>

      <!-- 功能特性徽章列表 -->
      <div class="hero-badges">
        <div class="badge-item">
          <el-icon><DataLine /></el-icon>
          <span>自动统计</span>
        </div>
        <div class="badge-item">
          <el-icon><Grid /></el-icon>
          <span>审批可追踪</span>
        </div>
        <div class="badge-item">
          <el-icon><Lock /></el-icon>
          <span>退出即回登录</span>
        </div>
      </div>
    </template>

    <!-- ==================== 右侧登录表单区域 ==================== -->

    <!--
      el-form: 表单容器
      - ref: 用于程序化触发表单验证
      - model: 绑定表单数据对象
      - rules: 定义验证规则
      - @keyup.enter: 监听回车键触发登录
    -->
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      class="form"
      @keyup.enter="handleLogin"
    >
      <!--
        el-form-item: 表单项容器
        - prop: 关联验证规则字段名
        - required: 显示红色星号标记
      -->
      <el-form-item prop="username">
        <el-input
          v-model="form.username"
          placeholder="请输入用户名"
          size="large"
          clearable
          :prefix-icon="User"
        />
      </el-form-item>

      <el-form-item prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          size="large"
          show-password
          :prefix-icon="Lock"
        />
      </el-form-item>

      <!-- 登录按钮：loading 状态防止重复提交 -->
      <el-button
        class="login-btn"
        type="primary"
        size="large"
        :loading="loading"
        @click="handleLogin"
      >
        登录系统
      </el-button>

      <!-- 注册入口链接：仅当公开注册启用时显示 -->
      <div v-if="isPublicRegisterEnabled" class="footer-links">
        <span>还没账号？</span>
        <el-link type="primary" underline="never" @click="goToRegister">
          立即注册
        </el-link>
      </div>
    </el-form>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { to } from '@/utils/async'
import { showError } from '@/utils/message'
import { DataLine, Grid, Lock, User } from '@element-plus/icons-vue'
import { isPublicRegisterEnabled } from '@/utils/runtimeConfig'
import AuthLayout from '@/components/common/AuthLayout.vue'

const router = useRouter()
const userStore = useUserStore()

/** 登录请求加载状态（控制按钮 loading 动画） */
const loading = ref(false)

/** 表单引用（用于手动调用 validate 方法触发验证） */
const formRef = ref()

/**
 * 登录表单数据（响应式对象）
 * - username: 用户名
 * - password: 密码
 */
const form = reactive({
  username: '',
  password: '',
})

/**
 * 表单验证规则配置
 *
 * 使用 Element Plus 的异步验证机制：
 * - required: true → 必填项
 * - message: 验证失败时的提示文案
 * - trigger: 触发时机（blur = 失焦时验证）
 */
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/**
 * 执行登录鉴权核心逻辑
 *
 * 处理流程：
 * 1. 触发表单验证（validate）
 * 2. 验证通过后设置 loading 状态
 * 3. 调用 userStore.login 发送凭据到后端
 * 4. 成功 → 跳转到首页（replace 模式，不可后退）
 * 5. 失败 → 显示错误提示，重置 loading
 */
const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    const [err] = await to(
      userStore.login({
        username: form.username,
        password: form.password,
      }),
    )

    if (err) {
      showError(err, '登录异常失败，请检查网络')
      loading.value = false
      return
    }

    router.replace('/')
    loading.value = false
  })
}

/** 跳转至新用户注册页 */
const goToRegister = () => router.push('/register')
</script>
