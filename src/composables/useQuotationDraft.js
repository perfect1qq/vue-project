/**
 * @file composables/useQuotationDraft.js
 * @description 报价单草稿状态管理（核心业务逻辑）
 *
 * 功能说明：
 * - 管理报价单的完整编辑状态（表头、明细行、折扣、成交价）
 * - 实现两种计价模式：
 *   1. **自动模式**：成交价 = 小计 × (1 - 折扣%)
 *   2. **手动模式**：用户直接输入成交价，反向计算折扣
 * - 明细行的增删改及自动计算（数量 × 单价 = 小计）
 * - 支持从历史记录加载并进入编辑/查看模式
 * - 提供深比对快照用于检测是否有修改
 *
 * 数据流架构：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  useQuotationDraft (本模块)                                 │
 * │  ┌──────────────┬────────────────────────────────────────┐  │
 * │  │ 表头状态      │ quotationNo, companyName, remark      │  │
 * │  ├──────────────┼────────────────────────────────────────┤  │
 * │  │ 价格计算链    │ items → subtotal → autoFinalPrice     │  │
 * │  │              │                    ↓                  │  │
 * │  │              │          finalPrice (自动/手动)        │  │
 * │  ├──────────────┼────────────────────────────────────────┤  │
 * │  │ 明细行管理    │ addRow / removeRow / updateRowTotal   │  │
 * │  ├──────────────┼────────────────────────────────────────┤  │
 * │  │ 模式控制      │ edit(编辑) / view(查看)               │  │
 * │  ├──────────────┼────────────────────────────────────────┤  │
 * │  │ 历史快照      │ originalPayloadStr (深比对用)         │  │
 * │  └──────────────┴────────────────────────────────────────┘  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 使用方式：
 * const {
 *   quotationNo, companyName, remark,
 *   discount, finalPrice, isManualFinalPrice,
 *   items, subtotal, autoFinalPrice, discountAmount,
 *   addRow, removeRow, updateRowTotal,
 *   setFinalPriceManual, restoreAutoFinalPrice,
 *   loadRecord, getPayload, resetDraft
 * } = useQuotationDraft()
 */

import { computed, ref, watch } from 'vue'

// ==================== 常量定义 ====================

/** 明细表字段顺序（决定表格列显示顺序） */
const FIELD_ORDER = ['name', 'spec', 'quantity', 'unitPrice', 'totalPrice']

// ==================== 工具函数 ====================

/**
 * 创建空的明细行对象
 * @returns {Object} 空行数据
 */
const createEmptyRow = () => ({
  name: '',
  spec: '',
  quantity: '',
  unitPrice: '',
  totalPrice: '',
})

/**
 * 金额四舍五入到2位小数
 * @param {*} value - 输入值（数字或字符串）
 * @returns {number} 格式化后的数字
 */
const roundMoney = (value) => Number((Number(value || 0)).toFixed(2))

/**
 * 解析数字值
 *
 * 从字符串中提取第一个合法数字，
 * 支持正负号和小数点
 *
 * @param {*} value - 输入值
 * @returns {number|null} 解析成功返回数字，失败返回 null
 */
const parseNumber = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return null

  const match = text.match(/[-+]?\d+(?:\.\d+)?/)
  if (!match) return null

  const num = Number(match[0])
  return Number.isFinite(num) ? num : null
}

/**
 * 规范化单行明细数据
 *
 * 将原始输入转换为标准格式：
 * - 文本字段：trim 处理
 * - 数值字段：尝试解析，保留原始文本作为回退
 * - 小计计算：quantity × unitPrice（如果两者都有值）
 *
 * @param {Object} [row={}] - 原始行数据
 * @returns {Object} 规范化后的行数据
 */
const normalizeRow = (row = {}) => {
  const quantity = parseNumber(row.quantity)
  const unitPrice = parseNumber(row.unitPrice)
  const totalPrice = parseNumber(row.totalPrice)

  // 自动计算小计（当数量和单价都有效时）
  const computedTotal =
    quantity !== null && unitPrice !== null
      ? roundMoney(quantity * unitPrice)
      : null

  // 最终小计：优先使用用户输入，否则使用计算值
  const finalTotal =
    totalPrice !== null ? roundMoney(totalPrice) : computedTotal ?? ''

  return {
    name: String(row.name ?? '').trim(),
    spec: String(row.spec ?? '').trim(),
    quantity: quantity === null ? String(row.quantity ?? '').trim() : quantity,
    unitPrice:
      unitPrice === null
        ? String(row.unitPrice ?? '').trim()
        : roundMoney(unitPrice),
    totalPrice: finalTotal,
  }
}

// ==================== 主 Composable ====================

/**
 * 报价单编辑器核心状态 Hook
 *
 * 负责：
 * 1. 报价单主表信息（公司、备注、折扣、成交价）的响应式管理
 * 2. 明细表行数据的增删改及自动计算
 * 3. 两种计价模式的切换与管理
 *
 * @returns {Object} 报价单状态和方法集合
 */
