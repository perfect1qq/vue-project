<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition name="fade-transform" mode="out-in">
        <div :key="route.fullPath" class="main-transition-wrapper">
          <Suspense timeout="0">
            <component :is="Component" />
            <template #fallback>
              <div class="route-skeleton">
                <el-skeleton animated :rows="6" />
                <el-skeleton animated :rows="6" />
              </div>
            </template>
          </Suspense>
        </div>
      </transition>
    </router-view>
  </section>
</template>
<script setup>
// router-view
</script>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--layout-header-height));
  width: 100%;
  min-width: 0;
  position: relative;
  overflow-x: hidden;
  overflow-y: visible;
  padding: calc(var(--layout-header-height) + 12px) 20px 20px;
  box-sizing: border-box;
}

.main-transition-wrapper {
  min-width: 0;
  width: 100%;
}

.route-skeleton {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  display: grid;
  gap: 14px;
}

.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all .3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
