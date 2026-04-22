<template>
  <div class="card-header">
    <span class="title">{{ title }}</span>
    <slot name="actions" />
  </div>
</template>

<script setup>
defineProps({
  /** 页面标题 */
  title: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}
</style>
