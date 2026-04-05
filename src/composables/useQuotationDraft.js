import { computed, ref, watch } from 'vue'

const FIELD_ORDER = ['name', 'spec', 'quantity', 'unitPrice', 'totalPrice']

const createEmptyRow = () => ({
  name: '',
  spec: '',
  quantity: '',
  unitPrice: '',
  totalPrice: ''
})

const roundMoney = (value) => Number((Number(value || 0)).toFixed(2))

const parseNumber = (value) => {
  const text = String(value ?? '').trim()
  if (!text) return null
  const match = text.match(/[-+]?\d+(?:\.\d+)?/)
  if (!match) return null
  const num = Number(match[0])
  return Number.isFinite(num) ? num : null
}

const normalizeRow = (row = {}) => {
  const quantity = parseNumber(row.quantity)
  const unitPrice = parseNumber(row.unitPrice)
  const totalPrice = parseNumber(row.totalPrice)
  const computedTotal = quantity !== null && unitPrice !== null ? roundMoney(quantity * unitPrice) : null
  const finalTotal = totalPrice !== null ? roundMoney(totalPrice) : (computedTotal ?? '')

  return {
    name: String(row.name ?? '').trim(),
    spec: String(row.spec ?? '').trim(),
    quantity: quantity === null ? String(row.quantity ?? '').trim() : quantity,
    unitPrice: unitPrice === null ? String(row.unitPrice ?? '').trim() : roundMoney(unitPrice),
    totalPrice: finalTotal
  }
}

/**
 * 报价单编辑器核心状态 Hook
 * 负责：
 * 1. 报价单主表信息 (公司、备注、折扣、成交价) 的响应式管理。
 * 2. 明细表行数据的增删改及自动计算。
 * 3. 两种计价模式：
 *    - 自动模式：成交价 = 小计 * (1 - 折扣%)
 *    - 手动模式：用户直接输入成交价，反向计算折扣。
 */
export function useQuotationDraft() {
  const companyName = ref('')
  const remark = ref('')
  const discount = ref(0) // 折扣百分比 (0-100)
  const finalPrice = ref(0) // 最终成交总价
  const isManualFinalPrice = ref(false) // 是否手动锁定了成交价
  const rawText = ref('') // 编辑器上方的原始文本区域内容
  const items = ref([createEmptyRow()]) // 明细行数组
  const visibleColumns = ref([...FIELD_ORDER]) // 动态显示的列名
  const editingHistoryId = ref(null) // 若是从历史记录加载的，存储其 ID
  const mode = ref('edit') // 模式：edit-编辑 / view-查看


  const subtotal = computed(() => roundMoney(items.value.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0))) // 所有行加总的小计
  const autoFinalPrice = computed(() => roundMoney(subtotal.value * (1 - Number(discount.value || 0) / 100))) // 根据折扣自动算出的价格
  const discountAmount = computed(() => roundMoney(subtotal.value - finalPrice.value)) // 优惠掉的金额
  const isViewMode = computed(() => mode.value === 'view') // 是否只读
  const isEditing = computed(() => Boolean(editingHistoryId.value)) // 是否在修改已有记录


  const syncAutoPrice = () => {
    if (!isManualFinalPrice.value) {
      finalPrice.value = autoFinalPrice.value
    }
  }

  watch([subtotal, discount], syncAutoPrice, { immediate: true })

  const resetDraft = () => {
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

  const setRows = (rows = [], columns = FIELD_ORDER) => {
    items.value = rows.length ? rows.map(normalizeRow) : [createEmptyRow()]
    visibleColumns.value = columns && columns.length ? [...columns] : [...FIELD_ORDER]
    syncAutoPrice()
  }

  const addRow = () => {
    if (isViewMode.value) return
    items.value.push(createEmptyRow())
  }

  const removeRow = (index) => {
    if (isViewMode.value) return
    items.value.splice(index, 1)
    if (!items.value.length) items.value.push(createEmptyRow())
    syncAutoPrice()
  }

  const clearRows = () => {
    if (isViewMode.value) return
    items.value = [createEmptyRow()]
    syncAutoPrice()
  }

  const updateRowTotal = (row) => {
    if (isViewMode.value) return
    const quantity = parseNumber(row.quantity)
    const unitPrice = parseNumber(row.unitPrice)
    if (quantity !== null && unitPrice !== null) {
      row.totalPrice = roundMoney(quantity * unitPrice)
      syncAutoPrice()
    }
  }

  const setCompanyName = (value) => {
    companyName.value = String(value ?? '').trim()
  }

  const setFinalPriceManual = (value) => {
    isManualFinalPrice.value = true
    const parsed = parseNumber(value)
    finalPrice.value = parsed === null ? Number(value || 0) : roundMoney(parsed)
    if (subtotal.value > 0) {
      discount.value = roundMoney((1 - finalPrice.value / subtotal.value) * 100)
    } else {
      discount.value = 0
    }
  }

  const restoreAutoFinalPrice = () => {
    isManualFinalPrice.value = false
    finalPrice.value = autoFinalPrice.value
  }

  const originalPayloadStr = ref('')

  const loadRecord = (record, newMode = 'edit') => {
    companyName.value = record.companyName || record.name || ''
    remark.value = record.remark || ''
    discount.value = Number(record.discount || 0)
    finalPrice.value = Number(record.finalPrice || 0)
    isManualFinalPrice.value = Boolean(record.isManual)
    rawText.value = ''
    editingHistoryId.value = record.id ?? null
    mode.value = newMode
    let itemsParsed = record.items || []
    if (typeof itemsParsed === 'string') {
      try {
        itemsParsed = JSON.parse(itemsParsed)
      } catch (e) {
        itemsParsed = []
      }
    }
    setRows(Array.isArray(itemsParsed) ? itemsParsed : [], FIELD_ORDER)
    if (!isManualFinalPrice.value) {
      finalPrice.value = autoFinalPrice.value
    }
    
    // 设置深比对快照
    originalPayloadStr.value = JSON.stringify(getPayload())
  }

  const setMode = (newMode) => {
    mode.value = newMode
  }

  const getPayload = () => ({
    companyName: companyName.value,
    name: companyName.value,
    remark: remark.value,
    discount: Number(discount.value || 0),
    finalPrice: Number(finalPrice.value || 0),
    isManual: Boolean(isManualFinalPrice.value),
    items: items.value.map(normalizeRow)
  })

  return {
    FIELD_ORDER,
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
    resetDraft,
    setRows,
    addRow,
    removeRow,
    clearRows,
    updateRowTotal,
    setCompanyName,
    setFinalPriceManual,
    restoreAutoFinalPrice,
    loadRecord,
    setMode,
    getPayload,
    originalPayloadStr
  }
}
