<template>
  <section class="page-shell">
    <div class="page-shell__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page-shell {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.page-shell__content {
  width: 100%;
  min-height: 0;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
  background: #fff;
  box-sizing: border-box;
  padding: 18px;
}
</style>
