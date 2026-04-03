<template>
  <div class="tags-view-wrapper">
    <div class="tags-left-tools">
      <el-dropdown trigger="click" @command="handleCommand">
        <button class="tags-op-btn" type="button">
          <el-icon><MoreFilled /></el-icon>
          <span>页面操作</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="closeOthers">关闭其他</el-dropdown-item>
            <!-- <el-dropdown-item command="closeLeft">关闭左侧</el-dropdown-item> -->
            <el-dropdown-item command="closeRight">关闭右侧</el-dropdown-item>
            <el-dropdown-item command="closeAll" divided>关闭全部</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-scrollbar class="tags-view-scrollbar">
      <div class="tags-view-list">
        <div
          v-for="item in visitedViews"
          :key="item.fullPath"
          :class="['tags-view-item', { active: item.fullPath === activeFullPath, home: item.path === '/home' }]"
          @click="goView(item)"
        >
          <el-icon v-if="item.path === '/home'" class="tag-home-icon">
            <House />
          </el-icon>
          <span class="tag-title">{{ item.title }}</span>
          <el-icon
            v-if="item.path !== '/home'"
            class="tag-close"
            @click.stop="closeView(item)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { Close, House, MoreFilled } from '@element-plus/icons-vue'
import { useBreadcrumbTabs } from '@/composables/useBreadcrumbTabs'

const {
  visitedViews,
  activeFullPath,
  goView,
  closeView,
  closeOthers,
  closeLeft,
  closeRight,
  closeAll
} = useBreadcrumbTabs()

const handleCommand = async (command) => {
  const current = visitedViews.value?.find(item => item.fullPath === activeFullPath.value) || visitedViews.value?.[visitedViews.value.length - 1]
  if (command === 'closeOthers') await closeOthers(current)
  if (command === 'closeLeft') closeLeft(current)
  if (command === 'closeRight') closeRight(current)
  if (command === 'closeAll') await closeAll()
}
</script>

<style scoped>
.tags-view-wrapper {
  height: 42px;
  width: 100%;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  box-sizing: border-box;
}

.tags-left-tools {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.tags-op-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.tags-op-btn:hover {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.tags-view-scrollbar {
  height: 100%;
  flex: 1 1 auto;
  min-width: 0;
}

.tags-view-list {
  display: flex;
  align-items: center;
  height: 42px;
  padding: 0 2px 0 0;
  gap: 8px;
  white-space: nowrap;
  justify-content: flex-start;
}

.tags-view-item {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #d8dce5;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  flex: 0 0 auto;
  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.02);
}

.tags-view-item:hover {
  color: #2563eb;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.tags-view-item.active {
  color: #2563eb;
  border-color: #93c5fd;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.12);
}

.tag-home-icon {
  margin-right: 5px;
  font-size: 12px;
}

.tag-title {
  line-height: 1;
}

.tag-close {
  margin-left: 6px;
  font-size: 12px;
  border-radius: 50%;
  padding: 1px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.tag-close:hover {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}
</style>
