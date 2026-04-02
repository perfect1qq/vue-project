<template>
  <section class="app-main">
    <router-view v-slot="{ Component, route }">
      <transition name="fade-transform" mode="out-in">
        <div :key="route.path" class="main-transition-wrapper">
          <component :is="Component" />
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
  /* 60 = navbar */
  min-height: calc(100vh - 60px);
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: 24px;
  box-sizing: border-box; /* 确保padding包含在width内 */
}

.main-transition-wrapper {
  width: 100%;
  box-sizing: border-box;
}

.fixed-header + .app-main {
  padding-top: 84px; /* 60 + 24 */
}

/* 若依标准 fade-transform 动画 */
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