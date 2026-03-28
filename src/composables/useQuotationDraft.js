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

export function useQuotationDraft() {
  const companyName = ref('')
  const remark = ref('')
  const discount = ref(0)
  const finalPrice = ref(0)
  const isManualFinalPrice = ref(false)
  const rawText = ref('')
  const items = ref([createEmptyRow()])
  const visibleColumns = ref([...FIELD_ORDER])
  const editingHistoryId = ref(null)
  const mode = ref('edit')

  const subtotal = computed(() => roundMoney(items.value.reduce((sum, row) => sum + Number(row.totalPrice || 0), 0)))
  const autoFinalPrice = computed(() => roundMoney(subtotal.value * (1 - Number(discount.value || 0) / 100)))
  const isViewMode = computed(() => mode.value === 'view')
  const isEditing = computed(() => Boolean(editingHistoryId.value))

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
  }

  const restoreAutoFinalPrice = () => {
    isManualFinalPrice.value = false
    finalPrice.value = autoFinalPrice.value
  }

  const loadRecord = (record, newMode = 'edit') => {
    companyName.value = record.companyName || record.name || ''
    remark.value = record.remark || ''
    discount.value = Number(record.discount || 0)
    finalPrice.value = Number(record.finalPrice || 0)
    isManualFinalPrice.value = Boolean(record.isManual)
    rawText.value = ''
    editingHistoryId.value = record.id ?? null
    mode.value = newMode
    setRows(Array.isArray(record.items) ? record.items : [], FIELD_ORDER)
    if (!isManualFinalPrice.value) {
      finalPrice.value = autoFinalPrice.value
    }
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
    getPayload
  }
}
