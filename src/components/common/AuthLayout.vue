<!--
  @file components/common/AuthLayout.vue
  @description 认证页面布局组件（登录/注册页面的通用容器）

  功能说明：
  - 提供登录和注册页面的统一视觉框架
  - 左右分栏布局：左侧品牌展示 + 右侧表单卡片
  - 深色渐变背景 + 动态装饰圆球（现代感设计）
  - 完全响应式适配（Desktop / Tablet / Mobile）
  - 通过插槽实现内容复用

  组件结构：
  ┌──────────────────────────────────────────────────────────────┐
  │  AuthLayout (认证页面)                                       │
  │                                                              │
  │  ┌─── 背景装饰层 (decor-1, decor-2) ─────────────────────┐   │
  │  │                                                          │   │
  │  │  ┌──────────────────────────────────────────────────┐  │   │
  │  │  │  login-wrap (主容器)                             │  │   │
  │  │  │                                                  │  │   │
  │  │  │  ┌──────────────┬─────────────────────────────┐  │  │   │
  │  │  │  │ Hero Panel    │ Login Card (el-card)       │  │  │   │
  │  │  │  │ (品牌展示)    │                           │  │  │   │
  │  │  │  │              │ ┌─────────────────────────┐│  │  │   │
  │  │  │  │ [R] Logo     │ │ card-title             ││  │  │   │
  │  │  │  │ 武汉倍力特... │ │ card-subtitle          ││  │  │   │
  │  │  │  │              │ ├─────────────────────────┤│  │  │   │
  │  │  │  │ <slot        │ │                         ││  │  │   │
  │  │  │  │  name=       │ │ <slot>                  ││  │  │   │
  │  │  │  │  hero-       │ │ (登录/注册表单)         ││  │  │   │
  │  │  │  │  content>    │ │                         ││  │  │   │
  │  │  │  │              │ └─────────────────────────┘│  │  │   │
  │  │  │  └──────────────┴─────────────────────────────┘  │  │   │
  │  │  └──────────────────────────────────────────────────┘  │   │
  │  └──────────────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────────┘

  插槽定义：
  ┌─────────────────────────────────────────────────────────────┐
  │  插槽名称          │  说明                                  │
  ├─────────────────────┼───────────────────────────────────────┤
  │  默认插槽           │  右侧表单区域（登录表单/注册表单）      │
  │  hero-content       │  左侧品牌面板的额外内容（可选）         │
  └─────────────────────┴───────────────────────────────────────┘

  Props 定义：
  - cardTitle: string (必填) - 卡片标题（如"欢迎登录"、"创建账户"）
  - cardSubtitle: string (必填) - 卡片副标题（如提示文字）

  使用示例：
  <AuthLayout card-title="欢迎登录" card-subtitle="请输入您的账号信息">
    <LoginForm />
  </AuthLayout>

  响应式断点：
  ┌─────────────────────┬─────────────────────────────────────────┐
  │  屏幕宽度            │  布局变化                               │
  ├─────────────────────┼─────────────────────────────────────────┤
  │  > 960px            │  双栏布局（品牌 + 表单）                 │
  │  ≤ 960px            │  单栏布局，品牌区缩小                   │
  │  ≤ 768px            │  隐藏品牌区，仅显示表单卡片              │
  │  ≤ 420px            │  紧凑模式，减小内边距                    │
  └─────────────────────┴─────────────────────────────────────────┘

  设计特点：
  - 背景：深色靛蓝渐变 + 模糊光球装饰
  - 表单卡片：白色背景，大圆角，柔和阴影
  - 输入框：圆角设计，聚焦时蓝色边框高亮
  - 按钮：渐变蓝色背景，悬停上浮动画效果
-->

<template>
  <!-- 认证页面封装布局组件 -->
  <div class="login-page">
    <!-- 动态背景装饰圆球 -->
    <div class="login-decor decor-1"></div>
    <div class="login-decor decor-2"></div>
    
    <!-- 主卡片区 -->
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

        <slot name="hero-content"></slot>
      </div>

      <!-- 右侧登录/注册表单卡片 -->
      <el-card class="login-card" shadow="never">
        <div class="card-head">
          <div class="card-title">{{ cardTitle }}</div>
          <div class="card-sub">{{ cardSubtitle }}</div>
        </div>

        <!-- 传入的具体表单 -->
        <slot></slot>
      </el-card>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cardTitle: {
    type: String,
    required: true
  },
  cardSubtitle: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
/* 深邃高级的靛蓝暗调背景 */
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

.hero-panel :deep(h1) {
  margin: 0;
  font-size: 48px;
  line-height: 1.15;
  letter-spacing: 1px;
  font-family: 'Inter', sans-serif;
}

.hero-panel :deep(p) {
  max-width: 620px;
  margin: 18px 0 0;
  color: rgba(255, 255, 255, .8);
  line-height: 1.8;
  font-size: 16px;
}

.hero-panel :deep(.hero-badges) {
  margin-top: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-panel :deep(.badge-item) {
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

.hero-panel :deep(.badge-item:hover) {
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

:deep(.form .el-input__wrapper) {
  border-radius: 12px;
  height: 46px;
  background: #f8fafc;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:deep(.form .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #6366f1 inset;
  background: #fff;
}

:deep(.form .el-input__prefix) {
  color: #94a3b8;
  font-size: 18px;
}

:deep(.login-btn) {
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

:deep(.login-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(99, 102, 241, .35);
}

:deep(.footer-links) {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #64748b;
  font-size: 14px;
  line-height: 1;
}

:deep(.footer-links .el-link) {
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

  .hero-panel :deep(h1) {
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

  :deep(.form .el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.form .el-input__wrapper) {
    height: 44px;
  }

  :deep(.login-btn) {
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

  :deep(.footer-links) {
    font-size: 13px;
  }
}
</style>
