<template>
  <el-breadcrumb separator="/" class="route-breadcrumb">
    <el-breadcrumb-item
      v-for="(item, index) in breadcrumbItems"
      :key="`${item.label}-${index}`"
      :to="index === breadcrumbItems.length - 1 || !item.path ? undefined : { path: item.path }"
    >
      {{ item.label }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const homePath = '/home'

const breadcrumbItems = computed(() => {
  const items = route.matched
    .filter(record => record.meta && record.meta.title)
    .map(record => ({
      label: record.meta.title,
      path: record.path
    }))

  if (route.path !== homePath) {
    items.unshift({ label: '首页', path: homePath })
  }

  return items.length ? items : [{ label: '首页', path: homePath }]
})
</script>

<style scoped>
.route-breadcrumb {
  font-size: 14px;
  white-space: nowrap;
}

:deep(.el-breadcrumb__inner),
:deep(.el-breadcrumb__inner a) {
  color: #64748b;
  font-weight: 500;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #111827;
  font-weight: 700;
}
</style>