export function useQuotationDraft() {
  // ==================== 响应式状态 ====================

  /** 报价单编号（自动生成或手动输入） */
  const quotationNo = ref('')

  /** 公司名称 */
  const companyName = ref('')

  /** 备注说明 */
  const remark = ref('')

  /**
   * 折扣百分比（0-100）
   * 例如：10 表示打九折
   */
  const discount = ref(0)

  /** 最终成交总价（元） */
  const finalPrice = ref(0)

  /**
   * 是否处于手动指定成交价模式
   * true: 用户直接输入了成交价，不再随折扣自动变化
   * false: 成交价 = 小计 × (1 - 折扣%)
   */
  const isManualFinalPrice = ref(false)

  /** 编辑器上方的原始文本区域内容（用于 AI 智能解析） */
  const rawText = ref('')

  /** 明细行数据数组 */
  const items = ref([createEmptyRow()])

  /** 当前显示的列名列表（动态列配置） */
  const visibleColumns = ref([...FIELD_ORDER])

  /**
   * 当前正在编辑的历史记录 ID
   * null: 新建模式
   * 有值: 编辑已有记录
   */
  const editingHistoryId = ref(null)

  /** 当前模式：'edit'（编辑） | 'view'（查看） */
  const mode = ref('edit')

  // ==================== 计算属性 ====================

  /**
   * 小计（所有行的小计之和）
   * 自动汇总所有明细行的 totalPrice 字段
   */
  const subtotal = computed(() =>
    roundMoney(
      items.value.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0),
    ),
  )

  /**
   * 根据折扣自动计算的成交价
   * 公式：autoFinalPrice = subtotal × (1 - discount / 100)
   */
  const autoFinalPrice = computed(() =>
    roundMoney(subtotal.value * (1 - Number(discount.value || 0) / 100)),
  )

  /**
   * 优惠金额（小减去最终成交价）
   */
  const discountAmount = computed(() =>
    roundMoney(subtotal.value - finalPrice.value),
  )

  /** 是否处于只读查看模式 */
  const isViewMode = computed(() => mode.value === 'view')

  /** 是否正在编辑已有的历史记录 */
  const isEditing = computed(() => Boolean(editingHistoryId.value))

  // ==================== 同步函数 ====================

  /**
   * 同步自动成交价到 finalPrice
   *
   * 仅在非手动模式下生效，
   * 当 subtotal 或 discount 变化时自动调用
   */
  const syncAutoPrice = () => {
    if (!isManualFinalPrice.value) {
      finalPrice.value = autoFinalPrice.value
    }
  }

  // 监听小计和折扣变化，自动更新成交价
  watch([subtotal, discount], syncAutoPrice, { immediate: true })

  // ==================== 操作方法 ====================

  /**
   * 重置草稿到初始空白状态
   *
   * 清空所有字段，重置模式为编辑，
   * 通常在保存成功后或用户点击"新建"时调用
   */
  const resetDraft = () => {
    quotationNo.value = ''
    companyName.value = ''
    remark.value = ''
    discount.value = 0
    finalPrice.value = 0
    isManualFinalPrice.value = false
    rawText.value = ''
    items.value = [createEmptyRow()]
    visibleColumns.value = [...FIELD_ORDER]
    editingHistoryId.value = null
    mode.value = 'edit'
  }

  /**
   * 批量设置明细行数据
   *
   * 用于 AI 智能解析后填充结果，
   * 或从历史记录加载时恢复数据
   *
   * @param {Array} [rows=[]] - 行数据数组
   * @param {string[]} [columns=FIELD_ORDER] - 显示的列名
   */
  const setRows = (rows = [], columns = FIELD_ORDER) => {
    items.value = rows.length
      ? rows.map(normalizeRow)
      : [createEmptyRow()]

    visibleColumns.value =
      columns && columns.length ? [...columns] : [...FIELD_ORDER]

    syncAutoPrice()
  }

  /**
   * 添加一行空白明细
   *
   * 查看模式下不可操作
   */
  const addRow = () => {
    if (isViewMode.value) return
    items.value.push(createEmptyRow())
  }

  /**
   * 删除指定索引的明细行
   *
   * 如果删除后没有行了，自动添加一个空行
   *
   * @param {number} index - 要删除的行索引
   */
  const removeRow = (index) => {
    if (isViewMode.value) return
    items.value.splice(index, 1)
    if (!items.value.length) items.value.push(createEmptyRow())
    syncAutoPrice()
  }

  /**
   * 清空所有明细行（保留一行空行）
   */
  const clearRows = () => {
    if (isViewMode.value) return
    items.value = [createEmptyRow()]
    syncAutoPrice()
  }

  /**
   * 更新单行的小计
   *
   * 根据该行的 quantity 和 unitPrice 重新计算 totalPrice
   *
   * @param {Object} row - 要更新的行对象引用
   */
  const updateRowTotal = (row) => {
    if (isViewMode.value) return

    const quantity = parseNumber(row.quantity)
    const unitPrice = parseNumber(row.unitPrice)

    if (quantity !== null && unitPrice !== null) {
      row.totalPrice = roundMoney(quantity * unitPrice)
      syncAutoPrice()
    }
  }

  /**
   * 设置公司名称
   * @param {string} value - 公司名称
   */
  const setCompanyName = (value) => {
    companyName.value = String(value ?? '').trim()
  }

  /**
   * 设置手动成交价（切换到手动模式）
   *
   * 用户直接输入成交价时调用：
   * 1. 锁定手动模式标志
   * 2. 设置成交价值
   * 3. 反向计算折扣率
   *
   * @param {*} value - 成交价输入值
   */
  const setFinalPriceManual = (value) => {
    isManualFinalPrice.value = true

    const parsed = parseNumber(value)
    finalPrice.value =
      parsed === null ? Number(value || 0) : roundMoney(parsed)

    // 反向计算折扣率
    if (subtotal.value > 0) {
      discount.value = roundMoney(
        ((1 - finalPrice.value / subtotal.value) * 100),
      )
    } else {
      discount.value = 0
    }
  }

  /**
   * 恢复自动计算成交价模式
   *
   * 取消手动锁定，
   * 成交价重新跟随折扣自动计算
   */
  const restoreAutoFinalPrice = () => {
    isManualFinalPrice.value = false
    finalPrice.value = autoFinalPrice.value
  }

  // ==================== 历史记录相关 ====================

  /** 深比对快照（用于检测是否有未保存的修改） */
  const originalPayloadStr = ref('')

  /**
   * 从历史记录加载报价单数据
   *
   * 支持两种加载模式：
   * - 'edit': 进入编辑模式（可修改）
   * - 'view': 进入查看模式（只读）
   *
   * 加载完成后会生成深比对快照
   *
   * @param {Object} record - 历史记录对象
   * @param {number|null} record.id - 记录 ID
   * @param {string} record.quotationNo - 报价单号
   * @param {string} record.companyName - 公司名称
   * @param {string} [record.remark] - 备注
   * @param {number} [record.discount] - 折扣
   * @param {number} [record.finalPrice] - 成交价
   * @param {boolean} [record.isManual] - 是否手动成交价
   * @param {Array|string} [record.items] - 明细行（支持 JSON 字符串）
   * @param {string} [newMode='edit'] - 加载模式
   */
  const loadRecord = (record, newMode = 'edit') => {
    quotationNo.value = record.quotationNo || ''
    companyName.value = record.companyName || record.name || ''
    remark.value = record.remark || ''
    discount.value = Number(record.discount || 0)
    finalPrice.value = Number(record.finalPrice || 0)
    isManualFinalPrice.value = Boolean(record.isManual)
    rawText.value = ''
    editingHistoryId.value = record.id ?? null
    mode.value = newMode

    // 解析明细行（兼容 JSON 字符串格式）
    let itemsParsed = record.items || []
    if (typeof itemsParsed === 'string') {
      try {
        itemsParsed = JSON.parse(itemsParsed)
      } catch (e) {
        itemsParsed = []
      }
    }

    setRows(Array.isArray(itemsParsed) ? itemsParsed : [], FIELD_ORDER)

    // 非手动模式时同步自动价格
    if (!isManualFinalPrice.value) {
      finalPrice.value = autoFinalPrice.value
    }

    // 生成深比对快照（用于检测是否有修改）
    originalPayloadStr.value = JSON.stringify(getPayload())
  }

  /**
   * 切换当前模式
   * @param {string} newMode - 'edit' 或 'view'
   */
  const setMode = (newMode) => {
    mode.value = newMode
  }

  /**
   * 获取当前草稿的提交数据
   *
   * 将当前状态序列化为可提交给后端的格式
   *
   * @returns {Object} 提交数据对象
   */
  const getPayload = () => ({
    quotationNo: quotationNo.value,
    companyName: companyName.value,
    name: companyName.value, // 兼容旧字段名
    remark: remark.value,
    discount: Number(discount.value || 0),
    finalPrice: Number(finalPrice.value || 0),
    isManual: Boolean(isManualFinalPrice.value),
    items: items.value.map(normalizeRow),
  })

  return {
    FIELD_ORDER,
    quotationNo,
    companyName,
    remark,
    discount,
    finalPrice,
    isManualFinalPrice,
    rawText,
    items,
    visibleColumns,
    editingHistoryId,
    mode,
    subtotal,
    autoFinalPrice,
    discountAmount,
    isViewMode,
    isEditing,

    // 操作方法
    resetDraft,
    setRows,
    addRow,
    removeRow,
    clearRows,
    updateRowTotal,
    setCompanyName,
    setFinalPriceManual,
    restoreAutoFinalPrice,

    // 历史记录方法
    loadRecord,
    setMode,
    getPayload,
    originalPayloadStr,
  }
}
