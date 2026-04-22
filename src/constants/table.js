/**
 * @module constants/table
 * @description 表格相关全局常量
 *
 * 统一管理表格样式、分页配置等常量，
 * 避免在各组件中重复定义。
 */

/** ==================== 表头样式 ==================== */

/**
 * 统一表头单元格样式（深色主题）
 * 用于 :header-cell-style 绑定
 */
export const TABLE_HEADER_STYLE = {
  background: '#f8fafc',
  color: '#475569',
  fontWeight: 'bold',
  textAlign: 'center'
}

/**
 * 浅色表头样式（备选）
 */
export const TABLE_HEADER_STYLE_LIGHT = {
  background: '#fafafa',
  color: '#666',
  fontWeight: '600',
  textAlign: 'center'
}

/** ==================== 分页配置 ==================== */

/**
 * 默认分页参数
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
  pageSizes: [10, 20, 50, 100]
}

/**
 * 小型列表分页参数
 */
export const SMALL_PAGINATION = {
  page: 1,
  pageSize: 10,
  pageSizes: [10, 20, 50]
}

/** ==================== 列宽常量 ==================== */

/**
 * 常用列宽预设（单位：px）
 */
export const COLUMN_WIDTH = {
  /** 序号列 */
  INDEX: 70,

  /** 操作列（1个按钮） */
  ACTION_SINGLE: 100,
  /** 操作列（2个按钮） */
  ACTION_DOUBLE: 180,
  /** 操作列（3个按钮） */
  ACTION_TRIPLE: 260,

  /** 状态列 */
  STATUS: 90,

  /** 日期时间列 */
  DATETIME_FULL: 170,
  DATETIME_DATE: 120,

  /** 用户名列 */
  USERNAME: 130,

  /** 公司名称列 */
  COMPANY_NAME: 160,

  /** 联系方式列 */
  CONTACT: 160
}

/** ==================== 按钮类型映射 ==================== */

/**
 * 操作按钮类型枚举
 */
export const ACTION_BUTTON_TYPE = {
  PRIMARY: 'primary',
  SUCCESS: 'success',
  WARNING: 'warning',
  DANGER: 'danger',
  INFO: 'info'
}
