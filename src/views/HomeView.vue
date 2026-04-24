<template>
  <div class="home-page">
    <el-card class="hero-card" shadow="never">
      <div class="hero">
        <div>
          <div class="eyebrow">工作台</div>
          <h2 class="title">欢迎回来，{{ userName }}</h2>
          <p class="desc">这里是系统首页，也是左侧导航首次进入时显示的默认页面。</p>
        </div>
        <div class="hero-badge">
          <el-icon><Operation /></el-icon>
          <span>快速入口</span>
        </div>
      </div>
    </el-card>

    <div class="grid">
      <el-card class="quick-card" shadow="hover" @click="router.push(quotationRoute)">
        <el-icon class="card-icon"><Document /></el-icon>
        <div class="card-title">报价单</div>
        <div class="card-desc">查看与处理普通报价单</div>
      </el-card>

      <el-card class="quick-card" shadow="hover" @click="router.push(beamRoute)">
        <el-icon class="card-icon"><List /></el-icon>
        <div class="card-title">横梁载重单</div>
        <div class="card-desc">进入横梁载重单与历史记录</div>
      </el-card>

      <el-card class="quick-card" shadow="hover" @click="router.push('/usd-conversion')">
        <el-icon class="card-icon"><Money /></el-icon>
        <div class="card-title">美金换算</div>
        <div class="card-desc">统一使用圆角风格的换算工具</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Document, List, Money, Operation } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const userName = computed(() => userStore.displayName || '管理员')
const quotationRoute = computed(() =>
  userStore.hasPermission('quotation:write') ? '/quotation' : '/quotation/history'
)
const beamRoute = computed(() =>
  userStore.hasPermission('beam:write') ? '/beam-quotation' : '/beam-quotation/history'
)
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.hero-card {
  border-radius: 12px;
}
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
}
.title {
  margin: 0;
  font-size: 24px;
  color: #0f172a;
}
.desc {
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.6;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  color: #1d4ed8;
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.quick-card {
  cursor: pointer;
  border-radius: 12px;
  min-height: 150px;
}
.card-icon {
  font-size: 24px;
  color: #6366f1;
  margin-bottom: 12px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.card-desc {
  margin-top: 8px;
  color: #64748b;
  line-height: 1.5;
  font-size: 13px;
}
@media (max-width: 1200px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .home-page {
    gap: 12px;
  }

  .title {
    font-size: 20px;
  }

  .desc {
    font-size: 13px;
  }

  .hero-badge {
    padding: 8px 10px;
    font-size: 13px;
  }

  .quick-card {
    min-height: 120px;
  }
}
</style>